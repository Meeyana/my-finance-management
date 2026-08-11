# Finance automation setup

The automation is intentionally server-side. Never put Gmail refresh tokens,
Telegram bot tokens, or the account HMAC secret in `VITE_*` variables because
those values are bundled into the browser application.

## 1. Create tracked accounts

Open **Finance → Tài khoản & thẻ** and add each bank account or credit card.
Enter only the last four digits shown in notification emails.

- **Tự động nhập từ Gmail** controls ingestion.
- **Tính trong báo cáo** controls dashboard and Telegram totals.

An email is ignored unless its source account/card last four digits match an
enabled account. Existing transactions are never deleted when an account is
removed from this list.

## 2. Google OAuth

Enable Gmail API in the same Google Cloud project. Create a Web OAuth client and
configure the redirect URI used below. Request only `gmail.readonly`.

Generate the consent URL:

```powershell
$env:GOOGLE_CLIENT_ID = "..."
$env:GOOGLE_REDIRECT_URI = "http://localhost:8080/oauth/callback"
npm.cmd --prefix functions run oauth:url
```

After consent, copy the `code` query parameter from the redirect URL and exchange it:

```powershell
$env:GOOGLE_CLIENT_SECRET = "..."
$env:GOOGLE_AUTH_CODE = "..."
npm.cmd --prefix functions run oauth:exchange
```

The OAuth project must not remain **External / Testing** for long-running Gmail
automation because those refresh tokens expire after seven days.

## 3. Telegram bot

Create a private bot with BotFather, start a private chat with it, and obtain the
numeric chat ID. Generate two independent random secrets:

- `TELEGRAM_WEBHOOK_SECRET`: authenticates Telegram webhook requests.
- `ACCOUNT_HMAC_SECRET`: HMACs destination account numbers; changing this value
  invalidates learned account rules.

## 4. Firebase parameters and secrets

Set the non-secret parameters during deploy:

```text
AUTOMATION_USER_ID=<Firebase Auth UID that owns the finance data>
GMAIL_QUERY=newer_than:2d (from:bank-a.example OR from:bank-b.example)
```

Set secrets using Firebase CLI:

```powershell
firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET
firebase functions:secrets:set GMAIL_REFRESH_TOKEN
firebase functions:secrets:set ACCOUNT_HMAC_SECRET
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET
```

Deploy Firestore rules and functions:

```powershell
npm.cmd --prefix functions test
npm.cmd run build
firebase deploy --only firestore:rules,firestore:indexes,functions,hosting
```

After deploy, configure Telegram using the deployed `telegramFinanceWebhook` URL:

```powershell
$env:TELEGRAM_BOT_TOKEN = "..."
$env:TELEGRAM_WEBHOOK_URL = "https://.../telegramFinanceWebhook"
$env:TELEGRAM_WEBHOOK_SECRET = "..."
npm.cmd --prefix functions run telegram:webhook
```

## 5. Parser adapters

`functions/src/parser.ts` contains a conservative generic Vietnamese parser.
Before production use, add redacted fixtures for every bank/card notification
format. A parser is accepted only when its fixture verifies:

1. amount and occurrence time;
2. source account last four digits;
3. full destination account when present;
4. credit purchase versus credit payment;
5. refund and fee classification.

Raw destination account numbers are held only in memory long enough to calculate
an HMAC. Firestore stores only the HMAC and last four digits.
