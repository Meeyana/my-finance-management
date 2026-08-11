import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTelegramReply } from './telegram-handler.js';

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
