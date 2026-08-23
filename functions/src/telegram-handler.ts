import { normalizeAccountNumber, normalizeText } from './domain.js';
import {
  classifyTransaction,
  deleteNoteKeywordRule,
  findTransactionByTelegramActionToken,
  findTransactionByTelegramMessageId,
  setNoteKeywordRule,
  setCounterpartyIgnoreRule,
} from './repository.js';
import {
  answerCallbackQuery,
  categoryNames,
  markTelegramMessageReviewed,
  sendTelegramMessage,
  type TelegramUpdate,
} from './telegram.js';

export interface TelegramHandlerConfig {
  uid: string;
  botToken: string;
  chatId: string;
  accountHmacSecret?: string;
}

export type CounterpartyRuleCommand = { type: 'ignore' | 'allow'; accountNumber: string };

export type NoteRuleCommand =
  | { type: 'set'; term: string; categoryId: string }
  | { type: 'delete'; term: string }
  | { type: 'invalid'; term?: string };

export function parseCounterpartyRuleCommand(text: string): CounterpartyRuleCommand | null {
  const match = text.trim().match(/^\/(ignore_stk|unignore_stk)(?:@[a-z0-9_]+)?\s+([0-9][0-9\s-]{5,23})$/i);
  if (!match) return null;
  const accountNumber = normalizeAccountNumber(match[2]);
  if (accountNumber.length < 6 || accountNumber.length > 24) return null;
  return { type: match[1].toLowerCase() === 'ignore_stk' ? 'ignore' : 'allow', accountNumber };
}

export function parseNoteRuleCommand(text: string, categories: Record<string, string>): NoteRuleCommand | null {
  const trimmed = text.trim();
  const removeMatch = trimmed.match(/^\/unrule(?:@[a-z0-9_]+)?\s+(.+)$/i);
  if (removeMatch) {
    const term = removeMatch[1].trim();
    return term && term.length <= 40 ? { type: 'delete', term } : { type: 'invalid' };
  }

  const setMatch = trimmed.match(/^\/rule(?:@[a-z0-9_]+)?\s+(.+?)\s*(?:->|=|:)\s*(.+)$/i);
  if (!setMatch) return null;
  const term = setMatch[1].trim();
  if (!term || term.length > 40) return { type: 'invalid' };
  const categoryId = categoryFromReply(setMatch[2], categories);
  return categoryId ? { type: 'set', term, categoryId } : { type: 'invalid', term };
}

function categoryFromReply(text: string, categories: Record<string, string>): string | null {
  const normalized = normalizeText(text.replace(/^[@/]/, '').trim());
  for (const [id, label] of Object.entries(categories)) {
    if (normalized === normalizeText(id) || normalized === normalizeText(label)) return id;
  }
  return null;
}

function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type TelegramReplyAction =
  | { type: 'category'; categoryId: string }
  | { type: 'internal' }
  | { type: 'ignore' }
  | { type: 'unknown' };

export function parseTelegramReply(text: string, categories: Record<string, string>): TelegramReplyAction {
  const normalizedReply = normalizeText(text);
  if (/^(noi bo|chuyen noi bo|transfer)$/.test(normalizedReply)) return { type: 'internal' };
  if (/^(bo qua|ignore|skip)$/.test(normalizedReply)) return { type: 'ignore' };
  const categoryId = categoryFromReply(text, categories);
  return categoryId ? { type: 'category', categoryId } : { type: 'unknown' };
}

function resultForRule(
  transaction: { counterpartyAccountKey?: string; merchantKey?: string },
  label: string,
): string {
  if (transaction.counterpartyAccountKey) return `Đã gắn “${label}” và ghi nhớ người nhận.`;
  if (transaction.merchantKey) return `Đã gắn “${label}” và ghi nhớ merchant.`;
  return `Đã gắn “${label}” cho giao dịch này.`;
}

