"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PROFILE, PROJECTS, type Project } from "./content";
import { pack, radii, PHASES, GRID, type Orientation } from "./pack";

/* ============================================================
   Two states, one screen, no document scrolling — ever.

   HOME     a mosaic of shapes on a unit grid. Different sizes,
            offset rows, one big anchor. Name tiny in the corner.

   PROJECT  the shape's colour floods the screen, the name comes
            in enormous, and the case study then travels
            HORIZONTALLY via lerped RAF physics. window.scrollY never moves.

   Every transition uses tuned ease curves (--ease/--dur), creating
   a harmonized, premium feeling across all interactions.
   ============================================================ */

/* Horizontal rail tuning.

   CLOSE_DISTANCE is the wheel travel that must accumulate past an end
   before the panel closes — about six firm notches. The old code closed
   on roughly one, which is why reaching the end of a case study
   dismissed it unexpectedly.

   SCROLL_GAIN under 1 makes the rail move slightly less than the wheel,
   so crossing a case study takes a deliberate scroll rather than one
   flick. */
const CLOSE_DISTANCE = 650;
const OVERSCROLL_LIMIT = 180;
const SCROLL_GAIN = 0.75;
/* Quiet time that separates one gesture from the next. Longer than a
   trackpad's momentum tail, so a flick and the push after it are told
   apart. */
