import { normalizeText } from './domain.js';
import { classifyTransaction, findTransactionByTelegramMessageId } from './repository.js';
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

function resultForRule(hasAccountRule: boolean, label: string): string {
  return hasAccountRule
    ? `Đã gắn “${label}” và ghi nhớ rule STK.`
    : `Đã gắn “${label}” cho giao dịch này.`;
}

export async function handleTelegramUpdate(
  config: TelegramHandlerConfig,
  update: TelegramUpdate,
): Promise<'handled' | 'ignored'> {
  const callback = update.callback_query;
  if (callback?.data && callback.message) {
    if (String(callback.message.chat.id) !== config.chatId) throw new Error('Wrong chat');
    const [action, transactionId, categoryId] = callback.data.split('|');
    const categories = await categoryNames(config.uid);
    let resultLabel = '';
    if (action === 'cat' && categoryId) {
      if (!categories[categoryId]) throw new Error('Unknown category');
      const transaction = await classifyTransaction(config.uid, transactionId, { categoryId });
      resultLabel = resultForRule(Boolean(transaction.counterpartyAccountKey), categories[categoryId]);
    } else if (action === 'internal') {
      const transaction = await classifyTransaction(config.uid, transactionId, { kind: 'transfer' });
      resultLabel = transaction.counterpartyAccountKey
        ? 'Đã đánh dấu chuyển nội bộ và ghi nhớ rule STK.'
        : 'Đã đánh dấu chuyển nội bộ.';
    } else if (action === 'ignore') {
      await classifyTransaction(config.uid, transactionId, { ignore: true });
      resultLabel = 'Đã bỏ qua giao dịch.';
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
  const repliedMessage = message?.reply_to_message;
  if (!message?.text || !repliedMessage) return 'ignored';
  if (String(message.chat.id) !== config.chatId) throw new Error('Wrong chat');

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
    await classifyTransaction(config.uid, transaction.id, { ignore: true });
    resultLabel = 'Đã bỏ qua giao dịch.';
  } else if (replyAction.type === 'category') {
    const updated = await classifyTransaction(config.uid, transaction.id, { categoryId: replyAction.categoryId });
    resultLabel = resultForRule(Boolean(updated.counterpartyAccountKey), categories[replyAction.categoryId]);
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
