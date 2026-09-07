#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUDGETS = {
  maxIndividualRawKb: 500,    // Max 500 KB uncompressed per chunk
  maxIndividualGzipKb: 160,   // Max 160 KB gzipped per chunk
  maxTotalRawMb: 4.0,         // Max 4.0 MB total JS across entire app
  maxTotalGzipMb: 1.2,        // Max 1.2 MB total gzipped JS across entire app
};

const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks');

if (!fs.existsSync(chunksDir)) {
  console.error('\x1b[31m[ERROR]\x1b[0m .next/static/chunks directory not found. Please run "next build" before checking bundle budgets.');
  process.exit(1);
}

const jsFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith('.js'));

if (jsFiles.length === 0) {
  console.error('\x1b[31m[ERROR]\x1b[0m No JavaScript chunks found in .next/static/chunks.');
  process.exit(1);
}

let totalRawBytes = 0;
let totalGzipBytes = 0;
const violations = [];

const chunkStats = jsFiles.map((file) => {
  const filePath = path.join(chunksDir, file);
  const content = fs.readFileSync(filePath);
  const rawBytes = content.length;
  const gzipBytes = zlib.gzipSync(content).length;

  totalRawBytes += rawBytes;
  totalGzipBytes += gzipBytes;

  const rawKb = rawBytes / 1024;
  const gzipKb = gzipBytes / 1024;

  if (rawKb > BUDGETS.maxIndividualRawKb) {
    violations.push(`Chunk "${file}" raw size (${rawKb.toFixed(1)} KB) exceeds budget of ${BUDGETS.maxIndividualRawKb} KB.`);
  }
  if (gzipKb > BUDGETS.maxIndividualGzipKb) {
    violations.push(`Chunk "${file}" gzipped size (${gzipKb.toFixed(1)} KB) exceeds budget of ${BUDGETS.maxIndividualGzipKb} KB.`);
  }

  return { name: file, rawKb, gzipKb };
});

chunkStats.sort((a, b) => b.gzipKb - a.gzipKb);

const totalRawMb = totalRawBytes / 1024 / 1024;
const totalGzipMb = totalGzipBytes / 1024 / 1024;

if (totalRawMb > BUDGETS.maxTotalRawMb) {
  violations.push(`Total JS bundle (${totalRawMb.toFixed(2)} MB) exceeds budget of ${BUDGETS.maxTotalRawMb} MB.`);
}
if (totalGzipMb > BUDGETS.maxTotalGzipMb) {
  violations.push(`Total gzipped JS bundle (${totalGzipMb.toFixed(2)} MB) exceeds budget of ${BUDGETS.maxTotalGzipMb} MB.`);
}

console.log('\n======================================================');
console.log('         ADMIN-PANEL CLIENT BUNDLE BUDGET CHECK       ');
console.log('======================================================\n');
console.log(`Total Chunks Analyzed: ${jsFiles.length}`);
console.log(`Total JS Raw:          ${totalRawMb.toFixed(2)} MB (Budget: <= ${BUDGETS.maxTotalRawMb} MB)`);
console.log(`Total JS Gzip:         ${(totalGzipBytes / 1024).toFixed(1)} KB / ${totalGzipMb.toFixed(2)} MB (Budget: <= ${BUDGETS.maxTotalGzipMb} MB)\n`);

console.log('Top 8 Largest Chunks (Gzipped):');
console.log('------------------------------------------------------');
chunkStats.slice(0, 8).forEach((chunk, index) => {
  console.log(
    ` ${index + 1}. ${chunk.name.padEnd(28)} Raw: ${chunk.rawKb.toFixed(1).padStart(6)} KB | Gzip: ${chunk.gzipKb.toFixed(1).padStart(5)} KB`
  );
});
console.log('------------------------------------------------------\n');

if (violations.length > 0) {
  console.error('\x1b[31m[FAILED]\x1b[0m Bundle budget check failed with violations:');
  violations.forEach((v) => console.error(`  - \x1b[31m${v}\x1b[0m`));
  console.error('\nPlease check for accidental static imports of heavy libraries (e.g. jspdf, xlsx, charts) and code-split them using next/dynamic.\n');
  process.exit(1);
} else {
  console.log('\x1b[32m[PASSED]\x1b[0m All client bundle budgets are respected! No chunk or total exceeded limits.\n');
  process.exit(0);
}
