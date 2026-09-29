import { describe, it, expect, vi } from 'vitest';
import { collectUploads } from '../src/lib/server/uploads-from-form.ts';
import { UploadError, MAX_BYTES } from '../src/lib/server/images.ts';

describe('collectUploads', () => {
  it('mapeia campos com ficheiro e ignora vazios', async () => {
    const fd = new FormData();
    fd.append('foto__file', new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }));
    fd.append('itens.2.img__file', new File([], '', { type: 'application/octet-stream' }));
    fd.append('titulo', 'x');
    const save = vi.fn().mockResolvedValue('arq');
    const r = await collectUploads(fd, save);
    expect(r).toEqual({ uploaded: { foto: 'arq' }, erros: [] });
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('converte UploadError em mensagem', async () => {
    const fd = new FormData();
    fd.append('foto__file', new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' }));
    const r = await collectUploads(fd, () => Promise.reject(new UploadError('Formato não suportado. Use JPG, PNG ou WebP.')));
    expect(r.erros).toEqual(['a.gif: Formato não suportado. Use JPG, PNG ou WebP.']);
  });
  it('recusa ficheiro acima de 10 MB sem o ler nem gravar', async () => {
    const fd = new FormData();
    fd.append('foto__file', new File([new Uint8Array(MAX_BYTES + 1)], 'grande.png', { type: 'image/png' }));
    const save = vi.fn();
    const r = await collectUploads(fd, save);
    expect(r.erros).toEqual(['grande.png: Imagem demasiado grande (máx. 10 MB).']);
    expect(save).not.toHaveBeenCalled();
  });
});
