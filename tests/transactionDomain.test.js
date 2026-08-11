import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getExpenseImpact,
  getIncomeImpact,
  TRANSACTION_KIND,
  withTransactionDefaults,
} from '../src/features/finance/transactionDomain.js';

test('legacy transactions remain expenses after migration', () => {
  assert.equal(getExpenseImpact({ amount: 125_000, status: 'posted' }), 125_000);
});

test('income, internal transfer and credit payment are not expenses', () => {
  assert.equal(getExpenseImpact({ amount: 500_000, kind: TRANSACTION_KIND.INCOME }), 0);
  assert.equal(getExpenseImpact({ amount: 500_000, kind: TRANSACTION_KIND.TRANSFER }), 0);
  assert.equal(getExpenseImpact({ amount: 500_000, kind: TRANSACTION_KIND.CREDIT_PAYMENT }), 0);
  assert.equal(getIncomeImpact({ amount: 500_000, kind: TRANSACTION_KIND.INCOME }), 500_000);
});

test('an account excluded from reports has no financial impact', () => {
  const accounts = new Map([['account-1', { includeInReports: false }]]);
  assert.equal(getExpenseImpact({ amount: 99_000, kind: TRANSACTION_KIND.EXPENSE, accountId: 'account-1' }, accounts), 0);
});

test('manual transaction defaults are normalized', () => {
  assert.deepEqual(withTransactionDefaults({ amount: '-250000', kind: TRANSACTION_KIND.INCOME }), {
    source: 'manual',
    status: 'posted',
    direction: 'in',
    amount: 250_000,
    kind: TRANSACTION_KIND.INCOME,
  });
});
