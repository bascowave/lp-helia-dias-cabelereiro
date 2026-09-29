import { describe, it, expect } from 'vitest';
import { needsAuth } from '../src/middleware.ts';

describe('needsAuth', () => {
  it.each(['/admin', '/admin/', '/admin/secao/hero', '/admin/banner', '/ADMIN/banner'])('protege %s', (p) =>
    expect(needsAuth(p)).toBe(true));
  it.each(['/', '/admin/login', '/administracao', '/uploads/x.webp'])('não protege %s', (p) =>
    expect(needsAuth(p)).toBe(false));
});
