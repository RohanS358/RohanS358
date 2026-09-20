/**
 * Authored collage layouts.
 *
 * This used to split the grid at random and hope the result composed.
 * It mostly did not: with a new throw every few seconds, no two ticks
 * were related and most landed on shapes nobody would have drawn on
 * purpose — slivers, lopsided towers, a different accident each time.
 *
 * The cast is fixed at 11 shapes, so the layouts are placed by hand
 * instead, and edited in the browser at /studio rather than typed here.
 *
 * Shapes are FREE: they may overlap, sit at fractional positions, and
 * hang past the edge of the grid. Earlier versions kept a strict tiling
 * and derived corners from the box, which held the composition together
 * but left nothing to compose WITH. A shape now carries its own
 * rectangle and, optionally, its own corner radius.
 */

/** A shape's placement, in grid units. Fractional and unbounded. */
export type Rect = { c: number; r: number; w: number; h: number };

/**
 * One shape in one composition: where it sits, and how its corners are
 * cut. `radius` is any CSS border-radius; when absent the composition's
 * phase decides, which is what keeps a whole arrangement coherent
 * unless a shape is deliberately singled out.
 */
export type Shape = Rect & { radius?: string };

export type Composition = {
  name: string;
  note: string;
  /** Eleven shapes, in the order projects are handed out. */
  shapes: Shape[];
  /** The silhouette worn by shapes that do not override it. */
  phase: Phase;
};

/**
 * Grid shape per orientation.
 *
 * A phone is tall, so the landscape 12x6 grid squeezed into it turns
 * every cell into a thin vertical sliver. Portrait transposes the grid
 * instead of scaling it, which keeps cells roughly square at any
 * screen shape.
 *
 * The grid is now only a COORDINATE SYSTEM — shapes are not required to
 * stay inside it, and a composition may deliberately bleed off an edge.
 */
export const GRID = {
  landscape: { cols: 12, rows: 6 },
  portrait: { cols: 6, rows: 12 },
} as const;

export type Orientation = keyof typeof GRID;

/**
 * Silhouette phases.
 *
 * A phase is the default corner treatment for a whole composition, so
 * an arrangement reads as one piece. Individual shapes override it via
 * `radius` when a composition wants one block to behave differently.
 */
export type Phase = "square" | "shoulder" | "round" | "capsule";

export const PHASES: Phase[] = ["square", "shoulder", "round", "capsule"];

/**
 * The border-radius a shape wears.
 *
 * Its own `radius` wins; otherwise the composition's phase decides,
 * read off the shape's BOX rather than its index in the array. Rotating
 * corners by array position was arbitrary — it made the field look
 * speckled, because the shape a block wore had nothing to do with where
 * it sat or how big it was.
 */
export function radii(phase: Phase, box: Rect, grid: { cols: number; rows: number }): string {
  switch (phase) {
    case "square":
      return "0px";

    case "shoulder": {
      /* One arched corner per shape, facing OUT of the composition: a
         block in the top-left arches top-left, so the four corners of
         the field bloom outward together. */
      const left = (box.c + box.w / 2) / grid.cols < 0.5;
      const top = (box.r + box.h / 2) / grid.rows < 0.5;

      /* A quarter-round, written as an explicit horizontal/vertical
         pair. A single percentage resolves against each axis
         separately, so on a 4x1 bar it would arch a quarter of the
         WIDTH horizontally and a quarter of the height vertically — a
         long shallow sweep rather than a corner. Pinning both radii to
         the short side keeps the same arch on every block. */
      const short = Math.min(box.w, box.h);
      const h = ((short / box.w) * 50).toFixed(2);
      const v = ((short / box.h) * 50).toFixed(2);
      const corner = (which: 0 | 1 | 2 | 3) => {
        const hs = ["0", "0", "0", "0"];
        const vs = ["0", "0", "0", "0"];
        hs[which] = `${h}%`;
        vs[which] = `${v}%`;
        return `${hs.join(" ")} / ${vs.join(" ")}`;
      };

      // Order is top-left, top-right, bottom-right, bottom-left.
      if (top && left) return corner(0);
      if (top) return corner(1);
      if (left) return corner(3);
      return corner(2);
    }

    case "round":
      /* A pill on the short axis — a true circle when the box is
         square, a stadium when it is not. `50%` looked right on square
         blocks and turned every wide one into a flattened ellipse. */
      return "9999px";

    case "capsule": {
      /* A softened brick: the step between hard-edged and fully round,
         so the cycle reads as one shape relaxing in stages. */
      const short = Math.min(box.w, box.h);
      const h = ((short / box.w) * 14).toFixed(2);
      const v = ((short / box.h) * 14).toFixed(2);
      return `${h}% / ${v}%`;
    }
  }
}

/** The radius for one shape, its own override taking precedence. */
export function shapeRadius(
  shape: Shape,
  phase: Phase,
  grid: { cols: number; rows: number },
): string {
  return shape.radius ?? radii(phase, shape, grid);
}

