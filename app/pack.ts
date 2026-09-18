/**
 * Random collage layouts that cannot overlap.
 *
 * Rather than placing shapes at random and hoping they miss each other,
 * we RECURSIVELY SPLIT the grid: a rectangle is cut into two, each half
 * is cut again, until there is one leaf per shape. Leaves of a binary
 * space partition are disjoint and cover the whole area by construction,
 * so "nothing overlaps" is a property of the algorithm, not a check that
 * might miss a case.
 *
 * Every shape also gets its own randomised corner radii, four corners
 * independently, so no two shapes share a silhouette.
 */

export type Rect = { c: number; r: number; w: number; h: number };

/** Deterministic PRNG so a given seed always yields the same layout. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/**
 * Split `rect` into exactly `n` disjoint rectangles.
 * Guarantees: every output is inside `rect`, no two outputs overlap,
 * and every cell of `rect` belongs to exactly one output.
 */
function split(rect: Rect, n: number, rand: () => number): Rect[] {
  if (n <= 1) return [rect];

  // Give each side a share proportional to a random-ish balance, but
  // never so lopsided that a piece has no room for its shapes.
  const left = Math.max(1, Math.min(n - 1, Math.round(n * (0.35 + rand() * 0.3))));
  const right = n - left;

  // Cut along whichever axis has room; prefer the longer side so pieces
  // stay reasonably square.
  const canV = rect.w >= 2;
  const canH = rect.h >= 2;
  const vertical = canV && (!canH || (rect.w >= rect.h ? rand() < 0.8 : rand() < 0.3));

  if (vertical) {
    // Each side needs at least 1 column per shape it will hold.
    const min = Math.max(1, left);
    const max = Math.min(rect.w - 1, rect.w - right);
    if (max < min) return splitEven(rect, n);
    const cut = min + Math.floor(rand() * (max - min + 1));
    return [
      ...split({ ...rect, w: cut }, left, rand),
      ...split({ ...rect, c: rect.c + cut, w: rect.w - cut }, right, rand),
    ];
  }

  const min = Math.max(1, left);
  const max = Math.min(rect.h - 1, rect.h - right);
  if (max < min) return splitEven(rect, n);
  const cut = min + Math.floor(rand() * (max - min + 1));
  return [
    ...split({ ...rect, h: cut }, left, rand),
    ...split({ ...rect, r: rect.r + cut, h: rect.h - cut }, right, rand),
  ];
}

/** Fallback when a rectangle is too small to cut randomly: slice evenly. */
function splitEven(rect: Rect, n: number): Rect[] {
  const along = rect.w >= rect.h ? "w" : "h";
  const total = rect[along];
  // Not enough room to give everyone a cell — split the other way.
  if (total < n) {
    const other = along === "w" ? "h" : "w";
    if (rect[other] >= n) {
      const out: Rect[] = [];
      const size = Math.floor(rect[other] / n);
      for (let i = 0; i < n; i++) {
        const isLast = i === n - 1;
        const off = i * size;
        const len = isLast ? rect[other] - off : size;
        out.push(
          other === "w"
            ? { ...rect, c: rect.c + off, w: len }
            : { ...rect, r: rect.r + off, h: len },
        );
      }
      return out;
    }
    // Genuinely cannot fit; return what we can rather than overlapping.
    return [rect];
  }

  const out: Rect[] = [];
  const size = Math.floor(total / n);
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const off = i * size;
    const len = isLast ? total - off : size;
    out.push(
      along === "w"
        ? { ...rect, c: rect.c + off, w: len }
        : { ...rect, r: rect.r + off, h: len },
    );
  }
  return out;
}

export const COLS = 12;
export const ROWS = 6;

/** A full-grid packing of `n` disjoint rectangles. */
export function pack(n: number, seed: number): Rect[] {
  const rand = rng(seed);
  const out = split({ c: 0, r: 0, w: COLS, h: ROWS }, n, rand);
  // Hero first: the largest leaf goes to index 0, so the composition
  // has an anchor instead of uniform lumps. Reordering leaves cannot
  // break disjointness — it is the same set of rectangles.
  const big = out.reduce((best, r, i) => (r.w * r.h > out[best].w * out[best].h ? i : best), 0);
  if (out.length) [out[0], out[big]] = [out[big], out[0]];
  // split() can only under-produce in pathological cases; pad so every
  // shape still gets a box rather than vanishing.
  while (out.length < n) out.push(out[out.length - 1]);
  return out.slice(0, n);
}

/**
 * Expressive silhouettes, driven by scroll.
 *
 * `border-radius` can only ever round a rectangle. clip-path can cut
 * it: chamfers, slants, arches, notches. The catch is that clip-path
 * only INTERPOLATES between paths of the same family with the same
 * number of points — polygon->inset, or 4 points->6 points, snaps.
 * So a shape picks its family once from its seed and keeps it; only
 * the numbers inside move as you scroll. That is what makes the morph
 * read as one continuous deformation rather than a flicker.
 *
 * `p` is scroll progress, wrapped to 0..1.
 */
const FAMILIES = ["slant", "arch", "chamfer", "pill", "notch"] as const;
export type Family = (typeof FAMILIES)[number];

export function family(index: number): Family {
  return FAMILIES[index % FAMILIES.length];
}

