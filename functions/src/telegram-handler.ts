import { normalizeAccountNumber, normalizeText } from './domain.js';
import {
  classifyTransaction,
  findTransactionByTelegramActionToken,
  findTransactionByTelegramMessageId,
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

export function parseCounterpartyRuleCommand(text: string): CounterpartyRuleCommand | null {
  const match = text.trim().match(/^\/(ignore_stk|unignore_stk)(?:@[a-z0-9_]+)?\s+([0-9][0-9\s-]{5,23})$/i);
  if (!match) return null;
  const accountNumber = normalizeAccountNumber(match[2]);
  if (accountNumber.length < 6 || accountNumber.length > 24) return null;
  return { type: match[1].toLowerCase() === 'ignore_stk' ? 'ignore' : 'allow', accountNumber };
}

function categoryFromReply(text: string, categories: Record<string, string>): string | null {
  const normalized = normalizeText(text.replace(/^\//, '').trim());
  for (const [id, label] of Object.entries(categories)) {
    if (normalized === normalizeText(id) || normalized === normalizeText(label)) return id;
  }
  return null;
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
  if (transaction.counterpartyAccountKey) return `Đã gắn “${label}” và ghi nhớ rule STK.`;
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
        ? 'Đã đánh dấu chuyển nội bộ và ghi nhớ rule STK.'
        : 'Đã đánh dấu chuyển nội bộ.';
    } else if (action === 'ignore') {
      const transaction = await classifyTransaction(config.uid, transactionId, { ignore: true });
      resultLabel = transaction.counterpartyAccountKey
        ? 'Đã bỏ qua và ghi nhớ rule STK.'
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
  if (message?.text && /^\/(?:start|help)\b/i.test(message.text.trim())) {
    await sendTelegramMessage(
      config.botToken,
      config.chatId,
      '✅ Finance bot đã kết nối. Reply danh mục/Bỏ qua cho giao dịch hoặc dùng /ignore_stk 0123456789 và /unignore_stk 0123456789 để quản lý STK bỏ qua.',
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
      ? 'Đã đánh dấu chuyển nội bộ và ghi nhớ rule STK.'
      : 'Đã đánh dấu chuyển nội bộ.';
  } else if (replyAction.type === 'ignore') {
    const updated = await classifyTransaction(config.uid, transaction.id, { ignore: true });
    resultLabel = updated.counterpartyAccountKey
      ? 'Đã bỏ qua và ghi nhớ rule STK.'
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