/* The compositions. Placed by hand and edited at /studio; the
   numbers are grid units, and nothing constrains them to the grid. */

/** Landscape, on a 12 x 6 field. */
const LANDSCAPE: Composition[] = [
  {
    name: "Colonnade",
    note: "An even run of uprights over a pair of shorter ones, on a single full-width plinth.",
    phase: "square",
    shapes: [
      { c: 0, r: 0, w: 2, h: 3 },
      { c: 2, r: 0, w: 3, h: 3 },
      { c: 5, r: 0, w: 3, h: 3 },
      { c: 8, r: 0, w: 2, h: 3 },
      { c: 10, r: 0, w: 2, h: 3 },
      { c: 0, r: 3, w: 2, h: 2 },
      { c: 2, r: 3, w: 3, h: 2 },
      { c: 5, r: 3, w: 3, h: 2 },
      { c: 8, r: 3, w: 2, h: 2 },
      { c: 10, r: 3, w: 2, h: 2 },
      { c: 0, r: 5, w: 12, h: 1 },
    ],
  },
  {
    name: "Keystone",
    note: "One block holds the middle and everything else braces around it.",
    phase: "shoulder",
    shapes: [
      { c: 0, r: 0, w: 3, h: 1 },
      { c: 3, r: 0, w: 5, h: 3 },
      { c: 8, r: 0, w: 4, h: 1 },
      { c: 0, r: 1, w: 3, h: 3 },
      { c: 8, r: 1, w: 4, h: 3 },
      { c: 3, r: 3, w: 2, h: 2 },
      { c: 5, r: 3, w: 3, h: 2 },
      { c: 0, r: 4, w: 3, h: 1 },
      { c: 8, r: 4, w: 4, h: 1 },
      { c: 0, r: 5, w: 6, h: 1 },
      { c: 6, r: 5, w: 6, h: 1 },
    ],
  },
  {
    name: "Staircase",
    note: "Three descending tiers, each cut finer than the one above it.",
    phase: "capsule",
    shapes: [
      { c: 0, r: 0, w: 4, h: 2 },
      { c: 4, r: 0, w: 4, h: 2 },
      { c: 8, r: 0, w: 4, h: 2 },
      { c: 0, r: 2, w: 4, h: 2 },
      { c: 4, r: 2, w: 4, h: 2 },
      { c: 8, r: 2, w: 4, h: 2 },
      { c: 0, r: 4, w: 3, h: 2 },
      { c: 3, r: 4, w: 3, h: 2 },
      { c: 6, r: 4, w: 3, h: 2 },
      { c: 9, r: 4, w: 3, h: 1 },
      { c: 9, r: 5, w: 3, h: 1 },
    ],
  },
  {
    name: "Horizon",
    note: "A banded landscape: a lid, a wide middle register, small marks, a base.",
    phase: "square",
    shapes: [
      { c: 0, r: 0, w: 6, h: 1 },
      { c: 6, r: 0, w: 6, h: 1 },
      { c: 0, r: 1, w: 3, h: 3 },
      { c: 3, r: 1, w: 5, h: 3 },
      { c: 8, r: 1, w: 4, h: 3 },
      { c: 0, r: 4, w: 2, h: 1 },
      { c: 2, r: 4, w: 2, h: 1 },
      { c: 4, r: 4, w: 3, h: 1 },
      { c: 7, r: 4, w: 2, h: 1 },
      { c: 9, r: 4, w: 3, h: 1 },
      { c: 0, r: 5, w: 12, h: 1 },
    ],
  },
  {
    name: "Pillars",
    note: "Tall outer columns gripping a shorter cluster.",
    phase: "round",
    shapes: [
      { c: 0, r: 0, w: 2, h: 4 },
      { c: 2, r: 0, w: 2, h: 4 },
      { c: 4, r: 0, w: 4, h: 3 },
      { c: 8, r: 0, w: 2, h: 4 },
      { c: 10, r: 0, w: 2, h: 4 },
      { c: 4, r: 3, w: 2, h: 2 },
      { c: 6, r: 3, w: 2, h: 2 },
      { c: 0, r: 4, w: 4, h: 2 },
      { c: 8, r: 4, w: 4, h: 2 },
      { c: 4, r: 5, w: 2, h: 1 },
      { c: 6, r: 5, w: 2, h: 1 },
    ],
  },
];

