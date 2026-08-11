export const TRANSACTION_KIND = Object.freeze({
  EXPENSE: 'expense',
  INCOME: 'income',
  TRANSFER: 'transfer',
  PENDING_TRANSFER: 'pending_transfer',
  CREDIT_PAYMENT: 'credit_payment',
  REFUND: 'refund',
  FEE: 'fee',
});

export const TRANSACTION_KIND_LABELS = Object.freeze({
  [TRANSACTION_KIND.EXPENSE]: 'Chi tiêu',
  [TRANSACTION_KIND.INCOME]: 'Thu nhập',
  [TRANSACTION_KIND.TRANSFER]: 'Chuyển nội bộ',
  [TRANSACTION_KIND.PENDING_TRANSFER]: 'Chờ phân loại',
  [TRANSACTION_KIND.CREDIT_PAYMENT]: 'Thanh toán thẻ',
  [TRANSACTION_KIND.REFUND]: 'Hoàn tiền',
  [TRANSACTION_KIND.FEE]: 'Phí / lãi',
});

export const getTransactionKind = (transaction) =>
  transaction.kind || TRANSACTION_KIND.EXPENSE;

export const isAccountIncluded = (transaction, accountsById) => {
  if (!transaction.accountId) return true;
  const account = accountsById.get(transaction.accountId);
  return !account || account.includeInReports !== false;
};

export const getExpenseImpact = (transaction, accountsById = new Map()) => {
  if (transaction.status === 'ignored' || !isAccountIncluded(transaction, accountsById)) return 0;

  const amount = Math.abs(Number(transaction.amount) || 0);
  switch (getTransactionKind(transaction)) {
    case TRANSACTION_KIND.EXPENSE:
    case TRANSACTION_KIND.FEE:
      return amount;
    case TRANSACTION_KIND.REFUND:
      return -amount;
    default:
      return 0;
  }
};

export const getIncomeImpact = (transaction, accountsById = new Map()) => {
  if (transaction.status === 'ignored' || !isAccountIncluded(transaction, accountsById)) return 0;
  return getTransactionKind(transaction) === TRANSACTION_KIND.INCOME
    ? Math.abs(Number(transaction.amount) || 0)
    : 0;
};

export const withTransactionDefaults = (transaction) => {
  const kind = getTransactionKind(transaction);
  return {
    source: 'manual',
    status: 'posted',
    direction: kind === TRANSACTION_KIND.INCOME ? 'in' : 'out',
    ...transaction,
    kind,
    amount: Math.abs(Number(transaction.amount) || 0),
  };
};
