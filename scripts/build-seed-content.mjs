import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const siteSrc = readFileSync(join(root, 'src/data/site.ts'), 'utf8');
const reviewsSrc = readFileSync(join(root, 'src/data/reviews.ts'), 'utf8');

const evalSite = () => {
  const body = siteSrc
    .replace(/^export type[\s\S]*$/m, '')
    .replace(/ as const/g, '')
    .replace(/export const /g, 'const ');
  return new Function(`${body}; return { site, nav, brands, trustPoints, serviceCategories, spaces, balayage, galleryItems };`)();
};

const evalReviews = () => {
  const body = reviewsSrc.replace(/ as const/g, '').replace(/export const /g, 'const ');
  return new Function(`${body}; return { googleRating, reviews };`)();
};

const { site, nav, brands, trustPoints, serviceCategories, spaces, balayage, galleryItems } = evalSite();
const { googleRating, reviews } = evalReviews();

const galeriaFiles = {
  imagem1: 'imagem1.png',
  galeriaPenteado: 'galeria-penteado.jpg',
  imagem3: 'imagem3.png',
  imagem4: 'imagem4.png',
  imagem5: 'imagem5.png',
  galeriaPenteadoPerolas: 'galeria-penteado-perolas.jpg',
};
const salonFiles = {
  cabeleireiro: 'espaco-cabeleireiro.jpg',
  produtos: 'espaco-produtos.jpg',
  manicure: 'espaco-manicure.jpg',
  recepcao: 'espaco-recepcao.jpg',
};
const marcaFiles = { kerastase: 'marca-kerastase.png', wella: 'marca-wella-professionals.png' };
const reviewAvatar = (path) => `@review-${path.replace('/reviews/', '').replace('.jpg', '')}.jpg`;

const privHtml = readFileSync(join(root, 'src/pages/politica-de-privacidade.astro'), 'utf8');
const termHtml = readFileSync(join(root, 'src/pages/termos-de-utilizacao.astro'), 'utf8');

