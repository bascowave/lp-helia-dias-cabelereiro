export type Field =
  | { name: string; label: string; type: 'text' | 'textarea' | 'html' | 'image' | 'number' | 'boolean' | 'url'; required?: boolean; max?: number }
  | { name: string; label: string; type: 'list'; itemLabel: string; fields: Field[] };

export type SectionName =
  | 'geral' | 'hero' | 'confianca' | 'servicos' | 'balayage' | 'sobre' | 'espacos' | 'galeria' | 'marcas'
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
    url('livroReclamacoes', 'Livro de Reclamações'),
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
    { name: 'categorias', label: 'Categorias', type: 'list', itemLabel: 'Categoria', fields: [
      t('id', 'Identificador', 40), t('title', 'Título'),
      { name: 'itens', label: 'Serviços', type: 'list', itemLabel: 'Serviço', fields: [t('nome', 'Nome')] },
    ] },
  ] },
  { nome: 'balayage', titulo: 'Balayage', fields: [
    t('label', 'Etiqueta'), t('title', 'Título'), ta('description', 'Descrição', 600),
    t('caption', 'Legenda do comparador'), img('beforeImagem', 'Imagem antes'), t('beforeAlt', 'Descrição (antes)'),
    img('afterImagem', 'Imagem depois'), t('afterAlt', 'Descrição (depois)'),
  ] },
  { nome: 'sobre', titulo: 'Sobre nós', fields: [
    t('label', 'Etiqueta'), t('titulo', 'Título'), ta('texto', 'Texto (parágrafos separados por linha em branco)', 3000),
    t('assinatura', 'Assinatura'),
    { name: 'numeros', label: 'Números', type: 'list', itemLabel: 'Número', fields: [t('valor', 'Valor', 40), t('legenda', 'Legenda')] },
  ] },
  { nome: 'espacos', titulo: 'Espaços', fields: [
    ...cabecalho,
    t('barbeariaTitle', 'Barbearia — título'), ta('barbeariaDescription', 'Barbearia — texto', 400),
    img('barbeariaImagem', 'Barbearia — foto'), t('barbeariaImagePosition', 'Barbearia — enquadramento', 40, false),
    t('depilacaoTitle', 'Depilação — título'), ta('depilacaoDescription', 'Depilação — texto', 400),
    img('depilacaoImagem', 'Depilação — foto'), t('depilacaoImagePosition', 'Depilação — enquadramento', 40, false),
    t('salonTitle', 'Salão — título'), ta('salonDescription', 'Salão — texto', 400),
    { name: 'salonImages', label: 'Salão — galeria', type: 'list', itemLabel: 'Foto', fields: [
      img('imagem', 'Foto'), t('alt', 'Descrição'), t('imagePosition', 'Enquadramento', 40, false),
    ] },
  ] },
  { nome: 'galeria', titulo: 'Galeria', fields: [
    ...cabecalho, t('botao', 'Texto do botão'),
    { name: 'itens', label: 'Fotos', type: 'list', itemLabel: 'Foto', fields: [
      img('image', 'Foto'), t('alt', 'Descrição'), t('objectPosition', 'Enquadramento', 40, false),
    ] },
  ] },
  { nome: 'marcas', titulo: 'Marcas', fields: [
    ...cabecalho,
    { name: 'itens', label: 'Marcas', type: 'list', itemLabel: 'Marca', fields: [
      t('name', 'Nome'), img('imagem', 'Logótipo'), t('alt', 'Descrição do logótipo'),
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
