# Painel administrativo — Design

Data: 2026-09-29

## Objetivo

Permitir que um único administrador edite todos os textos e imagens do site e gerencie um banner de promoção (faixa ou pop-up, ativável e com datas), com alterações visíveis imediatamente, sem novo deploy.

## Decisões

- Painel próprio em `/admin`, mesmo domínio.
- Um único usuário; credenciais via variáveis de ambiente.
- Postgres (serviço separado no Coolify).
- Imagens enviadas em volume persistente (`/data/uploads`).
- Alterações refletem na hora (SSR), sem rebuild.

## Arquitetura

- Astro em modo servidor com `@astrojs/node` (standalone). O nginx sai do Dockerfile; o container roda `node dist/server/entry.mjs`.
- Acesso ao banco com a biblioteca `postgres` e SQL puro; migrações em arquivos `.sql` versionados, aplicadas por `npm run migrate`.
- Variáveis de ambiente: `DATABASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `UPLOADS_DIR` (padrão `/data/uploads`).

## Modelo de dados

```sql
content (
  secao        text primary key,   -- 'geral','hero','sobre','servicos','galeria','avaliacoes','contactos','rodape','privacidade','termos'
  dados        jsonb not null,
  atualizado_em timestamptz not null default now()
)

imagens (
  id         uuid primary key,
  arquivo    text not null,        -- nome base; variantes <nome>-800.webp e <nome>-1600.webp
  alt        text not null default '',
  largura    int not null,
  altura     int not null,
  criado_em  timestamptz not null default now()
)

banner (
  id          int primary key check (id = 1),
  ativo       boolean not null default false,
  modo        text not null check (modo in ('faixa','popup')) default 'faixa',
  titulo      text not null default '',
  texto       text not null default '',
  imagem_id   uuid references imagens(id) on delete set null,
  link        text,
  texto_botao text,
  inicio      timestamptz,
  fim         timestamptz,
  atualizado_em timestamptz not null default now()
)
```

- O `jsonb` de cada seção segue o formato que os componentes já consomem hoje (`src/data/site.ts`, `src/data/reviews.ts` e textos embutidos nos componentes). Imagens são referenciadas por `id`.
- Cada seção tem um esquema fixo em código (campos: texto, texto longo, imagem, lista de itens) usado para gerar o formulário e validar no servidor.

## Imagens

- Upload aceita JPG, PNG e WebP até 10 MB; outros são recusados com mensagem.
- `sharp` converte para WebP em 800px e 1600px de largura; site usa `srcset`.
- Servidas por rota `/uploads/[arquivo]` com `Cache-Control` longo (nomes são únicos).

## Autenticação

- Login compara usuário e senha (bcrypt) com as variáveis de ambiente.
- Sessão: cookie assinado (HMAC com `SESSION_SECRET`), `httpOnly`, `secure`, `sameSite=lax`, validade de 7 dias.
- Middleware protege `/admin/*` (exceto `/admin/login`) e as rotas de API do painel.
- Bloqueio de 15 min após 5 tentativas erradas por IP (em memória).
- Proteção CSRF: token derivado da sessão em todos os formulários.
- `npm run hash-senha` gera o hash para configurar no Coolify.

## Painel

- `/admin/login` — formulário.
- `/admin` — lista de seções e link para o banner.
- `/admin/secao/[nome]` — formulário gerado do esquema; listas permitem adicionar, remover e reordenar.
- `/admin/banner` — ativo, modo, título, texto, imagem, link, texto do botão, início, fim e pré-visualização.
- Campo de imagem: upload com miniatura ou escolha entre imagens já enviadas.
- HTML + Tailwind, JS mínimo, sem framework de UI.

## Banner no site

- `PromoBanner.astro` no `Layout`, renderizado quando `ativo` e `agora` está entre `inicio` e `fim` (limites opcionais).
- Faixa: barra acima do header, com botão fechar.
- Pop-up: modal após ~1,5 s; fecha com X, Esc ou clique fora; foco acessível.
- Fechamento lembrado em `localStorage` com chave baseada em `atualizado_em`; nova campanha volta a aparecer.

## Dados iniciais

- `npm run seed` copia os textos atuais para `content`, as imagens de `src/assets/images` para o volume (convertidas) e cria o banner desativado. Após o seed o site é visualmente idêntico ao atual.
- Seed é idempotente: não sobrescreve seções já existentes.

## Erros

- Banco indisponível: site usa o último conteúdo em cache de memória; sem cache, página de erro amigável.
- Validação no servidor em todos os formulários (obrigatórios, tamanhos máximos, URLs válidas).

## Testes

Vitest:
- Regra de exibição do banner (ativo, datas, limites nulos).
- Assinatura e verificação de sessão (válida, expirada, adulterada).
- Validação dos esquemas das seções.
- Middleware bloqueando `/admin` sem sessão.
- Conversão de upload (tipos aceitos/recusados, variantes geradas).

Playwright (e2e): login → editar título do hero → ativar banner → verificar ambos na home.

## Deploy (Coolify)

- Serviço Postgres + app com volume montado em `/data/uploads`.
- Ordem no start: `migrate` → servidor. Seed executado manualmente uma vez.
- Remover `nginx.conf` e ajustar `Dockerfile` e `Dockerfile.vercel` (este último deixa de se aplicar; será removido ou documentado como obsoleto).

## Fora do escopo

Múltiplos usuários, histórico de versões, recuperação de senha por email.
