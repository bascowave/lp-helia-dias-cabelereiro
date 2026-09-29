import { describe, it, expect } from 'vitest';
import { parseForm, validate } from '../src/lib/server/form.ts';
import type { Field } from '../src/lib/server/schemas.ts';
import { SECTIONS } from '../src/lib/server/schemas.ts';

const fields: Field[] = [
  { name: 'titulo', label: 'Título', type: 'text', required: true, max: 20 },
  { name: 'ativo', label: 'Ativo', type: 'boolean' },
  { name: 'nota', label: 'Nota', type: 'number' },
  { name: 'foto', label: 'Foto', type: 'image' },
  { name: 'itens', label: 'Itens', type: 'list', itemLabel: 'Item', fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true },
    { name: 'img', label: 'Img', type: 'image' },
  ] },
];

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

describe('parseForm', () => {
  it('lê campos simples, boolean ausente = false, number', () => {
    const r = parseForm(fields, fd({ titulo: ' Olá ', nota: '4.7', foto: 'abc' }), {});
    expect(r).toMatchObject({ titulo: 'Olá', ativo: false, nota: 4.7, foto: 'abc' });
  });
  it('upload substitui imagem selecionada', () => {
    const r = parseForm(fields, fd({ titulo: 'x', foto: 'antiga' }), { foto: 'nova' });
    expect(r.foto).toBe('nova');
  });
  it('lista: ordena por _ordem, ignora item em branco, remove marcado', () => {
    const r = parseForm(fields, fd({
      titulo: 'x',
      'itens.0.nome': 'A', 'itens.0._ordem': '2',
      'itens.1.nome': 'B', 'itens.1._ordem': '1',
      'itens.2.nome': 'C', 'itens.2._ordem': '3', 'itens.2._remover': 'on',
      'itens.3.nome': '', 'itens.3._ordem': '4', 'itens.3.img': '',
    }), { 'itens.1.img': 'up' });
    expect(r.itens).toEqual([{ nome: 'B', img: 'up' }, { nome: 'A', img: '' }]);
  });
});

describe('validate', () => {
  it('obrigatório e tamanho máximo', () => {
    expect(validate(fields, { titulo: '', itens: [] })).toContain('Título é obrigatório');
    expect(validate(fields, { titulo: 'x'.repeat(21), itens: [] })).toContain('Título excede 20 caracteres');
  });
  it('valida campos dentro de listas com posição', () => {
    expect(validate(fields, { titulo: 'x', itens: [{ nome: '' }] })).toContain('Item 1: Nome é obrigatório');
  });
  it('url inválida', () => {
    const f: Field[] = [{ name: 'link', label: 'Link', type: 'url' }];
    expect(validate(f, { link: 'javascript:alert(1)' })).toContain('Link não é um endereço válido');
    expect(validate(f, { link: 'https://wa.me/1' })).toEqual([]);
    expect(validate(f, { link: 'tel:+351965833809' })).toEqual([]);
    expect(validate(f, { link: '/#servicos' })).toEqual([]);
    expect(validate(f, { link: '' })).toEqual([]);
  });
  it('todas as seções têm nome único', () => {
    const nomes = SECTIONS.map((s) => s.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
