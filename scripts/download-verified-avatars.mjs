import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('public/reviews');
fs.mkdirSync(dir, { recursive: true });

const downloads = [
  ['menina-94.jpg', 'https://lh3.googleusercontent.com/a-/ALV-UjVh5yRo68fRNhtWWNUhdPWuyPMAS45eNJgX06oXPCoASMAx5_8=s160-c-rp-mo-ba2-br100'],
  ['felicia-leites.jpg', 'https://lh3.googleusercontent.com/a-/ALV-UjVFgc8brC2ZM1KoXPf2tDR4TY8ihb8EQl_TWlHEmx6DKY38kdGx0A=s160-c-rp-mo-ba3-br100'],
  ['alexandra-flores.jpg', 'https://lh3.googleusercontent.com/a/ACg8ocKQMpyPcd4Ltfm5cxI-i-cGU9ScyB7kuvRoeHHL11oVhTKABH0=s160-c-rp-mo-ba3-br100'],
  ['djamila-monteiro.jpg', 'https://lh3.googleusercontent.com/a-/ALV-UjXF5yUzM__fLatbDnRS7f9ucd4CjfF033-uO_Xd93z2jdpEu2mfvQ=s160-c-rp-mo-ba4-br100'],
  ['claudia-marisa.jpg', 'https://lh3.googleusercontent.com/a/ACg8ocIPt0nFvK0FS5zIKddZ2Er24PzhHMds6NV3yTrEc3Ku81d39Q=s160-c-rp-mo-ba3-br100'],
  ['candida-ribeiro.jpg', 'https://lh3.googleusercontent.com/a-/ALV-UjWTwr-5ZDf81aOuPKEw67wcCdIVknTAbRZbzyemXgcswV_f1MiKWw=s160-c-rp-mo-br100'],
];

for (const [file, url] of downloads) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(dir, file), buf);
  console.log('saved', file, buf.length);
}
