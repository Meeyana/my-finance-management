import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVietnameseFinanceEmail } from './parser.js';
import type { GmailMessage } from './types.js';

function message(subject: string, body: string): GmailMessage {
  return {
    id: 'mail-1',
    internalDate: String(new Date(2026, 7, 11, 10, 30).getTime()),
    payload: {
      mimeType: 'multipart/alternative',
      headers: [{ name: 'Subject', value: subject }],
      parts: [{ mimeType: 'text/plain', body: { data: Buffer.from(body).toString('base64url') } }],
    },
  };
}

test('parses an outgoing transfer and extracts destination account', () => {
  const parsed = parseVietnameseFinanceEmail(message('Thông báo chuyển khoản', [
    'Từ tài khoản: ****1234',
    'Đến tài khoản: 0123456789',
    'Số tiền: 250.000 VND',
    'Nội dung: TIEN AN TRUA',
    'Thời gian: 11/08/2026 12:01',
  ].join('\n')));
  assert.ok(parsed);
  assert.equal(parsed.amount, 250_000);
  assert.equal(parsed.kind, 'pending_transfer');
  assert.equal(parsed.sourceAccountLast4, '1234');
  assert.equal(parsed.counterpartyAccount, '0123456789');
  assert.equal(parsed.date, '2026-08-11');
});

test('recognizes credit card payment so it is not counted as another expense', () => {
  const parsed = parseVietnameseFinanceEmail(message('Thanh toán dư nợ thẻ tín dụng', [
    'Từ tài khoản: ****1234',
    'Thẻ tín dụng: ****9988',
    'Số tiền: 3.500.000 VND',
    'Ngày: 11/08/2026 09:00',
  ].join('\n')));
  assert.ok(parsed);
  assert.equal(parsed.kind, 'credit_payment');
  assert.equal(parsed.amount, 3_500_000);
  assert.equal(parsed.sourceAccountLast4, '9988');
});

test('parses a VIB credit card purchase and matches the card last four digits', () => {
  const parsed = parseVietnameseFinanceEmail(message('Thông báo giao dịch thẻ VIB', `
    Thông báo giao dịch thẻ VIB
    Thẻ: **** 6789
    Số tiền giao dịch: VND 245,000
    Thời gian: 11/08/2026 09:15:00
    Đơn vị chấp nhận thẻ: GRAB HANOI VN
  `));

  assert.ok(parsed);
  assert.equal(parsed.kind, 'expense');
  assert.equal(parsed.amount, 245000);
  assert.equal(parsed.sourceAccountLast4, '6789');
  assert.equal(parsed.merchant, 'GRAB HANOI VN');
});
