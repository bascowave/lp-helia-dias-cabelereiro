import { describe, it, expect } from 'vitest';
import { isBannerVisible, parseBannerForm, toLocalInput, type Banner } from '../src/lib/server/banner.ts';

const base: Banner = { ativo: true, modo: 'faixa', titulo: 'Promo', texto: '', imagem: null, link: null,
  texto_botao: null, inicio: null, fim: null, atualizado_em: new Date(0) };
const d = (s: string) => new Date(s);

describe('isBannerVisible', () => {
  it('inativo nunca aparece', () => expect(isBannerVisible({ ...base, ativo: false }, d('2026-10-01'))).toBe(false));
  it('ativo sem datas aparece', () => expect(isBannerVisible(base, d('2026-10-01'))).toBe(true));
  it('antes do início não aparece', () =>
    expect(isBannerVisible({ ...base, inicio: d('2026-10-02T00:00:00Z') }, d('2026-10-01T23:59:59Z'))).toBe(false));
  it('depois do fim não aparece', () =>
    expect(isBannerVisible({ ...base, fim: d('2026-10-02T00:00:00Z') }, d('2026-10-02T00:00:01Z'))).toBe(false));
  it('entre início e fim aparece (limites inclusivos)', () => {
    const b = { ...base, inicio: d('2026-10-01T00:00:00Z'), fim: d('2026-10-02T00:00:00Z') };
    expect(isBannerVisible(b, d('2026-10-01T00:00:00Z'))).toBe(true);
    expect(isBannerVisible(b, d('2026-10-02T00:00:00Z'))).toBe(true);
  });
});

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

describe('parseBannerForm', () => {
  it('interpreta datetime-local em Europe/Lisbon (verão = UTC+1)', () => {
    const { dados, erros } = parseBannerForm(fd({ ativo: 'on', modo: 'popup', titulo: 'X', inicio: '2026-10-01T09:00' }), null);
    expect(erros).toEqual([]);
    expect(dados.inicio!.toISOString()).toBe('2026-10-01T08:00:00.000Z');
    expect(dados.modo).toBe('popup');
    expect(dados.ativo).toBe(true);
  });
  it('fim antes do início é erro', () => {
    const { erros } = parseBannerForm(fd({ titulo: 'X', modo: 'faixa', inicio: '2026-10-05T00:00', fim: '2026-10-01T00:00' }), null);
    expect(erros).toContain('A data de fim tem de ser posterior à de início');
  });
  it('título obrigatório quando ativo; modo inválido vira faixa', () => {
    const { dados, erros } = parseBannerForm(fd({ ativo: 'on', modo: 'xpto', titulo: '' }), null);
    expect(erros).toContain('Título é obrigatório');
    expect(dados.modo).toBe('faixa');
  });
  it('link inválido é erro; vazio vira null', () => {
    expect(parseBannerForm(fd({ titulo: 'X', link: 'javascript:x' }), null).erros).toContain('Link não é um endereço válido');
    expect(parseBannerForm(fd({ titulo: 'X', link: '' }), null).dados.link).toBeNull();
  });
  it('upload tem prioridade sobre imagem selecionada; "remover" limpa', () => {
    expect(parseBannerForm(fd({ titulo: 'X', imagem: 'a' }), 'b').dados.imagem).toBe('b');
    expect(parseBannerForm(fd({ titulo: 'X', imagem: '' }), null).dados.imagem).toBeNull();
  });
  it('toLocalInput faz ida e volta', () => {
    expect(toLocalInput(new Date('2026-10-01T08:00:00Z'))).toBe('2026-10-01T09:00');
    expect(toLocalInput(null)).toBe('');
  });
});
