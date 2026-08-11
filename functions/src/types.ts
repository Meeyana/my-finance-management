export type TransactionKind =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'pending_transfer'
  | 'credit_payment'
  | 'refund'
  | 'fee';

export type TransactionStatus = 'posted' | 'pending_category' | 'ignored';

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayload {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
}

export interface GmailMessage {
  id: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailPayload;
}

export interface ParsedEmailTransaction {
  amount: number;
  currency: string;
  occurredAt: Date;
  date: string;
  direction: 'in' | 'out';
  kind: TransactionKind;
  note: string;
  merchant?: string;
  merchantKey?: string;
  sourceAccountLast4?: string;
  counterpartyAccount?: string;
  counterpartyAccountLast4?: string;
  institution?: string;
  confidence: number;
}

export interface FinanceAccount {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'cash';
  institution?: string;
  last4: string;
  ingestEnabled?: boolean;
  includeInReports?: boolean;
}

export interface CategoryRule {
  categoryId?: string;
  kind?: TransactionKind;
  matchType: 'counterparty_account' | 'merchant';
}

export interface StoredTransaction {
  id?: string;
  amount: number;
  currency?: string;
  date: string;
  kind: TransactionKind;
  direction: 'in' | 'out';
  status: TransactionStatus;
  category?: string;
  note?: string;
  accountId?: string;
  counterpartyAccountKey?: string;
  counterpartyAccountLast4?: string;
  merchantKey?: string;
  source?: string;
}
