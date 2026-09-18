"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PROFILE, PROJECTS, type Project } from "./content";
import { pack, radii, GRID, type Orientation } from "./pack";

/* ============================================================
   Two states, one screen, no document scrolling — ever.

   HOME     a mosaic of shapes on a unit grid. Different sizes,
            offset rows, one big anchor. Name tiny in the corner.

   PROJECT  the shape's colour floods the screen, the name comes
            in enormous, and the case study then travels
            HORIZONTALLY: the wheel is captured and converted to
            travel along X. window.scrollY never moves.

   Every transition uses the one shared curve (--ease/--dur), which
   is what makes the motion read as a single gesture.
   ============================================================ */

const ORDER = [...PROJECTS].sort((a, b) => b.year - a.year);

const TONE: Record<string, string> = {
  simblip: "#2b57ff",
  saul: "#0a0a0a",
  looni: "#ff5147",
  rotary: "#1f9c6b",
  copaila: "#ffc93f",
  bijulibatti: "#7b61ff",
  orbital: "#0a0a0a",
  refill: "#127a54",
  rover: "#1d3fd4",
  fraud: "#8e93a3",
  hackforbusiness: "#e8402f",
};

/**
 * Type colour is computed, not hand-listed. A hand-maintained "light
 * colours" set had six of eleven tones wrong, which put white text on
 * mid-tone backgrounds below WCAG AA. This measures the real contrast
 * and picks whichever of ink/paper wins.
 */
