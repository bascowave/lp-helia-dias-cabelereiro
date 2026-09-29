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

describe('processImage robustez', () => {
  it('troca largura/altura para fotos com orientação EXIF >= 5', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'up-'));
    const buf = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#c33' } })
      .jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const r = await processImage(buf, 'image/jpeg', dir);
    expect(r.largura).toBe(100);
    expect(r.altura).toBe(200);
    const meta = await sharp(join(dir, `${r.arquivo}-1600.webp`)).metadata();
    expect(meta.width).toBe(100);
  });
  it('ficheiro truncado dá UploadError e não deixa ficheiros', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'up-'));
    const raw = Buffer.alloc(400 * 400 * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 7 + (i >> 5) * 13) & 255;
    const full = await sharp(raw, { raw: { width: 400, height: 400, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
    await expect(processImage(full.subarray(0, Math.floor(full.length / 2)), 'image/png', dir))
      .rejects.toBeInstanceOf(UploadError);
    expect(await readdir(dir)).toEqual([]);
  });
});

describe('isValidUploadName', () => {
  it.each(['../../etc/passwd', 'x.webp', 'abc-800.webp/..', '%2e%2e', 'a'.repeat(36) + '-300.webp'])(
    'recusa %s', (n) => expect(isValidUploadName(n)).toBe(false),
  );
});
