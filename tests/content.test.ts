import { describe, it, expect, vi } from 'vitest';
import { createContentStore, ContentUnavailableError } from '../src/lib/server/content.ts';

describe('content store', () => {
  it('serve do banco e cacheia', async () => {
    const q = vi.fn().mockResolvedValue({ titulo: 'A' });
    const s = createContentStore(q);
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
    expect(q).toHaveBeenCalledTimes(1);
  });
  it('invalidate força nova leitura', async () => {
    const q = vi.fn().mockResolvedValueOnce({ titulo: 'A' }).mockResolvedValueOnce({ titulo: 'B' });
    const s = createContentStore(q);
    await s.get('hero'); s.invalidate('hero');
    expect(await s.get('hero')).toEqual({ titulo: 'B' });
  });
  it('banco fora do ar após invalidate → último valor', async () => {
    const q = vi.fn().mockResolvedValueOnce({ titulo: 'A' }).mockRejectedValueOnce(new Error('down'));
    const s = createContentStore(q);
    await s.get('hero'); s.invalidate('hero');
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
  });
  it('banco fora do ar sem cache → ContentUnavailableError', async () => {
    const s = createContentStore(vi.fn().mockRejectedValue(new Error('down')));
    await expect(s.get('hero')).rejects.toBeInstanceOf(ContentUnavailableError);
  });
  it('seção inexistente → ContentUnavailableError', async () => {
    const s = createContentStore(vi.fn().mockResolvedValue(undefined));
    await expect(s.get('hero')).rejects.toBeInstanceOf(ContentUnavailableError);
  });
});
