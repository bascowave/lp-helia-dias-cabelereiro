import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Sql } from 'postgres';

const DIR = join(import.meta.dirname, '..', 'migrations');

export async function runMigrations(sql: Sql): Promise<string[]> {
  await sql`create table if not exists schema_migrations (nome text primary key, aplicado_em timestamptz default now())`;
  const feitas = new Set((await sql`select nome from schema_migrations`).map((r) => r.nome));
  const arquivos = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();
  const aplicadas: string[] = [];
  for (const nome of arquivos) {
    if (feitas.has(nome)) continue;
    const texto = await readFile(join(DIR, nome), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(texto);
      await tx`insert into schema_migrations (nome) values (${nome})`;
    });
    aplicadas.push(nome);
  }
  return aplicadas;
}

if (import.meta.main) {
  const { sql } = await import('../src/lib/server/db.ts');
  const aplicadas = await runMigrations(sql);
  console.log(aplicadas.length ? `Aplicadas: ${aplicadas.join(', ')}` : 'Nada a aplicar');
  await sql.end();
}
