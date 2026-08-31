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
  { label: 'Sobre Nós', href: '/#sobre' },
  { label: 'Galeria', href: '/#galeria' },
  { label: 'Contactos', href: '/#contactos' },
] as const;

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

export const services = [
  {
    id: '01',
    title: 'Corte & Styling',
    description:
      'Cortes femininos e masculinos, brushing e styling adaptados ao seu rosto, estilo e rotina.',
    featured: true,
    image: 'helia3' as const,
    alt: 'Corte acabado com movimento e brilho',
    imagePosition: 'center 35%',
  },
  {
    id: '02',
    title: 'Coloração & Balayage',
    description:
      'Cor, madeixas, balayage e técnicas de iluminação para um resultado natural, harmonioso e à sua medida.',
    featured: false,
  },
  {
    id: '03',
    title: 'Tratamentos Capilares',
    description:
      'Cuidados específicos para recuperar hidratação, brilho, força e suavidade do cabelo.',
    featured: false,
  },
  {
    id: '04',
    title: 'Alisamento & Transformação',
    description:
      'Soluções profissionais para controlar o volume, alinhar o cabelo e facilitar o seu dia a dia.',
    featured: false,
  },
  {
    id: '05',
    title: 'Penteados & Cerimónias',
    description:
      'Penteados elegantes para casamentos, festas e todos os momentos que merecem um cuidado especial.',
    featured: true,
    image: 'helia4' as const,
    alt: 'Penteado de cerimónia meio preso',
    imagePosition: 'center 25%',
  },
  {
    id: '06',
    title: 'Estética & Beleza',
    description:
      'Um espaço onde encontra outros cuidados de beleza e bem-estar para complementar o seu momento.',
    featured: false,
  },
] as const;

/** Imagens da galeria */
export const galleryItems = [
  {
    image: 'imagem1' as const,
    alt: 'Trabalho de cabeleireiro Hélia Dias Cabeleireiros',
  },
  {
    image: 'imagem2' as const,
    alt: 'Coloração e styling no salão Hélia Dias',
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
    image: 'helia2' as const,
    alt: 'Ambiente e trabalho no salão Hélia Dias',
    objectPosition: 'center center',
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
