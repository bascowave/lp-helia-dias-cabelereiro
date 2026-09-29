create table content (
  secao text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

create table imagens (
  id uuid primary key,
  arquivo text not null unique,
  alt text not null default '',
  largura int not null,
  altura int not null,
  criado_em timestamptz not null default now()
);

create table banner (
  id int primary key check (id = 1),
  ativo boolean not null default false,
  modo text not null default 'faixa' check (modo in ('faixa','popup')),
  titulo text not null default '',
  texto text not null default '',
  imagem text,
  link text,
  texto_botao text,
  inicio timestamptz,
  fim timestamptz,
  atualizado_em timestamptz not null default now()
);

insert into banner (id) values (1);