export async function handleTelegramUpdate(
  config: TelegramHandlerConfig,
  update: TelegramUpdate,
): Promise<'handled' | 'ignored'> {
  const callback = update.callback_query;
  if (callback?.data && callback.message) {
    if (String(callback.message.chat.id) !== config.chatId) throw new Error('Wrong chat');
    const [action, actionToken, categoryId] = callback.data.split('|');
    const callbackTransaction = actionToken.startsWith('n8n_')
      ? { id: actionToken }
      : await findTransactionByTelegramActionToken(config.uid, actionToken);
    if (!callbackTransaction?.id) throw new Error('Transaction action token not found');
    const transactionId = callbackTransaction.id;
    const categories = await categoryNames(config.uid);
    let resultLabel = '';
    if (action === 'cat' && categoryId) {
      if (!categories[categoryId]) throw new Error('Unknown category');
      const transaction = await classifyTransaction(config.uid, transactionId, { categoryId });
      resultLabel = resultForRule(transaction, categories[categoryId]);
    } else if (action === 'internal') {
      const transaction = await classifyTransaction(config.uid, transactionId, { kind: 'transfer' });
      resultLabel = transaction.counterpartyAccountKey
        ? 'Đã đánh dấu chuyển nội bộ và ghi nhớ người nhận.'
        : 'Đã đánh dấu chuyển nội bộ.';
    } else if (action === 'ignore') {
      const transaction = await classifyTransaction(config.uid, transactionId, { ignore: true });
      resultLabel = transaction.counterpartyAccountKey
        ? 'Đã bỏ qua và ghi nhớ người nhận.'
        : transaction.merchantKey
          ? 'Đã bỏ qua và ghi nhớ merchant.'
          : 'Đã bỏ qua giao dịch.';
    } else {
      throw new Error('Unsupported callback');
    }
    await answerCallbackQuery(config.botToken, callback.id, resultLabel);
    await markTelegramMessageReviewed(
      config.botToken,
      callback.message.chat.id,
      callback.message.message_id,
      callback.message.text || 'Giao dịch',
      resultLabel,
    );
    return 'handled';
  }

  const message = update.message;
  if (message?.text && String(message.chat.id) !== config.chatId) throw new Error('Wrong chat');
  const ruleCommand = message?.text ? parseCounterpartyRuleCommand(message.text) : null;
  if (message?.text && ruleCommand) {
    if (!config.accountHmacSecret) throw new Error('ACCOUNT_HMAC_SECRET is required for STK rules');
    const last4 = await setCounterpartyIgnoreRule(
      config.uid,
      ruleCommand.accountNumber,
      config.accountHmacSecret,
      ruleCommand.type === 'ignore',
    );
    await sendTelegramMessage(
      config.botToken,
      config.chatId,
      ruleCommand.type === 'ignore'
        ? `✅ Đã thêm STK ••••${last4} vào danh sách bỏ qua. Giao dịch sau này sẽ không được ghi.`
        : `✅ Đã bỏ STK ••••${last4} khỏi danh sách bỏ qua.`,
      undefined,
      message.message_id,
    );
    return 'handled';
  }
  if (message?.text && /^\/(?:rule|unrule)\b/i.test(message.text.trim())) {
    const categories = await categoryNames(config.uid);
    const noteRuleCommand = parseNoteRuleCommand(message.text, categories);
    if (noteRuleCommand?.type === 'set') {
      await setNoteKeywordRule(config.uid, noteRuleCommand.term, noteRuleCommand.categoryId);
      await sendTelegramMessage(
        config.botToken,
        config.chatId,
        `✅ Đã ghi nhớ từ khóa “${noteRuleCommand.term}” → “${categories[noteRuleCommand.categoryId]}”.`,
        undefined,
        message.message_id,
      );
    } else if (noteRuleCommand?.type === 'delete') {
      const deleted = await deleteNoteKeywordRule(config.uid, noteRuleCommand.term);
      await sendTelegramMessage(
        config.botToken,
        config.chatId,
        deleted ? `✅ Đã xóa rule từ khóa “${noteRuleCommand.term}”.` : `Không tìm thấy rule “${noteRuleCommand.term}”.`,
        undefined,
        message.message_id,
      );
    } else {
      await sendTelegramMessage(
        config.botToken,
        config.chatId,
        'Cú pháp: /rule từ_khóa -> danh_mục hoặc /unrule từ_khóa. Ví dụ: /rule cam -> ăn uống',
        undefined,
        message.message_id,
      );
    }
    return 'handled';
  }
  if (message?.text && /^\/(?:category|categories)(?:@[a-z0-9_]+)?\b/i.test(message.text.trim())) {
    const categories = await categoryNames(config.uid);
    const lines = Object.entries(categories)
      .map(([id, label]) => `• @${escapeTelegramHtml(id)} — ${escapeTelegramHtml(label)}`)
      .join('\n');
    await sendTelegramMessage(
      config.botToken,
      config.chatId,
      `📚 Danh mục hiện có:\n${lines}\n\nDùng: /rule từ_khóa -> @category`,
      undefined,
      message.message_id,
    );
    return 'handled';
  }
  if (message?.text && /^\/(?:start|help)\b/i.test(message.text.trim())) {
    await sendTelegramMessage(
      config.botToken,
      config.chatId,
      '✅ Finance bot đã kết nối. Dùng /category để xem danh mục; /rule cam -> @eating để thêm keyword; /ignore_stk 0123456789 để bỏ qua STK.',
      undefined,
      message.message_id,
    );
    return 'handled';
  }
  const repliedMessage = message?.reply_to_message;
  if (!message?.text || !repliedMessage) return 'ignored';

  const transaction = await findTransactionByTelegramMessageId(config.uid, repliedMessage.message_id);
  if (!transaction?.id || transaction.status !== 'pending_category') {
    await sendTelegramMessage(
      config.botToken,
      config.chatId,
      'Không tìm thấy giao dịch đang chờ tương ứng với tin nhắn này.',
      undefined,
      message.message_id,
    );
    return 'handled';
  }

  const categories = await categoryNames(config.uid);
  const replyAction = parseTelegramReply(message.text, categories);
  let resultLabel = '';
  if (replyAction.type === 'internal') {
    const updated = await classifyTransaction(config.uid, transaction.id, { kind: 'transfer' });
    resultLabel = updated.counterpartyAccountKey
      ? 'Đã đánh dấu chuyển nội bộ và ghi nhớ người nhận.'
      : 'Đã đánh dấu chuyển nội bộ.';
  } else if (replyAction.type === 'ignore') {
    const updated = await classifyTransaction(config.uid, transaction.id, { ignore: true });
    resultLabel = updated.counterpartyAccountKey
      ? 'Đã bỏ qua và ghi nhớ người nhận.'
      : updated.merchantKey
        ? 'Đã bỏ qua và ghi nhớ merchant.'
        : 'Đã bỏ qua giao dịch.';
  } else if (replyAction.type === 'category') {
    const updated = await classifyTransaction(config.uid, transaction.id, { categoryId: replyAction.categoryId });
    resultLabel = resultForRule(updated, categories[replyAction.categoryId]);
  } else {
    const choices = Object.values(categories).join(', ');
    await sendTelegramMessage(
      config.botToken,
      config.chatId,
      `Không nhận ra danh mục “${message.text.trim()}”. Hãy reply một trong: ${choices}, Chuyển nội bộ, Bỏ qua.`,
      undefined,
      message.message_id,
    );
    return 'handled';
  }

  await markTelegramMessageReviewed(
    config.botToken,
    message.chat.id,
    repliedMessage.message_id,
    repliedMessage.text || 'Giao dịch',
    resultLabel,
  );
  await sendTelegramMessage(config.botToken, config.chatId, `✅ ${resultLabel}`, undefined, message.message_id);
  return 'handled';
}
