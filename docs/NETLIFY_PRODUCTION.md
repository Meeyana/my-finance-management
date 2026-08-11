# Netlify finance automation production setup

Netlify deploys the frontend and all functions in `netlify/functions` from the
same GitHub push. Scheduled functions use UTC; the configured schedules are:

- Gmail sync: every 10 minutes.
- Daily report: 14:00 UTC = 21:00 Asia/Ho_Chi_Minh.
- Weekly report: Sunday 13:30 UTC = 20:30 Asia/Ho_Chi_Minh.

## 1. Create the Telegram bot

1. Open `@BotFather`, run `/newbot`, choose a name and username, then save the bot token.
2. Open the new bot and send `/start`.
3. Before setting a webhook, call `getUpdates` and copy `result[].message.chat.id`:

```powershell
$financeBotToken = Read-Host "Telegram bot token"
Invoke-RestMethod "https://api.telegram.org/bot$financeBotToken/getUpdates" | ConvertTo-Json -Depth 8
```

Do not commit or send the bot token in chat.

## 2. Create Gmail readonly OAuth credentials

Enable Gmail API in Google Cloud, create a Web OAuth client, and add
`http://localhost:8080/oauth/callback` as an authorized redirect URI.

```powershell
$env:GOOGLE_CLIENT_ID = "..."
$env:GOOGLE_REDIRECT_URI = "http://localhost:8080/oauth/callback"
npm.cmd --prefix functions run oauth:url
```

Open the generated URL, approve `gmail.readonly`, and copy the `code` query
parameter from the final localhost URL even if the page itself does not load.

```powershell
$env:GOOGLE_CLIENT_SECRET = "..."
$env:GOOGLE_AUTH_CODE = "..."
npm.cmd --prefix functions run oauth:exchange
```

Store the returned refresh token immediately. A Google OAuth app left in
External/Testing mode can issue refresh tokens that expire after seven days.

## 3. Create Firebase Admin credentials

In Firebase Console, open Project settings → Service accounts → Generate new
private key. Store the downloaded JSON securely. Netlify supports either:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete JSON on one line; or
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and
  `FIREBASE_ADMIN_PRIVATE_KEY`.

Never prefix server credentials with `VITE_`; Vite variables are exposed to the browser.

Copy `AUTOMATION_USER_ID` from Firebase Console → Authentication → Users. It
must be the UID of the account that owns the finance data.

## 4. Add Netlify environment variables

Add these in Project configuration → Environment variables. Use Production
context and Functions scope when the plan supports scopes; otherwise All scopes
is acceptable.

```text
FINANCE_AUTOMATION_ENABLED=false
AUTOMATION_USER_ID=<Firebase Auth UID>
GMAIL_QUERY=newer_than:2d
GMAIL_MAX_MESSAGES=30

GOOGLE_CLIENT_ID=<OAuth client id>
GOOGLE_CLIENT_SECRET=<OAuth client secret>
GMAIL_REFRESH_TOKEN=<OAuth refresh token>

TELEGRAM_BOT_TOKEN=<BotFather token>
TELEGRAM_CHAT_ID=<private chat id>
TELEGRAM_WEBHOOK_SECRET=<random value, at least 32 characters>
ACCOUNT_HMAC_SECRET=<another random value, at least 32 characters>

FIREBASE_SERVICE_ACCOUNT_JSON=<service account JSON on one line>
```

`TELEGRAM_WEBHOOK_SECRET` and `ACCOUNT_HMAC_SECRET` must be different. Changing
`ACCOUNT_HMAC_SECRET` later invalidates previously learned STK rules.

Keep `FINANCE_AUTOMATION_ENABLED=false` for the first deploy so scheduled jobs
cannot process mail before the account list is ready.

## 5. Add the debit account and VIB credit card

In Finance → Tài khoản & thẻ:

1. Add the debit account with its last four digits and enable Gmail ingestion.
2. Add a second account with type `Thẻ tín dụng`, institution `VIB`, and the
   last four digits shown in VIB transaction emails.
3. Enable Gmail ingestion and reporting for the VIB card.

The Gmail job scans the same mailbox for both sources. It matches each email to
the correct account/card by last four digits. A VIB card purchase is an expense;
a card-balance payment is `credit_payment` and is not counted as another expense.

## 6. Deploy and configure the webhook

After the GitHub/Netlify production deploy succeeds, configure Telegram with the
production site URL:

```powershell
$env:TELEGRAM_BOT_TOKEN = "..."
$env:TELEGRAM_WEBHOOK_URL = "https://<your-site>/api/finance/telegram"
$env:TELEGRAM_WEBHOOK_SECRET = "..."
npm.cmd --prefix functions run telegram:webhook
```

The webhook subscribes to both button callbacks and reply messages.

## 7. Production acceptance test

1. After all secrets and tracked accounts are ready, set
   `FINANCE_AUTOMATION_ENABLED=true` and trigger a production deploy.
2. In Netlify → Functions, open `sync-gmail` and select Run now.
3. Confirm its log reports scanned/created counts without an authentication error.
4. Confirm an unclassified transfer produces a Telegram message.
5. Reply to that exact bot message with a category label such as `Ăn uống`.
6. Confirm the transaction becomes posted and Telegram confirms that the STK rule was saved.
7. Process another transfer to the same full destination STK; it must be categorized without another prompt.
8. Process one VIB credit-card email and verify the card source, amount and merchant.
9. Run the daily and weekly report functions manually once.

For a real VIB acceptance fixture, redact personal information from one purchase
email but preserve the field labels and number formatting. The generic VIB test
fixture cannot guarantee every VIB email template variant.
