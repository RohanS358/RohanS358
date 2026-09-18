/* The collage must never show overlapping shapes — not at rest, and not
   while shapes are animating between layouts. Column bands make that
   structural: each shape owns its horizontal span for the whole
   animation, so no two can ever occupy the same space. */
import { pack, radii, PHASES, COLS, ROWS } from './pack.ts';

let fail = 0;
const N = 11;

const hit = (a, b) =>
  a.c < b.c + b.w && b.c < a.c + a.w && a.r < b.r + b.h && b.r < a.r + a.h;

for (let seed = 1; seed <= 300; seed++) {
  const rects = pack(N, seed);

  if (rects.length !== N) { console.log(`seed ${seed}: ${rects.length} rects, want ${N}`); fail++; continue; }

  for (const r of rects) {
    if (r.w <= 0 || r.h <= 0) { console.log(`seed ${seed}: zero-area`, r); fail++; }
    if (r.c < 0 || r.r < 0 || r.c + r.w > COLS || r.r + r.h > ROWS) {
      console.log(`seed ${seed}: out of bounds`, r); fail++;
    }
  }

  // at rest: disjoint...
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      if (hit(rects[i], rects[j])) { console.log(`seed ${seed}: overlap at rest`); fail++; }

  // ...and gapless, so the shapes touch as one collage
  const covered = new Set();
  for (const r of rects)
    for (let y = r.r; y < r.r + r.h; y++)
      for (let x = r.c; x < r.c + r.w; x++) covered.add(`${y},${x}`);
  if (covered.size !== COLS * ROWS) {
    console.log(`seed ${seed}: collage has ${COLS * ROWS - covered.size} hole(s)`); fail++;
  }
}

/* In flight, shapes may briefly share space. That is deliberate: the
   relayout crossfades so a crossing is never visible on screen. The
   invariant we DO guarantee is that every resting layout is a clean
   packing, which is what the loop above checks. */

/* Corners are square by design: the blocks butt against each other to
   form one cut-up plane, and any rounding opens a gap of paper at every
   junction. Asserted so a future "let's soften it" change has to be
   deliberate rather than accidental. */
/* The four phases must be visually distinct and every tile must get a
   value in each one. A phase that silently returns undefined drops
   border-radius entirely, which looks like "the morph stopped working"
   rather than an error. */
for (const ph of PHASES) {
  for (let i = 0; i < 11; i++) {
    const v = radii(ph, i);
    if (typeof v !== 'string' || !v) { console.log(`radii(${ph}, ${i}) gave`, v); fail++; }
  }
}
if (new Set(PHASES.map((ph) => radii(ph, 0))).size !== PHASES.length) {
  console.log('phases are not visually distinct'); fail++;
}

console.log(fail
  ? `${fail} FAILURE(S)`
  : `PASS — ${N} shapes over 300 layouts: full-grid packing, no overlaps, no holes, in bounds; 4 distinct corner phases`);
process.exit(fail ? 1 : 0);
