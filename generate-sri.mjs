#!/usr/bin/env node
// tools/generate-sri.mjs
// Baixa cada <script>/<link> de CDN marcado com data-sri-pending, calcula o hash SHA-384 do arquivo REAL
// e grava integrity="sha384-..." nos HTMLs. Precisa de internet. Uso:   node tools/generate-sri.mjs
//
// Por que não vem pronto? Os hashes dependem do conteúdo exato baixado do CDN; gerar sem baixar o arquivo
// seria inventar um valor — e um hash errado BLOQUEIA o script e quebra o sistema.
// Se o download falhar (ex.: 404 de versão), o script avisa e NÃO altera aquele arquivo.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const FILES = ['index.html', 'caixa.html'];
const TAG = /<script\b([^>]*?)\bsrc="(https:\/\/[^"]+)"([^>]*?)\bdata-sri-pending([^>]*)>/g;
const META_TAG = /<meta name="lazy-xlsx" content="(https:\/\/[^"]+)" data-sri-pending>/g; // biblioteca carregada sob demanda

const cache = new Map();
async function sri(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const value = 'sha384-' + createHash('sha384').update(buf).digest('base64');
  cache.set(url, value);
  return value;
}

let failed = 0;
for (const file of FILES) {
  let html = await readFile(file, 'utf8');
  const matches = [...html.matchAll(TAG)];
  for (const m of matches) {
    const url = m[2];
    try {
      const integrity = await sri(url);
      const replacement = `<script${m[1]}src="${url}"${m[3]}integrity="${integrity}"${m[4]}>`;
      html = html.replace(m[0], replacement);
      console.log(`OK    ${file}: ${url}\n      ${integrity}`);
    } catch (err) {
      failed++;
      console.error(`ERRO  ${file}: ${url} -> ${err.message} (arquivo NÃO alterado)`);
    }
  }
  for (const m of [...html.matchAll(META_TAG)]) {
    try {
      const integrity = await sri(m[1]);
      html = html.replace(m[0], `<meta name="lazy-xlsx" content="${m[1]}" data-integrity="${integrity}">`);
      console.log(`OK    ${file}: ${m[1]} (sob demanda)\n      ${integrity}`);
    } catch (err) {
      failed++;
      console.error(`ERRO  ${file}: ${m[1]} -> ${err.message} (arquivo NÃO alterado)`);
    }
  }
  await writeFile(file, html);
}
if (failed) { console.error(`\n${failed} recurso(s) sem SRI. Verifique a URL/versão e rode de novo.`); process.exit(1); }
console.log('\nSRI aplicado. Faça deploy e confirme no console do navegador que nenhum script foi bloqueado.');