const REL_LUM = (hex: string) => {
  const ch = hex.replace("#", "").match(/../g)!.map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

const contrast = (a: string, b: string) => {
  const [l1, l2] = [REL_LUM(a), REL_LUM(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const PAPER = "#ffffff";
const INK = "#0a0a0a";

const inkOn = (slug: string | null) => {
  const bg = slug ? TONE[slug] : PAPER;
  if (!bg) return INK;
  return contrast(bg, PAPER) >= contrast(bg, INK) ? PAPER : INK;
};

/**
 * The mosaic. Column/row spans on a 12x6 grid, so the shapes are
 * different sizes on offset rows rather than equal bars.
 * Order matches ORDER (reverse-chronological).
 */


/** Where an expansion starts: the tile's rect and its own corners. */
type Origin = { rect: DOMRect; radius: string };

function parseHash(): string | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash.replace(/^#\/?/, "");
  if (h.startsWith("p/")) {
    const slug = h.slice(2);
    if (PROJECTS.some((p) => p.slug === slug)) return slug;
  }
  return null;
}

export default function Shell() {
  const [slug, setSlug] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [seed, setSeed] = useState(1);
  // Portrait transposes the grid instead of squeezing the landscape one
  // into a tall box, which otherwise makes every cell a thin sliver.
  const [orient, setOrient] = useState<Orientation>("landscape");
  // The rect the panel grows from: the tile that was actually clicked.
  const [from, setFrom] = useState<Origin | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 1/1)");
    const sync = () => setOrient(mq.matches ? "portrait" : "landscape");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setSlug(parseHash());
    sync();
    const t = setTimeout(() => setReady(true), 40);
    window.addEventListener("hashchange", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  // Cycle the shapes on a slow loop. Paused when a project is open, and
  // never started at all under prefers-reduced-motion.
  useEffect(() => {
    if (slug) return;
    // Hovering holds the collage still — you cannot aim at a shape that
    // is sliding away from the cursor.
    if (hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Must exceed --dur-move so a move always completes.
    const t = setInterval(() => setSeed((n) => n + 1), 2600);
    return () => clearInterval(t);
  }, [slug, hover]);

  const open = useCallback((s: string, el?: HTMLElement) => {
    if (el) {
      const r = el.getBoundingClientRect();
      // Carry the tile's own corner radius into the expansion. A fixed
      // radius here made a pill-shaped tile turn into a rounded
      // rectangle the instant it was clicked, so the growth started
      // from a shape the reader had never seen.
      setFrom({ rect: r, radius: getComputedStyle(el).borderRadius });
    }
    window.location.hash = `/p/${s}`;
  }, []);

  const close = useCallback(() => {
    window.location.hash = "";
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!slug) return;
      const i = ORDER.findIndex((p) => p.slug === slug);
      if (i < 0) return;
      const n = (i + dir + ORDER.length) % ORDER.length;
      window.history.replaceState(null, "", `#/p/${ORDER[n].slug}`);
      setSlug(ORDER[n].slug);
    },
    [slug],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && slug) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug, close]);

  // A fresh collage each tick — a gapless, disjoint packing of the grid
  // by construction (see pack.ts, verified in pack.test.mjs).
  const boxes = pack(ORDER.length, seed, orient);
  const grid = GRID[orient];

  const active = slug ? PROJECTS.find((p) => p.slug === slug) : undefined;
  const hovered = hover ? PROJECTS.find((p) => p.slug === hover) : undefined;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        // Stays paper. Flooding the root with the project colour on
        // activation made the whole screen change colour instantly, and
        // the panel then expanded invisibly against a background that
        // already matched it — so the shape growing out of the tile was
        // never actually visible. The expanding panel paints the colour.
        background: "var(--color-paper)",
      }}
    >
      {/* ---------- HOME: the mosaic ---------- */}
      <div
        className="absolute inset-0 grid place-items-center p-4 sm:p-6"
        style={{
          opacity: active ? 0 : 1,
          pointerEvents: active ? "none" : undefined,
          /* The collage must not cross-fade while the panel is growing:
             the tile would dissolve out from under the very shape that
             is expanding FROM it. But cutting it at the end of the
             expansion put eleven tiles out in a single frame, which is
             the abrupt switch.

             So it fades over the LAST third of the growth, by which
             point the panel already covers most of the screen and the
             fade happens behind it. Opening and closing are asymmetric
             on purpose — on the way back the collage has to be fully
             painted before the panel finishes retracting into it. */
          transition: active
            ? "opacity 0.34s linear 0.6s"
            : "opacity 0.2s linear",
        }}
        aria-hidden={Boolean(active)}
      >
        {/* The collage: one composition, shapes touching, centred and
            occupying roughly half the screen rather than bleeding to
            the edges. */}
        <div
          className="relative h-[60svh] w-[min(56rem,86vw)] portrait:h-[66svh] portrait:w-[92vw]"
        >
        {ORDER.map((p, i) => {
          const lift = hover === p.slug;
          const dim = hover !== null && !lift;
          return (
            <button
              key={p.slug}
              onClick={(e) => open(p.slug, e.currentTarget)}
              onMouseEnter={() => setHover(p.slug)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.slug)}
              onBlur={() => setHover(null)}
              tabIndex={active ? -1 : 0}
              aria-label={`${p.name}, ${p.year}`}
              className="absolute"
              style={{
                // Percentage boxes rather than grid cells: left/top/size
                // are animatable, so the move and the corner morph run
                // together on one curve. grid-column would snap.
                left: `${(boxes[i].c / grid.cols) * 100}%`,
                top: `${(boxes[i].r / grid.rows) * 100}%`,
                width: `${(boxes[i].w / grid.cols) * 100}%`,
                height: `${(boxes[i].h / grid.rows) * 100}%`,
                background: TONE[p.slug],
                // Four corners, each randomised independently.
                borderRadius: radii(seed, i),
                // Position + shape + fade, all on the same easing.
                transition: [
                  "left var(--dur-move) var(--ease-move)",
                  "top var(--dur-move) var(--ease-move)",
                  "width var(--dur-move) var(--ease-move)",
                  "height var(--dur-move) var(--ease-move)",
                  "border-radius var(--dur-move) var(--ease-move)",
                  "opacity 0.5s var(--ease)",
                  "transform var(--dur) var(--ease)",
                  "box-shadow var(--dur) var(--ease)",
                ].join(", "),
                transform: ready
                  ? lift
                    ? "scale(1.04)"
                    : "none"
                  : "translateY(18px)",
                // Dimmed at 0.62 rather than 0.3: the tiles still
                // recede behind the hovered one, but the flat colours
                // keep their punch instead of going pastel.
                opacity: ready ? (dim ? 0.62 : 1) : 0,
                zIndex: lift ? 2 : 1,
                boxShadow: lift ? "0 12px 32px rgb(0 0 0 / 0.18)" : "none",
                transitionDelay: ready ? "0ms" : `${i * 40}ms`,
              }}
            />
          );
        })}
        </div>
      </div>

      {/* ---------- HOME chrome: name + caption ---------- */}
      <div
        className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-7"
        style={{
          opacity: active ? 0 : 1,
          transition: "opacity 0.5s var(--ease)",
        }}
      >
        <div className="flex items-start justify-between">
          <div className="pointer-events-auto rounded-full bg-paper/85 px-3 py-1.5 backdrop-blur-sm">
            <span className="t-small font-medium">{PROFILE.name}</span>
          </div>
          <a
            href={`mailto:${PROFILE.email}`}
            className="pointer-events-auto rounded-full bg-paper/85 px-3 py-1.5 backdrop-blur-sm"
            tabIndex={active ? -1 : 0}
          >
            <span className="t-small link">Contact</span>
          </a>
        </div>

        <div className="pointer-events-auto self-start rounded-full bg-paper/85 px-3 py-1.5 backdrop-blur-sm">
          <p className="t-small" aria-live="polite">
            {hovered ? (
              <>
                {hovered.name}
                <span className="text-ink-3">
                  {" — "}
                  {hovered.year}
                  {hovered.commits
                    ? `, ${hovered.commits.toLocaleString()} commits`
                    : ""}
                </span>
              </>
            ) : (
              <span className="text-ink-3">{PROFILE.shortBio}</span>
            )}
          </p>
        </div>
      </div>

      {/* ---------- PROJECT views ---------- */}
      {ORDER.map((p) => (
        <ProjectView
          /* Stable key. Including `active` here changed the key on
             every open and close, so React unmounted the panel and
             mounted a fresh one — which destroyed the state driving the
             retraction, and the panel vanished instead of shrinking
             back into its tile. */
          key={p.slug}
          p={p}
          active={slug === p.slug}
          fg={inkOn(p.slug)}
          from={from}
          onClose={close}
          onStep={step}
        />
      ))}
    </div>
  );
}