function extractLegalHtml(astro, s) {
  const inner = astro.match(/<LegalLayout[\s\S]*?>([\s\S]*?)<\/LegalLayout>/)?.[1] ?? '';
  return inner
    .replace(/<p class="kicker">Legal<\/p>\s*/i, '')
    .replace(/<h1>[^<]*<\/h1>\s*/i, '')
    .replace(/<p class="legal-meta">[^<]*<\/p>\s*/i, '')
    .replace(/\{site\.name\}/g, s.name)
    .replace(/\{site\.url\}/g, s.url)
    .replace(/\{site\.url\.replace\('https:\/\/', ''\)\}/g, s.url.replace('https://', ''))
    .replace(/\{site\.address\.street\}/g, s.address.street)
    .replace(/\{site\.address\.postalCode\}/g, s.address.postalCode)
    .replace(/\{site\.address\.city\}/g, s.address.city)
    .replace(/\{site\.email\}/g, s.email)
    .replace(/\{site\.phone\}/g, s.phone)
    .replace(/\{site\.phoneHref\}/g, s.phoneHref)
    .replace(/href=\{`mailto:\$\{site\.email\}`\}/g, `href="mailto:${s.email}"`)
    .replace(/href=\{site\.phoneHref\}/g, `href="${s.phoneHref}"`)
    .replace(/href=\{site\.url\}/g, `href="${s.url}"`)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const content = {
  geral: {
    name: site.name,
    shortName: 'Hélia Dias',
    tagline: site.tagline,
    kicker: site.kicker,
    description: site.description,
    logo: '@logo.jpg',
    phone: site.phone,
    phoneHref: site.phoneHref,
    whatsappHref: site.whatsappHref,
    email: site.email,
    street: site.address.street,
    city: site.address.city,
    postalCode: site.address.postalCode,
    instagram: site.links.instagram,
    facebook: site.links.facebook,
    googleReviews: site.links.googleReviews,
    googleMaps: site.links.googleMaps,
    mapsEmbed: site.links.mapsEmbed,
    livroReclamacoes: site.links.livroReclamacoes,
    nav: [...nav],
  },
  hero: {
    imagem: '@hero-salao.jpg',
    imagemAlt: 'Interior do salão Hélia Dias Cabeleireiros em Esposende',
    titulo: 'O seu cabelo.',
    destaque: 'A sua melhor versão.',
    texto:
      'Há mais de três décadas que cuidamos da beleza e do bem-estar de quem nos procura, com experiência, atenção ao detalhe e um atendimento verdadeiramente personalizado.',
    botaoPrimario: 'Marcar atendimento',
    botaoSecundario: 'Conhecer os nossos serviços',
  },
  confianca: { itens: trustPoints.map((p) => ({ title: p.title, description: p.description })) },
  servicos: {
    label: 'Os nossos serviços',
    title: 'Cuidados pensados para si',
    description:
      'Do corte à cor, dos tratamentos aos momentos mais especiais, trabalhamos cada serviço de forma personalizada para valorizar a sua beleza e respeitar a identidade do seu cabelo.',
    categorias: serviceCategories.map((c) => ({
      id: c.id,
      title: c.title,
      itens: c.items.map((nome) => ({ nome })),
    })),
  },
  balayage: {
    label: balayage.label,
    title: balayage.title,
    description: balayage.description,
    caption: balayage.caption,
    beforeImagem: '@balayage-antes.jpg',
    beforeAlt: balayage.beforeAlt,
    afterImagem: '@balayage-depois.jpg',
    afterAlt: balayage.afterAlt,
  },
  sobre: {
    label: 'Sobre nós',
    titulo: 'Mais do que mudar o cabelo, queremos que se sinta bem.',
    texto:
      'Desde 1990, a Hélia Dias Cabeleireiros tem uma missão simples: receber cada pessoa com proximidade, compreender aquilo que procura e encontrar a solução certa para si.\n\nAo longo dos anos, acompanhámos tendências, técnicas e novas formas de cuidar do cabelo, sem nunca perder aquilo que consideramos essencial: ouvir primeiro, aconselhar com honestidade e cuidar de cada detalhe.\n\nPorque um bom resultado começa muito antes da tesoura ou da cor. Começa por perceber quem está sentado à nossa frente.',
    assinatura: 'Hélia Dias',
    numeros: [
      { valor: '1990', legenda: 'Ano de fundação' },
      { valor: 'Esposende', legenda: 'No centro da cidade' },
    ],
  },
  espacos: {
    label: spaces.label,
    title: spaces.title,
    description: spaces.description,
    barbeariaTitle: spaces.barbearia.title,
    barbeariaDescription: spaces.barbearia.description,
    barbeariaImagem: '@espaco-barbearia.jpg',
    barbeariaImagePosition: spaces.barbearia.imagePosition,
    depilacaoTitle: spaces.depilacao.title,
    depilacaoDescription: spaces.depilacao.description,
    depilacaoImagem: '@espaco-depilacao.jpg',
    depilacaoImagePosition: spaces.depilacao.imagePosition,
    salonTitle: spaces.salon.title,
    salonDescription: spaces.salon.description,
    salonImages: spaces.salon.images.map((item) => ({
      imagem: `@${salonFiles[item.key]}`,
      alt: item.alt,
      imagePosition: item.imagePosition ?? '',
    })),
  },
  galeria: {
    label: 'O nosso trabalho',
    title: 'Resultados que falam por si',
    description: 'Cortes, cores e transformações criadas diariamente no nosso salão.',
    botao: 'Ver mais no Instagram',
    itens: galleryItems.map((item) => ({
      image: `@${galeriaFiles[item.image]}`,
      alt: item.alt,
      objectPosition: item.objectPosition ?? '',
    })),
  },
  marcas: {
    label: brands.label,
    title: brands.title,
    description: brands.description,
    itens: brands.items.map((b) => ({
      name: b.name,
      imagem: `@${marcaFiles[b.image]}`,
      alt: b.alt,
    })),
  },
  avaliacoes: {
    label: 'Quem nos visita',
    title: 'A melhor recomendação vem de quem já passou pelas nossas mãos.',
    score: googleRating.score,
    count: googleRating.count,
    itens: reviews.map((r) => ({
      author: r.author,
      relativeTime: r.relativeTime,
      rating: r.rating,
      avatar: reviewAvatar(r.avatar),
      text: r.text,
    })),
  },
  contactos: {
    label: 'Contactos',
    titulo: 'Estamos em Esposende',
    texto:
      'Marque o seu atendimento por WhatsApp ou ligue-nos. Estamos na Rua Engenheiro Losa Faria, no centro de Esposende.',
    botao: 'Marcar atendimento',
  },
  rodape: {
    texto: 'Salão de cabeleireiro e estética em Esposende, com atendimento personalizado desde 1990.',
    selo: 'Desde 1990 · Esposende',
  },
  privacidade: {
    titulo: 'Política de Privacidade',
    atualizacao: '31 de agosto de 2026',
    html: extractLegalHtml(privHtml, site),
  },
  termos: {
    titulo: 'Termos de Utilização',
    atualizacao: '31 de agosto de 2026',
    html: extractLegalHtml(termHtml, site),
  },
};

const seedDir = join(root, 'seed');
const imgDir = join(seedDir, 'images');
mkdirSync(imgDir, { recursive: true });
writeFileSync(join(seedDir, 'content.json'), JSON.stringify(content, null, 2), 'utf8');

const copies = [
  'logo.jpg',
  'hero-salao.jpg',
  'balayage-antes.jpg',
  'balayage-depois.jpg',
  'espaco-barbearia.jpg',
  'espaco-depilacao.jpg',
  'espaco-cabeleireiro.jpg',
  'espaco-produtos.jpg',
  'espaco-manicure.jpg',
  'espaco-recepcao.jpg',
  'imagem1.png',
  'imagem3.png',
  'imagem4.png',
  'imagem5.png',
  'galeria-penteado.jpg',
  'galeria-penteado-perolas.jpg',
  'marca-kerastase.png',
  'marca-wella-professionals.png',
];

for (const f of copies) {
  const src = join(root, 'src/assets/images', f);
  if (existsSync(src)) cpSync(src, join(imgDir, f));
}

for (const r of reviews) {
  const name = r.avatar.replace('/reviews/', '');
  const src = join(root, 'public/reviews', name);
  if (existsSync(src)) cpSync(src, join(imgDir, `review-${name}`));
}

console.log('seed/content.json e imagens gerados');
