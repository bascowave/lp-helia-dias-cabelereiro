# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Painel administrativo

O site é servido por Astro (SSR, `@astrojs/node`) e o conteúdo vive em Postgres. O painel está em `/admin` (um único utilizador).

### Variáveis de ambiente

| Variável | Descrição |
| :-- | :-- |
| `DATABASE_URL` | Ligação ao Postgres (`postgres://user:senha@host:5432/base`) |
| `ADMIN_USER` | Nome de utilizador do painel |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt da senha (ver abaixo) |
| `SESSION_SECRET` | Texto aleatório com **≥ 32 caracteres** (assina a sessão) |
| `UPLOADS_DIR` | Pasta das imagens enviadas (padrão `/data/uploads`) |
| `TZ` | `Europe/Lisbon` (as datas do banner são interpretadas neste fuso) |

Gerar o hash da senha:

```sh
npm run hash-senha -- "a-sua-senha"
```

Se o login falhar com a senha certa, confirme que o hash ficou inteiro no ambiente (começa por `$2b$12$` e tem 60 caracteres): alguns painéis interpretam o `$`.

### Deploy no Coolify

1. Criar um serviço **Postgres** e copiar o `DATABASE_URL` interno.
2. Criar a aplicação com build pack **Dockerfile**, porta **4321**, e as variáveis acima.
3. Adicionar um **volume persistente** montado em `/data/uploads` (sem ele as imagens enviadas perdem-se a cada deploy).
4. Ao arrancar, o contentor aplica as migrações e, se a base estiver vazia, o seed com o conteúdo atual do site.
5. O domínio público tem de constar em `security.allowedDomains` no `astro.config.mjs` (hoje: `heliadiascabeleireiros.pt` e `www.`, em https). Noutro domínio (por exemplo o temporário do Coolify) os formulários do painel respondem 403.

### Desenvolvimento local

```sh
docker compose -f docker-compose.dev.yml up -d   # Postgres em localhost:5433
cp .env.example .env                             # preencher ADMIN_PASSWORD_HASH
npm run migrate && npm run seed && npm run dev
```

### Trocar a senha

Gerar novo hash com `npm run hash-senha`, atualizar `ADMIN_PASSWORD_HASH` e fazer redeploy.
