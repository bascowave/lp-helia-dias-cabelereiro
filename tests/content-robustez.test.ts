import { describe, it, expect, vi } from 'vitest';
import { createContentStore, ContentUnavailableError } from '../src/lib/server/content.ts';

describe('content store — robustez', () => {
  it('gets concorrentes partilham uma só query', async () => {
    let resolve!: (v: unknown) => void;
    const q = vi.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    const s = createContentStore(q);
    const a = s.get('hero');
    const b = s.get('hero');
    resolve({ titulo: 'A' });
    expect(await a).toEqual({ titulo: 'A' });
    expect(await b).toEqual({ titulo: 'A' });
    expect(q).toHaveBeenCalledTimes(1);
  });

  it('após falha servida do cache, não volta a consultar durante 5000 ms', async () => {
    let t = 1000;
    const q = vi.fn()
      .mockResolvedValueOnce({ titulo: 'A' })
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ titulo: 'B' });
    const s = createContentStore(q, () => t);
    await s.get('hero'); s.invalidate('hero');
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
    expect(q).toHaveBeenCalledTimes(2);
    t += 4999;
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
    expect(q).toHaveBeenCalledTimes(2);
    t += 1;
    expect(await s.get('hero')).toEqual({ titulo: 'B' });
    expect(q).toHaveBeenCalledTimes(3);
  });

  it('falha sem cache não é cacheada', async () => {
    const q = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ titulo: 'A' });
    const s = createContentStore(q);
    await expect(s.get('hero')).rejects.toBeInstanceOf(ContentUnavailableError);
    expect(await s.get('hero')).toEqual({ titulo: 'A' });
  });

  it('leitura em voo não sobrepõe uma invalidação', async () => {
    let resolve!: (v: unknown) => void;
    const q = vi.fn()
      .mockReturnValueOnce(new Promise((r) => { resolve = r; }))
      .mockResolvedValueOnce({ titulo: 'novo' });
    const s = createContentStore(q);
    const a = s.get('hero');
    s.invalidate('hero');
    resolve({ titulo: 'antigo' });
    expect(await a).toEqual({ titulo: 'antigo' });
    expect(await s.get('hero')).toEqual({ titulo: 'novo' });
    expect(q).toHaveBeenCalledTimes(2);
  });
});
