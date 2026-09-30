export const site = {
  name: 'Hélia Dias Cabeleireiros',
  tagline: 'Cabeleireiro · Estética · Beleza',
  location: 'Esposende, Portugal',
  kicker: 'Cabeleireiro & Estética em Esposende',
  description:
    'Salão de cabeleireiro e estética em Esposende, desde 1990. Corte, coloração, balayage, tratamentos, alisamento, penteados e estética com atendimento personalizado.',
  url: 'https://heliadiascabeleireiros.pt',
  phone: '+351 965 833 809',
  phoneHref: 'tel:+351965833809',
  whatsappHref:
    'https://wa.me/351965833809?text=Ol%C3%A1%2C%20gostaria%20de%20marcar%20um%20atendimento%20na%20H%C3%A9lia%20Dias%20Cabeleireiros.',
  email: 'heliadias_cab@hotmail.com',
  address: {
    street: 'Rua Engenheiro Losa Faria, Loja 5',
    city: 'Esposende',
    postalCode: '4740-268',
    country: 'Portugal',
    full: 'Rua Engenheiro Losa Faria, Loja 5, Esposende',
  },
  links: {
    instagram: 'https://www.instagram.com/heliadiascabeleireiros/',
    facebook: 'https://www.facebook.com/heliadias.cabeleireiros/',
    googleReviews: 'https://share.google/XS2T3caRT50eCiXbB',
    googleMaps:
      'https://www.google.com/maps/place/H%C3%A9lia+Dias+Cabeleireiros/@41.533734,-8.7795553,17z/data=!3m1!4b1!4m6!3m5!1s0xd244b11246c9d85:0x3168ba034568550f!8m2!3d41.533734!4d-8.7795553!16s%2Fg%2F11h79vfh7l',
    directions:
      'https://www.google.com/maps/dir/?api=1&destination=41.533734,-8.7795553',
    mapsEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2979.5!2d-8.7795553!3d41.533734!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd244b11246c9d85%3A0x3168ba034568550f!2sH%C3%A9lia%20Dias%20Cabeleireiros!5e0!3m2!1spt-PT!2spt!4v1725129600000!5m2!1spt-PT!2spt',
    livroReclamacoes: 'https://www.livroreclamacoes.pt/inicio',
  },
  geo: {
    latitude: 41.533734,
    longitude: -8.7795553,
  },
} as const;

export const nav = [
  { label: 'Serviços', href: '/#servicos' },
  { label: 'Espaços', href: '/#espacos' },
  { label: 'Sobre Nós', href: '/#sobre' },
  { label: 'Galeria', href: '/#galeria' },
  { label: 'Contactos', href: '/#contactos' },
] as const;

export const brands = {
  label: 'Marcas profissionais',
  title: 'Produtos de referência que usamos no salão',
  description:
    'Trabalhamos com linhas profissionais reconhecidas internacionalmente para garantir resultados de qualidade em corte, coloração e tratamentos capilares.',
  items: [
    {
      name: 'Kérastase Paris',
      image: 'kerastase' as const,
      alt: 'Logótipo Kérastase Paris',
    },
    {
      name: 'Wella Professionals',
      image: 'wella' as const,
      alt: 'Logótipo Wella Professionals',
    },
  ],
} as const;

export const trustPoints = [
  {
    title: 'Desde 1990',
    description: 'Experiência que faz a diferença',
  },
  {
    title: 'Atendimento personalizado',
    description: 'Pensado para si',
  },
  {
    title: 'Cabelo & beleza',
    description: 'Tudo num só espaço',
  },
  {
    title: 'Em Esposende',
    description: 'Perto de si',
  },
] as const;

export const serviceCategories = [
  {
    id: 'cabeleireiro',
    title: 'Cabeleireiro & Barbearia',
    items: [
      'Serviços gerais',
      'Alisamento brasileiro',
      'Tratamentos capilares',
      'Extensões',
    ],
  },
  {
    id: 'beleza',
    title: 'Beleza',
    items: [
      'Manicure',
      'Verniz longa duração',
      'Verniz gel',
      'Aplicação de unhas',
      'Manutenção de gel',
      'Acrílico',
      'Fibra',
      'Pedicure',
      'Pedicure com verniz de gel',
      'Calista',
    ],
  },
  {
    id: 'estetica',
    title: 'Estética',
    items: ['Maquilhagem', 'Depilação a cera', 'Depilação a laser'],
  },
] as const;

export const spaces = {
  label: 'O nosso salão',
  title: 'Espaços para cada momento de cuidado',
  description:
    'No centro de Esposende, reunimos zonas distintas para que cada serviço tenha o ambiente certo — do grooming masculino à depilação, do cabeleireiro à estética.',
  barbearia: {
    title: 'Barbearia',
    description:
      'Espaço dedicado ao corte masculino, barba e acabamentos, com o conforto e o rigor de uma barbearia profissional.',
    imagePosition: 'center 45%',
  },
  depilacao: {
    title: 'Depilação',
    description:
      'Cabine de estética preparada para depilação e tratamentos corporais, num ambiente reservado, higiénico e acolhedor.',
    imagePosition: 'center 40%',
  },
  salon: {
    title: 'Cabeleireiro & estética',
    description:
      'Postos de corte e styling, lavagem e coloração, manicure e uma receção onde se sente bem desde o primeiro momento.',
    images: [
      {
        key: 'cabeleireiro' as const,
        alt: 'Postos de cabeleireiro no salão Hélia Dias',
        imagePosition: 'center 35%',
      },
      {
        key: 'produtos' as const,
        alt: 'Vitrine de produtos profissionais no salão Hélia Dias',
        imagePosition: 'center 45%',
      },
      {
        key: 'manicure' as const,
        alt: 'Estação de manicure e cuidados das unhas',
        imagePosition: 'center center',
      },
      {
        key: 'recepcao' as const,
        alt: 'Receção e área de espera do salão Hélia Dias Cabeleireiros',
        imagePosition: 'center 40%',
      },
    ],
  },
} as const;

export const balayage = {
  label: 'Coloração',
  title: 'Balayage, antes e depois',
  description:
    'Arraste o divisor para ver a transformação. A balayage ilumina o cabelo com um degradé natural, feito à medida do seu tom e do seu estilo.',
  caption: 'Balayage',
  beforeAlt: 'Cabelo castanho uniforme antes do balayage',
  afterAlt: 'Cabelo com balayage e madeixas após o tratamento no salão',
} as const;

/** Imagens da galeria */
export const galleryItems = [
  {
    image: 'imagem1' as const,
    alt: 'Trabalho de cabeleireiro Hélia Dias Cabeleireiros',
  },
  {
    image: 'galeriaPenteado' as const,
    alt: 'Penteado de cerimónia com adorno no salão Hélia Dias',
    objectPosition: 'center 30%',
  },
  {
    image: 'imagem3' as const,
    alt: 'Resultado de corte e tratamento capilar',
  },
  {
    image: 'imagem4' as const,
    alt: 'Penteado e acabamento profissional',
  },
  {
    image: 'imagem5' as const,
    alt: 'Transformação capilar Hélia Dias Cabeleireiros',
  },
  {
    image: 'galeriaPenteadoPerolas' as const,
    alt: 'Penteado meio preso com perolas e madeixas no salão Hélia Dias',
    objectPosition: 'center 35%',
  },
] as const;

export type ImageKey =
  | 'logo'
  | 'helia2'
  | 'helia3'
  | 'helia4'
  | 'imagem1'
  | 'imagem2'
  | 'imagem3'
  | 'imagem4'
  | 'imagem5';
