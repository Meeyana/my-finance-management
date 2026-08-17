import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { accountRuleKey, applyCategoryRule, maskAccount, matchCategoryKeyword } from './domain.js';
import type {
  CategoryRule,
  FinanceAccount,
  ParsedFinanceTransaction,
  NoteKeywordRule,
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

export async function getIngestionIgnoreReason(
  uid: string,
  parsed: ParsedFinanceTransaction,
  accountHmacSecret: string,
): Promise<'credit_payment' | 'counterparty_account_rule' | 'merchant_rule' | undefined> {
  if (parsed.kind === 'credit_payment') return 'credit_payment';

  const counterpartyAccountKey = parsed.counterpartyAccount
    ? accountRuleKey(parsed.counterpartyAccount, accountHmacSecret)
    : undefined;
  const rule = await getCategoryRule(uid, counterpartyAccountKey || parsed.merchantKey);
  if (!rule?.ignore) return undefined;
  return counterpartyAccountKey ? 'counterparty_account_rule' : 'merchant_rule';
}

export async function setCounterpartyIgnoreRule(
  uid: string,
  accountNumber: string,
  accountHmacSecret: string,
  ignore: boolean,
): Promise<string | undefined> {
  const key = accountRuleKey(accountNumber, accountHmacSecret);
  await userRoot(uid).collection('category_rules').doc(key).set({
    ignore,
    matchType: 'counterparty_account',
    counterpartyAccountLast4: maskAccount(accountNumber) || null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return maskAccount(accountNumber);
}

function noteKeywordRulesRef(uid: string): DocumentReference {
  return userRoot(uid).collection('settings').doc('note_rules');
}

export async function getNoteKeywordRules(uid: string): Promise<NoteKeywordRule[]> {
  const snapshot = await noteKeywordRulesRef(uid).get();
  const rules = snapshot.data()?.rules;
  if (!rules || typeof rules !== 'object') return [];
  return Object.values(rules).filter((value): value is NoteKeywordRule => Boolean(
    value && typeof value === 'object'
      && typeof (value as NoteKeywordRule).term === 'string'
      && typeof (value as NoteKeywordRule).categoryId === 'string',
  ));
}

export async function setNoteKeywordRule(uid: string, term: string, categoryId: string): Promise<NoteKeywordRule> {
  const normalizedTerm = term.trim();
  if (!normalizedTerm) throw new Error('Keyword is required');
  const rules = await getNoteKeywordRules(uid);
  const nextRule: NoteKeywordRule = { term: normalizedTerm, categoryId, updatedAt: new Date().toISOString() };
  const nextRules = Object.fromEntries([
    ...rules.filter((rule) => rule.term.toLowerCase() !== normalizedTerm.toLowerCase()).map((rule) => [rule.term, rule]),
    [normalizedTerm, nextRule],
  ]);
  await noteKeywordRulesRef(uid).set({ rules: nextRules, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return nextRule;
}

export async function deleteNoteKeywordRule(uid: string, term: string): Promise<boolean> {
  const rules = await getNoteKeywordRules(uid);
  const nextRules = Object.fromEntries(
    rules.filter((rule) => rule.term.toLowerCase() !== term.trim().toLowerCase()).map((rule) => [rule.term, rule]),
  );
  const changed = nextRules && Object.keys(nextRules).length !== rules.length;
  if (changed) await noteKeywordRulesRef(uid).set({ rules: nextRules, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return changed;
}

export function safeIngestionId(sourceRef: string): string {
  return createHash('sha256').update(sourceRef.trim()).digest('hex');
}

export function telegramActionToken(transactionId: string): string {
  return createHash('sha256').update(`telegram-action:${transactionId}`).digest('hex').slice(0, 24);
}

export async function hasProcessedIngestion(uid: string, sourceRef: string): Promise<boolean> {
  const safeSourceRef = safeIngestionId(sourceRef);
  const snapshot = await userRoot(uid).collection('ingestion_events').doc(safeSourceRef).get();
  return snapshot.data()?.status === 'processed';
}

interface StoreIngestionInput {
  uid: string;
  sourceRef: string;
  parsed: ParsedFinanceTransaction;
  account: FinanceAccount;
  accountHmacSecret: string;
  parserVersion: string;
}

export async function storeIngestedTransaction(input: StoreIngestionInput): Promise<{ created: boolean; transaction: StoredTransaction }> {
  const db = getFirestore();
  const root = userRoot(input.uid);
  const safeSourceRef = safeIngestionId(input.sourceRef);
  const transactionId = `n8n_${safeSourceRef}`;
  const transactionRef = root.collection('transactions').doc(transactionId);
  const eventRef = root.collection('ingestion_events').doc(safeSourceRef);

  const counterpartyAccountKey = input.parsed.counterpartyAccount
    ? accountRuleKey(input.parsed.counterpartyAccount, input.accountHmacSecret)
    : undefined;
  const ruleKey = counterpartyAccountKey || input.parsed.merchantKey;
  const rule = await getCategoryRule(input.uid, ruleKey);
  const customKeywordRules = await getNoteKeywordRules(input.uid);
  const keywordMatch = matchCategoryKeyword(input.parsed.note || input.parsed.merchant, customKeywordRules);

  const resolved = applyCategoryRule(input.parsed.kind, rule, keywordMatch?.categoryId);
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
    note: keywordMatch?.term || input.parsed.note,
    merchant: input.parsed.merchant,
    merchantKey: input.parsed.merchantKey,
    counterpartyAccountKey,
    counterpartyAccountLast4: input.parsed.counterpartyAccountLast4,
    source: 'n8n',
    sourceRef: input.sourceRef,
    parserVersion: input.parserVersion,
    confidence: input.parsed.confidence,
    createdAt: FieldValue.serverTimestamp(),
  };
  const transaction = Object.fromEntries(
    Object.entries(rawTransaction).filter(([, value]) => value !== undefined),
  ) as StoredTransaction & Record<string, unknown>;

  let storedTransaction: StoredTransaction | undefined;
  const created = await db.runTransaction(async (firestoreTransaction) => {
    const [existingTransaction, existingEvent] = await Promise.all([
      firestoreTransaction.get(transactionRef),
      firestoreTransaction.get(eventRef),
    ]);
    if (existingTransaction.exists || existingEvent.data()?.status === 'processed') {
      storedTransaction = {
        id: transactionId,
        ...(existingTransaction.data() || transaction),
      } as StoredTransaction;
      return false;
    }
    firestoreTransaction.create(transactionRef, transaction);
    firestoreTransaction.set(eventRef, {
      status: 'processed',
      transactionId,
      parserVersion: input.parserVersion,
      processedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    storedTransaction = { id: transactionId, ...transaction } as StoredTransaction;
    return true;
  });

  return { created, transaction: storedTransaction || { id: transactionId, ...transaction } as StoredTransaction };
}

export async function recordSkippedIngestion(uid: string, sourceRef: string, status: string, details?: Record<string, unknown>): Promise<void> {
  const safeSourceRef = safeIngestionId(sourceRef);
  const ref = userRoot(uid).collection('ingestion_events').doc(safeSourceRef);
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
    if (ruleKey) {
      const ruleRef = root.collection('category_rules').doc(ruleKey);
      if (action.ignore) {
        firestoreTransaction.set(ruleRef, {
          ignore: true,
          matchType: current.counterpartyAccountKey ? 'counterparty_account' : 'merchant',
          counterpartyAccountLast4: current.counterpartyAccountLast4 || null,
          usageCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      } else {
        firestoreTransaction.set(ruleRef, {
          ignore: false,
          categoryId: action.categoryId || null,
          kind,
          matchType: current.counterpartyAccountKey ? 'counterparty_account' : 'merchant',
          counterpartyAccountLast4: current.counterpartyAccountLast4 || null,
          usageCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
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

export async function ensureTelegramActionToken(uid: string, transactionId: string): Promise<string> {
  const token = telegramActionToken(transactionId);
  await userRoot(uid).collection('transactions').doc(transactionId).set({
    telegramActionToken: token,
  }, { merge: true });
  return token;
}

export async function findTransactionByTelegramActionToken(
  uid: string,
  token: string,
): Promise<StoredTransaction | null> {
  const snapshot = await userRoot(uid)
    .collection('transactions')
    .where('telegramActionToken', '==', token)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const document = snapshot.docs[0];
  return { id: document.id, ...document.data() } as StoredTransaction;
}