const GESTURE_GAP = 220;

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
 * Type colour is computed to pass WCAG AA standards against any project background tone.
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
  // Which silhouette the whole grid is wearing. See PHASES in pack.ts.
  const [phase, setPhase] = useState(0);
  const [orient, setOrient] = useState<Orientation>("landscape");
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

  /* The composition cycles on a slow loop, paused when a project is
     open or a tile is hovered.

     Position AND silhouette advance on the same tick: the reference
     repacks its grid and changes its corners together, so a block
     glides to a new cell while it is also becoming a circle. Changing
     only one at a time reads as two separate effects rather than one
     composition rearranging itself. */
  useEffect(() => {
    if (slug || hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setSeed((n) => n + 1);
      setPhase((p) => p + 1);
    }, 2600);
    return () => clearInterval(t);
  }, [slug, hover]);

  const open = useCallback((s: string, el?: HTMLElement) => {
    if (el) {
      const r = el.getBoundingClientRect();
      setFrom({ rect: r, radius: getComputedStyle(el).borderRadius });
    } else {
      const tileEl = document.querySelector(`[data-tile="${s}"]`) as HTMLElement;
      if (tileEl) {
        setFrom({ rect: tileEl.getBoundingClientRect(), radius: getComputedStyle(tileEl).borderRadius });
      }
    }
    /* Open on the NEXT frame, after `from` has committed.
       Changing the hash in the same tick fires hashchange, which sets
       `slug` and mounts the panel — and that first render could land
       before `from` arrived, leaving the panel with no origin to grow
       from, which showed as a wipe up from the bottom. */
    requestAnimationFrame(() => {
      window.location.hash = `/p/${s}`;
    });
  }, []);

  const close = useCallback(() => {
    window.location.hash = "";
  }, []);


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

  const boxes = pack(ORDER.length, seed, orient);
  const grid = GRID[orient];

  const active = slug ? PROJECTS.find((p) => p.slug === slug) : undefined;
  const hovered = hover ? PROJECTS.find((p) => p.slug === hover) : undefined;

  return (
    <div
      className="fixed inset-0 overflow-hidden font-sans"
      style={{
        background: "var(--color-paper)",
      }}
    >
      {/* ---------- HOME: the mosaic ---------- */}
      <div
        className="absolute inset-0 grid place-items-center p-4 sm:p-6"
        style={{
          opacity: active ? 0 : 1,
          pointerEvents: active ? "none" : undefined,
          transition: active
            ? "opacity calc(var(--dur-panel) * 0.35) linear calc(var(--dur-panel) * 0.5)"
            : "opacity calc(var(--dur-panel) * 0.25) linear",
        }}
        aria-hidden={Boolean(active)}
      >
        <div
          className="relative h-[60svh] w-[min(56rem,86vw)] portrait:h-[66svh] portrait:w-[92vw]"
        >
          {ORDER.map((p, i) => {
            const lift = hover === p.slug;
            const dim = hover !== null && !lift;
            return (
              <button
                key={p.slug}
                data-tile={p.slug}
                onClick={(e) => open(p.slug, e.currentTarget)}
                onMouseEnter={() => setHover(p.slug)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(p.slug)}
                onBlur={() => setHover(null)}
                tabIndex={active ? -1 : 0}
                aria-label={`${p.name}, ${p.year}`}
                className="absolute cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-current"
                style={{
                  left: `${(boxes[i].c / grid.cols) * 100}%`,
                  top: `${(boxes[i].r / grid.rows) * 100}%`,
                  width: `${(boxes[i].w / grid.cols) * 100}%`,
                  height: `${(boxes[i].h / grid.rows) * 100}%`,
                  background: TONE[p.slug],
                  borderRadius: radii(PHASES[phase % PHASES.length], i),
                  transition: [
                    "left var(--dur-move) var(--ease-move)",
                    "top var(--dur-move) var(--ease-move)",
                    "width var(--dur-move) var(--ease-move)",
                    "height var(--dur-move) var(--ease-move)",
                    "border-radius var(--dur-move) var(--ease-move)",
                    "opacity var(--dur) var(--ease)",
                    "transform var(--dur) var(--ease)",
                    "box-shadow var(--dur) var(--ease)",
                  ].join(", "),
                  transform: ready
                    ? lift
                      ? "scale(1.035)"
                      : "none"
                    : "translateY(16px)",
                  opacity: ready ? (dim ? 0.62 : 1) : 0,
                  zIndex: lift ? 2 : 1,
                  boxShadow: lift ? "0 14px 36px rgb(0 0 0 / 0.22)" : "none",
                  transitionDelay: ready ? "0ms" : `${i * 35}ms`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ---------- HOME chrome: header + caption ---------- */}
      <div
        className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-7"
        style={{
          opacity: active ? 0 : 1,
          transition: "opacity var(--dur) var(--ease)",
        }}
      >
        {/* Nothing at the top. The reference keeps the whole upper field
            empty so the composition is the only thing on screen. */}
        <div />

        {/* Name and caption sit on one baseline at the bottom, set tiny
            and uppercase, flat on the paper — no pill, no blur, no
            shadow. Those chips were competing with the blocks for
            attention, which is exactly what the reference avoids. */}
        <div className="flex items-end justify-between gap-6">
          <p className="t-meta" aria-live="polite">
            {hovered ? (
              <>
                <span className="text-ink">{hovered.name}</span>
                <span className="text-ink-3">
                  {" — "}
                  {hovered.year}
                </span>
              </>
            ) : (
              <span className="text-ink-3">{PROFILE.shortBio}</span>
            )}
          </p>

          <div className="pointer-events-auto flex shrink-0 items-center gap-5">
            <a
              href={`mailto:${PROFILE.email}`}
              className="t-meta link"
              tabIndex={active ? -1 : 0}
            >
              Contact
            </a>
            <span className="t-meta text-ink">{PROFILE.name}</span>
          </div>
        </div>
      </div>

      {/* ---------- PROJECT views ---------- */}
      {ORDER.map((p, idx) => (
        <ProjectView
          key={p.slug}
          p={p}
          active={slug === p.slug}
          fg={inkOn(p.slug)}
          from={from}
          onClose={close}
          projectIndex={idx}
          totalProjects={ORDER.length}
        />
      ))}
    </div>
  );
}

type Phase = "closed" | "opening" | "open" | "closing";

/**
 * ProjectView: full-screen case study that expands from the clicked tile
 * and retracts seamlessly back to it on close. Rail horizontal movement is
 * powered by a smooth lerp RAF loop with touch velocity inertia.
 */
function ProjectView({
  p,
  active,
  fg,
  from,
  onClose,
  projectIndex,
  totalProjects,
}: {
  p: Project;
  active: boolean;
  fg: string;
  from: Origin | null;
  onClose: () => void;
  projectIndex: number;
  totalProjects: number;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [liveOrigin, setLiveOrigin] = useState<Origin | null>(from);
  const [progress, setProgress] = useState(0);

  const targetX = useRef(0);
  const currentX = useRef(0);
  const maxScroll = useRef(0);
  const railRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  /* Guards the open animation to one run per activation. `setLiveOrigin`
     below re-renders, and `from` is a dependency of that effect, so
     without this the expansion fired twice — visibly, as a second
     animation restarting from the tile. */
  const openedFor = useRef<string | null>(null);

  /* How far past an end the wheel must travel before the panel closes.
     Deliberately large: a flick to the end of the rail is ~1-2 notches
     of overscroll, and closing on that made the panel feel like it shut
     itself. This is roughly six firm notches. */
  const overscroll = useRef({ px: 0, at: 0, armed: false });
  const closingRef = useRef(false);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scroll: 0, lastX: 0, velocity: 0, time: 0 });

  // Phase state machine for opening & closing
  useEffect(() => {
    if (active) {
      if (openedFor.current === p.slug) return;
      openedFor.current = p.slug;
      closingRef.current = false;
      overscroll.current = { px: 0, at: 0, armed: false };
      // Re-measure the live tile: the collage repacks on a timer, so a
      // rect captured at click time is stale by the time we animate.
      const tileEl = document.querySelector(`[data-tile="${p.slug}"]`) as HTMLElement;
      if (tileEl) {
        // Reading layout and storing it is the documented exception to
        // the no-setState-in-effect rule; a live rect cannot be read
        // during render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLiveOrigin({
          rect: tileEl.getBoundingClientRect(),
          radius: getComputedStyle(tileEl).borderRadius,
        });
      } else if (from) {
        setLiveOrigin(from);
      }
      /* Animate the expansion explicitly rather than by flipping a
         class and hoping CSS finds a start value.

         Two clip-path states set from React render in the same frame
         however they are scheduled — nested rAFs, forced style flushes,
         none of it survives React batching — so the browser never
         composites the tile-rect frame and falls back to interpolating
         from the hidden state, which is the wipe up from the bottom.
         WAAPI takes both keyframes up front, so the start value is not
         something the browser has to infer. */
      setPhase("opening");
      const el = document.querySelector(
        `[data-panel="${p.slug}"]`,
      ) as HTMLElement | null;
      /* Measured here rather than read from `liveOrigin` state: the
         state set moments ago in this same effect has not committed, and
         depending on it would restart the animation every time it does. */
      const measured = tileEl
        ? {
            rect: tileEl.getBoundingClientRect(),
            radius: getComputedStyle(tileEl).borderRadius,
          }
        : from;
      const start = originClip(measured);
      let anim: Animation | null = null;
      const raf = requestAnimationFrame(() => {
        if (el && start) {
          anim = el.animate(
            [{ clipPath: start }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }],
            {
              duration: cssMs("--dur-panel"),
              easing: cssValue("--ease-panel"),
              fill: "both",
            },
          );
          anim.onfinish = () => {
            anim?.cancel();
            setPhase("open");
          };
        } else {
          setPhase("open");
        }
      });
      return () => {
        cancelAnimationFrame(raf);
        anim?.cancel();
      };
    } else {
      openedFor.current = null;
      setPhase((prev) => {
        if (prev === "open" || prev === "opening") {
          const tileEl = document.querySelector(`[data-tile="${p.slug}"]`) as HTMLElement;
          if (tileEl) {
            setLiveOrigin({
              rect: tileEl.getBoundingClientRect(),
              radius: getComputedStyle(tileEl).borderRadius,
            });
          }
          targetX.current = 0; // smoothly return rail to origin
          return "closing";
        }
        return prev;
      });
    }
  }, [active, from, p.slug]);

  /* Hold the panel mounted for exactly as long as the CSS retraction
     runs, read from --dur-panel-close rather than hard-coded: a literal
     here silently cuts the animation short the moment the duration is
     retimed, and the panel disappears mid-retraction. */
  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => setPhase("closed"), closeMs() + 40);
    return () => clearTimeout(timer);
  }, [phase]);

  const isVisible = phase !== "closed";
  const isOpen = phase === "open";
  const isClosing = phase === "closing";

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return 0;
    maxScroll.current = Math.max(0, el.scrollWidth - window.innerWidth);
    return maxScroll.current;
  }, []);

  // Continuous RAF lerp physics loop for smooth horizontal scrolling
  useEffect(() => {
    if (!isVisible) return;
    measure();

    let lastProgress = -1;

    const loop = () => {
      const max = maxScroll.current;
      const dx = targetX.current - currentX.current;

      if (Math.abs(dx) > 0.05) {
        currentX.current += dx * 0.16;
      } else {
        currentX.current = targetX.current;
      }

      // Rebound rubberband if out of bounds and not actively wheeling
      if (!isDragging.current && targetX.current < 0) {
        targetX.current *= 0.82;
      } else if (!isDragging.current && targetX.current > max) {
        targetX.current = max + (targetX.current - max) * 0.82;
      }

      if (railRef.current) {
        railRef.current.style.transform = `translate3d(${-currentX.current.toFixed(2)}px, 0, 0)`;
      }

      if (max > 0) {
        const pct = Math.max(0, Math.min(1, currentX.current / max));
        if (Math.abs(pct - lastProgress) > 0.005) {
          lastProgress = pct;
          setProgress(pct);
        }
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isVisible, measure]);

  // Event handlers for wheel and keyboard nav
  useEffect(() => {
    if (!active) return;
    measure();

    /* Overscroll past either end closes the panel — but only after a
       sustained push.

       The distance is ACCUMULATED across events rather than tested per
       event, because a trackpad emits a long momentum tail after the
       finger lifts; acting on any single delta makes the panel appear to
       shut by itself at the end of an ordinary flick. The counter also
       decays, so slow nudges against the edge never add up to a close —
       it has to be one deliberate continuous push.

       While overscrolled the rail rubber-bands at a quarter rate, so
       there is visible resistance the whole way rather than a hard stop
       followed by a sudden dismissal. */
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      if (closingRef.current) return;

      const max = maxScroll.current;
      const now = performance.now();
      /* One continuous gesture cannot both cross the rail and close it.

         `armed` is the timestamp at which the rail first reached an end
         during THIS gesture. Overscroll only starts counting once the
         wheel has been quiet for a moment after that — so a single fast
         flick to the end stops there, and closing takes a second,
         separate push. A gap also resets the accumulator, so slow nudges
         never add up. */
      const gap = now - overscroll.current.at;
      if (gap > GESTURE_GAP) {
        overscroll.current.px = 0;
        overscroll.current.armed = true;
      }
      overscroll.current.at = now;

      const atStart = targetX.current <= 0;
      const atEnd = targetX.current >= max;
      const pushingPast = (atStart && d < 0) || (atEnd && d > 0);

      /* Arriving at an end does not start the count.

         A single fast flick across the whole rail ends with the target
         pinned at the edge while momentum events keep coming, and those
         would otherwise accumulate straight past the threshold and
         close the panel the moment the reader reached the last card.
         The rail has to SETTLE at the end first — the visible position
         catches up to the target — before a further push counts as a
         deliberate request to leave. */
      if (pushingPast && !overscroll.current.armed) {
        overscroll.current.px = 0;
        targetX.current = Math.min(
          max + OVERSCROLL_LIMIT,
          Math.max(-OVERSCROLL_LIMIT, targetX.current + d * 0.25),
        );
        return;
      }

      if (pushingPast) {
        overscroll.current.px += Math.abs(d);
        // Rubber-band: the rail keeps giving, at a quarter rate.
        targetX.current = Math.min(
          max + OVERSCROLL_LIMIT,
          Math.max(-OVERSCROLL_LIMIT, targetX.current + d * 0.25),
        );
        if (overscroll.current.px >= CLOSE_DISTANCE) {
          closingRef.current = true;
          onClose();
        }
        return;
      }

      // Scrolling within the rail disarms: reaching an end mid-flick
      // must not leave the panel primed to close on the tail events.
      overscroll.current.px = 0;
      overscroll.current.armed = false;
      targetX.current = Math.min(max, Math.max(0, targetX.current + d * SCROLL_GAIN));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        targetX.current = Math.min(measure(), targetX.current + window.innerWidth * 0.65);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        targetX.current = Math.max(0, targetX.current - window.innerWidth * 0.65);
      }
    };

    const onResize = () => {
      measure();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      targetX.current = 0;
      currentX.current = 0;
    };
  }, [active, measure, onClose]);

  // Pointer drag handling with smooth inertia
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    isDragging.current = true;
    const now = performance.now();
    dragStart.current = {
      x: e.clientX,
      scroll: targetX.current,
      lastX: e.clientX,
      velocity: 0,
      time: now,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - dragStart.current.time);
    dragStart.current.velocity = (dragStart.current.lastX - e.clientX) / dt;
    dragStart.current.lastX = e.clientX;
    dragStart.current.time = now;

    const delta = dragStart.current.x - e.clientX;
    const max = maxScroll.current;
    targetX.current = Math.min(
      max + OVERSCROLL_LIMIT,
      Math.max(-OVERSCROLL_LIMIT, dragStart.current.scroll + delta),
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const max = maxScroll.current;
    const inertia = dragStart.current.velocity * 160;
    const finalTarget = targetX.current + inertia;

    /* A drag released well past either end closes, mirroring the wheel.
       The threshold is most of the rubber-band range, so a lazy overpull
       springs back and only a committed drag dismisses. */
    const DRAG_CLOSE = OVERSCROLL_LIMIT * 0.8;
    if (!closingRef.current && (finalTarget < -DRAG_CLOSE || finalTarget > max + DRAG_CLOSE)) {
      closingRef.current = true;
      targetX.current = Math.min(max, Math.max(0, finalTarget));
      onClose();
    } else {
      targetX.current = Math.min(max, Math.max(0, finalTarget));
    }

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
  };

  /* Compute the expansion clip.

     The origin is read from `from` as a fallback when `liveOrigin` has
     not been committed yet: state set inside the phase effect does not
     reach the first painted frame, and without an origin on that frame
     the browser interpolates from the hidden `inset(100%)` state — the
     bottom wipe, instead of the block growing out of its tile. */
  const growth = (() => {
    if (isOpen) return "inset(0px 0px 0px 0px round 0px)";
    if (!isVisible) return "inset(100% 0% 0% 0% round 0px)";

    const origin = liveOrigin ?? from;
    if (origin) {
      const { rect, radius } = origin;
      const right = Math.max(0, window.innerWidth - rect.right);
      const bottom = Math.max(0, window.innerHeight - rect.bottom);
      return `inset(${rect.top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${rect.left.toFixed(1)}px round ${radius})`;
    }

    return "inset(20% 20% 20% 20% round 2rem)";
  })();

  return (
    <section
      aria-hidden={!active}
      aria-label={`${p.name} case study`}
      data-panel={p.slug}
      className="absolute inset-0 overflow-hidden font-sans"
      style={{
        background: TONE[p.slug],
        color: fg,
        clipPath: growth,
        WebkitClipPath: growth,
        transition: isClosing
          ? "clip-path var(--dur-panel-close) var(--ease-panel-close)"
          : "clip-path var(--dur-panel) var(--ease-panel)",
        willChange: "clip-path",
        pointerEvents: active ? "auto" : "none",
        zIndex: active ? 30 : isClosing ? 25 : 0,
        visibility: isVisible ? "visible" : "hidden",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ---------- Travelling Rail ---------- */}
      <div
        ref={railRef}
        className="absolute inset-y-0 left-0 flex touch-none items-center"
        style={{
          willChange: "transform",
        }}
      >
        {/* 1 — Giant Project Title */}
        <div className="flex h-full shrink-0 items-center px-[6vw]" style={rise(isOpen, 0.62)}>
          <h2
            className="whitespace-nowrap font-bold leading-[0.8] tracking-tighter select-none font-sans"
            style={{ fontSize: "min(42vh, 22vw)" }}
          >
            {p.name}
          </h2>
        </div>

        {/* 2 — Description & Project Details */}
        <div
          className="flex h-full w-[min(88vw,32rem)] shrink-0 flex-col justify-center gap-6 px-[4vw]"
          style={rise(isOpen, 0.7)}
        >
          <p className="t-body text-base sm:text-lg font-medium leading-relaxed font-sans" style={{ opacity: 0.94 }}>
            {p.line}
          </p>

          <dl className="grid grid-cols-3 gap-4 border-y border-current/15 py-4 font-sans">
            <div>
              <dt className="t-label opacity-60">Year</dt>
              <dd className="t-small text-sm font-semibold mt-0.5">{p.year}</dd>
            </div>
            <div>
              <dt className="t-label opacity-60">Role</dt>
              <dd className="t-small text-sm font-semibold mt-0.5">{p.role}</dd>
            </div>
            {p.commits ? (
              <div>
                <dt className="t-label opacity-60">Commits</dt>
                <dd className="t-small text-sm font-semibold tabular-nums mt-0.5">
                  {p.commits.toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2">
            {p.tech.map((t) => (
              <span
                key={t}
                className="t-label rounded-full bg-current/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm font-sans"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 font-sans">
            {p.live ? (
              <a
                href={p.live}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={active ? 0 : -1}
                className="t-body inline-flex items-center gap-1.5 rounded-full bg-current/15 px-4 py-2 font-semibold transition-all hover:bg-current/25 hover:scale-105"
                style={{ color: fg }}
              >
                <span>Open Live</span>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ) : null}
            {p.repo ? (
              <a
                href={p.repo}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={active ? 0 : -1}
                className="t-body inline-flex items-center gap-1.5 rounded-full border border-current/25 px-4 py-2 font-semibold transition-all hover:bg-current/10 hover:scale-105"
                style={{ color: fg }}
              >
                <span>Source</span>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>

        {/* 3 — Screenshots */}
        <div className="flex h-full shrink-0 items-center gap-[4vw] px-[4vw]" style={rise(isOpen, 0.78)}>
          {p.shot ? (
            <div className="relative h-[62vh] w-[min(80vw,36rem)] shrink-0 overflow-hidden rounded-2xl border border-current/15 bg-current/5 shadow-2xl backdrop-blur-md">
              <Image
                src={p.shot}
                alt={`${p.name} interface`}
                fill
                sizes="80vw"
                className="object-contain p-2"
                priority={active}
              />
            </div>
          ) : (
            <div className="grid h-[62vh] w-[min(80vw,36rem)] shrink-0 place-items-center rounded-2xl border border-dashed border-current/25 bg-current/5 font-sans">
              <span className="t-label font-medium opacity-70">
                Interactive preview coming soon
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ---------- Header & Chrome ---------- */}
      <div
        className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-7 font-sans"
        style={{
          opacity: isOpen ? 1 : 0,
          transition: isOpen
            ? "opacity calc(var(--dur-panel) * 0.4) var(--ease) calc(var(--dur-panel) * 0.55)"
            : "opacity calc(var(--dur-panel-close) * 0.25) ease-out",
        }}
      >
        {/* Top Floating Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-current/10 px-4 py-2 backdrop-blur-md">
            <span className="t-small font-semibold" style={{ color: fg }}>
              {p.name}
            </span>
            <span className="t-label text-xs opacity-50" style={{ color: fg }}>
              {String(projectIndex + 1).padStart(2, "0")} / {String(totalProjects).padStart(2, "0")}
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="hidden sm:flex mx-4 h-1 max-w-xs flex-1 overflow-hidden rounded-full bg-current/15">
            <div
              className="h-full bg-current transition-all duration-75"
              style={{ width: `${(progress * 100).toFixed(1)}%` }}
            />
          </div>

          {/* Touch-Friendly Close Button */}
          <button
            onClick={onClose}
            tabIndex={active ? 0 : -1}
            aria-label="Close project case study (Escape)"
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-current/10 px-4 py-2 font-semibold backdrop-blur-md transition-all hover:bg-current/25 hover:scale-105 cursor-pointer"
            style={{ color: fg }}
          >
            <span className="text-xs font-semibold">Close</span>
            <kbd className="hidden sm:inline-block rounded bg-current/20 px-1.5 py-0.5 text-[10px] font-mono opacity-70">
              Esc
            </kbd>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Bottom Hint */}
        <div className="pointer-events-none self-start rounded-full bg-current/10 px-3.5 py-1.5 backdrop-blur-md">
          <p className="t-label text-xs opacity-60" style={{ color: fg }}>
            scroll sideways to explore — keep scrolling past either end to close
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Content entrance and exit.
 *
 * `stagger` is a FRACTION of the panel duration, not a number of
 * seconds: the text has to keep arriving after the shape has landed,
 * so hard-coded delays silently became wrong the moment the expansion
 * was retimed. Expressed as a fraction, the whole sequence rescales
 * with --dur-panel.
 *
 * Exit is deliberately quick and undelayed — on the way out the text
 * should be gone before the panel starts shrinking, or it rides the
 * retraction down and smears.
 */
/** Read a CSS custom property off :root. */
function cssValue(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A duration custom property in milliseconds, so JS and CSS agree. */
function cssMs(name: string): number {
  const v = cssValue(name);
  const n = parseFloat(v);
  if (!n) return 1500;
  return v.endsWith("ms") ? n : n * 1000;
}

function closeMs(): number {
  return cssMs("--dur-panel-close");
}

/** The clip that matches a tile's rect, or null when there is none. */
function originClip(o: Origin | null): string | null {
  if (!o || typeof window === "undefined") return null;
  const { rect, radius } = o;
  const right = Math.max(0, window.innerWidth - rect.right);
  const bottom = Math.max(0, window.innerHeight - rect.bottom);
  return `inset(${rect.top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${rect.left.toFixed(1)}px round ${radius})`;
}

function rise(open: boolean, stagger: number): React.CSSProperties {
  const dur = "calc(var(--dur-panel) * 0.3)";
  const delay = `calc(var(--dur-panel) * ${stagger})`;
  return {
    opacity: open ? 1 : 0,
    transform: open ? "none" : "translateY(14px)",
    transition: open
      ? `opacity ${dur} var(--ease) ${delay}, transform ${dur} var(--ease) ${delay}`
      : "opacity calc(var(--dur-panel-close) * 0.2) ease-out, transform calc(var(--dur-panel-close) * 0.2) ease-out",
  };
}
