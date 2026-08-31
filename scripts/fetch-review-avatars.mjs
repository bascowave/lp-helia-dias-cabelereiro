import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('public/reviews');
fs.mkdirSync(dir, { recursive: true });

const html = await (await fetch('https://guiaempresas.pt/cabeleireiro/esposende/helia-dias-cabeleireiros/')).text();

const blockRe =
  /<img class=lh-title[^>]+src="([^"]+)"[^>]*>\s*<span class=ml3>[^<]+<\/span>[\s\S]*?stars-review-(\d)-\d[\s\S]*?<span>([\s\S]*?)<\/span>/g;

const blocks = [];
for (const match of html.matchAll(blockRe)) {
  blocks.push({
    avatar: match[1],
    stars: Number(match[2]),
    text: match[3].replace(/\s+/g, ' ').trim(),
  });
}

function to160(url) {
  const base = url.split('=')[0];
  return `${base}=s160-c-rp-mo-br100`;
}

/** Liga cada crítica ao avatar correto pelo texto publicado no Google */
const targets = [
  {
    file: 'menina-94.jpg',
    includes: 'primeira vez que fui',
  },
  {
    file: 'felicia-leites.jpg',
    includes: 'Serviço excelente, simpatia',
  },
  {
    file: 'renato-alves.jpg',
    includes: 'barbeiro',
  },
  {
    file: 'catarina-de-brito.jpg',
    includes: 'espetaculares, produtos',
  },
  {
    file: 'mira-duarte.jpg',
    includes: 'Decidimos ir ao cabeleireiro',
  },
];

for (const target of targets) {
  const hit = blocks.find(
    (b) => b.stars === 5 && b.text.toLowerCase().includes(target.includes.toLowerCase()),
  );
  if (!hit) {
    console.warn('Não encontrado:', target.file, target.includes);
    continue;
  }
  const url = to160(hit.avatar);
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(dir, target.file), buf);
  console.log('saved', target.file, buf.length, '←', hit.text.slice(0, 60));
}

// Sofia é crítica recente — procurar qualquer bloco 5★ com "cliente" ou usar avatar de crítica recente se existir
const sofiaHit =
  blocks.find((b) => b.stars === 5 && /cliente fiel|confian/i.test(b.text)) ??
  blocks.find((b) => b.stars === 5 && b.text.includes('profissionais'));

if (sofiaHit) {
  const url = to160(sofiaHit.avatar);
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(dir, 'sofia-madalena-oliveira.jpg'), buf);
  console.log('saved sofia-madalena-oliveira.jpg (proxy)', buf.length);
} else {
  console.warn('Sofia: avatar não encontrado no espelho público — usar foto manual ou Google Business');
}
