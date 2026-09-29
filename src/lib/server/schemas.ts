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
