import { runMigrations } from './migrate.ts';
import { runSeed } from './seed.ts';
import { sql } from '../src/lib/server/db.ts';
import { uploadsDir } from '../src/lib/server/images.ts';

for (const v of ['ADMIN_USER', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET']) {
  if (!process.env[v]) { console.error(`${v} não definida`); process.exit(1); }
}
if (process.env.SESSION_SECRET!.length < 32) { console.error('SESSION_SECRET deve ter ≥ 32 caracteres'); process.exit(1); }

console.log('Migrações:', (await runMigrations(sql)).join(', ') || 'nenhuma');
console.log('Seed:', (await runSeed(sql, uploadsDir())) ? 'aplicado' : 'ignorado');
await import('../dist/server/entry.mjs');
