import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidUploadName, uploadsDir } from '../../lib/server/images.ts';

export const GET: APIRoute = async ({ params }) => {
  const name = params.file ?? '';
  if (!isValidUploadName(name)) return new Response(null, { status: 404 });
  try {
    const body = await readFile(join(uploadsDir(), name));
    return new Response(body, {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
