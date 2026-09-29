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
