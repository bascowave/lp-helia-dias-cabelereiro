import { defineConfig } from '@playwright/test';

// Servidor de desenvolvimento e não o build: o `checkOrigin` do Astro recusa POSTs de formulário do browser
// contra o build servido em http://localhost:4321 (o Origin traz a porta; o URL do pedido, não). Em produção o
// proxy envia X-Forwarded-* e `security.allowedDomains` cobre isso. `node --env-file` porque o Astro só
// expõe .env a `process.env` no build/produção, e `auth.ts` lê `process.env`.
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'node --env-file=.env node_modules/astro/astro.js dev --port 4321',
    port: 4321,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
