/* Shapes are free — they may overlap, sit at fractional positions and
   hang off the grid — so there is nothing to assert about how they are
   ARRANGED. What must hold is that every composition is complete and
   renderable: the full cast present, no zero-area shapes, and a radius
   for every shape in every phase. */
import {
  MAPS, PHASES, GRID, COMPOSITION_COUNT, composition, pack, radii, shapeRadius,
} from './pack.ts';

let fail = 0;
const N = 11;
const bad = (msg) => { console.log(msg); fail++; };

for (const [orient, g] of Object.entries(GRID)) {
  const set = MAPS[orient];
  if (set.length !== COMPOSITION_COUNT) {
    bad(`${orient}: ${set.length} compositions, expected ${COMPOSITION_COUNT}`);
  }

  for (const [i, comp] of set.entries()) {
    const where = `${orient} #${i} (${comp.name})`;

    if (!comp.name?.trim()) bad(`${where}: no name`);
    if (!PHASES.includes(comp.phase)) bad(`${where}: unknown phase ${comp.phase}`);
    if (comp.shapes.length !== N) {
      bad(`${where}: ${comp.shapes.length} shapes, expected ${N}`);
    }

    for (const [j, s] of comp.shapes.entries()) {
      for (const k of ['c', 'r', 'w', 'h']) {
        if (!Number.isFinite(s[k])) bad(`${where} shape ${j}: ${k} is ${s[k]}`);
      }
      /* Zero or negative area renders as nothing, which reads on the
         page as a project silently missing rather than as an error. */
      if (s.w <= 0 || s.h <= 0) bad(`${where} shape ${j}: ${s.w}x${s.h} has no area`);
    }

    /* Every shape must get a usable radius in every phase. A phase that
       falls through returns undefined, which drops border-radius
       entirely and looks like the morph broke. */
    for (const ph of PHASES) {
      for (const [j, s] of comp.shapes.entries()) {
        const v = shapeRadius(s, ph, g);
        if (typeof v !== 'string' || !v || v.includes('NaN') || v.includes('undefined')) {
          bad(`${where} shape ${j} in ${ph}: radius is ${v}`);
        }
      }
    }
  }

  /* The cycle wraps rather than running off the end: a tick counter is
     the only thing feeding this and it climbs without limit. */
  for (const step of [-7, -1, 0, COMPOSITION_COUNT, COMPOSITION_COUNT * 9 + 3]) {
    if (pack(N, step, orient).length !== N) bad(`${orient}: step ${step} did not wrap`);
    if (!composition(step, orient)?.name) bad(`${orient}: step ${step} has no composition`);
  }

  /* Asking for more shapes than a composition holds pads rather than
     dropping a project off the page. */
  if (pack(N + 3, 0, orient).length !== N + 3) bad(`${orient}: pack did not pad`);
}

/* A shape's own radius beats the composition's phase — that override is
   the whole reason a shape can break from its arrangement. */
const s = { c: 0, r: 0, w: 2, h: 2, radius: '3px 4px' };
if (shapeRadius(s, 'round', GRID.landscape) !== '3px 4px') {
  bad('shape radius did not override the phase');
}
if (shapeRadius({ c: 0, r: 0, w: 2, h: 2 }, 'square', GRID.landscape) !== '0px') {
  bad('phase was not used when a shape has no override');
}

/* The four phases must look different from each other, or the phase
   setting is doing nothing. Compared on a square shape, where the
   short-side pinning cannot coincidentally collapse two of them. */
const sq = { c: 0, r: 0, w: 2, h: 2 };
if (new Set(PHASES.map((p) => radii(p, sq, GRID.landscape))).size !== PHASES.length) {
  bad('phases are not visually distinct');
}

/* The shoulder arch faces out of the composition: top-left block arches
   top-left, bottom-right arches bottom-right. Easy to invert when
   editing the halves, and silent when it happens. */
const g = GRID.landscape;
if (!/^\S+%/.test(radii('shoulder', { c: 0, r: 0, w: 2, h: 2 }, g))) {
  bad('shoulder: top-left corner is not the arched one');
}
if (!/^0 0 \S+%/.test(radii('shoulder', { c: 10, r: 4, w: 2, h: 2 }, g))) {
  bad('shoulder: bottom-right corner is not the arched one');
}

console.log(fail
  ? `${fail} FAILURE(S)`
  : `PASS — ${COMPOSITION_COUNT} compositions x ${Object.keys(GRID).length} orientations: `
    + `${N} shapes each, all finite and non-empty, radius in every phase; `
    + `overrides win, phases distinct, arch faces out`);
process.exit(fail ? 1 : 0);
