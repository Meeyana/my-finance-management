# My Finance Management

Personal finance and habit tracking application built with React, Vite, Firebase
Auth/Firestore, and Netlify Functions.

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

Production Gmail, Telegram, Firebase Admin, and Netlify configuration is documented in
[`docs/NETLIFY_PRODUCTION.md`](docs/NETLIFY_PRODUCTION.md). The older Firebase
Functions deployment path remains in [`docs/AUTOMATION_SETUP.md`](docs/AUTOMATION_SETUP.md).
Acceptance status is in [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md).

Secrets must be stored as Netlify environment variables with Functions scope.
Never expose Gmail, Telegram, or Firebase Admin credentials through `VITE_*` variables.
