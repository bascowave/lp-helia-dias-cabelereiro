import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'hd_session';
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

export function createSessionToken(secret: string, now: number): string {
  if (!secret) throw new Error('SESSION_SECRET vazio');
  const exp = String(now + SESSION_MAX_AGE_S * 1000);
  return `${exp}.${sign(exp, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now: number): boolean {
  if (!token || !secret) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const expected = Buffer.from(sign(exp, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(exp) > now;
}
