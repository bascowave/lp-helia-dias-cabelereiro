import type { SectionName } from './schemas.ts';

export class ContentUnavailableError extends Error {}

type Entry = { valor: unknown; fresco: boolean; retryAfter: number };

const RETRY_MS = 5000;

export function createContentStore(
  query: (nome: string) => Promise<unknown | undefined>,
  now: () => number = () => Date.now(),
) {
  const cache = new Map<string, Entry>();
  const inflight = new Map<string, Promise<unknown>>();
  const versoes = new Map<string, number>();

  async function ler(nome: string, versao: number): Promise<unknown> {
    try {
      const v = await query(nome);
      if (v === undefined) throw new ContentUnavailableError(`Seção ${nome} em falta`);
      if ((versoes.get(nome) ?? 0) === versao) cache.set(nome, { valor: v, fresco: true, retryAfter: 0 });
      return v;
    } catch (e) {
      const c = cache.get(nome);
      if (c) {
        c.retryAfter = now() + RETRY_MS;
        return c.valor;
      }
      throw e instanceof ContentUnavailableError ? e : new ContentUnavailableError(String(e));
    }
  }

  return {
    async get<T>(nome: SectionName): Promise<T> {
      const c = cache.get(nome);
      if (c?.fresco) return c.valor as T;
      if (c && c.retryAfter > now()) return c.valor as T;
      let p = inflight.get(nome);
      if (!p) {
        const novo: Promise<unknown> = ler(nome, versoes.get(nome) ?? 0).finally(() => {
          if (inflight.get(nome) === novo) inflight.delete(nome);
        });
        p = novo;
        inflight.set(nome, p);
      }
      return (await p) as T;
    },
    invalidate(nome: SectionName) {
      versoes.set(nome, (versoes.get(nome) ?? 0) + 1);
      inflight.delete(nome);
      const c = cache.get(nome);
      if (c) { c.fresco = false; c.retryAfter = 0; }
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
