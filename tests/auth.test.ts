import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { checkCredentials, LoginLimiter, clientIp } from '../src/lib/server/auth.ts';

const env = { ADMIN_USER: 'admin', ADMIN_PASSWORD_HASH: bcrypt.hashSync('segredo', 4) };

describe('credenciais', () => {
  it('aceita certas', async () => expect(await checkCredentials('admin', 'segredo', env)).toBe(true));
  it('recusa senha errada', async () => expect(await checkCredentials('admin', 'x', env)).toBe(false));
  it('recusa usuário errado', async () => expect(await checkCredentials('outro', 'segredo', env)).toBe(false));
  it('recusa sem hash configurado', async () =>
    expect(await checkCredentials('admin', 'segredo', { ADMIN_USER: 'admin' })).toBe(false));
});

describe('LoginLimiter', () => {
  it('bloqueia após 5 falhas e libera após 15 min', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 4; i++) l.fail('1.1.1.1', 0);
    expect(l.isBlocked('1.1.1.1', 0)).toBe(false);
    l.fail('1.1.1.1', 0);
    expect(l.isBlocked('1.1.1.1', 1000)).toBe(true);
    expect(l.isBlocked('2.2.2.2', 1000)).toBe(false);
    expect(l.isBlocked('1.1.1.1', 15 * 60_000 + 1)).toBe(false);
  });
  it('reset limpa', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 5; i++) l.fail('a', 0);
    l.reset('a');
    expect(l.isBlocked('a', 0)).toBe(false);
  });
  it('fail não estende bloqueio enquanto bloqueado', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 5; i++) l.fail('1.1.1.1', 0);
    expect(l.isBlocked('1.1.1.1', 1000)).toBe(true);
    l.fail('1.1.1.1', 10 * 60_000);
    expect(l.isBlocked('1.1.1.1', 15 * 60_000 + 1)).toBe(false);
  });
  it('contador decai após expiração do bloqueio', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 4; i++) l.fail('1.1.1.1', 0);
    l.fail('1.1.1.1', 16 * 60_000);
    expect(l.isBlocked('1.1.1.1', 16 * 60_000 + 1)).toBe(false);
  });
  it('entrada removida após expiração, falhas subsequentes não bloqueiam imediatamente', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 4; i++) l.fail('1.1.1.1', 0);
    expect(l.isBlocked('1.1.1.1', 16 * 60_000)).toBe(false);
    for (let i = 0; i < 4; i++) l.fail('1.1.1.1', 16 * 60_000);
    expect(l.isBlocked('1.1.1.1', 16 * 60_000)).toBe(false);
  });
});

describe('clientIp', () => {
  it('usa a última entrada de X-Forwarded-For (a que o proxy acrescentou), não a falsificável', () => {
    expect(clientIp('6.6.6.6, 9.9.9.9', '10.0.0.1')).toBe('9.9.9.9');
    expect(clientIp('9.9.9.9', '10.0.0.1')).toBe('9.9.9.9');
  });
  it('sem cabeçalho (ou vazio) usa o endereço do socket', () => {
    expect(clientIp(null, '10.0.0.1')).toBe('10.0.0.1');
    expect(clientIp(' , ', '10.0.0.1')).toBe('10.0.0.1');
  });
});
