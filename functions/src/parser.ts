import { dateKeyInTimeZone, merchantRuleKey, normalizeText } from './domain.js';
import type { GmailMessage, GmailPayload, ParsedEmailTransaction, TransactionKind } from './types.js';

function decodeBase64Url(value?: string): string {
  if (!value) return '';
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"');
}

function collectBody(payload?: GmailPayload): string[] {
  if (!payload) return [];
  const own = decodeBase64Url(payload.body?.data);
  const values = own ? [payload.mimeType === 'text/html' ? stripHtml(own) : own] : [];
  return values.concat((payload.parts || []).flatMap(collectBody));
}

export function extractMessageText(message: GmailMessage): string {
  const subject = message.payload?.headers?.find((header) => header.name.toLowerCase() === 'subject')?.value || '';
  return [subject, message.snippet || '', ...collectBody(message.payload)]
    .join('\n')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseAmount(text: string): number | null {
  const patterns = [
    /(?:so tien|gia tri giao dich|transaction amount|amount|tong tien)\s*[:\-]?\s*([+\-]?[\d.,\s]{3,})\s*(?:vnd|dong|d)/i,
    /([+\-]?[\d][\d.,\s]{2,})\s*(?:vnd|dong|d)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const digits = match[1].replace(/\D/g, '');
    const amount = Number(digits);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return null;
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function parseOccurredAt(text: string, fallback: Date): Date {
  const match = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return fallback;
  const date = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
    Number(match[4] || 12),
    Number(match[5] || 0),
    Number(match[6] || 0),
  );
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function classify(normalized: string): { kind: TransactionKind; direction: 'in' | 'out' } {
  if (/hoan tien|refund|reversal/.test(normalized)) return { kind: 'refund', direction: 'in' };
  if (/thanh toan du no|thanh toan the tin dung|credit card payment|payment received/.test(normalized)) {
    return { kind: 'credit_payment', direction: 'out' };
  }
  if (/phi thuong nien|phi giao dich|lai suat|tien lai|interest charge|fee/.test(normalized)) {
    return { kind: 'fee', direction: 'out' };
  }
  if (/ghi co|nhan tien|credited|tien vao|bao co/.test(normalized)) return { kind: 'income', direction: 'in' };
  if (/chuyen khoan|chuyen tien|transfer|ghi no|debit/.test(normalized)) {
    return { kind: 'pending_transfer', direction: 'out' };
  }
  return { kind: 'expense', direction: 'out' };
}

export function parseVietnameseFinanceEmail(message: GmailMessage): ParsedEmailTransaction | null {
  const rawText = extractMessageText(message);
  const normalized = normalizeText(rawText);
  const amount = parseAmount(normalized);
  if (!amount) return null;

  const classification = classify(normalized);

  const sourceAccount = firstMatch(normalized, [
    /(?:tai khoan nguon|tu tai khoan|so tai khoan|stk|the)\s*[:\-]?\s*(?:x+|\*+)?\s*([0-9]{4,20})/i,
    /(?:account|card)\s*[:\-]?\s*(?:x+|\*+)?\s*([0-9]{4,20})/i,
  ]);
  const counterpartyAccount = firstMatch(normalized, [
    /(?:tai khoan nhan|den tai khoan|den stk|stk nhan|beneficiary account|destination account)\s*[:\-]?\s*([0-9]{6,24})/i,
  ]);
  const creditCardLast4 = firstMatch(normalized, [
    /(?:the tin dung|credit card|card number)\s*[:\-]?\s*(?:x+|\*+)?\s*([0-9]{4,20})/i,
  ])?.slice(-4);
  const merchant = firstMatch(rawText, [
    /(?:Nội dung|Nội dung giao dịch|Mô tả|Merchant|Đơn vị chấp nhận thẻ)\s*[:\-]\s*([^\n]{2,120})/i,
  ]);
  const fallbackDate = message.internalDate ? new Date(Number(message.internalDate)) : new Date();
  const occurredAt = parseOccurredAt(rawText, fallbackDate);

  return {
    amount,
    currency: 'VND',
    occurredAt,
    date: dateKeyInTimeZone(occurredAt),
    ...classification,
    note: merchant || message.snippet || 'Giao dịch nhập từ Gmail',
    merchant,
    merchantKey: merchant ? merchantRuleKey(merchant) : undefined,
    sourceAccountLast4: classification.kind === 'credit_payment'
      ? creditCardLast4 || sourceAccount?.slice(-4)
      : sourceAccount?.slice(-4),
    counterpartyAccount,
    counterpartyAccountLast4: counterpartyAccount?.slice(-4),
    confidence: counterpartyAccount || merchant ? 0.85 : 0.55,
  };
}
