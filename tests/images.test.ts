import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processImage, isValidUploadName, UploadError, MAX_BYTES } from '../src/lib/server/images.ts';

const png = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#c33' } }).png().toBuffer();

describe('processImage', () => {
  it('gera duas variantes webp e devolve dimensões originais', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'up-'));
    const r = await processImage(await png(2000, 1000), 'image/png', dir);
    expect(r.largura).toBe(2000);
    expect(r.altura).toBe(1000);
    expect((await readdir(dir)).sort()).toEqual([`${r.arquivo}-1600.webp`, `${r.arquivo}-800.webp`]);
    expect(isValidUploadName(`${r.arquivo}-800.webp`)).toBe(true);
  });
  it('não amplia imagem pequena', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'up-'));
    const r = await processImage(await png(300, 300), 'image/png', dir);
    const meta = await sharp(join(dir, `${r.arquivo}-1600.webp`)).metadata();
    expect(meta.width).toBe(300);
  });
  it('recusa tipo não suportado', async () => {
    await expect(processImage(Buffer.from('gif'), 'image/gif', tmpdir())).rejects.toBeInstanceOf(UploadError);
  });
  it('recusa acima de 10 MB', async () => {
    await expect(processImage(Buffer.alloc(MAX_BYTES + 1), 'image/png', tmpdir())).rejects.toBeInstanceOf(UploadError);
  });
  it('recusa conteúdo que não é imagem', async () => {
    await expect(processImage(Buffer.from('nao sou png'), 'image/png', tmpdir())).rejects.toBeInstanceOf(UploadError);
  });
});

describe('isValidUploadName', () => {
  it.each(['../../etc/passwd', 'x.webp', 'abc-800.webp/..', '%2e%2e', 'a'.repeat(36) + '-300.webp'])(
    'recusa %s', (n) => expect(isValidUploadName(n)).toBe(false),
  );
});
