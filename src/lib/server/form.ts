import type { Field } from './schemas.ts';

function readField(f: Field, fd: FormData, key: string, uploaded: Record<string, string>): unknown {
  if (f.type === 'list') return readList(f, fd, key, uploaded);
  const raw = fd.get(key);
  if (f.type === 'boolean') return raw === 'on';
  if (f.type === 'image') return uploaded[key] ?? String(raw ?? '');
  const s = typeof raw === 'string' ? raw : '';
  if (f.type === 'number') return s.trim() === '' ? null : Number(s.replace(',', '.'));
  return f.type === 'html' ? s : s.trim();
}

function readList(f: Extract<Field, { type: 'list' }>, fd: FormData, key: string, uploaded: Record<string, string>) {
  const idx = new Set<number>();
  const prefix = `${key}.`;
  for (const k of fd.keys()) if (k.startsWith(prefix)) idx.add(Number(k.slice(prefix.length).split('.')[0]));
  for (const k of Object.keys(uploaded)) if (k.startsWith(prefix)) idx.add(Number(k.slice(prefix.length).split('.')[0]));
  const rows: { ordem: number; item: Record<string, unknown> }[] = [];
  for (const i of [...idx].sort((a, b) => a - b)) {
    const base = `${key}.${i}`;
    if (fd.get(`${base}._remover`) === 'on') continue;
    const item: Record<string, unknown> = {};
    for (const sub of f.fields) item[sub.name] = readField(sub, fd, `${base}.${sub.name}`, uploaded);
    const vazio = f.fields.every((sub) => sub.type === 'boolean' || item[sub.name] === '' || item[sub.name] === null);
    if (vazio) continue;
    rows.push({ ordem: Number(fd.get(`${base}._ordem`) ?? i), item });
  }
  return rows.sort((a, b) => a.ordem - b.ordem).map((r) => r.item);
}

export function parseForm(fields: Field[], fd: FormData, uploaded: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.name] = readField(f, fd, f.name, uploaded);
  return out;
}

const URL_OK = /^(https?:\/\/|tel:|mailto:|\/)/i;

export function validate(fields: Field[], data: Record<string, unknown>, prefixo = ''): string[] {
  const erros: string[] = [];
  for (const f of fields) {
    const v = data[f.name];
    if (f.type === 'list') {
      (Array.isArray(v) ? v : []).forEach((item, i) =>
        erros.push(...validate(f.fields, item as Record<string, unknown>, `${f.itemLabel} ${i + 1}: `)));
      continue;
    }
    const vazio = v === '' || v === null || v === undefined;
    if (f.required && vazio && f.type !== 'boolean') { erros.push(`${prefixo}${f.label} é obrigatório`); continue; }
    if (vazio) continue;
    if (f.type === 'number' && Number.isNaN(v)) erros.push(`${prefixo}${f.label} deve ser um número`);
    if (typeof v === 'string' && f.max && v.length > f.max) erros.push(`${prefixo}${f.label} excede ${f.max} caracteres`);
    if (f.type === 'url' && !URL_OK.test(String(v))) erros.push(`${prefixo}${f.label} não é um endereço válido`);
  }
  return erros;
}
