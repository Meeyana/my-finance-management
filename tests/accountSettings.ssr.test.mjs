import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let vite;
let AccountSettings;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  });
  AccountSettings = (await vite.ssrLoadModule('/src/features/finance/AccountSettings.jsx')).default;
});

after(async () => {
  await vite?.close();
});

test('tracked account screen renders ingestion and report controls', () => {
  const html = renderToStaticMarkup(React.createElement(AccountSettings, {
    accounts: [{
      id: 'vcb-1',
      name: 'VCB nhận lương',
      type: 'bank',
      institution: 'Vietcombank',
      last4: '1234',
      ingestEnabled: true,
      includeInReports: false,
    }],
    addAccount: async () => {},
    updateAccount: async () => {},
    deleteAccount: async () => {},
    checkPermission: () => true,
  }));

  assert.match(html, /VCB nhận lương/);
  assert.match(html, /•••• 1234/);
  assert.match(html, /Tự động nhập từ Gmail/);
  assert.match(html, /Tính trong báo cáo/);
  assert.match(html, /Đang bật/);
  assert.match(html, /Không/);
});