/** Portrait, on a 6 x 12 field — the same ideas, redrawn for a tall frame. */
const PORTRAIT: Composition[] = [
  {
    name: "Colonnade",
    note: "The uprights and plinth, restacked for a tall frame.",
    phase: "square",
    shapes: [
      { c: 0, r: 0, w: 3, h: 2 },
      { c: 3, r: 0, w: 3, h: 2 },
      { c: 0, r: 2, w: 3, h: 3 },
      { c: 3, r: 2, w: 3, h: 3 },
      { c: 0, r: 5, w: 3, h: 2 },
      { c: 3, r: 5, w: 3, h: 2 },
      { c: 0, r: 7, w: 2, h: 2 },
      { c: 2, r: 7, w: 2, h: 2 },
      { c: 4, r: 7, w: 2, h: 2 },
      { c: 0, r: 9, w: 6, h: 1 },
      { c: 0, r: 10, w: 6, h: 2 },
    ],
  },
  {
    name: "Keystone",
    note: "The dominant centre block, braced above and below.",
    phase: "shoulder",
    shapes: [
      { c: 0, r: 0, w: 3, h: 2 },
      { c: 3, r: 0, w: 3, h: 2 },
      { c: 0, r: 2, w: 6, h: 3 },
      { c: 0, r: 5, w: 3, h: 2 },
      { c: 3, r: 5, w: 3, h: 2 },
      { c: 0, r: 7, w: 6, h: 1 },
      { c: 0, r: 8, w: 3, h: 2 },
      { c: 3, r: 8, w: 3, h: 2 },
      { c: 0, r: 10, w: 2, h: 2 },
      { c: 2, r: 10, w: 2, h: 2 },
      { c: 4, r: 10, w: 2, h: 2 },
    ],
  },
  {
    name: "Staircase",
    note: "Descending tiers, each cut finer than the one above.",
    phase: "capsule",
    shapes: [
      { c: 0, r: 0, w: 4, h: 3 },
      { c: 4, r: 0, w: 2, h: 3 },
      { c: 0, r: 3, w: 2, h: 2 },
      { c: 2, r: 3, w: 4, h: 2 },
      { c: 0, r: 5, w: 3, h: 2 },
      { c: 3, r: 5, w: 3, h: 2 },
      { c: 0, r: 7, w: 4, h: 2 },
      { c: 4, r: 7, w: 2, h: 2 },
      { c: 0, r: 9, w: 3, h: 2 },
      { c: 3, r: 9, w: 3, h: 2 },
      { c: 0, r: 11, w: 6, h: 1 },
    ],
  },
  {
    name: "Horizon",
    note: "Banded registers: a lid, a wide middle, small marks, a base.",
    phase: "square",
    shapes: [
      { c: 0, r: 0, w: 6, h: 1 },
      { c: 0, r: 1, w: 3, h: 2 },
      { c: 3, r: 1, w: 3, h: 2 },
      { c: 0, r: 3, w: 6, h: 3 },
      { c: 0, r: 6, w: 3, h: 2 },
      { c: 3, r: 6, w: 3, h: 2 },
      { c: 0, r: 8, w: 2, h: 2 },
      { c: 2, r: 8, w: 2, h: 2 },
      { c: 4, r: 8, w: 2, h: 2 },
      { c: 0, r: 10, w: 6, h: 1 },
      { c: 0, r: 11, w: 6, h: 1 },
    ],
  },
  {
    name: "Pillars",
    note: "Tall columns above a shorter cluster, weight at the edges.",
    phase: "round",
    shapes: [
      { c: 0, r: 0, w: 3, h: 4 },
      { c: 3, r: 0, w: 3, h: 4 },
      { c: 0, r: 4, w: 2, h: 2 },
      { c: 2, r: 4, w: 2, h: 2 },
      { c: 4, r: 4, w: 2, h: 2 },
      { c: 0, r: 6, w: 3, h: 3 },
      { c: 3, r: 6, w: 3, h: 3 },
      { c: 0, r: 9, w: 2, h: 2 },
      { c: 2, r: 9, w: 2, h: 2 },
      { c: 4, r: 9, w: 2, h: 2 },
      { c: 0, r: 11, w: 6, h: 1 },
    ],
  },
];

/* Exposed for the editor at /studio to read and write back. */
export const MAPS: Record<Orientation, Composition[]> = {
  landscape: LANDSCAPE,
  portrait: PORTRAIT,
};

export const COMPOSITION_COUNT = LANDSCAPE.length;

/**
 * The `step`-th composition.
 *
 * Shapes are handed out in array order, and every composition lists
 * them in that same order, so shape i occupies roughly the same region
 * of the frame throughout. That is what makes a change read as one
 * arrangement settling into another rather than eleven blocks
 * scattering — a tile travels a short way to its next post instead of
 * crossing the screen past everything else.
 */
export function composition(step: number, o: Orientation = "landscape"): Composition {
  const set = MAPS[o];
  return set[((step % set.length) + set.length) % set.length];
}

/**
 * Placements for the `step`-th composition.
 *
 * `n` is honoured for safety: a composition is authored for the full
 * cast, so asking for more shapes than it holds repeats the last rather
 * than dropping a tile off the page.
 */
export function pack(n: number, step: number, o: Orientation = "landscape"): Shape[] {
  const { shapes } = composition(step, o);
  const out = shapes.slice(0, n).map((s) => ({ ...s }));
  while (out.length < n) out.push({ ...shapes[shapes.length - 1] });
  return out;
}
