import fs from 'node:fs';

const html = await (await fetch('https://guiaempresas.pt/cabeleireiro/esposende/helia-dias-cabeleireiros/')).text();
const blockRe =
  /<img class=lh-title[^>]+src="([^"]+)"[^>]*>\s*<span class=ml3>([^<]+)<\/span>[\s\S]*?stars-review-(\d)-\d[\s\S]*?<span>([\s\S]*?)<\/span>/g;

const blocks = [];
for (const match of html.matchAll(blockRe)) {
  blocks.push({
    initials: match[2].trim(),
    avatar: match[1],
    stars: Number(match[3]),
    text: match[4].replace(/\s+/g, ' ').trim(),
  });
}

fs.writeFileSync('scripts/review-blocks.json', JSON.stringify(blocks, null, 2));
console.log('blocks', blocks.length);
