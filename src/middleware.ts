import type { MiddlewareHandler } from 'astro';
import { SESSION_COOKIE, verifySessionToken } from './lib/server/session.ts';

export function needsAuth(pathname: string): boolean {
  const p = pathname.toLowerCase().replace(/\/+$/, '');
  return (p === '/admin' || p.startsWith('/admin/')) && p !== '/admin/login';
}

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  if (needsAuth(ctx.url.pathname)) {
    const ok = verifySessionToken(ctx.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '', Date.now());
    if (!ok) return ctx.redirect('/admin/login');
  }
  const res = await next();
  if (ctx.url.pathname.toLowerCase().startsWith('/admin')) res.headers.set('Cache-Control', 'no-store');
  return res;
};
