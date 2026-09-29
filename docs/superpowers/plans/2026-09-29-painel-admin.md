# Painel Administrativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel em `/admin` (um usuário) para editar todos os textos e imagens do site e gerir um banner de promoção (faixa ou pop-up, ativável, com datas), com efeito imediato.

**Architecture:** Astro passa a SSR com `@astrojs/node` (standalone). Conteúdo em Postgres (`content` jsonb por seção, `imagens`, `banner`), imagens em volume (`UPLOADS_DIR`) convertidas para WebP por `sharp`. Formulários do painel são gerados a partir de esquemas declarativos por seção e funcionam sem JS. Lógica pura (sessão, rate limit, banner, esquemas/parse de formulário, upload) fica em `src/lib/server/*.ts`, testada com Vitest; scripts (`migrate`, `seed`, `start`, `hash-senha`) são `.ts` executados diretamente pelo Node 24 (type stripping).

**Tech Stack:** Astro 5.18, @astrojs/node ^9, Tailwind 4, postgres (porsager) ^3, bcryptjs ^3, sharp, Vitest ^3, Playwright, Postgres 16, Node 24.

**Spec:** `docs/superpowers/specs/2026-09-29-painel-admin-design.md`

## Global Constraints

- Node 24 (local e Docker `node:24-bookworm-slim`); scripts `.ts` executados com `node` direto; imports relativos entre arquivos de `src/lib/server` e `scripts` usam extensão `.ts`.
- Nenhum módulo em `src/lib/server` importa `astro:*` (precisam rodar em scripts e testes).
- Variáveis de ambiente: `DATABASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (≥ 32 caracteres), `UPLOADS_DIR` (padrão `/data/uploads`), `TZ=Europe/Lisbon`.
- Upload: apenas `image/jpeg`, `image/png`, `image/webp`, máx. 10 MB; saída WebP em larguras 800 e 1600 (`withoutEnlargement`).
- Sessão: cookie `hd_session`, `httpOnly`, `secure` em produção, `sameSite: 'strict'`, 7 dias.
- Login: bloqueio de 15 min após 5 falhas por IP.
- CSRF: coberto por `security.checkOrigin` (padrão do Astro em SSR) + cookie `sameSite: 'strict'`. **Desvio consciente da spec** (que pedia token): mesma proteção, menos código.
- Referência de imagem no conteúdo e no banner é o **nome base do arquivo** (`string`), não o `uuid`. **Desvio consciente da spec**: evita lookup por render.
- Textos de interface do painel em português de Portugal.
- Páginas legais editadas como HTML num textarea (usuário único e confiável); renderizadas com `set:html`.

## Review Focus

1. Datas do banner digitadas em `datetime-local` (sem fuso) devem ser interpretadas em Europe/Lisbon — teste em Task 7 com `TZ` fixo.
2. Banner com `fim` anterior a `inicio` → rejeitado na validação com mensagem — teste em Task 7.
3. Item de lista deixado em branco (linha extra “novo item”) não deve criar item vazio; item marcado “remover” some; ordem respeita o campo `ordem` — testes em Task 4.
4. Banco fora do ar depois de o site ter servido uma vez → site continua a servir o último conteúdo — teste em Task 5.
5. Pedido a `/uploads/../../etc/passwd` ou nome fora do padrão → 404 — teste em Task 3.

---

## File Structure

```
migrations/001_init.sql                 esquema
scripts/migrate.ts                      aplica migrações pendentes
scripts/seed.ts                         popula banco + volume se vazio
scripts/start.ts                        migrate → seed → servidor (container)
scripts/hash-senha.ts                   gera hash bcrypt
seed/content.json                       conteúdo atual do site por seção
seed/images/*                           cópia das imagens atuais
src/lib/server/db.ts                    cliente postgres
src/lib/server/session.ts               token assinado
src/lib/server/auth.ts                  credenciais + rate limit
src/lib/server/images.ts                processamento/armazenamento de upload
src/lib/server/schemas.ts               esquemas por seção + tipos
src/lib/server/form.ts                  FormData → objeto + validação
src/lib/server/content.ts               leitura/gravação de seções com cache
src/lib/server/banner.ts                regra de exibição + leitura/gravação
src/middleware.ts                       protege /admin
src/pages/uploads/[file].ts             serve imagens do volume
src/pages/admin/login.astro             login
src/pages/admin/logout.ts               logout
src/pages/admin/index.astro             lista de seções
src/pages/admin/secao/[nome].astro      editor de seção
src/pages/admin/banner.astro            editor do banner
src/components/admin/Field.astro        renderiza um campo do esquema
src/components/admin/AdminLayout.astro  layout do painel
src/components/Img.astro                <img> com srcset do volume
src/components/PromoBanner.astro        faixa / pop-up
tests/*.test.ts                         Vitest
e2e/painel.spec.ts                      Playwright
docker-compose.dev.yml                  Postgres local
```

---

### Task 1: Base SSR, dependências, banco e migração

**Files:**
- Modify: `package.json`, `astro.config.mjs`, `.gitignore`
- Create: `docker-compose.dev.yml`, `.env.example`, `vitest.config.ts`, `migrations/001_init.sql`, `src/lib/server/db.ts`, `scripts/migrate.ts`

**Interfaces:**
- Produces: `sql` (instância `postgres`) exportada de `src/lib/server/db.ts`; `runMigrations(sql): Promise<string[]>` de `scripts/migrate.ts` (retorna nomes aplicados).

- [ ] **Step 1: Instalar dependências**

```bash
npm install @astrojs/node@^9 postgres@^3 bcryptjs@^3 sharp
npm install -D vitest@^3 @playwright/test
npm uninstall -D sharp
```

(`sharp` passa a dependência de produção.)

- [ ] **Step 2: `astro.config.mjs`** — adicionar adapter e output:

```js
import node from '@astrojs/node';
// ...
export default defineConfig({
  site: 'https://heliadiascabeleireiros.pt',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap()],
  image: { quality: 92 },
});
```

- [ ] **Step 3: Scripts em `package.json`**

```json
"test": "vitest run",
"e2e": "playwright test",
"migrate": "node --env-file=.env scripts/migrate.ts",
"seed": "node --env-file=.env scripts/seed.ts",
"hash-senha": "node scripts/hash-senha.ts"
```

- [ ] **Step 4: `docker-compose.dev.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: helia
      POSTGRES_PASSWORD: helia
      POSTGRES_DB: helia
    ports: ["5432:5432"]
```

- [ ] **Step 5: `.env.example`** (e acrescentar `data/` ao `.gitignore`)

```
DATABASE_URL=postgres://helia:helia@localhost:5432/helia
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=
SESSION_SECRET=troque-por-uma-string-aleatoria-de-32-caracteres
UPLOADS_DIR=./data/uploads
TZ=Europe/Lisbon
```

- [ ] **Step 6: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], env: { TZ: 'Europe/Lisbon' } },
});
```

- [ ] **Step 7: `migrations/001_init.sql`**

```sql
create table content (
  secao text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

create table imagens (
  id uuid primary key,
  arquivo text not null unique,
  alt text not null default '',
  largura int not null,
  altura int not null,
  criado_em timestamptz not null default now()
);

create table banner (
  id int primary key check (id = 1),
  ativo boolean not null default false,
  modo text not null default 'faixa' check (modo in ('faixa','popup')),
  titulo text not null default '',
  texto text not null default '',
  imagem text,
  link text,
  texto_botao text,
  inicio timestamptz,
  fim timestamptz,
  atualizado_em timestamptz not null default now()
);

insert into banner (id) values (1);
```

- [ ] **Step 8: `src/lib/server/db.ts`**

```ts
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definida');

export const sql = postgres(url, { max: 5, idle_timeout: 30, connect_timeout: 5 });
```

- [ ] **Step 9: `scripts/migrate.ts`**

```ts
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
```

- [ ] **Step 10: Verificar**

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npm run migrate      # Expected: "Aplicadas: 001_init.sql"
npm run migrate      # Expected: "Nada a aplicar"
npx astro check      # Expected: 0 errors
```

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: SSR com adapter node, Postgres e migrações"
```

---

### Task 2: Sessão, credenciais e rate limit

**Files:**
- Create: `src/lib/server/session.ts`, `src/lib/server/auth.ts`, `scripts/hash-senha.ts`
- Test: `tests/session.test.ts`, `tests/auth.test.ts`

**Interfaces:**
- Produces:
  - `createSessionToken(secret: string, now: number): string`
  - `verifySessionToken(token: string | undefined, secret: string, now: number): boolean`
  - `SESSION_COOKIE = 'hd_session'`, `SESSION_MAX_AGE_S = 604800`
  - `checkCredentials(user: string, pass: string, env?: {ADMIN_USER?, ADMIN_PASSWORD_HASH?}): Promise<boolean>`
  - `class LoginLimiter { isBlocked(ip, now): boolean; fail(ip, now): void; reset(ip): void }`, instância `loginLimiter`

- [ ] **Step 1: Testes que falham** — `tests/session.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_S } from '../src/lib/server/session.ts';

const S = 'x'.repeat(32);
const T0 = 1_800_000_000_000;

describe('sessão', () => {
  it('aceita token válido', () => {
    expect(verifySessionToken(createSessionToken(S, T0), S, T0 + 1000)).toBe(true);
  });
  it('rejeita expirado', () => {
    const t = createSessionToken(S, T0);
    expect(verifySessionToken(t, S, T0 + SESSION_MAX_AGE_S * 1000 + 1)).toBe(false);
  });
  it('rejeita adulterado', () => {
    const t = createSessionToken(S, T0);
    const [exp, sig] = t.split('.');
    expect(verifySessionToken(`${Number(exp) + 1}.${sig}`, S, T0)).toBe(false);
  });
  it('rejeita outro segredo, vazio e malformado', () => {
    expect(verifySessionToken(createSessionToken(S, T0), 'y'.repeat(32), T0)).toBe(false);
    expect(verifySessionToken(undefined, S, T0)).toBe(false);
    expect(verifySessionToken('lixo', S, T0)).toBe(false);
  });
});
```

`tests/auth.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { checkCredentials, LoginLimiter } from '../src/lib/server/auth.ts';

const env = { ADMIN_USER: 'admin', ADMIN_PASSWORD_HASH: bcrypt.hashSync('segredo', 4) };

describe('credenciais', () => {
  it('aceita certas', async () => expect(await checkCredentials('admin', 'segredo', env)).toBe(true));
  it('recusa senha errada', async () => expect(await checkCredentials('admin', 'x', env)).toBe(false));
  it('recusa usuário errado', async () => expect(await checkCredentials('outro', 'segredo', env)).toBe(false));
  it('recusa sem hash configurado', async () =>
    expect(await checkCredentials('admin', 'segredo', { ADMIN_USER: 'admin' })).toBe(false));
});

describe('LoginLimiter', () => {
  it('bloqueia após 5 falhas e libera após 15 min', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 4; i++) l.fail('1.1.1.1', 0);
    expect(l.isBlocked('1.1.1.1', 0)).toBe(false);
    l.fail('1.1.1.1', 0);
    expect(l.isBlocked('1.1.1.1', 1000)).toBe(true);
    expect(l.isBlocked('2.2.2.2', 1000)).toBe(false);
    expect(l.isBlocked('1.1.1.1', 15 * 60_000 + 1)).toBe(false);
  });
  it('reset limpa', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 5; i++) l.fail('a', 0);
    l.reset('a');
    expect(l.isBlocked('a', 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar** `npx vitest run tests/session.test.ts tests/auth.test.ts` → FAIL (módulos inexistentes).

- [ ] **Step 3: `src/lib/server/session.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'hd_session';
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

export function createSessionToken(secret: string, now: number): string {
  const exp = String(now + SESSION_MAX_AGE_S * 1000);
  return `${exp}.${sign(exp, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now: number): boolean {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const expected = Buffer.from(sign(exp, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(exp) > now;
}
```

- [ ] **Step 4: `src/lib/server/auth.ts`**

```ts
import bcrypt from 'bcryptjs';

type Env = { ADMIN_USER?: string; ADMIN_PASSWORD_HASH?: string };

export async function checkCredentials(user: string, pass: string, env: Env = process.env): Promise<boolean> {
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD_HASH) return false;
  const passOk = await bcrypt.compare(pass, env.ADMIN_PASSWORD_HASH);
  return passOk && user === env.ADMIN_USER;
}

const MAX_FALHAS = 5;
const BLOQUEIO_MS = 15 * 60_000;

export class LoginLimiter {
  private falhas = new Map<string, { n: number; ate: number }>();

  isBlocked(ip: string, now: number): boolean {
    const f = this.falhas.get(ip);
    if (!f || f.n < MAX_FALHAS) return false;
    if (now > f.ate) { this.falhas.delete(ip); return false; }
    return true;
  }

  fail(ip: string, now: number): void {
    const f = this.falhas.get(ip) ?? { n: 0, ate: 0 };
    f.n += 1;
    f.ate = now + BLOQUEIO_MS;
    this.falhas.set(ip, f);
  }

  reset(ip: string): void { this.falhas.delete(ip); }
}

export const loginLimiter = new LoginLimiter();
```

- [ ] **Step 5: `scripts/hash-senha.ts`**

```ts
import bcrypt from 'bcryptjs';
const senha = process.argv[2];
if (!senha) { console.error('Uso: npm run hash-senha -- "a-sua-senha"'); process.exit(1); }
console.log(bcrypt.hashSync(senha, 12));
```

- [ ] **Step 6: Rodar testes** → PASS. `npm run hash-senha -- teste` imprime hash `$2...`.

- [ ] **Step 7: Commit** `git commit -am "feat: sessão assinada, credenciais e limite de login"` (adicionar arquivos novos antes).

---

### Task 3: Imagens (upload, armazenamento, rota pública, componente)

**Files:**
- Create: `src/lib/server/images.ts`, `src/pages/uploads/[file].ts`, `src/components/Img.astro`
- Test: `tests/images.test.ts`

**Interfaces:**
- Consumes: `sql` (Task 1).
- Produces:
  - `ACCEPTED_TYPES`, `MAX_BYTES = 10 * 1024 * 1024`, `WIDTHS = [800, 1600] as const`
  - `class UploadError extends Error`
  - `processImage(buf: Buffer, mime: string, dir: string): Promise<{ arquivo: string; largura: number; altura: number }>` — grava `<arquivo>-800.webp` e `<arquivo>-1600.webp` em `dir`
  - `saveUpload(file: File, alt?: string): Promise<string>` — valida, processa em `uploadsDir()`, insere em `imagens`, retorna `arquivo`
  - `listImages(): Promise<{ arquivo: string; alt: string }[]>`
  - `isValidUploadName(name: string): boolean`
  - `uploadsDir(): string`
  - `imgSrc(arquivo: string, w: 800 | 1600): string` → `/uploads/<arquivo>-<w>.webp`
  - `<Img arquivo alt sizes? class? style? loading? fetchpriority? />`

- [ ] **Step 1: Testes que falham** — `tests/images.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processImage, isValidUploadName, UploadError, MAX_BYTES } from '../src/lib/server/images.ts';

const png = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#c33' } }).png().toBuffer();

describe('processImage', () => {
  it('gera duas variantes webp e devolve dimensões originais', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'up-'));
    const r = await processImage(await png(2000, 1000), 'image/png', dir);
    expect(r.largura).toBe(2000);
    expect(r.altura).toBe(1000);
    expect((await readdir(dir)).sort()).toEqual([`${r.arquivo}-1600.webp`, `${r.arquivo}-800.webp`]);
    expect(isValidUploadName(`${r.arquivo}-800.webp`)).toBe(true);
  });
  it('não amplia imagem pequena', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'up-'));
    const r = await processImage(await png(300, 300), 'image/png', dir);
    const meta = await sharp(join(dir, `${r.arquivo}-1600.webp`)).metadata();
    expect(meta.width).toBe(300);
  });
  it('recusa tipo não suportado', async () => {
    await expect(processImage(Buffer.from('gif'), 'image/gif', tmpdir())).rejects.toBeInstanceOf(UploadError);
  });
  it('recusa acima de 10 MB', async () => {
    await expect(processImage(Buffer.alloc(MAX_BYTES + 1), 'image/png', tmpdir())).rejects.toBeInstanceOf(UploadError);
  });
  it('recusa conteúdo que não é imagem', async () => {
    await expect(processImage(Buffer.from('nao sou png'), 'image/png', tmpdir())).rejects.toBeInstanceOf(UploadError);
  });
});

describe('isValidUploadName', () => {
  it.each(['../../etc/passwd', 'x.webp', 'abc-800.webp/..', '%2e%2e', 'a'.repeat(36) + '-300.webp'])(
    'recusa %s', (n) => expect(isValidUploadName(n)).toBe(false),
  );
});
```

- [ ] **Step 2: Rodar** → FAIL.

- [ ] **Step 3: `src/lib/server/images.ts`**

```ts
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 10 * 1024 * 1024;
export const WIDTHS = [800, 1600] as const;

export class UploadError extends Error {}

export const uploadsDir = () => process.env.UPLOADS_DIR ?? '/data/uploads';
export const imgSrc = (arquivo: string, w: 800 | 1600) => `/uploads/${arquivo}-${w}.webp`;

const NOME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(800|1600)\.webp$/;
export const isValidUploadName = (name: string) => NOME.test(name);

export async function processImage(buf: Buffer, mime: string, dir: string) {
  if (!ACCEPTED_TYPES.includes(mime)) throw new UploadError('Formato não suportado. Use JPG, PNG ou WebP.');
  if (buf.length > MAX_BYTES) throw new UploadError('Imagem demasiado grande (máx. 10 MB).');
  let meta;
  try { meta = await sharp(buf).metadata(); } catch { throw new UploadError('Ficheiro de imagem inválido.'); }
  if (!meta.width || !meta.height) throw new UploadError('Ficheiro de imagem inválido.');
  const arquivo = randomUUID();
  await mkdir(dir, { recursive: true });
  for (const w of WIDTHS) {
    await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 85 })
      .toFile(join(dir, `${arquivo}-${w}.webp`));
  }
  return { arquivo, largura: meta.width, altura: meta.height };
}

export async function saveUpload(file: File, alt = ''): Promise<string> {
  const { sql } = await import('./db.ts');
  const r = await processImage(Buffer.from(await file.arrayBuffer()), file.type, uploadsDir());
  await sql`insert into imagens (id, arquivo, alt, largura, altura)
            values (${r.arquivo}, ${r.arquivo}, ${alt}, ${r.largura}, ${r.altura})`;
  return r.arquivo;
}

export async function listImages() {
  const { sql } = await import('./db.ts');
  return sql<{ arquivo: string; alt: string }[]>`select arquivo, alt from imagens order by criado_em desc`;
}
```

(`db.ts` é importado dinamicamente para os testes de `processImage` não exigirem `DATABASE_URL`.)

- [ ] **Step 4: `src/pages/uploads/[file].ts`**

```ts
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidUploadName, uploadsDir } from '../../lib/server/images.ts';

export const GET: APIRoute = async ({ params }) => {
  const name = params.file ?? '';
  if (!isValidUploadName(name)) return new Response(null, { status: 404 });
  try {
    const body = await readFile(join(uploadsDir(), name));
    return new Response(body, {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
```

- [ ] **Step 5: `src/components/Img.astro`**

```astro
---
import { imgSrc } from '../lib/server/images.ts';

interface Props {
  arquivo: string;
  alt: string;
  sizes?: string;
  class?: string;
  style?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'auto';
}
const { arquivo, alt, sizes = '100vw', class: className, style, loading = 'lazy', fetchpriority } = Astro.props;
---
<img
  src={imgSrc(arquivo, 1600)}
  srcset={`${imgSrc(arquivo, 800)} 800w, ${imgSrc(arquivo, 1600)} 1600w`}
  sizes={sizes}
  alt={alt}
  class={className}
  style={style}
  loading={loading}
  fetchpriority={fetchpriority}
  decoding="async"
/>
```

- [ ] **Step 6: Rodar testes** → PASS.
- [ ] **Step 7: Commit** `feat: processamento de upload e rota de imagens`.

---

### Task 4: Esquemas de seção e parse de formulário

**Files:**
- Create: `src/lib/server/schemas.ts`, `src/lib/server/form.ts`
- Test: `tests/form.test.ts`

**Interfaces:**
- Produces:
  - `type Field = { name: string; label: string; type: 'text' | 'textarea' | 'html' | 'image' | 'number' | 'boolean' | 'url'; required?: boolean; max?: number } | { name: string; label: string; type: 'list'; itemLabel: string; fields: Field[] }`
  - `type SectionSchema = { nome: SectionName; titulo: string; fields: Field[] }`
  - `type SectionName = 'geral' | 'hero' | 'confianca' | 'servicos' | 'sobre' | 'galeria' | 'avaliacoes' | 'contactos' | 'rodape' | 'privacidade' | 'termos'`
  - `SECTIONS: SectionSchema[]`, `getSchema(nome: string): SectionSchema | undefined`
  - `parseForm(fields: Field[], fd: FormData, uploaded: Record<string, string>): Record<string, unknown>` — `uploaded` mapeia nome de campo de imagem (ex. `itens.2.imagem`) → `arquivo` recém-enviado
  - `validate(fields: Field[], data: Record<string, unknown>): string[]` (lista de erros em PT; vazia = ok)
  - Convenção de nomes no formulário: `campo`, `lista.<i>.campo`, `lista.<i>._ordem`, `lista.<i>._remover`, campo imagem: `<nome>` (select com existentes) + `<nome>__file` (input file).

- [ ] **Step 1: Testes que falham** — `tests/form.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parseForm, validate } from '../src/lib/server/form.ts';
import type { Field } from '../src/lib/server/schemas.ts';
import { SECTIONS } from '../src/lib/server/schemas.ts';

const fields: Field[] = [
  { name: 'titulo', label: 'Título', type: 'text', required: true, max: 20 },
  { name: 'ativo', label: 'Ativo', type: 'boolean' },
  { name: 'nota', label: 'Nota', type: 'number' },
  { name: 'foto', label: 'Foto', type: 'image' },
  { name: 'itens', label: 'Itens', type: 'list', itemLabel: 'Item', fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true },
    { name: 'img', label: 'Img', type: 'image' },
  ] },
];

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

describe('parseForm', () => {
  it('lê campos simples, boolean ausente = false, number', () => {
    const r = parseForm(fields, fd({ titulo: ' Olá ', nota: '4.7', foto: 'abc' }), {});
    expect(r).toMatchObject({ titulo: 'Olá', ativo: false, nota: 4.7, foto: 'abc' });
  });
  it('upload substitui imagem selecionada', () => {
    const r = parseForm(fields, fd({ titulo: 'x', foto: 'antiga' }), { foto: 'nova' });
    expect(r.foto).toBe('nova');
  });
  it('lista: ordena por _ordem, ignora item em branco, remove marcado', () => {
    const r = parseForm(fields, fd({
      titulo: 'x',
      'itens.0.nome': 'A', 'itens.0._ordem': '2',
      'itens.1.nome': 'B', 'itens.1._ordem': '1',
      'itens.2.nome': 'C', 'itens.2._ordem': '3', 'itens.2._remover': 'on',
      'itens.3.nome': '', 'itens.3._ordem': '4', 'itens.3.img': '',
    }), { 'itens.1.img': 'up' });
    expect(r.itens).toEqual([{ nome: 'B', img: 'up' }, { nome: 'A', img: '' }]);
  });
});

describe('validate', () => {
  it('obrigatório e tamanho máximo', () => {
    expect(validate(fields, { titulo: '', itens: [] })).toContain('Título é obrigatório');
    expect(validate(fields, { titulo: 'x'.repeat(21), itens: [] })).toContain('Título excede 20 caracteres');
  });
  it('valida campos dentro de listas com posição', () => {
    expect(validate(fields, { titulo: 'x', itens: [{ nome: '' }] })).toContain('Item 1: Nome é obrigatório');
  });
  it('url inválida', () => {
    const f: Field[] = [{ name: 'link', label: 'Link', type: 'url' }];
    expect(validate(f, { link: 'javascript:alert(1)' })).toContain('Link não é um endereço válido');
    expect(validate(f, { link: 'https://wa.me/1' })).toEqual([]);
    expect(validate(f, { link: 'tel:+351965833809' })).toEqual([]);
    expect(validate(f, { link: '/#servicos' })).toEqual([]);
    expect(validate(f, { link: '' })).toEqual([]);
  });
  it('todas as seções têm nome único', () => {
    const nomes = SECTIONS.map((s) => s.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
```

- [ ] **Step 2: Rodar** → FAIL.

- [ ] **Step 3: `src/lib/server/schemas.ts`**

```ts
export type Field =
  | { name: string; label: string; type: 'text' | 'textarea' | 'html' | 'image' | 'number' | 'boolean' | 'url'; required?: boolean; max?: number }
  | { name: string; label: string; type: 'list'; itemLabel: string; fields: Field[] };

export type SectionName = 'geral' | 'hero' | 'confianca' | 'servicos' | 'sobre' | 'galeria'
  | 'avaliacoes' | 'contactos' | 'rodape' | 'privacidade' | 'termos';

export type SectionSchema = { nome: SectionName; titulo: string; fields: Field[] };

const t = (name: string, label: string, max = 200, required = true): Field => ({ name, label, type: 'text', max, required });
const ta = (name: string, label: string, max = 2000): Field => ({ name, label, type: 'textarea', max, required: true });
const img = (name: string, label: string): Field => ({ name, label, type: 'image', required: true });
const url = (name: string, label: string): Field => ({ name, label, type: 'url', required: true });

const cabecalho = [t('label', 'Etiqueta'), t('title', 'Título'), ta('description', 'Descrição', 600)];

export const SECTIONS: SectionSchema[] = [
  { nome: 'geral', titulo: 'Dados gerais', fields: [
    t('name', 'Nome do salão'), t('shortName', 'Nome curto'), t('tagline', 'Slogan'),
    t('kicker', 'Frase de destaque (topo)'), ta('description', 'Descrição (Google/redes)', 300),
    img('logo', 'Logótipo'),
    t('phone', 'Telefone (como aparece)'), url('phoneHref', 'Telefone (link, ex. tel:+351...)'),
    url('whatsappHref', 'Link WhatsApp'), t('email', 'Email'),
    t('street', 'Rua'), t('city', 'Cidade'), t('postalCode', 'Código postal'),
    url('instagram', 'Instagram'), url('facebook', 'Facebook'), url('googleReviews', 'Avaliações Google'),
    url('googleMaps', 'Google Maps'), url('mapsEmbed', 'Mapa incorporado (embed)'),
    { name: 'nav', label: 'Menu', type: 'list', itemLabel: 'Link', fields: [t('label', 'Texto'), url('href', 'Destino')] },
  ] },
  { nome: 'hero', titulo: 'Topo (hero)', fields: [
    img('imagem', 'Imagem de fundo'), t('imagemAlt', 'Descrição da imagem'),
    t('titulo', 'Título'), t('destaque', 'Título (2.ª linha, destaque)'), ta('texto', 'Texto', 600),
    t('botaoPrimario', 'Botão principal'), t('botaoSecundario', 'Botão secundário'),
  ] },
  { nome: 'confianca', titulo: 'Faixa de confiança', fields: [
    { name: 'itens', label: 'Pontos', type: 'list', itemLabel: 'Ponto', fields: [t('title', 'Título'), t('description', 'Texto')] },
  ] },
  { nome: 'servicos', titulo: 'Serviços', fields: [
    ...cabecalho,
    { name: 'itens', label: 'Serviços', type: 'list', itemLabel: 'Serviço', fields: [
      t('id', 'Número', 4), t('title', 'Título'), ta('description', 'Descrição', 400),
      { name: 'featured', label: 'Destaque com foto', type: 'boolean' },
      { name: 'image', label: 'Foto (só destaques)', type: 'image' },
      t('alt', 'Descrição da foto', 200, false), t('imagePosition', 'Enquadramento (ex. center 35%)', 40, false),
    ] },
  ] },
  { nome: 'sobre', titulo: 'Sobre nós', fields: [
    t('label', 'Etiqueta'), t('titulo', 'Título'), ta('texto', 'Texto (parágrafos separados por linha em branco)', 3000),
    t('assinatura', 'Assinatura'),
    { name: 'numeros', label: 'Números', type: 'list', itemLabel: 'Número', fields: [t('valor', 'Valor', 40), t('legenda', 'Legenda')] },
  ] },
  { nome: 'galeria', titulo: 'Galeria', fields: [
    ...cabecalho, t('botao', 'Texto do botão'),
    { name: 'itens', label: 'Fotos', type: 'list', itemLabel: 'Foto', fields: [
      img('image', 'Foto'), t('alt', 'Descrição'), t('objectPosition', 'Enquadramento', 40, false),
    ] },
  ] },
  { nome: 'avaliacoes', titulo: 'Avaliações', fields: [
    t('label', 'Etiqueta'), t('title', 'Título'),
    { name: 'score', label: 'Nota Google', type: 'number', required: true },
    { name: 'count', label: 'N.º de críticas', type: 'number', required: true },
    { name: 'itens', label: 'Avaliações', type: 'list', itemLabel: 'Avaliação', fields: [
      t('author', 'Autor'), t('relativeTime', 'Subtítulo'),
      { name: 'rating', label: 'Estrelas (1–5)', type: 'number', required: true },
      { name: 'avatar', label: 'Foto', type: 'image' }, ta('text', 'Texto', 1500),
    ] },
  ] },
  { nome: 'contactos', titulo: 'Contactos', fields: [
    t('label', 'Etiqueta'), t('titulo', 'Título'), ta('texto', 'Texto', 600), t('botao', 'Texto do botão'),
  ] },
  { nome: 'rodape', titulo: 'Rodapé', fields: [
    ta('texto', 'Texto', 400), t('selo', 'Linha inferior'),
  ] },
  { nome: 'privacidade', titulo: 'Política de Privacidade', fields: [
    t('titulo', 'Título'), t('atualizacao', 'Data de atualização'),
    { name: 'html', label: 'Conteúdo (HTML)', type: 'html', required: true, max: 50000 },
  ] },
  { nome: 'termos', titulo: 'Termos de Utilização', fields: [
    t('titulo', 'Título'), t('atualizacao', 'Data de atualização'),
    { name: 'html', label: 'Conteúdo (HTML)', type: 'html', required: true, max: 50000 },
  ] },
];

export const getSchema = (nome: string) => SECTIONS.find((s) => s.nome === nome);
```

- [ ] **Step 4: `src/lib/server/form.ts`**

```ts
import type { Field } from './schemas.ts';

function readField(f: Field, fd: FormData, key: string, uploaded: Record<string, string>): unknown {
  if (f.type === 'list') return readList(f, fd, key, uploaded);
  const raw = fd.get(key);
  if (f.type === 'boolean') return raw === 'on';
  if (f.type === 'image') return uploaded[key] ?? String(raw ?? '');
  const s = typeof raw === 'string' ? raw : '';
  if (f.type === 'number') return s.trim() === '' ? null : Number(s.replace(',', '.'));
  return f.type === 'html' ? s : s.trim();
}

function readList(f: Extract<Field, { type: 'list' }>, fd: FormData, key: string, uploaded: Record<string, string>) {
  const idx = new Set<number>();
  const prefix = `${key}.`;
  for (const k of fd.keys()) if (k.startsWith(prefix)) idx.add(Number(k.slice(prefix.length).split('.')[0]));
  for (const k of Object.keys(uploaded)) if (k.startsWith(prefix)) idx.add(Number(k.slice(prefix.length).split('.')[0]));
  const rows: { ordem: number; item: Record<string, unknown> }[] = [];
  for (const i of [...idx].sort((a, b) => a - b)) {
    const base = `${key}.${i}`;
    if (fd.get(`${base}._remover`) === 'on') continue;
    const item: Record<string, unknown> = {};
    for (const sub of f.fields) item[sub.name] = readField(sub, fd, `${base}.${sub.name}`, uploaded);
    const vazio = f.fields.every((sub) => sub.type === 'boolean' || item[sub.name] === '' || item[sub.name] === null);
    if (vazio) continue;
    rows.push({ ordem: Number(fd.get(`${base}._ordem`) ?? i), item });
  }
  return rows.sort((a, b) => a.ordem - b.ordem).map((r) => r.item);
}

export function parseForm(fields: Field[], fd: FormData, uploaded: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.name] = readField(f, fd, f.name, uploaded);
  return out;
}

const URL_OK = /^(https?:\/\/|tel:|mailto:|\/)/i;

export function validate(fields: Field[], data: Record<string, unknown>, prefixo = ''): string[] {
  const erros: string[] = [];
  for (const f of fields) {
    const v = data[f.name];
    if (f.type === 'list') {
      (Array.isArray(v) ? v : []).forEach((item, i) =>
        erros.push(...validate(f.fields, item as Record<string, unknown>, `${f.itemLabel} ${i + 1}: `)));
      continue;
    }
    const vazio = v === '' || v === null || v === undefined;
    if (f.required && vazio && f.type !== 'boolean') { erros.push(`${prefixo}${f.label} é obrigatório`); continue; }
    if (vazio) continue;
    if (f.type === 'number' && Number.isNaN(v)) erros.push(`${prefixo}${f.label} deve ser um número`);
    if (typeof v === 'string' && f.max && v.length > f.max) erros.push(`${prefixo}${f.label} excede ${f.max} caracteres`);
    if (f.type === 'url' && !URL_OK.test(String(v))) erros.push(`${prefixo}${f.label} não é um endereço válido`);
  }
  return erros;
}
```

- [ ] **Step 5: Rodar testes** → PASS.
- [ ] **Step 6: Commit** `feat: esquemas de seção e parse/validação de formulário`.

---

### Task 5: Leitura/gravação de conteúdo com cache + seed + start

**Files:**
- Create: `src/lib/server/content.ts`, `seed/content.json`, `seed/images/` (cópias), `scripts/seed.ts`, `scripts/start.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: `sql`, `processImage`, `uploadsDir`, `runMigrations`, `SectionName`.
- Produces:
  - `createContentStore(query: (nome: string) => Promise<unknown | undefined>)` → `{ get<T>(nome: SectionName): Promise<T>; invalidate(nome): void }` (lança `ContentUnavailableError` se banco falha e não há cache)
  - `content` (store ligada ao Postgres), `saveSection(nome: SectionName, dados: object): Promise<void>` (grava e invalida)
  - Tipos de dados por seção exportados de `content.ts`: `Geral`, `Hero`, `Confianca`, `Servicos`, `Sobre`, `Galeria`, `Avaliacoes`, `Contactos`, `Rodape`, `Legal` (formas exatamente iguais aos campos de `schemas.ts`)
  - `runSeed(sql, dir: string): Promise<boolean>` (false se já havia conteúdo)

- [ ] **Step 1: Teste que falha** — `tests/content.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { createContentStore, ContentUnavailableError } from '../src/lib/server/content.ts';

describe('content store', () => {
  it('serve do banco e cacheia', async () => {
    const q = vi.fn().mockResolvedValue({ titulo: 'A' });
    const s = createContentStore(q);
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
    expect(q).toHaveBeenCalledTimes(1);
  });
  it('invalidate força nova leitura', async () => {
    const q = vi.fn().mockResolvedValueOnce({ titulo: 'A' }).mockResolvedValueOnce({ titulo: 'B' });
    const s = createContentStore(q);
    await s.get('hero'); s.invalidate('hero');
    expect(await s.get('hero')).toEqual({ titulo: 'B' });
  });
  it('banco fora do ar após invalidate → último valor', async () => {
    const q = vi.fn().mockResolvedValueOnce({ titulo: 'A' }).mockRejectedValueOnce(new Error('down'));
    const s = createContentStore(q);
    await s.get('hero'); s.invalidate('hero');
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
  });
  it('banco fora do ar sem cache → ContentUnavailableError', async () => {
    const s = createContentStore(vi.fn().mockRejectedValue(new Error('down')));
    await expect(s.get('hero')).rejects.toBeInstanceOf(ContentUnavailableError);
  });
  it('seção inexistente → ContentUnavailableError', async () => {
    const s = createContentStore(vi.fn().mockResolvedValue(undefined));
    await expect(s.get('hero')).rejects.toBeInstanceOf(ContentUnavailableError);
  });
});
```

- [ ] **Step 2: Rodar** → FAIL.

- [ ] **Step 3: `src/lib/server/content.ts`**

```ts
import type { SectionName } from './schemas.ts';

export class ContentUnavailableError extends Error {}

type Entry = { valor: unknown; fresco: boolean };

export function createContentStore(query: (nome: string) => Promise<unknown | undefined>) {
  const cache = new Map<string, Entry>();
  return {
    async get<T>(nome: SectionName): Promise<T> {
      const c = cache.get(nome);
      if (c?.fresco) return c.valor as T;
      try {
        const v = await query(nome);
        if (v === undefined) throw new ContentUnavailableError(`Seção ${nome} em falta`);
        cache.set(nome, { valor: v, fresco: true });
        return v as T;
      } catch (e) {
        if (c) return c.valor as T;
        throw e instanceof ContentUnavailableError ? e : new ContentUnavailableError(String(e));
      }
    },
    invalidate(nome: SectionName) {
      const c = cache.get(nome);
      if (c) c.fresco = false;
    },
  };
}

export const content = createContentStore(async (nome) => {
  const { sql } = await import('./db.ts');
  const [row] = await sql`select dados from content where secao = ${nome}`;
  return row?.dados;
});

export async function saveSection(nome: SectionName, dados: object) {
  const { sql } = await import('./db.ts');
  await sql`insert into content (secao, dados) values (${nome}, ${sql.json(dados as never)})
            on conflict (secao) do update set dados = excluded.dados, atualizado_em = now()`;
  content.invalidate(nome);
}

export type NavItem = { label: string; href: string };
export type Geral = {
  name: string; shortName: string; tagline: string; kicker: string; description: string; logo: string;
  phone: string; phoneHref: string; whatsappHref: string; email: string;
  street: string; city: string; postalCode: string;
  instagram: string; facebook: string; googleReviews: string; googleMaps: string; mapsEmbed: string;
  nav: NavItem[];
};
export type Hero = { imagem: string; imagemAlt: string; titulo: string; destaque: string; texto: string; botaoPrimario: string; botaoSecundario: string };
export type Confianca = { itens: { title: string; description: string }[] };
export type Servico = { id: string; title: string; description: string; featured: boolean; image: string; alt: string; imagePosition: string };
export type Servicos = { label: string; title: string; description: string; itens: Servico[] };
export type Sobre = { label: string; titulo: string; texto: string; assinatura: string; numeros: { valor: string; legenda: string }[] };
export type Galeria = { label: string; title: string; description: string; botao: string; itens: { image: string; alt: string; objectPosition: string }[] };
export type Avaliacoes = { label: string; title: string; score: number; count: number; itens: { author: string; relativeTime: string; rating: number; avatar: string; text: string }[] };
export type Contactos = { label: string; titulo: string; texto: string; botao: string };
export type Rodape = { texto: string; selo: string };
export type Legal = { titulo: string; atualizacao: string; html: string };
```

- [ ] **Step 4: Copiar imagens para `seed/images/`**

```bash
mkdir -p seed/images
cp src/assets/images/{logo.jpg,helia2.jpg,helia3.jpg,helia4.jpg,imagem1.png,imagem2.png,imagem3.png,imagem4.png,imagem5.png} seed/images/
cp public/hero/salao.jpg seed/images/salao.jpg
for f in menina-94 felicia-leites alexandra-flores djamila-monteiro claudia-marisa candida-ribeiro; do cp public/reviews/$f.jpg seed/images/review-$f.jpg; done
```

- [ ] **Step 5: `seed/content.json`** — referências de imagem usam `@<nome-do-ficheiro-em-seed/images>`, resolvidas pelo seed. Valores copiados literalmente do site atual:

```json
{
  "geral": {
    "name": "Hélia Dias Cabeleireiros",
    "shortName": "Hélia Dias",
    "tagline": "Cabeleireiro · Estética · Beleza",
    "kicker": "Cabeleireiro & Estética em Esposende",
    "description": "Salão de cabeleireiro e estética em Esposende, desde 1990. Corte, coloração, balayage, tratamentos, alisamento, penteados e estética com atendimento personalizado.",
    "logo": "@logo.jpg",
    "phone": "+351 965 833 809",
    "phoneHref": "tel:+351965833809",
    "whatsappHref": "https://wa.me/351965833809?text=Ol%C3%A1%2C%20gostaria%20de%20marcar%20um%20atendimento%20na%20H%C3%A9lia%20Dias%20Cabeleireiros.",
    "email": "heliadias_cab@hotmail.com",
    "street": "Rua Engenheiro Losa Faria, Loja 5",
    "city": "Esposende",
    "postalCode": "4740-268",
    "instagram": "https://www.instagram.com/heliadiascabeleireiros/",
    "facebook": "https://www.facebook.com/heliadias.cabeleireiros/",
    "googleReviews": "https://share.google/XS2T3caRT50eCiXbB",
    "googleMaps": "<copiar site.links.googleMaps de src/data/site.ts>",
    "mapsEmbed": "<copiar site.links.mapsEmbed de src/data/site.ts>",
    "nav": [
      { "label": "Serviços", "href": "/#servicos" },
      { "label": "Sobre Nós", "href": "/#sobre" },
      { "label": "Galeria", "href": "/#galeria" },
      { "label": "Contactos", "href": "/#contactos" }
    ]
  },
  "hero": {
    "imagem": "@salao.jpg",
    "imagemAlt": "Interior do salão Hélia Dias Cabeleireiros em Esposende",
    "titulo": "O seu cabelo.",
    "destaque": "A sua melhor versão.",
    "texto": "Há mais de três décadas que cuidamos da beleza e do bem-estar de quem nos procura, com experiência, atenção ao detalhe e um atendimento verdadeiramente personalizado.",
    "botaoPrimario": "Marcar atendimento",
    "botaoSecundario": "Conhecer os nossos serviços"
  },
  "confianca": { "itens": [
    { "title": "Desde 1990", "description": "Experiência que faz a diferença" },
    { "title": "Atendimento personalizado", "description": "Pensado para si" },
    { "title": "Cabelo & beleza", "description": "Tudo num só espaço" },
    { "title": "Em Esposende", "description": "Perto de si" }
  ] },
  "servicos": {
    "label": "Os nossos serviços",
    "title": "Cuidados pensados para si",
    "description": "Do corte à cor, dos tratamentos aos momentos mais especiais, trabalhamos cada serviço de forma personalizada para valorizar a sua beleza e respeitar a identidade do seu cabelo.",
    "itens": [
      { "id": "01", "title": "Corte & Styling", "description": "Cortes femininos e masculinos, brushing e styling adaptados ao seu rosto, estilo e rotina.", "featured": true, "image": "@helia3.jpg", "alt": "Corte acabado com movimento e brilho", "imagePosition": "center 35%" },
      { "id": "02", "title": "Coloração & Balayage", "description": "Cor, madeixas, balayage e técnicas de iluminação para um resultado natural, harmonioso e à sua medida.", "featured": false, "image": "", "alt": "", "imagePosition": "" },
      { "id": "03", "title": "Tratamentos Capilares", "description": "Cuidados específicos para recuperar hidratação, brilho, força e suavidade do cabelo.", "featured": false, "image": "", "alt": "", "imagePosition": "" },
      { "id": "04", "title": "Alisamento & Transformação", "description": "Soluções profissionais para controlar o volume, alinhar o cabelo e facilitar o seu dia a dia.", "featured": false, "image": "", "alt": "", "imagePosition": "" },
      { "id": "05", "title": "Penteados & Cerimónias", "description": "Penteados elegantes para casamentos, festas e todos os momentos que merecem um cuidado especial.", "featured": true, "image": "@helia4.jpg", "alt": "Penteado de cerimónia meio preso", "imagePosition": "center 25%" },
      { "id": "06", "title": "Estética & Beleza", "description": "Um espaço onde encontra outros cuidados de beleza e bem-estar para complementar o seu momento.", "featured": false, "image": "", "alt": "", "imagePosition": "" }
    ]
  },
  "sobre": {
    "label": "Sobre nós",
    "titulo": "Mais do que mudar o cabelo, queremos que se sinta bem.",
    "texto": "Desde 1990, a Hélia Dias Cabeleireiros tem uma missão simples: receber cada pessoa com proximidade, compreender aquilo que procura e encontrar a solução certa para si.\n\nAo longo dos anos, acompanhámos tendências, técnicas e novas formas de cuidar do cabelo, sem nunca perder aquilo que consideramos essencial: ouvir primeiro, aconselhar com honestidade e cuidar de cada detalhe.\n\nPorque um bom resultado começa muito antes da tesoura ou da cor. Começa por perceber quem está sentado à nossa frente.",
    "assinatura": "Hélia Dias",
    "numeros": [
      { "valor": "1990", "legenda": "Ano de fundação" },
      { "valor": "Esposende", "legenda": "No centro da cidade" }
    ]
  },
  "galeria": {
    "label": "O nosso trabalho",
    "title": "Resultados que falam por si",
    "description": "Cortes, cores e transformações criadas diariamente no nosso salão.",
    "botao": "Ver mais no Instagram",
    "itens": [
      { "image": "@imagem1.png", "alt": "Trabalho de cabeleireiro Hélia Dias Cabeleireiros", "objectPosition": "" },
      { "image": "@imagem2.png", "alt": "Coloração e styling no salão Hélia Dias", "objectPosition": "" },
      { "image": "@imagem3.png", "alt": "Resultado de corte e tratamento capilar", "objectPosition": "" },
      { "image": "@imagem4.png", "alt": "Penteado e acabamento profissional", "objectPosition": "" },
      { "image": "@imagem5.png", "alt": "Transformação capilar Hélia Dias Cabeleireiros", "objectPosition": "" },
      { "image": "@helia2.jpg", "alt": "Ambiente e trabalho no salão Hélia Dias", "objectPosition": "center center" }
    ]
  },
  "avaliacoes": {
    "label": "Quem nos visita",
    "title": "A melhor recomendação vem de quem já passou pelas nossas mãos.",
    "score": 4.7,
    "count": 93,
    "itens": "<copiar os 6 itens de src/data/reviews.ts: author, relativeTime, rating, text; avatar = \"@review-<slug>.jpg\" onde <slug> é o nome do ficheiro atual em /reviews sem .jpg>"
  },
  "contactos": {
    "label": "Contactos",
    "titulo": "Estamos em Esposende",
    "texto": "Marque o seu atendimento por WhatsApp ou ligue-nos. Estamos na Rua Engenheiro Losa Faria, no centro de Esposende.",
    "botao": "Marcar atendimento"
  },
  "rodape": {
    "texto": "Salão de cabeleireiro e estética em Esposende, com atendimento personalizado desde 1990.",
    "selo": "Desde 1990 · Esposende"
  },
  "privacidade": { "titulo": "Política de Privacidade", "atualizacao": "31 de agosto de 2026", "html": "<ver instrução abaixo>" },
  "termos": { "titulo": "Termos de Utilização", "atualizacao": "<ler de termos-de-utilizacao.astro>", "html": "<ver instrução abaixo>" }
}
```

Instruções para os valores marcados `<...>` (substituir antes de commitar; nenhum `<` de marcador pode restar — o Step 8 verifica):
- `googleMaps`, `mapsEmbed`: copiar a string exata de `src/data/site.ts`.
- `avaliacoes.itens`: array com os 6 objetos de `src/data/reviews.ts`, no formato `{ "author", "relativeTime", "rating", "avatar": "@review-menina-94.jpg", "text" }` etc.
- `privacidade.html` / `termos.html`: o markup dentro de `<LegalLayout>` da página correspondente **a partir do primeiro `<p>` após `legal-meta`** (sem kicker, `h1` e data, que viram campos), com cada expressão `{site.x}` substituída pelo valor literal de `site.ts` e `{site.url.replace('https://', '')}` por `heliadiascabeleireiros.pt`. Escapar para JSON (usar `JSON.stringify` num script Node descartável).

- [ ] **Step 6: `scripts/seed.ts`**

```ts
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
  const cache = new Map<string, string>();

  async function resolve(v: unknown): Promise<unknown> {
    if (typeof v === 'string' && v.startsWith('@')) {
      const nome = v.slice(1);
      if (!cache.has(nome)) {
        const buf = await readFile(join(SEED, 'images', nome));
        const r = await processImage(buf, MIME[nome.split('.').pop()!], dir);
        await sql`insert into imagens (id, arquivo, alt, largura, altura)
                  values (${r.arquivo}, ${r.arquivo}, ${nome}, ${r.largura}, ${r.altura})`;
        cache.set(nome, r.arquivo);
      }
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

  await sql.begin(async (tx) => {
    for (const [secao, valor] of Object.entries(dados)) {
      const final = await resolve(valor);
      await tx`insert into content (secao, dados) values (${secao}, ${tx.json(final as never)})`;
    }
  });
  return true;
}

if (import.meta.main) {
  const { sql } = await import('../src/lib/server/db.ts');
  const { uploadsDir } = await import('../src/lib/server/images.ts');
  console.log((await runSeed(sql, uploadsDir())) ? 'Seed aplicado' : 'Conteúdo já existe — seed ignorado');
  await sql.end();
}
```

- [ ] **Step 7: `scripts/start.ts`**

```ts
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
```

- [ ] **Step 8: Verificar**

```bash
npx vitest run tests/content.test.ts          # PASS
node -e "const s=require('fs').readFileSync('seed/content.json','utf8'); JSON.parse(s); if(/<(copiar|ver|ler)/.test(s)) throw 'marcador por substituir'"
npm run seed                                  # "Seed aplicado"
npm run seed                                  # "Conteúdo já existe — seed ignorado"
ls data/uploads | wc -l                       # 32 (16 imagens × 2)
```

- [ ] **Step 9: Commit** `feat: store de conteúdo com cache, seed e script de arranque`.

---

### Task 6: Site público lê do banco

**Files:**
- Modify: `src/layouts/Layout.astro`, `src/layouts/LegalLayout.astro`, `src/components/{Header,Hero,TrustBar,Services,About,Gallery,Reviews,Contact,Footer}.astro`, `src/pages/politica-de-privacidade.astro`, `src/pages/termos-de-utilizacao.astro`
- Create: `src/pages/500.astro`
- Delete: `src/data/site.ts`, `src/data/reviews.ts`, `src/assets/images/*` (após verificar que nada importa)

**Interfaces:**
- Consumes: `content.get<T>()` e tipos de Task 5; `<Img>` de Task 3.

Regra geral para cada componente: no frontmatter, `const g = await content.get<Geral>('geral')` (e a seção própria); substituir cada texto literal e cada `site.*` pelo campo correspondente; trocar `<Image src={logo…}>` por `<Img arquivo={g.logo} alt={g.name} sizes="64px" class=… />` mantendo as mesmas classes. Mapa `site.*` → `Geral`: `site.name→name`, `site.tagline→tagline`, `site.kicker→kicker`, `site.description→description`, `site.phone→phone`, `site.phoneHref→phoneHref`, `site.whatsappHref→whatsappHref`, `site.email→email`, `site.address.street→street`, `.city→city`, `.postalCode→postalCode`, `site.address.full→` `${street}, ${city}`, `site.links.*→` campo de mesmo nome, `nav→g.nav`, texto “Hélia Dias” do header/rodapé → `g.shortName`. `site.url` e `site.geo` passam a constantes em `Layout.astro` (não editáveis).

- [ ] **Step 1: Hero** — exemplo completo do padrão:

```astro
---
import { content, type Geral, type Hero } from '../lib/server/content.ts';
import Button from './Button.astro';
import Img from './Img.astro';
const g = await content.get<Geral>('geral');
const h = await content.get<Hero>('hero');
---
<section class="hero relative flex min-h-[92vh] items-end overflow-hidden md:min-h-[88vh]">
  <div class="absolute inset-0">
    <Img arquivo={h.imagem} alt={h.imagemAlt} class="hero-bg h-full w-full object-cover object-center" loading="eager" fetchpriority="high" />
    <!-- gradiente inalterado -->
  </div>
  <div class="relative w-full px-5 pb-14 pt-32 md:px-8 md:pb-20 lg:px-12 lg:pb-24">
    <div class="container-wide max-w-3xl">
      <p class="hero-kicker mb-4">{g.kicker}</p>
      <h1 class="…mesmas classes…">{h.titulo}<br /><span class="hero-accent">{h.destaque}</span></h1>
      <p class="…">{h.texto}</p>
      <div class="…">
        <Button href={g.whatsappHref} external>{h.botaoPrimario}</Button>
        <Button href="#servicos" variant="secondary" class="…">{h.botaoSecundario}</Button>
      </div>
    </div>
  </div>
</section>
```

(“…” = classes existentes sem alteração; `<style>` inalterado.)

- [ ] **Step 2: TrustBar** — `const c = await content.get<Confianca>('confianca')`; `trustPoints.map` → `c.itens.map`.

- [ ] **Step 3: Services** — `const s = await content.get<Servicos>('servicos')`; `SectionHeading label={s.label} title={s.title} description={s.description}`; `featured = s.itens.filter(i => i.featured)`, `standard = …!featured`; imagem destaque: `{service.image && <Img arquivo={service.image} alt={service.alt || service.title} sizes="(max-width: 1024px) 100vw, 50vw" class="…" style={service.imagePosition ? \`object-position: ${service.imagePosition}\` : undefined} />}`. Remover imports de `helia3/helia4`.

- [ ] **Step 4: About** — `sobre` + `geral`: logo via `<Img arquivo={g.logo} alt={g.name} sizes="120px" …/>`; kicker `{a.label}`; h2 `{a.titulo}`; assinatura `{a.assinatura}`; parágrafos:
```astro
{a.texto.split(/\n\s*\n/).map((p) => <p>{p.trim()}</p>)}
```
`<dl>`: `{a.numeros.map((n) => <div><dt class="font-serif text-3xl text-ink">{n.valor}</dt><dd class="mt-1 text-sm text-ink-muted">{n.legenda}</dd></div>)}`.

- [ ] **Step 5: Gallery** — `galeria` + `geral`; `SectionHeading` com `gl.label/title/description`; `item.image` → `<Img arquivo={item.image} alt={item.alt} sizes="(max-width: 768px) 45vw, 220px" class="…" style={item.objectPosition ? … : undefined} />`; botão `{gl.botao}` com `href={g.instagram}`.

- [ ] **Step 6: Reviews** — `const r = await content.get<Avaliacoes>('avaliacoes')`; `label/title` de `r`; `googleRating.score→r.score`, `.count→r.count`; `reviews→r.itens`; `ReviewAvatar avatar={review.avatar ? imgSrc(review.avatar, 800) : null}` (importar `imgSrc`).

- [ ] **Step 7: Contact** — `contactos` + `geral`: kicker `{c.label}`, h2 `{c.titulo}`, texto `{c.texto}`, morada `{g.street}`/`{g.city}`, telefone, botão `{c.botao}`, iframe `src={g.mapsEmbed}`.

- [ ] **Step 8: Header e Footer** — `geral` (+ `rodape` no footer): `nav`→`g.nav`, logo via `<Img>`, “Hélia Dias”→`{g.shortName}`, `{site.tagline}`→`{g.tagline}`, parágrafo do rodapé→`{rf.texto}`, “Desde 1990 · Esposende”→`{rf.selo}`, links `site.links.x`→`g.x`, morada `{g.street}<br/>{g.postalCode} {g.city}`.

- [ ] **Step 9: Layout** — `geral` + `hero`:
```ts
const SITE_URL = 'https://heliadiascabeleireiros.pt';
const GEO = { latitude: 41.533734, longitude: -8.7795553 };
const g = await content.get<Geral>('geral');
const h = await content.get<Hero>('hero');
const { title = `${g.name} | ${g.kicker}`, description = g.description } = Astro.props;
const ogImage = new URL(imgSrc(h.imagem, 1600), SITE_URL).href;
```
e no `jsonLd` trocar `site.*` pelos campos de `g` (endereço de `g.street/city/postalCode`, `sameAs: [g.instagram, g.facebook]`).

- [ ] **Step 10: Páginas legais** — ex. `politica-de-privacidade.astro`:
```astro
---
import LegalLayout from '../layouts/LegalLayout.astro';
import { content, type Geral, type Legal } from '../lib/server/content.ts';
const g = await content.get<Geral>('geral');
const p = await content.get<Legal>('privacidade');
---
<LegalLayout title={`${p.titulo} | ${g.name}`} description={`${p.titulo} do website ${g.name}.`}>
  <p class="kicker">Legal</p>
  <h1>{p.titulo}</h1>
  <p class="legal-meta">Última atualização: {p.atualizacao}</p>
  <Fragment set:html={p.html} />
</LegalLayout>
```
Idem `termos-de-utilizacao.astro` com `'termos'`. Remover import não usado de `site` em `LegalLayout.astro`.

- [ ] **Step 11: `src/pages/500.astro`** (renderizada quando `ContentUnavailableError` sobe sem cache)
```astro
---
---
<html lang="pt-PT"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Voltamos já</title></head>
<body style="font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f1e8;color:#1c1614">
  <div style="text-align:center;padding:1rem"><h1>Voltamos já</h1><p>O site está temporariamente indisponível. Ligue +351 965 833 809.</p></div>
</body></html>
```

- [ ] **Step 12: Remover dados/imagens antigos**

```bash
grep -rn "data/site\|data/reviews\|assets/images" src   # Expected: nenhuma linha
git rm src/data/site.ts src/data/reviews.ts src/assets/images/*
```

- [ ] **Step 13: Verificar**

```bash
npx astro check                      # 0 errors
npm run build
node --env-file=.env dist/server/entry.mjs &   # porta 4321
```
Abrir `http://localhost:4321`, `/politica-de-privacidade`, `/termos-de-utilizacao` e comparar visualmente com `git stash`/produção atual (screenshots lado a lado via Playwright MCP). Critério: textos e imagens idênticos. Parar o banco (`docker compose -f docker-compose.dev.yml stop`) e recarregar: página continua a abrir (cache). Religar o banco.

- [ ] **Step 14: Commit** `feat: site público lê conteúdo do Postgres`.

---

### Task 7: Banner — regra, gravação e exibição

**Files:**
- Create: `src/lib/server/banner.ts`, `src/components/PromoBanner.astro`
- Modify: `src/layouts/Layout.astro` (inserir `<PromoBanner />` como primeiro filho de `<body>`)
- Test: `tests/banner.test.ts`

**Interfaces:**
- Produces:
  - `type Banner = { ativo: boolean; modo: 'faixa' | 'popup'; titulo: string; texto: string; imagem: string | null; link: string | null; texto_botao: string | null; inicio: Date | null; fim: Date | null; atualizado_em: Date }`
  - `isBannerVisible(b: Banner, now: Date): boolean`
  - `parseBannerForm(fd: FormData, imagemUpload: string | null): { dados: Omit<Banner, 'atualizado_em'>; erros: string[] }`
  - `getBanner(): Promise<Banner>`, `saveBanner(d: Omit<Banner, 'atualizado_em'>): Promise<void>`
  - `toLocalInput(d: Date | null): string` (para preencher `datetime-local`)

- [ ] **Step 1: Testes que falham** — `tests/banner.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { isBannerVisible, parseBannerForm, toLocalInput, type Banner } from '../src/lib/server/banner.ts';

const base: Banner = { ativo: true, modo: 'faixa', titulo: 'Promo', texto: '', imagem: null, link: null,
  texto_botao: null, inicio: null, fim: null, atualizado_em: new Date(0) };
const d = (s: string) => new Date(s);

describe('isBannerVisible', () => {
  it('inativo nunca aparece', () => expect(isBannerVisible({ ...base, ativo: false }, d('2026-10-01'))).toBe(false));
  it('ativo sem datas aparece', () => expect(isBannerVisible(base, d('2026-10-01'))).toBe(true));
  it('antes do início não aparece', () =>
    expect(isBannerVisible({ ...base, inicio: d('2026-10-02T00:00:00Z') }, d('2026-10-01T23:59:59Z'))).toBe(false));
  it('depois do fim não aparece', () =>
    expect(isBannerVisible({ ...base, fim: d('2026-10-02T00:00:00Z') }, d('2026-10-02T00:00:01Z'))).toBe(false));
  it('entre início e fim aparece (limites inclusivos)', () => {
    const b = { ...base, inicio: d('2026-10-01T00:00:00Z'), fim: d('2026-10-02T00:00:00Z') };
    expect(isBannerVisible(b, d('2026-10-01T00:00:00Z'))).toBe(true);
    expect(isBannerVisible(b, d('2026-10-02T00:00:00Z'))).toBe(true);
  });
});

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

describe('parseBannerForm', () => {
  it('interpreta datetime-local em Europe/Lisbon (verão = UTC+1)', () => {
    const { dados, erros } = parseBannerForm(fd({ ativo: 'on', modo: 'popup', titulo: 'X', inicio: '2026-10-01T09:00' }), null);
    expect(erros).toEqual([]);
    expect(dados.inicio!.toISOString()).toBe('2026-10-01T08:00:00.000Z');
    expect(dados.modo).toBe('popup');
    expect(dados.ativo).toBe(true);
  });
  it('fim antes do início é erro', () => {
    const { erros } = parseBannerForm(fd({ titulo: 'X', modo: 'faixa', inicio: '2026-10-05T00:00', fim: '2026-10-01T00:00' }), null);
    expect(erros).toContain('A data de fim tem de ser posterior à de início');
  });
  it('título obrigatório quando ativo; modo inválido vira faixa', () => {
    const { dados, erros } = parseBannerForm(fd({ ativo: 'on', modo: 'xpto', titulo: '' }), null);
    expect(erros).toContain('Título é obrigatório');
    expect(dados.modo).toBe('faixa');
  });
  it('link inválido é erro; vazio vira null', () => {
    expect(parseBannerForm(fd({ titulo: 'X', link: 'javascript:x' }), null).erros).toContain('Link não é um endereço válido');
    expect(parseBannerForm(fd({ titulo: 'X', link: '' }), null).dados.link).toBeNull();
  });
  it('upload tem prioridade sobre imagem selecionada; "remover" limpa', () => {
    expect(parseBannerForm(fd({ titulo: 'X', imagem: 'a' }), 'b').dados.imagem).toBe('b');
    expect(parseBannerForm(fd({ titulo: 'X', imagem: '' }), null).dados.imagem).toBeNull();
  });
  it('toLocalInput faz ida e volta', () => {
    expect(toLocalInput(new Date('2026-10-01T08:00:00Z'))).toBe('2026-10-01T09:00');
    expect(toLocalInput(null)).toBe('');
  });
});
```

- [ ] **Step 2: Rodar** → FAIL.

- [ ] **Step 3: `src/lib/server/banner.ts`**

```ts
export type Banner = {
  ativo: boolean; modo: 'faixa' | 'popup'; titulo: string; texto: string; imagem: string | null;
  link: string | null; texto_botao: string | null; inicio: Date | null; fim: Date | null; atualizado_em: Date;
};
type Dados = Omit<Banner, 'atualizado_em'>;

export function isBannerVisible(b: Banner, now: Date): boolean {
  if (!b.ativo) return false;
  if (b.inicio && now < b.inicio) return false;
  if (b.fim && now > b.fim) return false;
  return true;
}

// `new Date('YYYY-MM-DDTHH:mm')` sem fuso usa o TZ do processo (Europe/Lisbon no container e nos testes).
const parseLocal = (s: string) => (s ? new Date(s) : null);
const pad = (n: number) => String(n).padStart(2, '0');
export const toLocalInput = (d: Date | null) =>
  d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : '';

const URL_OK = /^(https?:\/\/|tel:|mailto:|\/)/i;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export function parseBannerForm(fd: FormData, imagemUpload: string | null) {
  const dados: Dados = {
    ativo: fd.get('ativo') === 'on',
    modo: fd.get('modo') === 'popup' ? 'popup' : 'faixa',
    titulo: str(fd, 'titulo'),
    texto: str(fd, 'texto'),
    imagem: imagemUpload ?? (str(fd, 'imagem') || null),
    link: str(fd, 'link') || null,
    texto_botao: str(fd, 'texto_botao') || null,
    inicio: parseLocal(str(fd, 'inicio')),
    fim: parseLocal(str(fd, 'fim')),
  };
  const erros: string[] = [];
  if (!dados.titulo) erros.push('Título é obrigatório');
  if (dados.titulo.length > 120) erros.push('Título excede 120 caracteres');
  if (dados.texto.length > 500) erros.push('Texto excede 500 caracteres');
  if (dados.link && !URL_OK.test(dados.link)) erros.push('Link não é um endereço válido');
  if (dados.inicio && dados.fim && dados.fim <= dados.inicio) erros.push('A data de fim tem de ser posterior à de início');
  return { dados, erros };
}

export async function getBanner(): Promise<Banner> {
  const { sql } = await import('./db.ts');
  const [b] = await sql<Banner[]>`select ativo, modo, titulo, texto, imagem, link, texto_botao, inicio, fim, atualizado_em from banner where id = 1`;
  return b;
}

export async function saveBanner(d: Dados) {
  const { sql } = await import('./db.ts');
  await sql`update banner set ativo=${d.ativo}, modo=${d.modo}, titulo=${d.titulo}, texto=${d.texto},
    imagem=${d.imagem}, link=${d.link}, texto_botao=${d.texto_botao}, inicio=${d.inicio}, fim=${d.fim},
    atualizado_em=now() where id = 1`;
}
```

(O banner não usa o cache de `content`: é uma linha pequena lida por pedido; se o banco falhar, o `PromoBanner` apanha o erro e não mostra nada.)

- [ ] **Step 4: Rodar testes** → PASS.

- [ ] **Step 5: `src/components/PromoBanner.astro`**

```astro
---
import { getBanner, isBannerVisible, type Banner } from '../lib/server/banner.ts';
import Img from './Img.astro';

let b: Banner | null = null;
try { b = await getBanner(); } catch { b = null; }
const show = b && isBannerVisible(b, new Date());
const key = b ? `hd-banner-${b.atualizado_em.getTime()}` : '';
const externo = b?.link?.startsWith('http');
---
{show && b && (
  <div id="promo" data-key={key} data-modo={b.modo} hidden>
    {b.modo === 'faixa' ? (
      <div class="relative z-[60] bg-burgundy px-12 py-2.5 text-center text-sm text-ivory">
        <strong class="font-medium">{b.titulo}</strong>
        {b.texto && <span class="ml-2 text-ivory/85">{b.texto}</span>}
        {b.link && <a href={b.link} class="ml-3 underline underline-offset-2" target={externo ? '_blank' : undefined} rel={externo ? 'noopener noreferrer' : undefined}>{b.texto_botao || 'Saber mais'}</a>}
        <button type="button" data-fechar class="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label="Fechar">✕</button>
      </div>
    ) : (
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-5" data-fundo>
        <div role="dialog" aria-modal="true" aria-labelledby="promo-titulo" class="relative w-full max-w-md overflow-hidden rounded-sm bg-ivory shadow-2xl">
          {b.imagem && <Img arquivo={b.imagem} alt="" sizes="448px" class="aspect-[16/10] w-full object-cover" />}
          <div class="p-6 text-center">
            <h2 id="promo-titulo" class="font-serif text-3xl text-ink">{b.titulo}</h2>
            {b.texto && <p class="mt-3 text-ink-muted">{b.texto}</p>}
            {b.link && <a href={b.link} class="btn-primary mt-6 inline-block" target={externo ? '_blank' : undefined} rel={externo ? 'noopener noreferrer' : undefined}>{b.texto_botao || 'Saber mais'}</a>}
          </div>
          <button type="button" data-fechar class="absolute right-3 top-3 rounded-full bg-ivory/80 p-1.5 text-ink" aria-label="Fechar">✕</button>
        </div>
      </div>
    )}
  </div>
)}

<script>
  const el = document.getElementById('promo');
  if (el) {
    const key = el.dataset.key!;
    let fechado = false;
    try { fechado = localStorage.getItem(key) === '1'; } catch {}
    if (!fechado) {
      const anterior = document.activeElement as HTMLElement | null;
      const fechar = () => {
        el.hidden = true;
        try { localStorage.setItem(key, '1'); } catch {}
        document.removeEventListener('keydown', onKey);
        anterior?.focus();
      };
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
      el.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fechar));
      el.querySelector('[data-fundo]')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) fechar(); });
      const abrir = () => {
        el.hidden = false;
        document.addEventListener('keydown', onKey);
        if (el.dataset.modo === 'popup') el.querySelector<HTMLElement>('[data-fechar]')?.focus();
      };
      el.dataset.modo === 'popup' ? setTimeout(abrir, 1500) : abrir();
    }
  }
</script>
```

Observação: a faixa fica acima do `<header class="fixed top-0">`; para não ficar por baixo dele, envolver a faixa em `sticky top-0` **ou** aceitar que o header fixo a sobrepõe. Decisão: faixa com `class="sticky top-0 z-[60] …"` e o header recebe `top-[var(--promo-h,0px)]`; no script, após abrir a faixa: `document.documentElement.style.setProperty('--promo-h', el.offsetHeight + 'px')`, e ao fechar `setProperty('--promo-h', '0px')`. Em `Header.astro` trocar `top-0` por `top-[var(--promo-h,0px)]` no `<header>`.

- [ ] **Step 6: Verificar manualmente** — `update banner set ativo=true, titulo='Teste'` via `psql`, abrir home: faixa aparece, header desce, ✕ fecha e não volta no reload; `modo='popup'`: abre após ~1,5 s, Esc/fundo/✕ fecham, foco vai para ✕. Desativar e confirmar que some.

- [ ] **Step 7: Commit** `feat: banner de promoção (faixa/pop-up) com datas`.

---

### Task 8: Autenticação no painel (middleware, login, logout, layout)

**Files:**
- Create: `src/middleware.ts`, `src/pages/admin/login.astro`, `src/pages/admin/logout.ts`, `src/components/admin/AdminLayout.astro`
- Test: `tests/middleware.test.ts`

**Interfaces:**
- Consumes: `verifySessionToken`, `createSessionToken`, `SESSION_COOKIE`, `SESSION_MAX_AGE_S`, `checkCredentials`, `loginLimiter`.
- Produces: `needsAuth(pathname: string): boolean`; `<AdminLayout title>` com slot; cookie de sessão definido no login.

- [ ] **Step 1: Teste que falha** — `tests/middleware.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { needsAuth } from '../src/middleware.ts';

describe('needsAuth', () => {
  it.each(['/admin', '/admin/', '/admin/secao/hero', '/admin/banner', '/ADMIN/banner'])('protege %s', (p) =>
    expect(needsAuth(p)).toBe(true));
  it.each(['/', '/admin/login', '/administracao', '/uploads/x.webp'])('não protege %s', (p) =>
    expect(needsAuth(p)).toBe(false));
});
```

(O teste importa `src/middleware.ts`; o arquivo só pode importar `astro:middleware` **tipos** — usar `import type { MiddlewareHandler } from 'astro'` para rodar em Vitest.)

- [ ] **Step 2: Rodar** → FAIL.

- [ ] **Step 3: `src/middleware.ts`**

```ts
import type { MiddlewareHandler } from 'astro';
import { SESSION_COOKIE, verifySessionToken } from './lib/server/session.ts';

export function needsAuth(pathname: string): boolean {
  const p = pathname.toLowerCase().replace(/\/+$/, '');
  return (p === '/admin' || p.startsWith('/admin/')) && p !== '/admin/login';
}

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  if (needsAuth(ctx.url.pathname)) {
    const ok = verifySessionToken(ctx.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '', Date.now());
    if (!ok) return ctx.redirect('/admin/login');
  }
  const res = await next();
  if (ctx.url.pathname.toLowerCase().startsWith('/admin')) res.headers.set('Cache-Control', 'no-store');
  return res;
};
```

- [ ] **Step 4: Rodar teste** → PASS.

- [ ] **Step 5: `src/components/admin/AdminLayout.astro`**

```astro
---
import '../../styles/global.css';
interface Props { title: string }
const { title } = Astro.props;
---
<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>{title} · Painel</title>
  </head>
  <body class="min-h-screen bg-ivory-dark text-ink">
    <header class="border-b border-ink/10 bg-ivory">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <a href="/admin" class="font-serif text-xl">Painel</a>
        <nav class="flex gap-4 text-sm">
          <a href="/" target="_blank" class="underline">Ver site</a>
          <form method="post" action="/admin/logout"><button class="underline">Sair</button></form>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-4xl px-4 py-8"><slot /></main>
  </body>
</html>
```

- [ ] **Step 6: `src/pages/admin/login.astro`**

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.astro';
import { checkCredentials, loginLimiter } from '../../lib/server/auth.ts';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_S } from '../../lib/server/session.ts';

let erro = '';
if (Astro.request.method === 'POST') {
  const ip = Astro.clientAddress;
  const now = Date.now();
  if (loginLimiter.isBlocked(ip, now)) {
    erro = 'Demasiadas tentativas. Tente novamente dentro de 15 minutos.';
  } else {
    const fd = await Astro.request.formData();
    if (await checkCredentials(String(fd.get('usuario') ?? ''), String(fd.get('senha') ?? ''))) {
      loginLimiter.reset(ip);
      Astro.cookies.set(SESSION_COOKIE, createSessionToken(process.env.SESSION_SECRET!, now), {
        httpOnly: true, secure: import.meta.env.PROD, sameSite: 'strict', path: '/', maxAge: SESSION_MAX_AGE_S,
      });
      return Astro.redirect('/admin');
    }
    loginLimiter.fail(ip, now);
    erro = 'Utilizador ou palavra-passe incorretos.';
  }
}
---
<AdminLayout title="Entrar">
  <form method="post" class="mx-auto max-w-sm space-y-4 rounded-sm bg-ivory p-6 shadow-sm">
    <h1 class="font-serif text-3xl">Entrar</h1>
    {erro && <p role="alert" class="text-sm text-burgundy">{erro}</p>}
    <label class="block text-sm">Utilizador<input name="usuario" autocomplete="username" required class="mt-1 w-full rounded-sm border border-ink/20 px-3 py-2" /></label>
    <label class="block text-sm">Palavra-passe<input name="senha" type="password" autocomplete="current-password" required class="mt-1 w-full rounded-sm border border-ink/20 px-3 py-2" /></label>
    <button class="btn-primary w-full">Entrar</button>
  </form>
</AdminLayout>
```

(No layout de login os links “Sair/Ver site” aparecem; aceitável. Se incomodar, adicionar prop `semNav`.)

- [ ] **Step 7: `src/pages/admin/logout.ts`**

```ts
import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/server/session.ts';

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/admin/login');
};
```

- [ ] **Step 8: Verificar** — `npm run dev`; `/admin` redireciona para login; senha errada 5× → mensagem de bloqueio; senha certa (hash no `.env` gerado com `npm run hash-senha -- teste`) → `/admin` (404 até Task 9 — esperado); Sair → volta ao login.

- [ ] **Step 9: Commit** `feat: login, logout e proteção de /admin`.

---

### Task 9: Editores do painel (seções e banner)

**Files:**
- Create: `src/components/admin/Field.astro`, `src/components/admin/ImageField.astro`, `src/pages/admin/index.astro`, `src/pages/admin/secao/[nome].astro`, `src/pages/admin/banner.astro`, `src/lib/server/uploads-from-form.ts`
- Test: `tests/uploads-from-form.test.ts`

**Interfaces:**
- Consumes: `SECTIONS`, `getSchema`, `parseForm`, `validate`, `content`, `saveSection`, `saveUpload`, `listImages`, `UploadError`, `imgSrc`, `getBanner`, `saveBanner`, `parseBannerForm`, `toLocalInput`.
- Produces: `collectUploads(fd: FormData, save: (f: File) => Promise<string>): Promise<{ uploaded: Record<string, string>; erros: string[] }>` — para cada entrada `<campo>__file` com `File` não vazio, grava e mapeia `<campo>` → `arquivo`.

- [ ] **Step 1: Teste que falha** — `tests/uploads-from-form.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { collectUploads } from '../src/lib/server/uploads-from-form.ts';
import { UploadError } from '../src/lib/server/images.ts';

describe('collectUploads', () => {
  it('mapeia campos com ficheiro e ignora vazios', async () => {
    const fd = new FormData();
    fd.append('foto__file', new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }));
    fd.append('itens.2.img__file', new File([], '', { type: 'application/octet-stream' }));
    fd.append('titulo', 'x');
    const save = vi.fn().mockResolvedValue('arq');
    const r = await collectUploads(fd, save);
    expect(r).toEqual({ uploaded: { foto: 'arq' }, erros: [] });
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('converte UploadError em mensagem', async () => {
    const fd = new FormData();
    fd.append('foto__file', new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' }));
    const r = await collectUploads(fd, () => Promise.reject(new UploadError('Formato não suportado. Use JPG, PNG ou WebP.')));
    expect(r.erros).toEqual(['a.gif: Formato não suportado. Use JPG, PNG ou WebP.']);
  });
});
```

- [ ] **Step 2: Rodar** → FAIL.

- [ ] **Step 3: `src/lib/server/uploads-from-form.ts`**

```ts
import { UploadError } from './images.ts';

export async function collectUploads(fd: FormData, save: (f: File) => Promise<string>) {
  const uploaded: Record<string, string> = {};
  const erros: string[] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.endsWith('__file') || !(v instanceof File) || v.size === 0) continue;
    try {
      uploaded[k.slice(0, -'__file'.length)] = await save(v);
    } catch (e) {
      if (e instanceof UploadError) erros.push(`${v.name}: ${e.message}`);
      else throw e;
    }
  }
  return { uploaded, erros };
}
```

- [ ] **Step 4: Rodar teste** → PASS.

- [ ] **Step 5: `src/components/admin/ImageField.astro`**

```astro
---
import { imgSrc } from '../../lib/server/images.ts';
interface Props { name: string; label: string; value: string; imagens: { arquivo: string; alt: string }[]; required?: boolean }
const { name, label, value, imagens, required } = Astro.props;
---
<fieldset class="space-y-2">
  <legend class="text-sm font-medium">{label}</legend>
  {value && <img src={imgSrc(value, 800)} alt="" class="h-24 w-auto rounded-sm border border-ink/10" />}
  <select name={name} class="w-full rounded-sm border border-ink/20 px-2 py-1.5 text-sm">
    {!required && <option value="">— sem imagem —</option>}
    {imagens.map((i) => <option value={i.arquivo} selected={i.arquivo === value}>{i.alt || i.arquivo}</option>)}
  </select>
  <label class="block text-xs text-ink-muted">ou enviar nova (JPG, PNG, WebP, máx. 10 MB)
    <input type="file" name={`${name}__file`} accept="image/jpeg,image/png,image/webp" class="mt-1 block text-sm" />
  </label>
</fieldset>
```

- [ ] **Step 6: `src/components/admin/Field.astro`** (recursivo para listas)

```astro
---
import type { Field } from '../../lib/server/schemas.ts';
import ImageField from './ImageField.astro';
import Self from './Field.astro';

interface Props { field: Field; name: string; value: unknown; imagens: { arquivo: string; alt: string }[] }
const { field, name, value, imagens } = Astro.props;
const input = 'mt-1 w-full rounded-sm border border-ink/20 px-3 py-2 text-sm';
const itens = field.type === 'list' ? [...((value as Record<string, unknown>[]) ?? []), {}] : [];
---
{field.type === 'list' ? (
  <fieldset class="space-y-4">
    <legend class="font-serif text-xl">{field.label}</legend>
    {itens.map((item, i) => {
      const novo = i === itens.length - 1;
      return (
        <div class="space-y-3 rounded-sm border border-ink/10 bg-white/60 p-4">
          <div class="flex items-center justify-between text-sm">
            <strong>{novo ? `+ Novo ${field.itemLabel.toLowerCase()} (deixe em branco para ignorar)` : `${field.itemLabel} ${i + 1}`}</strong>
            <div class="flex items-center gap-4">
              <label>Ordem <input type="number" name={`${name}.${i}._ordem`} value={i + 1} class="w-16 rounded-sm border border-ink/20 px-2 py-1" /></label>
              {!novo && <label><input type="checkbox" name={`${name}.${i}._remover`} /> Remover</label>}
            </div>
          </div>
          {field.fields.map((sub) => <Self field={sub} name={`${name}.${i}.${sub.name}`} value={(item as Record<string, unknown>)[sub.name]} imagens={imagens} />)}
        </div>
      );
    })}
  </fieldset>
) : field.type === 'image' ? (
  <ImageField name={name} label={field.label} value={String(value ?? '')} imagens={imagens} required={field.required} />
) : field.type === 'boolean' ? (
  <label class="flex items-center gap-2 text-sm"><input type="checkbox" name={name} checked={value === true} /> {field.label}</label>
) : field.type === 'textarea' || field.type === 'html' ? (
  <label class="block text-sm">{field.label}
    <textarea name={name} rows={field.type === 'html' ? 24 : 5} maxlength={field.max} class:list={[input, field.type === 'html' && 'font-mono text-xs']}>{String(value ?? '')}</textarea>
  </label>
) : (
  <label class="block text-sm">{field.label}
    <input name={name} inputmode={field.type === 'number' ? 'decimal' : undefined} value={value == null ? '' : String(value)} maxlength={field.max} class={input} />
  </label>
)}
```

(Campos não recebem `required` no HTML: itens “novos” em branco têm de poder ser enviados; a validação é no servidor.)

- [ ] **Step 7: `src/pages/admin/index.astro`**

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.astro';
import { SECTIONS } from '../../lib/server/schemas.ts';
import { getBanner, isBannerVisible } from '../../lib/server/banner.ts';
const b = await getBanner();
const estado = isBannerVisible(b, new Date()) ? 'Visível agora' : b.ativo ? 'Ativo, fora do período' : 'Desativado';
---
<AdminLayout title="Início">
  <h1 class="font-serif text-4xl">Painel</h1>
  <a href="/admin/banner" class="mt-6 flex items-center justify-between rounded-sm bg-ivory p-4 shadow-sm">
    <span class="font-medium">Banner de promoção</span><span class="text-sm text-ink-muted">{estado}</span>
  </a>
  <h2 class="mt-10 font-serif text-2xl">Conteúdo do site</h2>
  <ul class="mt-4 divide-y divide-ink/10 rounded-sm bg-ivory shadow-sm">
    {SECTIONS.map((s) => <li><a href={`/admin/secao/${s.nome}`} class="flex justify-between p-4 hover:bg-white">{s.titulo}<span aria-hidden="true">→</span></a></li>)}
  </ul>
</AdminLayout>
```

- [ ] **Step 8: `src/pages/admin/secao/[nome].astro`**

```astro
---
import AdminLayout from '../../../components/admin/AdminLayout.astro';
import Field from '../../../components/admin/Field.astro';
import { getSchema } from '../../../lib/server/schemas.ts';
import { parseForm, validate } from '../../../lib/server/form.ts';
import { content, saveSection } from '../../../lib/server/content.ts';
import { listImages, saveUpload } from '../../../lib/server/images.ts';
import { collectUploads } from '../../../lib/server/uploads-from-form.ts';

const schema = getSchema(Astro.params.nome ?? '');
if (!schema) return new Response('Seção inexistente', { status: 404 });

let erros: string[] = [];
let valores: Record<string, unknown>;
let salvo = Astro.url.searchParams.has('salvo');

if (Astro.request.method === 'POST') {
  const fd = await Astro.request.formData();
  const up = await collectUploads(fd, (f) => saveUpload(f));
  valores = parseForm(schema.fields, fd, up.uploaded);
  erros = [...up.erros, ...validate(schema.fields, valores)];
  if (erros.length === 0) {
    await saveSection(schema.nome, valores);
    return Astro.redirect(`/admin/secao/${schema.nome}?salvo`);
  }
  salvo = false;
} else {
  valores = await content.get<Record<string, unknown>>(schema.nome);
}
const imagens = await listImages();
---
<AdminLayout title={schema.titulo}>
  <a href="/admin" class="text-sm underline">← Voltar</a>
  <h1 class="mt-2 font-serif text-4xl">{schema.titulo}</h1>
  {salvo && <p role="status" class="mt-4 rounded-sm bg-green-100 p-3 text-sm">Guardado. O site já mostra as alterações.</p>}
  {erros.length > 0 && (
    <div role="alert" class="mt-4 rounded-sm bg-red-100 p-3 text-sm">
      <p class="font-medium">Não foi possível guardar:</p>
      <ul class="list-disc pl-5">{erros.map((e) => <li>{e}</li>)}</ul>
    </div>
  )}
  <form method="post" enctype="multipart/form-data" class="mt-6 space-y-5">
    {schema.fields.map((f) => <Field field={f} name={f.name} value={valores[f.name]} imagens={imagens} />)}
    <div class="sticky bottom-0 border-t border-ink/10 bg-ivory-dark py-3"><button class="btn-primary">Guardar</button></div>
  </form>
</AdminLayout>
```

(Nota: em POST com erro, imagens recém-enviadas já foram gravadas e o seu `arquivo` está em `valores`, portanto não se perdem ao reexibir o formulário.)

- [ ] **Step 9: `src/pages/admin/banner.astro`**

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.astro';
import ImageField from '../../components/admin/ImageField.astro';
import { getBanner, saveBanner, parseBannerForm, toLocalInput, isBannerVisible } from '../../lib/server/banner.ts';
import { listImages, saveUpload } from '../../lib/server/images.ts';
import { collectUploads } from '../../lib/server/uploads-from-form.ts';

let erros: string[] = [];
let b = await getBanner();
const salvo = Astro.url.searchParams.has('salvo');

if (Astro.request.method === 'POST') {
  const fd = await Astro.request.formData();
  const up = await collectUploads(fd, (f) => saveUpload(f));
  const r = parseBannerForm(fd, up.uploaded.imagem ?? null);
  erros = [...up.erros, ...r.erros];
  if (erros.length === 0) { await saveBanner(r.dados); return Astro.redirect('/admin/banner?salvo'); }
  b = { ...r.dados, atualizado_em: b.atualizado_em };
}
const imagens = await listImages();
const input = 'mt-1 w-full rounded-sm border border-ink/20 px-3 py-2 text-sm';
const estado = isBannerVisible(b, new Date()) ? 'Visível agora no site' : b.ativo ? 'Ativo, mas fora do período definido' : 'Desativado';
---
<AdminLayout title="Banner">
  <a href="/admin" class="text-sm underline">← Voltar</a>
  <h1 class="mt-2 font-serif text-4xl">Banner de promoção</h1>
  <p class="mt-1 text-sm text-ink-muted">Estado: {estado}</p>
  {salvo && <p role="status" class="mt-4 rounded-sm bg-green-100 p-3 text-sm">Guardado.</p>}
  {erros.length > 0 && <div role="alert" class="mt-4 rounded-sm bg-red-100 p-3 text-sm"><ul class="list-disc pl-5">{erros.map((e) => <li>{e}</li>)}</ul></div>}
  <form method="post" enctype="multipart/form-data" class="mt-6 space-y-5">
    <label class="flex items-center gap-2 font-medium"><input type="checkbox" name="ativo" checked={b.ativo} /> Banner ativo</label>
    <fieldset class="flex gap-6 text-sm"><legend class="mb-1 font-medium">Formato</legend>
      <label><input type="radio" name="modo" value="faixa" checked={b.modo === 'faixa'} /> Faixa no topo</label>
      <label><input type="radio" name="modo" value="popup" checked={b.modo === 'popup'} /> Pop-up</label>
    </fieldset>
    <label class="block text-sm">Título<input name="titulo" value={b.titulo} maxlength="120" class={input} /></label>
    <label class="block text-sm">Texto<textarea name="texto" rows="3" maxlength="500" class={input}>{b.texto}</textarea></label>
    <ImageField name="imagem" label="Imagem (só no pop-up)" value={b.imagem ?? ''} imagens={imagens} />
    <label class="block text-sm">Link do botão<input name="link" value={b.link ?? ''} placeholder="https://wa.me/..." class={input} /></label>
    <label class="block text-sm">Texto do botão<input name="texto_botao" value={b.texto_botao ?? ''} placeholder="Saber mais" class={input} /></label>
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="block text-sm">Início (opcional)<input type="datetime-local" name="inicio" value={toLocalInput(b.inicio)} class={input} /></label>
      <label class="block text-sm">Fim (opcional)<input type="datetime-local" name="fim" value={toLocalInput(b.fim)} class={input} /></label>
    </div>
    <button class="btn-primary">Guardar</button>
  </form>
  <p class="mt-10 text-sm text-ink-muted">Pré-visualização: abra o site num separador anónimo para ver o banner tal como os visitantes (o fecho fica guardado no navegador).</p>
</AdminLayout>
```

**Nota de escopo:** a spec pede “pré-visualização”; esta implementação usa o próprio site (mudanças imediatas) em vez de um preview embutido. Assinalar ao usuário na entrega.

- [ ] **Step 10: Verificar manualmente** (dev server, logado):
  - Editar título do hero → Guardar → mensagem → home mostra novo título.
  - Serviços: mudar ordem (1↔2), remover um, adicionar novo pela linha em branco → home reflete.
  - Enviar `.gif` → erro “Formato não suportado”; enviar JPG 12 MB → erro de tamanho; valores digitados mantidos.
  - Banner: ativar como pop-up com fim ontem → estado “fora do período”, não aparece; sem datas → aparece.
  - `npx astro check` 0 erros; `npm test` tudo PASS.

- [ ] **Step 11: Commit** `feat: editores de seções e do banner no painel`.

---

### Task 10: Deploy (Docker/Coolify) e documentação

**Files:**
- Modify: `Dockerfile`, `.dockerignore`, `README.md`
- Delete: `nginx.conf`, `Dockerfile.vercel`

- [ ] **Step 1: `Dockerfile`**

```dockerfile
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 TZ=Europe/Lisbon UPLOADS_DIR=/data/uploads
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY seed ./seed
COPY src/lib/server ./src/lib/server
VOLUME /data/uploads
EXPOSE 4321
CMD ["node", "scripts/start.ts"]
```

- [ ] **Step 2: `.dockerignore`** — garantir que contém `node_modules`, `dist`, `data`, `.env`, `e2e`, `test-results`.

- [ ] **Step 3: Remover obsoletos** — `git rm nginx.conf Dockerfile.vercel`.

- [ ] **Step 4: README — secção “Painel”** com: variáveis de ambiente (lista das Global Constraints), `npm run hash-senha -- "senha"`, passos no Coolify (criar Postgres, copiar `DATABASE_URL` interno; app com build pack Dockerfile, porta 4321, volume persistente em `/data/uploads`; migração e seed automáticos no arranque), dev local (`docker compose -f docker-compose.dev.yml up -d`, `cp .env.example .env`, `npm run migrate && npm run seed && npm run dev`), trocar senha (novo hash → atualizar variável → redeploy).

- [ ] **Step 5: Verificar build da imagem**

```bash
docker build -t helia-painel .
docker run --rm --network host -e DATABASE_URL=postgres://helia:helia@localhost:5432/helia \
  -e ADMIN_USER=admin -e ADMIN_PASSWORD_HASH="$(npm run -s hash-senha -- teste)" \
  -e SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))") \
  -v "$PWD/data/uploads:/data/uploads" helia-painel
```
Expected: logs “Migrações: nenhuma”, “Seed: ignorado”, servidor em 4321; `curl -I localhost:4321` → 200. Sem `SESSION_SECRET` → sai com “SESSION_SECRET não definida”.

- [ ] **Step 6: Commit** `chore: Docker com Node SSR, docs de deploy do painel`.

---

### Task 11: Teste ponta a ponta

**Files:**
- Create: `playwright.config.ts`, `e2e/painel.spec.ts`

- [ ] **Step 1: `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: { command: 'npm run build && node --env-file=.env dist/server/entry.mjs', port: 4321, reuseExistingServer: true, timeout: 120_000 },
});
```

(Requer `.env` com `ADMIN_PASSWORD_HASH` de `teste` e `E2E_PASSWORD=teste`; `secure` do cookie é `true` em build de produção — em `http://localhost` os browsers aceitam cookies `secure`.)

- [ ] **Step 2: `e2e/painel.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('editar hero e ativar banner', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.fill('input[name=usuario]', process.env.ADMIN_USER ?? 'admin');
  await page.fill('input[name=senha]', process.env.E2E_PASSWORD ?? 'teste');
  await page.click('button:has-text("Entrar")');
  await expect(page).toHaveURL(/\/admin$/);

  const titulo = `Teste E2E ${Date.now()}`;
  await page.goto('/admin/secao/hero');
  const original = await page.inputValue('input[name=titulo]');
  await page.fill('input[name=titulo]', titulo);
  await page.click('button:has-text("Guardar")');
  await expect(page.getByRole('status')).toBeVisible();

  await page.goto('/admin/banner');
  await page.check('input[name=ativo]');
  await page.check('input[value=faixa]');
  await page.fill('input[name=titulo]', 'Promo E2E');
  await page.fill('input[name=inicio]', '');
  await page.fill('input[name=fim]', '');
  await page.click('button:has-text("Guardar")');

  const site = await page.context().newPage();
  await site.goto('/');
  await expect(site.locator('h1')).toContainText(titulo);
  await expect(site.locator('#promo')).toContainText('Promo E2E');

  // repor
  await page.goto('/admin/secao/hero');
  await page.fill('input[name=titulo]', original);
  await page.click('button:has-text("Guardar")');
  await page.goto('/admin/banner');
  await page.uncheck('input[name=ativo]');
  await page.click('button:has-text("Guardar")');
});
```

- [ ] **Step 3: Rodar** `npx playwright install chromium && npm run e2e` → PASS.
- [ ] **Step 4: Rodar tudo** `npm test && npx astro check && npm run e2e` → tudo verde.
- [ ] **Step 5: Commit** `test: e2e do painel`.
