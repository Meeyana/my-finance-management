import assert from 'node:assert/strict';
import test from 'node:test';
import { safeIngestionId, telegramActionToken } from './repository.js';

test('ingestion IDs are deterministic and do not collide after punctuation normalization', () => {
  const first = safeIngestionId('gmail:message/123');
  assert.equal(first, safeIngestionId('gmail:message/123'));
  assert.notEqual(first, safeIngestionId('gmail_message_123'));
  assert.match(first, /^[a-f0-9]{64}$/);
});

test('Telegram action tokens stay within Telegram callback data limits', () => {
  const token = telegramActionToken(`n8n_${'a'.repeat(64)}`);
  assert.match(token, /^[a-f0-9]{24}$/);
  assert.ok(`cat|${token}|entertainment`.length <= 64);
});
