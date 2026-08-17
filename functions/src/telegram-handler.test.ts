import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCounterpartyRuleCommand, parseNoteRuleCommand, parseTelegramReply } from './telegram-handler.js';

const categories = {
  eating: 'Ăn uống',
  shopping: 'Mua sắm',
};

test('accepts a Vietnamese category label in a Telegram reply', () => {
  assert.deepEqual(parseTelegramReply('Ăn uống', categories), { type: 'category', categoryId: 'eating' });
});

test('accepts category id and special reply actions', () => {
  assert.deepEqual(parseTelegramReply('shopping', categories), { type: 'category', categoryId: 'shopping' });
  assert.deepEqual(parseTelegramReply('Chuyển nội bộ', categories), { type: 'internal' });
  assert.deepEqual(parseTelegramReply('Bỏ qua', categories), { type: 'ignore' });
  assert.deepEqual(parseTelegramReply('không biết', categories), { type: 'unknown' });
});

test('parses Telegram commands for the counterparty ignore list', () => {
  assert.deepEqual(parseCounterpartyRuleCommand('/ignore_stk 0123-456-789'), {
    type: 'ignore',
    accountNumber: '0123456789',
  });
  assert.deepEqual(parseCounterpartyRuleCommand('/unignore_stk 0123456789'), {
    type: 'allow',
    accountNumber: '0123456789',
  });
  assert.equal(parseCounterpartyRuleCommand('/ignore_stk 12345'), null);
});

test('parses Telegram commands for custom note keyword rules', () => {
  const categories = { eating: 'Ăn uống', entertainment: 'Giải trí' };
  assert.deepEqual(parseNoteRuleCommand('/rule cam -> ăn uống', categories), {
    type: 'set',
    term: 'cam',
    categoryId: 'eating',
  });
  assert.deepEqual(parseNoteRuleCommand('/rule TD = Giải trí', categories), {
    type: 'set',
    term: 'TD',
    categoryId: 'entertainment',
  });
  assert.deepEqual(parseNoteRuleCommand('/unrule cam', categories), { type: 'delete', term: 'cam' });
  assert.equal(parseNoteRuleCommand('/rule cam -> unknown', categories)?.type, 'invalid');
});
