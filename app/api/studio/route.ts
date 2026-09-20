/**
 * The editor's save endpoint — development only.
 *
 * It rewrites the LANDSCAPE / PORTRAIT arrays in app/pack.ts in place,
 * so an edit made in the browser lands in the source file as an
 * ordinary diff you can read and commit. Nothing is persisted at
 * runtime: the site still renders from constants in the module, and a
 * production build has no idea this route existed.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PHASES, type Composition, type Orientation, type Shape } from "../../pack";

const PACK = path.join(process.cwd(), "app", "pack.ts");

/**
 * Check a composition before it becomes source code.
 *
 * Shapes are free — they may overlap, sit at fractional positions and
 * hang off the grid — so there is nothing to check about their
 * ARRANGEMENT. What is still worth refusing is a payload that would not
 * be valid TypeScript or would render nothing: a non-finite number, a
 * shape with no area, a radius carrying characters that have no
 * business in a CSS value.
 */
function validate(comp: Composition): string | null {
  if (typeof comp?.name !== "string" || typeof comp?.note !== "string") {
    return "missing name or note";
  }
  if (!PHASES.includes(comp.phase)) return `unknown phase ${JSON.stringify(comp.phase)}`;
  if (!Array.isArray(comp.shapes) || comp.shapes.length === 0) return "no shapes";

  for (const [i, s] of comp.shapes.entries()) {
    for (const k of ["c", "r", "w", "h"] as const) {
      if (typeof s?.[k] !== "number" || !Number.isFinite(s[k])) {
        return `shape ${i}: ${k} is not a finite number`;
      }
    }
    if (s.w <= 0 || s.h <= 0) return `shape ${i}: zero or negative size`;
    /* A radius is written into the file verbatim, so it is confined to
       the characters CSS lengths actually use. Anything else — quotes,
       semicolons, braces — would either break the string literal or
       smuggle syntax into the module. */
    if (s.radius !== undefined) {
      if (typeof s.radius !== "string") return `shape ${i}: radius is not a string`;
      if (s.radius.length > 120) return `shape ${i}: radius is too long`;
      if (!/^[\d\s.,%/a-zA-Z()-]*$/.test(s.radius)) {
        return `shape ${i}: radius has characters that are not valid in a CSS length`;
      }
    }
  }
  return null;
}

/** Trim a number to its shortest exact form, so the file stays readable. */
const num = (n: number) => String(Math.round(n * 1000) / 1000);

/** Render one orientation's array exactly as it is written by hand. */
function render(name: string, comment: string, set: Composition[]): string {
  const shape = (s: Shape) => {
    const base = `{ c: ${num(s.c)}, r: ${num(s.r)}, w: ${num(s.w)}, h: ${num(s.h)}`;
    return `      ${base}${s.radius ? `, radius: ${JSON.stringify(s.radius)}` : ""} },`;
  };
  const body = set
    .map(
      (c) =>
        `  {\n` +
        `    name: ${JSON.stringify(c.name)},\n` +
        `    note: ${JSON.stringify(c.note)},\n` +
        `    phase: ${JSON.stringify(c.phase)},\n` +
        `    shapes: [\n` +
        c.shapes.map(shape).join("\n") +
        `\n    ],\n` +
        `  },`,
    )
    .join("\n");
  return `${comment}\nconst ${name}: Composition[] = [\n${body}\n];`;
}

/**
 * Swap one `const NAME: Composition[] = [...]` block for a freshly
 * rendered one.
 *
 * Anchored on the declaration and the first line that is exactly `];`,
 * rather than brace-counting: the array holds only literals and object
 * fields, so no nested `];` can occur inside it. A regex that fails to
 * match is reported rather than silently writing nothing.
 */
function swap(src: string, name: string, block: string): string {
  const re = new RegExp(
    `(?:/\\*\\*[^\\n]*\\*/\\n)?const ${name}: Composition\\[\\] = \\[[\\s\\S]*?\\n\\];`,
  );
  if (!re.test(src)) throw new Error(`could not locate ${name} in pack.ts`);
  return src.replace(re, block);
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "editor is dev-only" }, { status: 403 });
  }

  let payload: Record<Orientation, Composition[]>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "body was not JSON" }, { status: 400 });
  }

  for (const o of ["landscape", "portrait"] as Orientation[]) {
    const set = payload?.[o];
    if (!Array.isArray(set) || set.length === 0) {
      return NextResponse.json({ error: `${o}: no compositions` }, { status: 400 });
    }
    for (const [i, comp] of set.entries()) {
      const bad = validate(comp);
      if (bad) {
        return NextResponse.json(
          { error: `${o} #${i} (${comp?.name ?? "unnamed"}): ${bad}` },
          { status: 400 },
        );
      }
    }
  }

  try {
    const src = await readFile(PACK, "utf8");
    let out = swap(
      src,
      "LANDSCAPE",
      render("LANDSCAPE", "/** Landscape, on a 12 x 6 field. */", payload.landscape),
    );
    out = swap(
      out,
      "PORTRAIT",
      render(
        "PORTRAIT",
        "/** Portrait, on a 6 x 12 field — the same ideas, redrawn for a tall frame. */",
        payload.portrait,
      ),
    );
    await writeFile(PACK, out, "utf8");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "write failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
