"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GRID,
  PHASES,
  shapeRadius,
  type Composition,
  type Orientation,
  type Phase,
  type Shape,
} from "../pack";

/* ============================================================
   The composition editor.

   Shapes are free. Drag one to move it, pull a handle to resize it,
   overlap them, push them off the edge of the field — nothing is
   constrained and nothing is corrected behind you. The grid is a
   coordinate system and a visual guide, not a container.

   Snapping is therefore a convenience rather than a rule: held by
   default so arrangements stay tidy, dropped to fine steps while Alt
   is down for the deliberately-off placements.
   ============================================================ */

const GLYPHS = "ABCDEFGHIJK".split("");

/* The site's own palette, so what is arranged here is what ships. */
const TONE = [
  "#55E6C1", "#292522", "#EF476F", "#4E7D32", "#86B83F", "#8067D6",
  "#FFD166", "#39735A", "#126782", "#75645D", "#D1493F",
];

type Maps = Record<Orientation, Composition[]>;
type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type Drag = {
  shape: number;
  handle: Handle;
  /** Pointer position and shape geometry at the moment the drag began. */
  fromX: number;
  fromY: number;
  start: Shape;
};

/** Shortest exact form, so the readout does not jitter with float dust. */
const num = (n: number) => String(Math.round(n * 1000) / 1000);

