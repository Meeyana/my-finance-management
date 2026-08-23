import assert from 'node:assert/strict';
import test from 'node:test';
import { accountRuleKey, applyCategoryRule, creditImpact, expenseImpact, matchCategoryKeyword, normalizeAccountNumber } from './domain.js';

test('account rule key is stable for equivalent account formatting', () => {
  const secret = 'test-secret-at-least-long-enough';
  assert.equal(normalizeAccountNumber('0123 456-789'), '0123456789');
  assert.equal(accountRuleKey('0123 456-789', secret), accountRuleKey('0123456789', secret));
  assert.notEqual(accountRuleKey('0123456789', secret), accountRuleKey('0123456788', secret));
  assert.equal(accountRuleKey('vqrqakdqq0814', secret), accountRuleKey('VQRQ-AKDQQ-0814', secret));
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

test('matches the longest prepared keyword and returns the canonical category', () => {
  assert.deepEqual(matchCategoryKeyword('CK mua do dung thang 8'), {
    term: 'Mua đồ dùng',
    categoryId: 'shopping',
  });
  assert.deepEqual(matchCategoryKeyword('chuyen tien tiet kiem va mua crypto'), {
    term: 'Tiết kiệm và mua crypto',
    categoryId: 'investment',
  });
});

test('promotes a keyword-matched transfer to a posted expense', () => {
  assert.deepEqual(applyCategoryRule('pending_transfer', null, 'living'), {
    kind: 'expense',
    categoryId: 'living',
    needsCategory: false,
  });
});

test('custom keyword rules take precedence and match token boundaries', () => {
  assert.deepEqual(matchCategoryKeyword('Thanh toán TD tháng này', [{ term: 'TD', categoryId: 'entertainment' }]), {
    term: 'TD',
    categoryId: 'entertainment',
  });
  assert.equal(matchCategoryKeyword('thanh toan tdd', [{ term: 'TD', categoryId: 'entertainment' }]), undefined);
});
