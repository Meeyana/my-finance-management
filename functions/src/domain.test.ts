import assert from 'node:assert/strict';
import test from 'node:test';
import { accountRuleKey, applyCategoryRule, creditImpact, expenseImpact, normalizeAccountNumber } from './domain.js';

test('account rule key is stable for equivalent account formatting', () => {
  const secret = 'test-secret-at-least-long-enough';
  assert.equal(normalizeAccountNumber('0123 456-789'), '0123456789');
  assert.equal(accountRuleKey('0123 456-789', secret), accountRuleKey('0123456789', secret));
  assert.notEqual(accountRuleKey('0123456789', secret), accountRuleKey('0123456788', secret));
});

test('transfers and credit payments do not count as expenses', () => {
  assert.equal(expenseImpact({ amount: 500_000, kind: 'expense', direction: 'out', status: 'posted', date: '2026-08-11' }), 500_000);
  assert.equal(expenseImpact({ amount: 500_000, kind: 'credit_payment', direction: 'out', status: 'posted', date: '2026-08-11' }), 0);
  assert.equal(expenseImpact({ amount: 500_000, kind: 'transfer', direction: 'out', status: 'posted', date: '2026-08-11' }), 0);
});

test('credit balance increases on purchase and decreases on payment/refund', () => {
  assert.equal(creditImpact({ amount: 700_000, kind: 'expense', direction: 'out', status: 'posted', date: '2026-08-11' }, 'credit_card'), 700_000);
  assert.equal(creditImpact({ amount: 500_000, kind: 'credit_payment', direction: 'out', status: 'posted', date: '2026-08-11' }, 'credit_card'), -500_000);
  assert.equal(creditImpact({ amount: 100_000, kind: 'refund', direction: 'in', status: 'posted', date: '2026-08-11' }, 'credit_card'), -100_000);
});

test('a learned destination account rule categorizes the next transfer without prompting', () => {
  assert.deepEqual(applyCategoryRule('pending_transfer', {
    categoryId: 'eating',
    kind: 'expense',
    matchType: 'counterparty_account',
  }), { kind: 'expense', categoryId: 'eating', needsCategory: false });

  assert.deepEqual(applyCategoryRule('pending_transfer', {
    kind: 'transfer',
    matchType: 'counterparty_account',
  }), { kind: 'transfer', categoryId: undefined, needsCategory: false });
});
