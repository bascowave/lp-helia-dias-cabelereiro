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
