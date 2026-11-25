import { createHash } from 'node:crypto';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist/About', { recursive: true });
await copyFile('dist/index.html', 'dist/About/index.html');
const html = await readFile('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="[^"]*?\/assets\/([^"]+)"/g)].map(match => 'assets/' + match[1]);
const version = createHash('sha256').update(html).digest('hex').slice(0, 12);
const worker = await readFile('dist/sw.js', 'utf8');
await writeFile('dist/sw.js', `const shell = ${JSON.stringify(assets)};\nconst version = '${version}';\n${worker}`);