export default function Studio({ initial }: { initial: Maps }) {
  const [maps, setMaps] = useState<Maps>(initial);
  const [orient, setOrient] = useState<Orientation>("landscape");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(0);
  const [snap, setSnap] = useState(1);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  /* Undo is a stack of whole states. A composition is eleven small
     objects, so snapshotting the lot per gesture costs nothing and
     makes undo exact — far simpler than inverting each drag. */
  const undo = useRef<Maps[]>([]);
  const drag = useRef<Drag | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  /* Read during pointermove, which is subscribed once — state read
     inside that listener would be captured from the frame it was
     created in. */
  const fine = useRef(false);

  const grid = GRID[orient];
  const set = maps[orient];
  /* Clamped during render: the index is per-orientation and the two
     sets can differ in length, so switching while parked on a high
     index would otherwise read past the end for a frame. */
  const at = Math.min(index, set.length - 1);
  const comp = set[at];
  const sel = Math.min(selected, comp.shapes.length - 1);

  const snapshot = useCallback(() => {
    undo.current.push(structuredClone(maps));
    if (undo.current.length > 120) undo.current.shift();
  }, [maps]);

  const edit = useCallback(
    (fn: (c: Composition) => void) => {
      setMaps((prev) => {
        const next = structuredClone(prev);
        fn(next[orient][at]);
        return next;
      });
      setSaving("idle");
    },
    [orient, at],
  );

  const patch = useCallback(
    (i: number, p: Partial<Shape>) => edit((c) => Object.assign(c.shapes[i], p)),
    [edit],
  );

  /* ---------- Dragging ----------

     One window-level pointermove drives every gesture. Per-handle
     listeners would each need their own capture and teardown, and a
     fast drag that outruns the element would drop out of its own
     stroke. */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const field = fieldRef.current;
      if (!d || !field) return;
      const box = field.getBoundingClientRect();
      const perCol = box.width / grid.cols;
      const perRow = box.height / grid.rows;

      // Pointer travel, expressed in grid units.
      const dc = (e.clientX - d.fromX) / perCol;
      const dr = (e.clientY - d.fromY) / perRow;

      /* Snapping rounds the RESULT, not the delta, so a shape lands on
         whole grid lines regardless of where inside it the drag began.
         Alt drops to a twentieth of a cell for placements that are
         meant to sit off the grid. */
      const step = fine.current ? 0.05 : snap;
      const q = (v: number) => (step > 0 ? Math.round(v / step) * step : v);

      const s = d.start;
      const next: Shape = { ...s };

      if (d.handle === "move") {
        next.c = q(s.c + dc);
        next.r = q(s.r + dr);
      } else {
        if (d.handle.includes("w")) {
          const right = s.c + s.w;
          next.c = q(s.c + dc);
          next.w = right - next.c;
        }
        if (d.handle.includes("e")) next.w = q(s.c + s.w + dc) - s.c;
        if (d.handle.includes("n")) {
          const bottom = s.r + s.h;
          next.r = q(s.r + dr);
          next.h = bottom - next.r;
        }
        if (d.handle.includes("s")) next.h = q(s.r + s.h + dr) - s.r;

        /* A resize may not invert the shape. Pulling an edge past its
           opposite would give a negative size, which renders as
           nothing and reads as the block vanishing. */
        const min = step > 0 ? step : 0.05;
        if (next.w < min) {
          next.w = min;
          if (d.handle.includes("w")) next.c = s.c + s.w - min;
        }
        if (next.h < min) {
          next.h = min;
          if (d.handle.includes("n")) next.r = s.r + s.h - min;
        }
      }

      setMaps((prev) => {
        const out = structuredClone(prev);
        Object.assign(out[orient][at].shapes[d.shape], next);
        return out;
      });
      setSaving("idle");
    };

    const onUp = () => (drag.current = null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [orient, at, grid.cols, grid.rows, snap]);

  const startDrag = (i: number, handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    snapshot();
    setSelected(i);
    drag.current = {
      shape: i,
      handle,
      fromX: e.clientX,
      fromY: e.clientY,
      start: { ...comp.shapes[i] },
    };
  };

  /* Keyboard: arrows nudge, shift-arrows resize, digits select, Alt is
     the fine-placement modifier. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey) fine.current = true;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const prev = undo.current.pop();
        if (prev) {
          setMaps(prev);
          setSaving("idle");
        }
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n)) {
        setSelected(n === 0 ? 9 : n - 1);
        return;
      }
      if (e.key === "-") setSelected(10);

      const step = e.altKey ? 0.05 : snap || 0.25;
      const move: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const m = move[e.key];
      if (!m) return;
      e.preventDefault();
      snapshot();
      const s = comp.shapes[sel];
      if (e.shiftKey) {
        patch(sel, { w: Math.max(0.05, s.w + m[0]), h: Math.max(0.05, s.h + m[1]) });
      } else {
        patch(sel, { c: s.c + m[0], r: s.r + m[1] });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) fine.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [comp, sel, snap, patch, snapshot]);

  const save = async () => {
    setSaving("saving");
    setMessage("");
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(maps),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "save failed");
      setSaving("saved");
      setMessage("Written to app/pack.ts");
    } catch (e) {
      setSaving("error");
      setMessage(e instanceof Error ? e.message : "save failed");
    }
  };

  /* The field is inset within a larger stage, so shapes pushed off the
     grid stay visible and draggable instead of disappearing under the
     panel edge. */
  const PAD = 18;
  const pos = (s: Shape) => ({
    left: `${PAD + (s.c / grid.cols) * (100 - 2 * PAD)}%`,
    top: `${PAD + (s.r / grid.rows) * (100 - 2 * PAD)}%`,
    width: `${(s.w / grid.cols) * (100 - 2 * PAD)}%`,
    height: `${(s.h / grid.rows) * (100 - 2 * PAD)}%`,
  });

  const shape = comp.shapes[sel];

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-neutral-200 antialiased">
      <div className="mx-auto flex max-w-[78rem] flex-col gap-5">
        <header className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Composition studio</h1>
            <p className="text-sm text-neutral-400">
              Drag to move, pull a handle to resize. Overlap freely — saving rewrites{" "}
              <code className="text-neutral-300">app/pack.ts</code>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {message ? (
              <span className={`text-sm ${saving === "error" ? "text-red-400" : "text-emerald-400"}`}>
                {message}
              </span>
            ) : null}
            <button
              onClick={save}
              disabled={saving === "saving"}
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {saving === "saving" ? "Saving…" : "Save to pack.ts"}
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-y border-neutral-800 py-3">
          <Segmented
            options={["landscape", "portrait"]}
            value={orient}
            onChange={(v) => setOrient(v as Orientation)}
          />
          <span className="mx-1 h-5 w-px bg-neutral-800" />
          {set.map((c, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                i === at
                  ? "bg-neutral-100 font-semibold text-neutral-950"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              {c.name || `#${i + 1}`}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
            <span>snap</span>
            <Segmented
              small
              options={["1", "0.5", "0.25", "0"]}
              value={String(snap)}
              onChange={(v) => setSnap(Number(v))}
            />
            <span className="ml-2">hold alt for fine · ⌘Z undo</span>
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          {/* ---------- The field ---------- */}
          <div className="flex flex-col gap-3">
            <div
              ref={fieldRef}
              onPointerDown={() => (drag.current = null)}
              className="relative w-full touch-none overflow-hidden rounded-lg bg-neutral-900 select-none"
              style={{ aspectRatio: `${grid.cols} / ${grid.rows}` }}
            >
              {/* The grid itself, as a guide. Drawn inside the padded
                  field so the guide and the coordinates agree. */}
              <div
                className="pointer-events-none absolute border border-neutral-700/70"
                style={{
                  left: `${PAD}%`,
                  top: `${PAD}%`,
                  width: `${100 - 2 * PAD}%`,
                  height: `${100 - 2 * PAD}%`,
                  backgroundImage:
                    "linear-gradient(to right, rgb(255 255 255 / 0.07) 1px, transparent 1px)," +
                    "linear-gradient(to bottom, rgb(255 255 255 / 0.07) 1px, transparent 1px)",
                  backgroundSize: `${100 / grid.cols}% ${100 / grid.rows}%`,
                }}
              />

              {comp.shapes.map((s, i) => {
                const active = i === sel;
                return (
                  <div
                    key={i}
                    onPointerDown={startDrag(i, "move")}
                    className="absolute cursor-move transition-[border-radius] duration-200"
                    style={{
                      ...pos(s),
                      background: TONE[i % TONE.length],
                      borderRadius: shapeRadius(s, comp.phase, grid),
                      /* Selected on top, so a shape buried under an
                         overlap can still be picked up and moved. */
                      zIndex: active ? 20 : 1,
                      outline: active ? "2px solid white" : "none",
                      outlineOffset: "1px",
                      opacity: active ? 1 : 0.92,
                    }}
                  >
                    <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs font-bold text-black/40">
                      {GLYPHS[i]}
                    </span>

                    {/* Handles, on the selected shape only — eleven
                        shapes' worth at once would bury the field. */}
                    {active
                      ? (["nw", "n", "ne", "w", "e", "sw", "s", "se"] as Handle[]).map((h) => (
                          <span
                            key={h}
                            onPointerDown={startDrag(i, h)}
                            className="absolute size-2.5 rounded-full border border-neutral-900 bg-white"
                            style={{
                              cursor: `${h}-resize`,
                              left: h.includes("w") ? -5 : h.includes("e") ? undefined : "50%",
                              right: h.includes("e") ? -5 : undefined,
                              top: h.includes("n") ? -5 : h.includes("s") ? undefined : "50%",
                              bottom: h.includes("s") ? -5 : undefined,
                              transform:
                                h === "n" || h === "s"
                                  ? "translateX(-50%)"
                                  : h === "e" || h === "w"
                                    ? "translateY(-50%)"
                                    : undefined,
                            }}
                          />
                        ))
                      : null}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {comp.shapes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`grid size-8 place-items-center rounded text-xs font-bold transition ${
                    i === sel ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"
                  }`}
                  style={{ background: TONE[i % TONE.length], color: "rgb(0 0 0 / 0.55)" }}
                >
                  {GLYPHS[i]}
                </button>
              ))}
              <span className="ml-2 text-xs text-neutral-500">
                blocks go to projects in this order — A is the newest
              </span>
            </div>
          </div>

          {/* ---------- Inspector ---------- */}
          <aside className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Shape {GLYPHS[sel]}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["c", "r", "w", "h"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2">
                    <span className="w-4 text-xs text-neutral-500 uppercase">{k}</span>
                    <input
                      type="number"
                      step={0.25}
                      value={num(shape[k])}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) patch(sel, { [k]: v });
                      }}
                      className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neutral-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Corner override
              </span>
              <input
                value={shape.radius ?? ""}
                placeholder={`${comp.phase} (from composition)`}
                onChange={(e) =>
                  patch(sel, { radius: e.target.value.trim() ? e.target.value : undefined })
                }
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 font-mono text-xs outline-none focus:border-neutral-600"
              />
              <span className="text-xs text-neutral-600">
                Any CSS border-radius — <code>9999px</code>, <code>2rem 0 0 0</code>. Empty follows
                the composition.
              </span>
            </label>

            <div className="h-px bg-neutral-800" />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Composition phase
              </span>
              <Segmented
                small
                options={[...PHASES]}
                value={comp.phase}
                onChange={(v) => edit((c) => (c.phase = v as Phase))}
              />
              <span className="text-xs text-neutral-600">
                The default corner for every shape that has no override.
              </span>
            </div>

            <Field label="Name" value={comp.name} onChange={(v) => edit((c) => (c.name = v))} />
            <Field
              label="Note"
              value={comp.note}
              onChange={(v) => edit((c) => (c.note = v))}
              textarea
            />

            <button
              onClick={() => {
                snapshot();
                setMaps((prev) => {
                  const next = structuredClone(prev);
                  next[orient][at] = structuredClone(initial[orient][at]);
                  return next;
                });
                setSaving("idle");
              }}
              className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
            >
              Revert this composition
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
  small,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  small?: boolean;
}) {
  return (
    <div className="flex rounded-md bg-neutral-900 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded capitalize transition ${small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${
            value === o
              ? "bg-neutral-100 font-semibold text-neutral-950"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  const cls =
    "w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{label}</span>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}
