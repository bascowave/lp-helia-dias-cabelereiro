import { MAX_BYTES, UploadError } from './images.ts';

export async function collectUploads(fd: FormData, save: (f: File) => Promise<string>) {
  const uploaded: Record<string, string> = {};
  const erros: string[] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.endsWith('__file') || !(v instanceof File) || v.size === 0) continue;
    if (v.size > MAX_BYTES) { erros.push(`${v.name}: Imagem demasiado grande (máx. 10 MB).`); continue; }
    try {
      uploaded[k.slice(0, -'__file'.length)] = await save(v);
    } catch (e) {
      if (e instanceof UploadError) erros.push(`${v.name}: ${e.message}`);
      else throw e;
    }
  }
  return { uploaded, erros };
}
