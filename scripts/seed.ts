import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Sql } from 'postgres';
import { processImage } from '../src/lib/server/images.ts';

const SEED = join(import.meta.dirname, '..', 'seed');
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function runSeed(sql: Sql, dir: string): Promise<boolean> {
  const [{ n }] = await sql`select count(*)::int as n from content`;
  if (n > 0) return false;
  const dados = JSON.parse(await readFile(join(SEED, 'content.json'), 'utf8'));
  const cache = new Map<string, Promise<string>>();
  const linhas: { arquivo: string; alt: string; largura: number; altura: number }[] = [];

  async function processar(nome: string): Promise<string> {
    const mime = MIME[nome.split('.').pop()!.toLowerCase()];
    if (!mime) throw new Error(`Extensão de imagem não suportada: ${nome}`);
    const buf = await readFile(join(SEED, 'images', nome));
    const r = await processImage(buf, mime, dir);
    linhas.push({ arquivo: r.arquivo, alt: nome, largura: r.largura, altura: r.altura });
    return r.arquivo;
  }

  async function resolve(v: unknown): Promise<unknown> {
    if (typeof v === 'string' && v.startsWith('@')) {
      const nome = v.slice(1);
      if (!cache.has(nome)) cache.set(nome, processar(nome));
      return cache.get(nome);
    }
    if (Array.isArray(v)) return Promise.all(v.map(resolve));
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) o[k] = await resolve(x);
      return o;
    }
    return v;
  }

  const finais: [string, unknown][] = [];
  for (const [secao, valor] of Object.entries(dados)) finais.push([secao, await resolve(valor)]);

  await sql.begin(async (tx) => {
    for (const r of linhas) {
      await tx`insert into imagens (id, arquivo, alt, largura, altura)
               values (${r.arquivo}, ${r.arquivo}, ${r.alt}, ${r.largura}, ${r.altura})`;
    }
    for (const [secao, final] of finais) {
      await tx`insert into content (secao, dados) values (${secao}, ${tx.json(final as never)})`;
    }
  });
  return true;
}

if (import.meta.main) {
  const { sql } = await import('../src/lib/server/db.ts');
  const { uploadsDir } = await import('../src/lib/server/images.ts');
  try {
    console.log((await runSeed(sql, uploadsDir())) ? 'Seed aplicado' : 'Conteúdo já existe — seed ignorado');
  } finally {
    await sql.end();
  }
}
