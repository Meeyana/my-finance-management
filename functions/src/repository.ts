import { FieldValue, Timestamp, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { accountRuleKey, applyCategoryRule } from './domain.js';
import type {
  CategoryRule,
  FinanceAccount,
  ParsedEmailTransaction,
  StoredTransaction,
  TransactionKind,
} from './types.js';

const APP_ID = 'quan-ly-chi-tieu-personal';

export function userRoot(uid: string): DocumentReference {
  return getFirestore().doc(`artifacts/${APP_ID}/users/${uid}`);
}

export async function listAccounts(uid: string): Promise<FinanceAccount[]> {
  const snapshot = await userRoot(uid).collection('accounts').get();
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as FinanceAccount));
}

export async function findTrackedAccount(uid: string, sourceLast4?: string): Promise<FinanceAccount | null> {
  if (!sourceLast4) return null;
  const accounts = await listAccounts(uid);
  return accounts.find((account) => account.last4 === sourceLast4 && account.ingestEnabled !== false) || null;
}

export async function getCategoryRule(uid: string, key?: string): Promise<CategoryRule | null> {
  if (!key) return null;
  const snapshot = await userRoot(uid).collection('category_rules').doc(key).get();
  return snapshot.exists ? snapshot.data() as CategoryRule : null;
}

export async function hasProcessedEmail(uid: string, messageId: string): Promise<boolean> {
  const safeMessageId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const snapshot = await userRoot(uid).collection('gmail_events').doc(safeMessageId).get();
  return snapshot.data()?.status === 'processed';
}

interface StoreEmailInput {
  uid: string;
  messageId: string;
  parsed: ParsedEmailTransaction;
  account: FinanceAccount;
  accountHmacSecret: string;
  parserVersion: string;
}

export async function storeEmailTransaction(input: StoreEmailInput): Promise<{ created: boolean; transaction: StoredTransaction }> {
  const db = getFirestore();
  const root = userRoot(input.uid);
  const safeMessageId = input.messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const transactionId = `gmail_${safeMessageId}`;
  const transactionRef = root.collection('transactions').doc(transactionId);
  const eventRef = root.collection('gmail_events').doc(safeMessageId);

  const counterpartyAccountKey = input.parsed.counterpartyAccount
    ? accountRuleKey(input.parsed.counterpartyAccount, input.accountHmacSecret)
    : undefined;
  const ruleKey = counterpartyAccountKey || input.parsed.merchantKey;
  const rule = await getCategoryRule(input.uid, ruleKey);

  const resolved = applyCategoryRule(input.parsed.kind, rule);
  const kind: TransactionKind = resolved.kind;
  const category = resolved.categoryId;
  const needsCategory = resolved.needsCategory;

  const rawTransaction: StoredTransaction & Record<string, unknown> = {
    amount: input.parsed.amount,
    currency: input.parsed.currency,
    occurredAt: Timestamp.fromDate(input.parsed.occurredAt),
    date: input.parsed.date,
    direction: input.parsed.direction,
    kind,
    status: needsCategory ? 'pending_category' : 'posted',
    category: category || (kind === 'fee' ? 'other' : undefined),
    accountId: input.account.id,
    note: input.parsed.note,
    merchant: input.parsed.merchant,
    merchantKey: input.parsed.merchantKey,
    counterpartyAccountKey,
    counterpartyAccountLast4: input.parsed.counterpartyAccountLast4,
    source: 'gmail',
    sourceRef: input.messageId,
    parserVersion: input.parserVersion,
    confidence: input.parsed.confidence,
    createdAt: FieldValue.serverTimestamp(),
  };
  const transaction = Object.fromEntries(
    Object.entries(rawTransaction).filter(([, value]) => value !== undefined),
  ) as StoredTransaction & Record<string, unknown>;

  const created = await db.runTransaction(async (firestoreTransaction) => {
    const [existingTransaction, existingEvent] = await Promise.all([
      firestoreTransaction.get(transactionRef),
      firestoreTransaction.get(eventRef),
    ]);
    if (existingTransaction.exists || existingEvent.data()?.status === 'processed') return false;
    firestoreTransaction.create(transactionRef, transaction);
    firestoreTransaction.set(eventRef, {
      status: 'processed',
      transactionId,
      parserVersion: input.parserVersion,
      processedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });

  return { created, transaction: { id: transactionId, ...transaction } as StoredTransaction };
}

export async function recordSkippedEmail(uid: string, messageId: string, status: string, details?: Record<string, unknown>): Promise<void> {
  const safeMessageId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ref = userRoot(uid).collection('gmail_events').doc(safeMessageId);
  await ref.set({ status, ...details, processedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function classifyTransaction(
  uid: string,
  transactionId: string,
  action: { categoryId?: string; kind?: TransactionKind; ignore?: boolean },
): Promise<StoredTransaction> {
  const db = getFirestore();
  const root = userRoot(uid);
  const transactionRef = root.collection('transactions').doc(transactionId);

  return db.runTransaction(async (firestoreTransaction) => {
    const snapshot = await firestoreTransaction.get(transactionRef);
    if (!snapshot.exists) throw new Error('Transaction not found');
    const current = { id: snapshot.id, ...snapshot.data() } as StoredTransaction;
    const kind = action.kind || (current.kind === 'pending_transfer' ? 'expense' : current.kind);
    const updates: Record<string, unknown> = action.ignore
      ? { status: 'ignored', reviewedAt: FieldValue.serverTimestamp() }
      : {
          status: 'posted',
          kind,
          category: action.categoryId || current.category || null,
          reviewedAt: FieldValue.serverTimestamp(),
        };
    firestoreTransaction.update(transactionRef, updates);

    const ruleKey = current.counterpartyAccountKey || current.merchantKey;
    if (!action.ignore && ruleKey) {
      const ruleRef = root.collection('category_rules').doc(ruleKey);
      firestoreTransaction.set(ruleRef, {
        categoryId: action.categoryId || null,
        kind,
        matchType: current.counterpartyAccountKey ? 'counterparty_account' : 'merchant',
        counterpartyAccountLast4: current.counterpartyAccountLast4 || null,
        usageCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return { ...current, ...updates, kind, category: action.categoryId || current.category } as StoredTransaction;
  });
}

export async function findTransactionByTelegramMessageId(
  uid: string,
  telegramMessageId: number,
): Promise<StoredTransaction | null> {
  const snapshot = await userRoot(uid)
    .collection('transactions')
    .where('telegramMessageId', '==', telegramMessageId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const document = snapshot.docs[0];
  return { id: document.id, ...document.data() } as StoredTransaction;
}

export async function listUnnotifiedPendingTransactions(uid: string, limit = 20): Promise<StoredTransaction[]> {
  const snapshot = await userRoot(uid)
    .collection('transactions')
    .where('status', '==', 'pending_category')
    .limit(limit)
    .get();
  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() } as StoredTransaction & { telegramNotifiedAt?: unknown }))
    .filter((transaction) => !transaction.telegramNotifiedAt);
}

export async function markTelegramNotified(uid: string, transactionId: string, messageId: number): Promise<void> {
  await userRoot(uid).collection('transactions').doc(transactionId).update({
    telegramMessageId: messageId,
    telegramNotifiedAt: FieldValue.serverTimestamp(),
  });
}
