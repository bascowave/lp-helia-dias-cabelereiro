import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 10 * 1024 * 1024;
export const WIDTHS = [800, 1600] as const;

export class UploadError extends Error {}

export const uploadsDir = () => process.env.UPLOADS_DIR ?? '/data/uploads';
export const imgSrc = (arquivo: string, w: 800 | 1600) => `/uploads/${arquivo}-${w}.webp`;

const NOME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(800|1600)\.webp$/;
export const isValidUploadName = (name: string) => NOME.test(name);

export async function processImage(buf: Buffer, mime: string, dir: string) {
  if (!ACCEPTED_TYPES.includes(mime)) throw new UploadError('Formato não suportado. Use JPG, PNG ou WebP.');
  if (buf.length > MAX_BYTES) throw new UploadError('Imagem demasiado grande (máx. 10 MB).');
  let meta;
  try { meta = await sharp(buf).metadata(); } catch { throw new UploadError('Ficheiro de imagem inválido.'); }
  if (!meta.width || !meta.height) throw new UploadError('Ficheiro de imagem inválido.');
  const arquivo = randomUUID();
  await mkdir(dir, { recursive: true });
  for (const w of WIDTHS) {
    await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 85 })
      .toFile(join(dir, `${arquivo}-${w}.webp`));
  }
  return { arquivo, largura: meta.width, altura: meta.height };
}

export async function saveUpload(file: File, alt = ''): Promise<string> {
  const { sql } = await import('./db.ts');
  const r = await processImage(Buffer.from(await file.arrayBuffer()), file.type, uploadsDir());
  await sql`insert into imagens (id, arquivo, alt, largura, altura)
            values (${r.arquivo}, ${r.arquivo}, ${alt}, ${r.largura}, ${r.altura})`;
  return r.arquivo;
}

export async function listImages() {
  const { sql } = await import('./db.ts');
  return sql<{ arquivo: string; alt: string }[]>`select arquivo, alt from imagens order by criado_em desc`;
}
