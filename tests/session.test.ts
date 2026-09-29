import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_S } from '../src/lib/server/session.ts';

const S = 'x'.repeat(32);
const T0 = 1_800_000_000_000;

describe('sessão', () => {
  it('aceita token válido', () => {
    expect(verifySessionToken(createSessionToken(S, T0), S, T0 + 1000)).toBe(true);
  });
  it('rejeita expirado', () => {
    const t = createSessionToken(S, T0);
    expect(verifySessionToken(t, S, T0 + SESSION_MAX_AGE_S * 1000 + 1)).toBe(false);
  });
  it('rejeita adulterado', () => {
    const t = createSessionToken(S, T0);
    const [exp, sig] = t.split('.');
    expect(verifySessionToken(`${Number(exp) + 1}.${sig}`, S, T0)).toBe(false);
  });
  it('rejeita outro segredo, vazio e malformado', () => {
    expect(verifySessionToken(createSessionToken(S, T0), 'y'.repeat(32), T0)).toBe(false);
    expect(verifySessionToken(undefined, S, T0)).toBe(false);
    expect(verifySessionToken('lixo', S, T0)).toBe(false);
  });
  it('rejeita token com segredo vazio', () => {
    expect(verifySessionToken(createSessionToken(S, T0), '', T0)).toBe(false);
  });
  it('createSessionToken lança erro com segredo vazio', () => {
    expect(() => createSessionToken('', T0)).toThrow('SESSION_SECRET vazio');
  });
  it('rejeita token forjado com segredo vazio', () => {
    const { createHmac } = require('node:crypto');
    const exp = String(T0 + 1000);
    const sig = createHmac('sha256', '').update(exp).digest('base64url');
    const token = `${exp}.${sig}`;
    expect(verifySessionToken(token, '', T0)).toBe(false);
  });
});
