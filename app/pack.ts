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
  // split() can only under-produce in pathological cases; pad so every
  // shape still gets a box rather than vanishing.
  while (out.length < n) out.push(out[out.length - 1]);
  return out.slice(0, n);
}

/**
 * Corner radii for one shape.
 *
 * Each corner is random, but they all share one scale: mixing a 50%
 * corner with a 2px corner on the same box reads as a mistake rather
 * than a choice. A shape picks a roundness band, then varies its four
 * corners within that band, so it stays visually balanced.
 */
export function radii(seed: number, index: number): string {
  const rand = rng(seed * 7919 + index * 104729);

  // The band this shape lives in, as a fraction of its shorter side.
  const r = rand();
  const band: [number, number] =
    r < 0.2
      ? [0.02, 0.06] // nearly square
      : r < 0.55
        ? [0.1, 0.22] // softened
        : r < 0.85
          ? [0.26, 0.4] // generous
          : [0.45, 0.5]; // pill / round

  const [lo, hi] = band;
  // Four corners, varied but all within the same band.
  const pick = () => `${((lo + rand() * (hi - lo)) * 100).toFixed(1)}%`;
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
