# Finance automation: n8n + Netlify

Gmail is owned by n8n. Netlify does not connect to Gmail and does not need Google
OAuth credentials.

```text
Gmail -> n8n Gmail Trigger -> POST /api/finance/ingest
      -> parse + account matching + deterministic deduplication
      -> Firestore -> Telegram classification -> learned account/merchant rule
```

Netlify also sends the daily report at 21:00 Asia/Ho_Chi_Minh, the weekly report
at 20:30 on Sunday, and retries failed Telegram notifications every 10 minutes.

## 1. Required Netlify environment variables

Configure these for the Production context and Functions scope (or All scopes):

```text
FINANCE_AUTOMATION_ENABLED=true
FINANCE_INGEST_SECRET=<random value, at least 32 characters>
AUTOMATION_USER_ID=<Firebase Auth UID that owns the finance data>

TELEGRAM_BOT_TOKEN=<BotFather token>
TELEGRAM_CHAT_ID=<private chat id>
TELEGRAM_WEBHOOK_SECRET=<random value, at least 32 characters>
ACCOUNT_HMAC_SECRET=<different random value, at least 32 characters>

FIREBASE_SERVICE_ACCOUNT_JSON=<Firebase service account JSON on one line>
```

`FINANCE_INGEST_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, and
`ACCOUNT_HMAC_SECRET` must be different values. Do not prefix server secrets with
`VITE_`. Changing `ACCOUNT_HMAC_SECRET` invalidates existing learned account
rules.

Generate a value without printing it into shell history:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$financeIngestSecret = [Convert]::ToHexString($bytes).ToLowerInvariant()
$financeIngestSecret
```

Store that same value as `FINANCE_INGEST_SECRET` in both Netlify and n8n.

## 2. Configure tracked accounts

In Finance -> Accounts and cards:

1. Add the debit account and its last four digits.
2. Add the VIB card as a credit-card account with the last four digits present
   in VIB transaction emails.
3. Enable email ingestion only for accounts/cards that should be tracked.
4. Disable report inclusion for any account that should be ingested but excluded
   from totals.

An email without a tracked last-four match is rejected with HTTP 422; it is not
silently assigned to the wrong account.

## 3. Configure the n8n workflow

The local `automation.json` export is intentionally ignored by Git because n8n
exports can contain credentials. Its current version contains only:

1. A VIB Gmail Trigger.
2. A Code node that creates a minimal email payload.
3. An authenticated HTTP Request to the Netlify ingestion endpoint.

Create an n8n variable named `FINANCE_INGEST_SECRET` with the same value used in
Netlify. The HTTP node sends it in the `x-finance-ingest-secret` header.

The existing VIB trigger handles credit-card emails. To ingest the debit bank,
duplicate the Gmail Trigger branch and change its Sender/Search filter to match
that bank's email. Connect it to the same Code and HTTP nodes. Do not add a
second Firebase write node; Netlify is the only Firestore writer for ingestion.

Keep the Gmail message ID in `messageId`. Netlify derives a deterministic
transaction ID from it, so n8n retries do not create duplicate transactions.

## 4. Telegram webhook

After Netlify deploys, set the webhook:

```powershell
$financeBotToken = Read-Host "Telegram bot token"
$webhookSecret = Read-Host "Telegram webhook secret"
$body = @{
  url = "https://tp-finance.netlify.app/api/finance/telegram"
  secret_token = $webhookSecret
  allowed_updates = @("message", "callback_query")
} | ConvertTo-Json
Invoke-RestMethod "https://api.telegram.org/bot$financeBotToken/setWebhook" `
  -Method Post -ContentType "application/json" -Body $body
```

When an unknown destination account or merchant arrives, reply to that exact
bot message with a category label. The transaction is posted and a hashed
account/merchant rule is saved for the next matching transaction.

## 5. Production acceptance test

1. Push the source and wait for the Netlify production deploy to succeed.
2. Add `FINANCE_INGEST_SECRET` to Netlify and n8n, then redeploy Netlify once.
3. Run one VIB execution manually in n8n. The HTTP node should return 201.
4. Run the same Gmail message again. It should return 200 with `created: false`.
5. Confirm the amount, VIB card, merchant, and transaction kind in Finance.
6. For an unknown merchant/account, confirm Telegram asks for a category.
7. Reply to the bot message and verify the transaction changes to `posted`.
8. Process a later transaction for the same account/merchant and verify no new
   classification prompt is sent.
9. Add the debit Gmail Trigger and repeat the account-matching test.
10. Run daily/weekly functions manually once and verify Telegram delivery.

Expected ingestion responses:

| HTTP | Meaning |
| --- | --- |
| 201 | New transaction created |
| 200 | Message was already processed |
| 400 | Invalid n8n payload |
| 401 | Ingestion secret mismatch |
| 413 | Payload is too large |
| 422 | Email could not be parsed or account is not tracked |
| 500/503 | Backend or environment configuration error |
