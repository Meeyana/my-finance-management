import type { Config } from '@netlify/functions';
import { parseN8nFinancePayload } from '../../functions/src/parser.js';
import {
  findTrackedAccount,
  getIngestionIgnoreReason,
  markTelegramNotified,
  recordSkippedIngestion,
  storeIngestedTransaction,
} from '../../functions/src/repository.js';
import { notifyPendingCategory } from '../../functions/src/telegram.js';
import type { N8nFinancePayload } from '../../functions/src/types.js';
import {
  financeRuntimeConfig,
  initializeFinanceAdmin,
  matchesSecret,
  requiredEnv,
} from './_runtime.mjs';

const PARSER_VERSION = 'n8n-vi-finance-v2';
const MAX_BODY_BYTES = 1_000_000;

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function validPayload(value: unknown): value is N8nFinancePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<N8nFinancePayload>;
  return typeof payload.messageId === 'string'
    && payload.messageId.trim().length > 0
    && payload.messageId.length <= 300
    && [payload.html, payload.text, payload.snippet, payload.subject].some(
      (field) => typeof field === 'string' && field.trim().length > 0,
    );
}

export default async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const configuredSecret = process.env.FINANCE_INGEST_SECRET;
  if (!configuredSecret) {
    console.error('Missing required environment variable: FINANCE_INGEST_SECRET');
    return json({ error: 'ingestion_not_configured' }, 503);
  }
  if (!matchesSecret(request.headers.get('x-finance-ingest-secret'), configuredSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);

  try {
    const payload = await request.json() as unknown;
    if (!validPayload(payload)) return json({ error: 'invalid_payload' }, 400);

    initializeFinanceAdmin();
    const runtime = financeRuntimeConfig();
    const parsed = parseN8nFinancePayload(payload);
    if (!parsed) {
      await recordSkippedIngestion(runtime.uid, payload.messageId, 'parse_failed', { parserVersion: PARSER_VERSION });
      return json({ error: 'parse_failed', messageId: payload.messageId }, 422);
    }

    const accountHmacSecret = requiredEnv('ACCOUNT_HMAC_SECRET');
    const ignoreReason = await getIngestionIgnoreReason(runtime.uid, parsed, accountHmacSecret);
    if (ignoreReason) {
      await recordSkippedIngestion(runtime.uid, payload.messageId, 'ignored_rule', {
        reason: ignoreReason,
        parserVersion: PARSER_VERSION,
      });
      return json({
        created: false,
        status: 'ignored',
        reason: ignoreReason,
        telegramNotified: false,
      });
    }

    const account = await findTrackedAccount(runtime.uid, parsed.sourceAccountLast4);
    if (!account) {
      await recordSkippedIngestion(runtime.uid, payload.messageId, 'unmatched_or_disabled_account', {
        sourceAccountLast4: parsed.sourceAccountLast4 || null,
        parserVersion: PARSER_VERSION,
      });
      return json({
        error: 'unmatched_or_disabled_account',
        sourceAccountLast4: parsed.sourceAccountLast4 || null,
      }, 422);
    }

    const result = await storeIngestedTransaction({
      uid: runtime.uid,
      sourceRef: payload.messageId,
      parsed,
      account,
      accountHmacSecret,
      parserVersion: PARSER_VERSION,
    });

    let telegramNotified = Boolean(result.transaction.telegramNotifiedAt);
    let telegramError: string | undefined;
    if (result.transaction.status === 'pending_category'
      && result.transaction.id
      && !result.transaction.telegramNotifiedAt) {
      try {
        const telegramMessageId = await notifyPendingCategory(
          runtime.botToken,
          runtime.chatId,
          runtime.uid,
          result.transaction,
        );
        if (telegramMessageId) {
          await markTelegramNotified(runtime.uid, result.transaction.id, telegramMessageId);
          telegramNotified = true;
        }
      } catch (error) {
        console.error('Immediate Telegram notification failed', { transactionId: result.transaction.id, error });
        telegramError = error instanceof Error ? error.message : 'telegram_notification_failed';
      }
    }

    return json({
      created: result.created,
      transactionId: result.transaction.id,
      status: result.transaction.status,
      kind: result.transaction.kind,
      category: result.transaction.category || null,
      note: result.transaction.note || null,
      accountId: account.id,
      telegramNotified,
      ...(telegramError ? { telegramError } : {}),
    }, result.created ? 201 : 200);
  } catch (error) {
    console.error('n8n finance ingestion failed', error);
    return json({ error: 'internal_error' }, 500);
  }
};

export const config: Config = {
  path: '/api/finance/ingest',
};
