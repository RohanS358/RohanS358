/* Every cell of the 12x6 collage must be covered exactly once, with no
   zero-area shapes — otherwise the composition has holes or a shape
   silently disappears. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'Shell.tsx'), 'utf8');
const start = src.indexOf('const CELLS = [');
const block = src.slice(start, src.indexOf('];', start));
const cells = [...block.matchAll(/col-start-(\d+) col-span-(\d+) row-start-(\d+) row-span-(\d+)/g)]
  .map(m => ({ cs: +m[1], cp: +m[2], rs: +m[3], rp: +m[4] }));

let fail = 0;
const zero = cells.filter(c => c.cp === 0 || c.rp === 0);
if (zero.length) { console.log(`FAIL: ${zero.length} zero-area cell(s) — they render nothing`); fail++; }

const grid = new Map();
for (const c of cells)
  for (let r = c.rs; r < c.rs + c.rp; r++)
    for (let col = c.cs; col < c.cs + c.cp; col++) {
      const k = `${r},${col}`;
      grid.set(k, (grid.get(k) ?? 0) + 1);
      if (r > 6 || col > 12) { console.log(`FAIL: cell ${k} is outside the 12x6 grid`); fail++; }
    }

const overlaps = [...grid.entries()].filter(([, n]) => n > 1);
if (overlaps.length) { console.log(`FAIL: ${overlaps.length} overlapping cell(s)`); fail++; }

const missing = [];
for (let r = 1; r <= 6; r++) for (let c = 1; c <= 12; c++) if (!grid.has(`${r},${c}`)) missing.push(`${r},${c}`);
if (missing.length) { console.log(`FAIL: ${missing.length} hole(s): ${missing.slice(0, 10).join(' ')}`); fail++; }

console.log(fail ? `${fail} FAILURE(S)` : `PASS — ${cells.length} shapes tile 12x6 with no holes, overlaps or zero-area cells`);
process.exit(fail ? 1 : 0);
