import assert from 'node:assert/strict';
import test from 'node:test';
import { parseN8nFinancePayload } from './parser.js';
import type { N8nFinancePayload } from './types.js';

function message(subject: string, body: string): N8nFinancePayload {
  return {
    messageId: 'mail-1',
    receivedAt: new Date(2026, 7, 11, 10, 30).toISOString(),
    subject,
    text: body,
  };
}

test('parses an outgoing transfer and extracts destination account', () => {
  const parsed = parseN8nFinancePayload(message('Thông báo chuyển khoản', [
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
  const parsed = parseN8nFinancePayload(message('Thanh toán dư nợ thẻ tín dụng', [
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

test('recognizes a monthly Mastercard statement payment as a credit payment', () => {
  const parsed = parseN8nFinancePayload(message('Thanh toan sao ke the Master Card 07/2026', [
    'Từ tài khoản: ****1234',
    'Số tiền: 4.420.431 VND',
    'Ngày: 31/07/2026 09:00',
  ].join('\n')));
  assert.ok(parsed);
  assert.equal(parsed.kind, 'credit_payment');
  assert.equal(parsed.amount, 4_420_431);
});

test('parses a VIB credit card purchase and matches the card last four digits', () => {
  const parsed = parseN8nFinancePayload(message('Thông báo giao dịch thẻ VIB', `
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

test('parses a VIB HTML payload delivered by n8n', () => {
  const parsed = parseN8nFinancePayload({
    messageId: 'vib-html-1',
    subject: 'Thông báo giao dịch thẻ VIB',
    html: `
      <table>
        <tr><td>Thẻ</td><td>**** 6789</td></tr>
        <tr><td>Số tiền giao dịch</td><td>350.000 VND</td></tr>
        <tr><td>Ngày giao dịch</td><td>11/08/2026 19:20:00</td></tr>
        <tr><td>Đơn vị chấp nhận thẻ</td><td>SHOPEE VN</td></tr>
      </table>
    `,
  });

  assert.ok(parsed);
  assert.equal(parsed.amount, 350000);
  assert.equal(parsed.sourceAccountLast4, '6789');
  assert.equal(parsed.merchant, 'SHOPEE VN');
});

test('parses a VIB domestic transfer email with đồng symbol and table fields', () => {
  const parsed = parseN8nFinancePayload({
    messageId: 'vib-transfer-html-1',
    subject: 'Chuyển tiền nhanh đến tài khoản ngân hàng nội địa thành công',
    text: [
      'Ngày giao dịch 13:00 17/08/2026',
      'Từ tài khoản 943524970',
      'Đến tài khoản 0811000042065 - PHAN DINH TUAN',
      'Số tiền 2,000 ₫',
      'Diễn giải PHAN ĐÌNH TUẤN chuyen tien den PHAN DINH TUAN - 0811000042065',
      'Hotline:19002200 (1.000 đồng/phút)',
    ].join('\n'),
  });

  assert.ok(parsed);
  assert.equal(parsed.amount, 2_000);
  assert.equal(parsed.sourceAccountLast4, '4970');
  assert.equal(parsed.counterpartyAccount, '0811000042065');
  assert.equal(parsed.counterpartyAccountLast4, '2065');
  assert.equal(parsed.counterpartyDisplay, '0811000042065 - PHAN DINH TUAN');
  assert.match(parsed.note, /PHAN ĐÌNH TUẤN chuyen tien den/);
});

test('parses and learns an alphanumeric VIB recipient identifier', () => {
  const parsed = parseN8nFinancePayload({
    messageId: 'vib-vietqr-transfer-1',
    subject: 'Chuyển tiền nhanh đến tài khoản ngân hàng nội địa thành công',
    text: [
      'Ngày giao dịch 20:38 23/08/2026',
      'Từ tài khoản 943524970',
      'Đến tài khoản VQRQAKDQQ0814 - HO KINH DOANH PHAP UYEN',
      'Tại ngân hàng Quân đội',
      'Số tiền 150,000 ₫',
      'Diễn giải VQRLOAMB20260702153010815',
    ].join('\n'),
  });

  assert.ok(parsed);
  assert.equal(parsed.amount, 150_000);
  assert.equal(parsed.kind, 'pending_transfer');
  assert.equal(parsed.counterpartyAccount, 'VQRQAKDQQ0814');
  assert.equal(parsed.counterpartyAccountLast4, '0814');
  assert.equal(parsed.counterpartyDisplay, 'VQRQAKDQQ0814 - HO KINH DOANH PHAP UYEN');
  assert.equal(parsed.confidence, 0.85);
});