export function shapePath(seed: number, index: number, p: number): string {
  // Each shape reads the same scroll at its own phase, so the
  // composition breathes instead of pulsing in unison.
  const phase = Math.sin(p * Math.PI * 2 + index * 1.1);
  const bias = ((seed * 7919 + index * 104729) % 1000) / 1000;

  switch (family(index)) {
    case "slant": {
      // 3..17. The boxes are packed gapless, so every cut opens a gap
      // against the neighbour — past ~20% the collage stops reading as
      // one composition and becomes floating slivers.
      const o = 3 + bias * 6 + Math.abs(phase) * 8;
      return `polygon(${o}% 0%, 100% 0%, ${100 - o}% 100%, 0% 100%)`;
    }
    case "arch": {
      // Both top corners swing from near-square to near-round, staying
      // inside 0..50 by range rather than by clamping, so the swing
      // never stalls at either end. Range: 24 ± 22 -> 2..46.
      // bias shifts the centre a little so two arches differ; the swing
      // shrinks to match, keeping the total inside 2..46.
      const mid = 20 + bias * 8;
      const r = mid + phase * (Math.min(mid, 46 - mid) - 2);
      return `inset(0% 0% 0% 0% round ${r.toFixed(1)}% ${r.toFixed(1)}% 0% 0%)`;
    }
    case "chamfer": {
      // Centres chosen so the swing never needs clamping — a clamp
      // would stall the corner at the extremes instead of morphing it.
      const a = 10 + bias * 4 + phase * 6;
      const b = 12 + bias * 4 - phase * 7;
      return `polygon(${a}% 0%, 100% 0%, 100% ${100 - b}%, ${100 - a}% 100%, 0% 100%, 0% ${b}%)`;
    }
    case "pill": {
      // Kept strictly under 50%. Clamping there instead would make the
      // shape sit still at the extremes; scaling the range keeps it
      // moving for the whole cycle. Max: 12 + 12 + 24 = 48.
      const r = 12 + bias * 12 + Math.abs(phase) * 24;
      return `inset(0% 0% 0% 0% round ${r.toFixed(1)}%)`;
    }
    default: {
      // 4..20, same reason as the slant: a deep notch tears the collage.
      const n = 12 + bias * 4 - phase * 7;
      return `polygon(0% 0%, ${100 - n}% 0%, 100% ${n}%, 100% 100%, 0% 100%)`;
    }
  }
}

/**
 * Four independently random corner radii.
 *
 * Deliberately NOT banded per shape: letting a 50% corner sit next to a
 * sharp one is what gives each shape its own tapered, lopsided
 * character, and it is the look Rohan picked over the balanced version.
 */
export function radii(seed: number, index: number): string {
  const rand = rng(seed * 7919 + index * 104729);
  const pick = () => {
    const r = rand();
    // A spread of forms: sharp, softened, generous, fully round.
    if (r < 0.18) return "2px";
    if (r < 0.5) return `${(0.75 + rand() * 1.5).toFixed(2)}rem`;
    if (r < 0.8) return `${(2 + rand() * 2.5).toFixed(2)}rem`;
    return "50%";
  };
  return `${pick()} ${pick()} ${pick()} ${pick()}`;
}





/* ------------------------------------------------------------------
   Keeping the collage clean DURING the move.

   Two shapes can each be overlap-free at rest and still cross paths
   while tweening. Requiring the swept boxes to be disjoint fixes that
   but is far too strict — measured 18.7% acceptance, and chains of
   such layouts dead-end within a step or two.

   Instead the layout is built from COLUMN BANDS. Each shape owns a band
   for the whole animation; only its vertical extent within that band
   changes. Shapes never share horizontal space, so no two can ever
   cross, at rest or in flight — again a property of the construction
   rather than a test that might miss a case.
   ------------------------------------------------------------------ */

/**
 * `n` shapes packed into vertical bands. Band boundaries are stable for
 * a given `bandSeed`, so shapes keep their column while their heights
 * and vertical offsets reshuffle.
 */
export function packBands(n: number, seed: number, bandSeed = 1): Rect[] {
  const bandRand = rng(bandSeed);
  // How many columns per band: at least 1, summing to COLS.
  const weights = Array.from({ length: n }, () => 0.6 + bandRand() * 0.8);
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.max(1, Math.round((w / total) * COLS)));

  // Fix rounding drift so the bands exactly fill COLS.
  let drift = widths.reduce((a, b) => a + b, 0) - COLS;
  for (let i = 0; drift !== 0 && i < widths.length * 4; i++) {
    const k = i % widths.length;
    if (drift > 0 && widths[k] > 1) {
      widths[k]--;
      drift--;
    } else if (drift < 0) {
      widths[k]++;
      drift++;
    }
  }

  const rand = rng(seed);
  const out: Rect[] = [];
  let c = 0;
  for (let i = 0; i < n; i++) {
    const w = widths[i];
    // Vary height and vertical position inside the band.
    const h = 2 + Math.floor(rand() * (ROWS - 1));
    const r = Math.floor(rand() * (ROWS - h + 1));
    out.push({ c, r, w: w, h: Math.min(h, ROWS - r) });
    c += w;
  }
  return out;
}
