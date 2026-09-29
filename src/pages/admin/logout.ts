import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/server/session.ts';

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/admin/login');
};
