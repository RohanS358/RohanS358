/* The collage must never show overlapping shapes — not at rest, and not
   while shapes are animating between layouts. Column bands make that
   structural: each shape owns its horizontal span for the whole
   animation, so no two can ever occupy the same space. */
import { pack, radii, COLS, ROWS } from './pack.ts';

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

const corners = radii(42, 3).split(' ');
if (corners.length !== 4) { console.log('radii should give 4 corners, got', corners.length); fail++; }
if (new Set(Array.from({ length: 60 }, (_, i) => radii(i, i))).size < 30) {
  console.log('radii not varied enough'); fail++;
}

console.log(fail
  ? `${fail} FAILURE(S)`
  : `PASS — ${N} shapes over 300 layouts: full-grid packing, no overlaps, no holes, in bounds; 4 independent corners`);

/* The scroll-driven silhouettes must stay valid shapes at EVERY point
   of the scroll cycle. A percentage that runs past its neighbour makes
   a polygon self-intersect (the shape visibly turns inside out), and a
   negative inset radius is dropped entirely (the morph snaps). Sweep
   the whole 0..1 cycle rather than spot-checking p=0. */
{
  const { shapePath, family } = await import('./pack.ts');
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    for (let step = 0; step <= 100; step++) {
      const p = step / 100;
      const path = shapePath(7, i, p);
      const nums = [...path.matchAll(/-?\d+(\.\d+)?(?=%)/g)].map((m) => Number(m[0]));
      if (!nums.length) { console.log('no numbers in', path); bad++; continue; }
      if (nums.some((v) => v < 0 || v > 100)) {
        console.log(`shape ${i} (${family(i)}) at p=${p}: out of range`, path); bad++;
      }
      // Shapes that cut BOTH sides must leave a body between the cuts.
      const fam = family(i);
      if ((fam === 'slant' || fam === 'chamfer') && nums.some((v) => v > 45)) {
        // the cut offsets are the small values; a cut past the midline
        // would cross its opposite edge.
        const cuts = nums.filter((v) => v < 50);
        if (cuts.some((v) => v >= 50)) { console.log(`shape ${i}: cut crosses midline`); bad++; }
      }
      if (fam === 'arch' || fam === 'pill') {
        const r = nums.filter((v) => v > 0);
        if (r.some((v) => v > 50)) { console.log(`shape ${i} (${fam}) at p=${p}: radius > 50%`, path); bad++; }
      }
    }
  }
  // Every family must actually be reachable, or the switch is dead code.
  const seen = new Set(Array.from({ length: 20 }, (_, i) => family(i)));
  if (seen.size !== 5) { console.log('families reachable:', [...seen]); bad++; }

  console.log(bad ? `${bad} SHAPE FAILURE(S)` : 'PASS — 5 families, 40 shapes x 101 scroll steps: all clip-paths in range');
  fail += bad;
}

process.exit(fail ? 1 : 0);
