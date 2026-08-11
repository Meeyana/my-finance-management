# My Finance Management

Personal finance and habit tracking application built with React, Vite, Firebase
Auth, Firestore, and Firebase Functions.

## Finance capabilities

- Manual income and expense ledger with budgets and reports.
- Bank account and credit-card tracking controls.
- Gmail transaction ingestion with deterministic deduplication.
- Credit purchases, repayments, refunds, transfers, and fees have separate semantics.
- Telegram classification for unknown destination accounts.
- Learned HMAC account rules automatically categorize repeated transfers.
- Daily and weekly Telegram reports.
- Legacy browser-side recurring expenses are disabled to prevent duplicates.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Quality gates:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd --prefix functions install
npm.cmd --prefix functions test
```

Production Gmail, Telegram, and Firebase configuration is documented in
[`docs/AUTOMATION_SETUP.md`](docs/AUTOMATION_SETUP.md). Acceptance status is in
[`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md).

Secrets must be stored in Firebase Secret Manager. Never expose Gmail or
Telegram tokens through `VITE_*` environment variables.
