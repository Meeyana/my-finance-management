import { DEFAULT_CATEGORIES } from './domain.js';
import { userRoot } from './repository.js';
import type { StoredTransaction } from './types.js';

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
}

export interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    reply_to_message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
    };
  };
}

interface TelegramMessageResult {
  message_id: number;
}

async function telegramRequest<T>(token: string, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as TelegramResponse<T>;
  if (!response.ok || !body.ok) throw new Error(body.description || `Telegram ${method} failed`);
  return body.result as T;
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
  replyToMessageId?: number,
): Promise<TelegramMessageResult> {
  return telegramRequest<TelegramMessageResult>(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
  });
}

export async function answerCallbackQuery(token: string, callbackQueryId: string, text: string): Promise<void> {
  await telegramRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function markTelegramMessageReviewed(
  token: string,
  chatId: number,
  messageId: number,
  originalText: string,
  result: string,
): Promise<void> {
  await telegramRequest(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: `${originalText}\n\n✅ ${result}`,
  });
}

export async function categoryNames(uid: string): Promise<Record<string, string>> {
  const snapshot = await userRoot(uid).collection('settings').doc('categories').get();
  const custom = snapshot.exists ? snapshot.data() || {} : {};
  const customNames = Object.fromEntries(
    Object.entries(custom).map(([id, value]) => [id, (value as { label?: string }).label || id]),
  );
  return { ...DEFAULT_CATEGORIES, ...customNames };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function notifyPendingCategory(
  token: string,
  chatId: string,
  uid: string,
  transaction: StoredTransaction,
): Promise<number | null> {
  if (!transaction.id) return null;
  const categories = await categoryNames(uid);
  const preferred = ['eating', 'living', 'fuel', 'shopping', 'learning', 'investment', 'entertainment', 'other'];
  const categoryButtons = preferred
    .filter((id) => categories[id])
    .map((id) => ({ text: categories[id], callback_data: `cat|${transaction.id}|${id}` }));
  const rows = [];
  for (let index = 0; index < categoryButtons.length; index += 2) rows.push(categoryButtons.slice(index, index + 2));
  rows.push([
    { text: '🔁 Chuyển nội bộ', callback_data: `internal|${transaction.id}` },
    { text: '🚫 Bỏ qua', callback_data: `ignore|${transaction.id}` },
  ]);

  const accountText = transaction.counterpartyAccountLast4
    ? `STK nhận: •••• ${transaction.counterpartyAccountLast4}`
    : 'Không đọc được STK nhận';
  const result = await sendTelegramMessage(
    token,
    chatId,
    [
      '<b>Cần phân loại giao dịch</b>',
      `💸 ${Math.abs(transaction.amount).toLocaleString('vi-VN')}đ`,
      `🏦 ${accountText}`,
      `📝 ${escapeHtml(transaction.note || 'Không có nội dung')}`,
      '',
      transaction.counterpartyAccountKey
        ? 'Bấm nút hoặc reply tin nhắn này bằng tên danh mục. Lựa chọn sẽ được nhớ cho đúng STK này ở các lần sau.'
        : 'Không có STK để học rule; lựa chọn chỉ áp dụng cho giao dịch này.',
    ].join('\n'),
    { inline_keyboard: rows },
  );
  return result.message_id;
}
