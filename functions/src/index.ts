import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { dateKeyInTimeZone } from './domain.js';
import { getAccessToken, getGmailMessage, listGmailMessageIds } from './gmail.js';
import { parseVietnameseFinanceEmail } from './parser.js';
import {
  classifyTransaction,
  findTrackedAccount,
  hasProcessedEmail,
  listUnnotifiedPendingTransactions,
  markTelegramNotified,
  recordSkippedEmail,
  storeEmailTransaction,
} from './repository.js';
import { buildFinanceReport, sendReportOnce } from './reports.js';
import {
  answerCallbackQuery,
  categoryNames,
  markTelegramMessageReviewed,
  notifyPendingCategory,
  type TelegramUpdate,
} from './telegram.js';

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });

const AUTOMATION_USER_ID = defineString('AUTOMATION_USER_ID');
const GMAIL_QUERY = defineString('GMAIL_QUERY', { default: 'newer_than:2d' });
const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CLIENT_SECRET');
const GMAIL_REFRESH_TOKEN = defineSecret('GMAIL_REFRESH_TOKEN');
const ACCOUNT_HMAC_SECRET = defineSecret('ACCOUNT_HMAC_SECRET');
const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = defineSecret('TELEGRAM_CHAT_ID');
const TELEGRAM_WEBHOOK_SECRET = defineSecret('TELEGRAM_WEBHOOK_SECRET');
const PARSER_VERSION = 'vi-finance-v1';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const gmailSecrets = [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, ACCOUNT_HMAC_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID];

export const syncGmailTransactions = onSchedule({
  schedule: 'every 10 minutes',
  timeZone: TIME_ZONE,
  secrets: gmailSecrets,
  retryCount: 1,
}, async () => {
  const uid = AUTOMATION_USER_ID.value();
  if (!uid) throw new Error('AUTOMATION_USER_ID is required');
  const accessToken = await getAccessToken({
    clientId: GOOGLE_CLIENT_ID.value(),
    clientSecret: GOOGLE_CLIENT_SECRET.value(),
    refreshToken: GMAIL_REFRESH_TOKEN.value(),
  });
  const messageIds = await listGmailMessageIds(accessToken, GMAIL_QUERY.value());
  let created = 0;

  for (const messageId of messageIds) {
    if (await hasProcessedEmail(uid, messageId)) continue;
    try {
      const message = await getGmailMessage(accessToken, messageId);
      const parsed = parseVietnameseFinanceEmail(message);
      if (!parsed) {
        await recordSkippedEmail(uid, messageId, 'parse_failed', { parserVersion: PARSER_VERSION });
        continue;
      }
      const account = await findTrackedAccount(uid, parsed.sourceAccountLast4);
      if (!account) {
        await recordSkippedEmail(uid, messageId, 'unmatched_or_disabled_account', {
          sourceAccountLast4: parsed.sourceAccountLast4 || null,
          parserVersion: PARSER_VERSION,
        });
        continue;
      }
      const result = await storeEmailTransaction({
        uid,
        messageId,
        parsed,
        account,
        accountHmacSecret: ACCOUNT_HMAC_SECRET.value(),
        parserVersion: PARSER_VERSION,
      });
      if (!result.created) continue;
      created += 1;
    } catch (error) {
      logger.error('Failed to process Gmail message', { messageId, error });
    }
  }

  const pendingNotifications = await listUnnotifiedPendingTransactions(uid);
  for (const transaction of pendingNotifications) {
    try {
      const telegramMessageId = await notifyPendingCategory(
        TELEGRAM_BOT_TOKEN.value(),
        TELEGRAM_CHAT_ID.value(),
        uid,
        transaction,
      );
      if (telegramMessageId && transaction.id) {
        await markTelegramNotified(uid, transaction.id, telegramMessageId);
      }
    } catch (error) {
      logger.error('Failed to deliver pending Telegram classification', { transactionId: transaction.id, error });
    }
  }
  logger.info('Gmail sync completed', { scanned: messageIds.length, created });
});

export const telegramFinanceWebhook = onRequest({
  secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET],
}, async (request, response) => {
  if (request.get('x-telegram-bot-api-secret-token') !== TELEGRAM_WEBHOOK_SECRET.value()) {
    response.status(401).send('Unauthorized');
    return;
  }
  const update = request.body as TelegramUpdate;
  const callback = update.callback_query;
  if (!callback?.data || !callback.message) {
    response.status(200).send('ok');
    return;
  }
  if (String(callback.message.chat.id) !== TELEGRAM_CHAT_ID.value()) {
    response.status(403).send('Wrong chat');
    return;
  }

  try {
    const [action, transactionId, categoryId] = callback.data.split('|');
    const uid = AUTOMATION_USER_ID.value();
    let resultLabel = '';
    if (action === 'cat' && categoryId) {
      const categories = await categoryNames(uid);
      if (!categories[categoryId]) throw new Error('Unknown category');
      const transaction = await classifyTransaction(uid, transactionId, { categoryId });
      resultLabel = transaction.counterpartyAccountKey
        ? `Đã gắn “${categories[categoryId]}” và ghi nhớ rule STK.`
        : `Đã gắn “${categories[categoryId]}” cho giao dịch này.`;
    } else if (action === 'internal') {
      const transaction = await classifyTransaction(uid, transactionId, { kind: 'transfer' });
      resultLabel = transaction.counterpartyAccountKey
        ? 'Đã đánh dấu chuyển nội bộ và ghi nhớ rule STK.'
        : 'Đã đánh dấu chuyển nội bộ.';
    } else if (action === 'ignore') {
      await classifyTransaction(uid, transactionId, { ignore: true });
      resultLabel = 'Đã bỏ qua giao dịch.';
    } else {
      throw new Error('Unsupported callback');
    }
    await answerCallbackQuery(TELEGRAM_BOT_TOKEN.value(), callback.id, resultLabel);
    await markTelegramMessageReviewed(
      TELEGRAM_BOT_TOKEN.value(),
      callback.message.chat.id,
      callback.message.message_id,
      callback.message.text || 'Giao dịch',
      resultLabel,
    );
    response.status(200).send('ok');
  } catch (error) {
    logger.error('Telegram callback failed', error);
    await answerCallbackQuery(TELEGRAM_BOT_TOKEN.value(), callback.id, 'Không thể cập nhật giao dịch.');
    response.status(500).send('error');
  }
});

export const dailyFinanceReport = onSchedule({
  schedule: '0 21 * * *',
  timeZone: TIME_ZONE,
  secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
}, async () => {
  const uid = AUTOMATION_USER_ID.value();
  const date = dateKeyInTimeZone(new Date(), TIME_ZONE);
  const report = await buildFinanceReport(uid, date, date, 'Báo cáo tài chính hôm nay');
  await sendReportOnce(uid, `daily_${date}`, TELEGRAM_BOT_TOKEN.value(), TELEGRAM_CHAT_ID.value(), report);
});

export const weeklyFinanceReport = onSchedule({
  schedule: '30 20 * * 0',
  timeZone: TIME_ZONE,
  secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
}, async () => {
  const uid = AUTOMATION_USER_ID.value();
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startDate = dateKeyInTimeZone(start, TIME_ZONE);
  const endDate = dateKeyInTimeZone(end, TIME_ZONE);
  const report = await buildFinanceReport(uid, startDate, endDate, 'Tổng kết tài chính 7 ngày');
  await sendReportOnce(uid, `weekly_${endDate}`, TELEGRAM_BOT_TOKEN.value(), TELEGRAM_CHAT_ID.value(), report);
});
