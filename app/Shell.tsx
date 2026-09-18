"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PROFILE, PROJECTS, type Project } from "./content";
import { pack, radii, COLS, ROWS } from "./pack";

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

  const open = useCallback((s: string) => {
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
  const boxes = pack(ORDER.length, seed);

  const active = slug ? PROJECTS.find((p) => p.slug === slug) : undefined;
  const hovered = hover ? PROJECTS.find((p) => p.slug === hover) : undefined;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: active ? TONE[active.slug] : "var(--color-paper)",
        transition: "background-color var(--dur) var(--ease)",
      }}
    >
      {/* ---------- HOME: the mosaic ---------- */}
      <div
        className="absolute inset-0 grid place-items-center p-4 sm:p-6"
        style={{
          opacity: active ? 0 : 1,
          pointerEvents: active ? "none" : undefined,
          transition: "opacity 0.5s var(--ease)",
        }}
        aria-hidden={Boolean(active)}
      >
        {/* The collage: one composition, shapes touching, centred and
            occupying roughly half the screen rather than bleeding to
            the edges. */}
        <div
          className="relative h-[60svh] w-[min(56rem,86vw)]"
        >
        {ORDER.map((p, i) => {
          const lift = hover === p.slug;
          return (
            <button
              key={p.slug}
              onClick={() => open(p.slug)}
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
                left: `${(boxes[i].c / COLS) * 100}%`,
                top: `${(boxes[i].r / ROWS) * 100}%`,
                width: `${(boxes[i].w / COLS) * 100}%`,
                height: `${(boxes[i].h / ROWS) * 100}%`,
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
                // Colour stays at full strength whatever is hovered.
                // Dimming the other ten to 0.3 turned the whole collage
                // pastel, and because the layout reshuffles under a
                // stationary cursor, that washed-out state engaged
                // without the reader ever aiming at anything. Scale and
                // z-order carry the focus instead.
                opacity: ready ? 1 : 0,
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
          key={`${p.slug}-${slug === p.slug}`}
          p={p}
          active={slug === p.slug}
          fg={inkOn(p.slug)}
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
  onClose,
  onStep,
}: {
  p: Project;
  active: boolean;
  fg: string;
  onClose: () => void;
  onStep: (d: 1 | -1) => void;
}) {
  const [x, setX] = useState(0);
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
    measure();

    const el = railRef.current;
    if (!el) return;

    // Vertical wheel -> horizontal travel. Non-passive so the page
    // cannot scroll underneath.
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      setX((v) => Math.min(measure(), Math.max(0, v + d)));
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
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
    };
  }, [active, measure]);

  // Drag to travel, for touch and trackpad users.
  const drag = useRef<{ x: number; start: number } | null>(null);

  return (
    <section
      aria-hidden={!active}
      className="absolute inset-0 overflow-hidden"
      style={{
        background: TONE[p.slug],
        color: fg,
        // Wipe up from the bottom, like the shape growing into the page.
        clipPath: active ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
        transition: "clip-path var(--dur) var(--ease)",
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
        <div className="flex h-full shrink-0 items-center px-[6vw]">
          <h2
            className="whitespace-nowrap font-semibold leading-[0.8] tracking-tighter"
            style={{ fontSize: "min(42vh, 22vw)" }}
          >
            {p.name}
          </h2>
        </div>

        {/* 2 — what it is */}
        <div className="flex h-full w-[min(88vw,30rem)] shrink-0 flex-col justify-center gap-5 px-[4vw]">
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
        <div className="flex h-full shrink-0 items-center gap-[4vw] px-[4vw]">
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
          scroll or drag sideways
        </p>
      </div>
    </section>
  );
}
