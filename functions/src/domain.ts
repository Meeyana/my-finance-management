import { createHmac } from 'node:crypto';
import type { CategoryRule, StoredTransaction, TransactionKind } from './types.js';

export const DEFAULT_CATEGORIES: Record<string, string> = {
  eating: 'Ăn uống',
  investment: 'Đầu tư',
  entertainment: 'Giải trí',
  learning: 'Học tập',
  living: 'Nhà cửa',
  fuel: 'Đi lại',
  shopping: 'Mua sắm',
  other: 'Khác',
};

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeAccountNumber(value: string): string {
  return value.replace(/[^0-9a-z]/gi, '').toUpperCase();
}

export function accountRuleKey(accountNumber: string, secret: string): string {
  const normalized = normalizeAccountNumber(accountNumber);
  if (normalized.length < 6) throw new Error('Counterparty account number is too short');
  return createHmac('sha256', secret).update(normalized).digest('base64url');
}

export function merchantRuleKey(merchant: string): string {
  return createHmac('sha256', 'merchant-key-v1').update(normalizeText(merchant)).digest('base64url');
}

export function expenseImpact(transaction: StoredTransaction): number {
  if (transaction.status === 'ignored') return 0;
  const amount = Math.abs(Number(transaction.amount) || 0);
  if (transaction.kind === 'expense' || transaction.kind === 'fee') return amount;
  if (transaction.kind === 'refund') return -amount;
  return 0;
}

export function incomeImpact(transaction: StoredTransaction): number {
  if (transaction.status === 'ignored') return 0;
  return transaction.kind === 'income' ? Math.abs(Number(transaction.amount) || 0) : 0;
}

export function creditImpact(transaction: StoredTransaction, accountType?: string): number {
  if (accountType !== 'credit_card' || transaction.status === 'ignored') return 0;
  const amount = Math.abs(Number(transaction.amount) || 0);
  const additions: TransactionKind[] = ['expense', 'fee'];
  if (additions.includes(transaction.kind)) return amount;
  if (transaction.kind === 'refund' || transaction.kind === 'credit_payment') return -amount;
  return 0;
}

export function dateKeyInTimeZone(date: Date, timeZone = 'Asia/Ho_Chi_Minh'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function maskAccount(accountNumber?: string): string | undefined {
  if (!accountNumber) return undefined;
  const normalized = normalizeAccountNumber(accountNumber);
  return normalized.length >= 4 ? normalized.slice(-4) : undefined;
}

export function applyCategoryRule(
  parsedKind: TransactionKind,
  rule: CategoryRule | null,
): { kind: TransactionKind; categoryId?: string; needsCategory: boolean } {
  let kind = rule?.kind || parsedKind;
  const categoryId = rule?.categoryId;
  if (categoryId && kind === 'pending_transfer') kind = 'expense';
  const needsCategory = (kind === 'expense' || kind === 'pending_transfer' || kind === 'fee') && !categoryId;
  return { kind, categoryId, needsCategory };
}
