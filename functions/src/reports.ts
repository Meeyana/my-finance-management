import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { creditImpact, expenseImpact, incomeImpact } from './domain.js';
import { categoryNames, sendTelegramMessage } from './telegram.js';
import { listAccounts, userRoot } from './repository.js';
import type { StoredTransaction } from './types.js';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function buildFinanceReport(uid: string, startDate: string, endDate: string, title: string): Promise<string> {
  const root = userRoot(uid);
  const [transactionSnapshot, allTransactionSnapshot, accounts, categories] = await Promise.all([
    root.collection('transactions').where('date', '>=', startDate).where('date', '<=', endDate).get(),
    root.collection('transactions').get(),
    listAccounts(uid),
    categoryNames(uid),
  ]);
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const transactions = transactionSnapshot.docs
    .map((document) => ({ id: document.id, ...document.data() } as StoredTransaction))
    .filter((transaction) => !transaction.accountId || accountsById.get(transaction.accountId)?.includeInReports !== false);

  const spent = transactions.reduce((sum, transaction) => sum + expenseImpact(transaction), 0);
  const income = transactions.reduce((sum, transaction) => sum + incomeImpact(transaction), 0);
  const pending = transactions.filter((transaction) => transaction.status === 'pending_category').length;
  const categoryTotals = new Map<string, number>();
  for (const transaction of transactions) {
    const impact = expenseImpact(transaction);
    if (impact <= 0) continue;
    const category = transaction.category || 'other';
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + impact);
  }
  const topCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  let creditOutstanding = 0;
  for (const document of allTransactionSnapshot.docs) {
    const transaction = { id: document.id, ...document.data() } as StoredTransaction;
    const account = transaction.accountId ? accountsById.get(transaction.accountId) : undefined;
    if (account?.includeInReports === false) continue;
    creditOutstanding += creditImpact(transaction, account?.type);
  }

  const lines = [
    `<b>${escapeHtml(title)}</b>`,
    `<i>${startDate === endDate ? startDate : `${startDate} → ${endDate}`}</i>`,
    '',
    `💸 Chi tiêu: <b>${spent.toLocaleString('vi-VN')}đ</b>`,
    `💰 Thu nhập: <b>${income.toLocaleString('vi-VN')}đ</b>`,
    `📊 Dòng tiền: <b>${(income - spent).toLocaleString('vi-VN')}đ</b>`,
    `💳 Dư nợ thẻ ước tính: <b>${Math.max(0, creditOutstanding).toLocaleString('vi-VN')}đ</b>`,
  ];
  if (topCategories.length) {
    lines.push('', '<b>Top danh mục</b>');
    topCategories.forEach(([categoryId, total], index) => {
      lines.push(`${index + 1}. ${escapeHtml(categories[categoryId] || categoryId)}: ${total.toLocaleString('vi-VN')}đ`);
    });
  }
  if (pending > 0) lines.push('', `⚠️ Còn <b>${pending}</b> giao dịch chờ phân loại.`);
  return lines.join('\n');
}

export async function sendReportOnce(
  uid: string,
  runId: string,
  token: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  const db = getFirestore();
  const runRef = userRoot(uid).collection('automation_runs').doc(runId);
  const shouldSend = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(runRef);
    const data = snapshot.data();
    if (data?.status === 'complete') return false;
    const startedAt = data?.startedAt as Timestamp | undefined;
    if (data?.status === 'sending' && startedAt && Date.now() - startedAt.toMillis() < 15 * 60 * 1000) return false;
    transaction.set(runRef, { status: 'sending', startedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!shouldSend) return false;

  try {
    await sendTelegramMessage(token, chatId, text);
    await runRef.set({ status: 'complete', completedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  } catch (error) {
    await runRef.set({ status: 'failed', error: error instanceof Error ? error.message : String(error) }, { merge: true });
    throw error;
  }
}