/**
 * A project: colour fills the screen, the name arrives enormous, and the
 * case study travels horizontally. The wheel is captured and converted
 * into X travel so the document itself still never scrolls.
 */
function ProjectView({
  p,
  active,
  fg,
  from,
  onClose,
  onStep,
}: {
  p: Project;
  active: boolean;
  fg: string;
  from: Origin | null;
  onClose: () => void;
  onStep: (d: 1 | -1) => void;
}) {
  const [x, setX] = useState(0);
  // Flips one frame after activation so the expansion has a start rect
  // to animate FROM — setting it in the same frame jumps to the end.
  const [opened, setOpen] = useState(false);
  // Never 'open' while inactive, so a close always has a rect to
  // retract INTO rather than leaving the panel stuck full-screen.
  const open = active && opened;
  /* True while this panel is retracting: it is no longer active, but it
     WAS open a moment ago, so it must keep painting at the tile rect
     until the animation finishes. Without this the panel jumps straight
     to the hidden state and the close has no visible retraction. */
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (active || !opened) return;
    // Deferred, not synchronous: this reacts to `active` going false and
    // only needs to hold the panel painted for the length of the
    // retraction, so a frame's delay costs nothing and keeps the effect
    // out of the render path.
    const on = requestAnimationFrame(() => setClosing(true));
    const off = setTimeout(() => setClosing(false), 1040);
    return () => {
      cancelAnimationFrame(on);
      clearTimeout(off);
    };
  }, [active, opened]);
  const railRef = useRef<HTMLDivElement>(null);
  const maxRef = useRef(0);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return 0;
    maxRef.current = Math.max(0, el.scrollWidth - window.innerWidth);
    return maxRef.current;
  }, []);

  useEffect(() => {
    if (!active) return;
    // One frame after activation, so the browser has the closed rect to
    // animate FROM. Flipping in the same frame jumps to the end state.
    const raf = requestAnimationFrame(() => setOpen(true));
    measure();

    const el = railRef.current;
    if (!el) return;

    /* Vertical wheel -> horizontal travel, and past either end the
       panel closes: pull back at the start, or keep going after the
       last card. Overscroll is ACCUMULATED rather than acted on per
       event, because a trackpad emits a long momentum tail after the
       finger lifts and closing on the first of those feels like the
       panel shut by itself. */
    let past = 0;
    let closing = false;
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      if (closing) return;

      const max = measure();
      setX((v) => {
        const next = v + d;
        const pushing = (v <= 0 && d < 0) || (v >= max && d > 0);
        past = pushing ? past + Math.abs(d) : 0;
        if (past > 180) {
          closing = true;
          onClose();
        }
        return Math.min(max, Math.max(0, next));
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setX((v) => Math.min(measure(), v + window.innerWidth * 0.7));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setX((v) => Math.max(0, v - window.innerWidth * 0.7));
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
      setOpen(false);
      setX(0);
    };
  }, [active, measure, onClose]);

  // Drag to travel, for touch and trackpad users.
  const drag = useRef<{ x: number; start: number } | null>(null);

  /* Closed: the tile's rect as an inset from each viewport edge.
     Open: zero inset, i.e. the whole screen. Falls back to the old
     bottom wipe when there is no origin rect (deep link, keyboard). */
  const growth = (() => {
    if (open) return "inset(0px 0px 0px 0px round 0px)";
    // Inactive panels must be clipped fully AWAY, not parked at the
    // tile rect: all eleven live in the DOM at once, so returning a
    // visible rect here stacked ten coloured blocks on the collage and
    // made the expansion look instant.
    if ((!active && !closing) || !from)
      return "inset(100% 0% 0% 0% round 0px)";
    const { rect } = from;
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    return `inset(${rect.top}px ${right}px ${bottom}px ${rect.left}px round ${from.radius})`;
  })();

  return (
    <section
      aria-hidden={!active}
      className="absolute inset-0 overflow-hidden"
      style={{
        background: TONE[p.slug],
        color: fg,
        // The panel GROWS OUT OF the clicked tile: it starts at that
        // tile's screen rect and opens to fill the viewport, so the
        // colour block the reader pressed becomes the page. Closing
        // runs the same animation backwards.
        clipPath: growth,
        WebkitClipPath: growth,
        transition: "clip-path var(--dur-panel) var(--ease-panel)",
        willChange: "clip-path",
        pointerEvents: active ? undefined : "none",
        zIndex: active ? 30 : 10,
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) return;
        drag.current = { x: e.clientX, start: x };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const next = drag.current.start - (e.clientX - drag.current.x);
        setX(Math.min(maxRef.current, Math.max(0, next)));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      {/* the travelling rail */}
      <div
        ref={railRef}
        className="absolute inset-y-0 left-0 flex touch-none items-center"
        style={{
          transform: `translate3d(${-x}px,0,0)`,
          transition: "transform var(--dur) var(--ease)",
          willChange: "transform",
        }}
      >
        {/* 1 — the name, enormous, bleeding past the edges */}
        <div className="flex h-full shrink-0 items-center px-[6vw]" style={rise(open, 0.66)}>
          <h2
            className="whitespace-nowrap font-semibold leading-[0.8] tracking-tighter"
            style={{ fontSize: "min(42vh, 22vw)" }}
          >
            {p.name}
          </h2>
        </div>

        {/* 2 — what it is */}
        <div
          className="flex h-full w-[min(88vw,30rem)] shrink-0 flex-col justify-center gap-5 px-[4vw]"
          style={rise(open, 0.74)}
        >
          <p className="t-body" style={{ opacity: 0.92 }}>
            {p.line}
          </p>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="t-label" style={{ color: fg, opacity: 0.55 }}>
                Year
              </dt>
              <dd className="t-small" style={{ color: fg }}>{p.year}</dd>
            </div>
            <div>
              <dt className="t-label" style={{ color: fg, opacity: 0.55 }}>
                Role
              </dt>
              <dd className="t-small" style={{ color: fg }}>{p.role}</dd>
            </div>
            {p.commits ? (
              <div>
                <dt className="t-label" style={{ color: fg, opacity: 0.55 }}>
                  Commits
                </dt>
                <dd className="t-small tabular-nums" style={{ color: fg }}>
                  {p.commits.toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="t-label" style={{ color: fg, opacity: 0.55 }}>
            {p.tech.join(", ")}
          </p>
          <div className="flex gap-6">
            {p.live ? (
              <a
                href={p.live}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={active ? 0 : -1}
                className="t-body link-out"
                style={{ color: fg }}
              >
                Open it live
              </a>
            ) : null}
            {p.repo ? (
              <a
                href={p.repo}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={active ? 0 : -1}
                className="t-body link-out"
                style={{ color: fg }}
              >
                Source
              </a>
            ) : null}
          </div>
        </div>

        {/* 3 — the work itself */}
        <div className="flex h-full shrink-0 items-center gap-[4vw] px-[4vw]" style={rise(open, 0.82)}>
          {p.shot ? (
            <div className="relative h-[62vh] w-[min(80vw,34rem)] shrink-0 overflow-hidden rounded-xl bg-white/10">
              <Image
                src={p.shot}
                alt={`${p.name} interface`}
                fill
                sizes="80vw"
                className="object-contain"
              />
            </div>
          ) : (
            <div className="grid h-[62vh] w-[min(80vw,34rem)] shrink-0 place-items-center rounded-xl border border-current/20">
              <span className="t-label" style={{ color: fg, opacity: 0.6 }}>
                Screenshot coming
              </span>
            </div>
          )}

          {/* end cap: next project */}
          <div className="flex h-full shrink-0 flex-col justify-center px-[4vw]">
            <p className="t-label mb-2" style={{ color: fg, opacity: 0.55 }}>
              Next
            </p>
            <button
              onClick={() => onStep(1)}
              tabIndex={active ? 0 : -1}
              className="whitespace-nowrap text-left font-semibold leading-none tracking-tight"
              style={{ fontSize: "min(14vh, 9vw)", color: fg }}
            >
              {ORDER[(ORDER.findIndex((q) => q.slug === p.slug) + 1) % ORDER.length]
                .name}
            </button>
          </div>
        </div>
      </div>

      {/* fixed chrome inside the project */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5 sm:p-7">
        <div className="flex items-start justify-between">
          <span className="t-small font-medium" style={{ color: fg }}>
            {p.name}
          </span>
          <button
            onClick={onClose}
            tabIndex={active ? 0 : -1}
            aria-label="Back to home"
            className="pointer-events-auto grid size-8 place-items-center"
            style={{ color: fg }}
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path
                d="M5 5 L19 19 M19 5 L5 19"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
              />
            </svg>
          </button>
        </div>

        <p className="t-label" style={{ color: fg, opacity: 0.5 }}>
          scroll sideways — keep going to close
        </p>
      </div>
    </section>
  );
}

/**
 * Content rises in after the colour has landed.
 *
 * Staggered by section so the case study assembles rather than
 * appearing all at once — the panel expansion reads as the gesture,
 * and the text follows it in.
 */
function rise(open: boolean, delay: number): React.CSSProperties {
  return {
    opacity: open ? 1 : 0,
    transform: open ? "none" : "translateY(22px)",
    transition: `opacity 0.5s var(--ease) ${delay}s, transform 0.5s var(--ease) ${delay}s`,
  };
}
