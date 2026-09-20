"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Lenis from "lenis";
import { PROFILE, PROJECTS, type Project } from "./content";
import { pack, composition, shapeRadius, GRID, type Orientation } from "./pack";
import SwarmCursor from "../components/SwarmCursor";

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

   SCROLL_GAIN under 1 makes the rail move less than the wheel, so
   crossing a case study takes a deliberate scroll rather than one
   flick, and each notch lands as a glide rather than a jump. */
const SCROLL_GAIN = 0.55;

const ORDER = [...PROJECTS].sort((a, b) => b.year - a.year);

const TONE: Record<string, string> = {
  simblip: "#55E6C1",
  saul: "#292522",
  looni: "#EF476F",
  rotary: "#4E7D32",
  copaila: "#86B83F",
  bijulibatti: "#8067D6",
  orbital: "#FFD166",
  refill: "#39735A",
  rover: "#126782",
  fraud: "#75645D",
  hackforbusiness: "#D1493F",
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
  /* Black only wins when it clears white by a real margin. On the
     saturated mid-tones (looni, hackforbusiness) the two ratios land
     close enough that black technically edges ahead, but reads
     muddier there than white does — the margin corrects for that
     instead of trusting the bare comparison. */
  return contrast(bg, INK) > contrast(bg, PAPER) * 1.6 ? INK : PAPER;
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
  /* One counter drives the whole cycle. Layout and silhouette are
     read off it at different periods — 5 compositions against 4
     silhouettes — so a pairing only comes round again every 20 ticks
     rather than the two locking together into a short loop. */
  const [tick, setTick] = useState(0);
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

     Arrangement AND silhouette advance on the same tick, so a block
     glides to its post in the next composition while it is also
     becoming a circle. Changing only one at a time reads as two
     separate effects rather than one composition restating itself. */
  useEffect(() => {
    if (slug || hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setTick((n) => n + 1), 2600);
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

  const grid = GRID[orient];
  const boxes = pack(ORDER.length, tick, orient);
  /* The silhouette now travels WITH the arrangement: each composition
     names the phase it was drawn for, so a layout always appears in the
     corner treatment it was composed with rather than in whichever one
     the tick happened to land on. */
  const { phase: silhouette } = composition(tick, orient);

  const active = slug ? PROJECTS.find((p) => p.slug === slug) : undefined;
  const hovered = hover ? PROJECTS.find((p) => p.slug === hover) : undefined;

  return (
    <div
      className="fixed inset-0 overflow-hidden font-sans"
      style={{
        background: "var(--color-paper)",
      }}
    >
      {/* ---------- The swarm ----------

          A stroke of ink that trails the cursor across the paper. It
          sits at z-0 while the mosaic is z-10, so the trail passes
          BEHIND the blocks and only shows in the gaps between them —
          something moving behind the composition rather than a layer
          smeared on top of it. The blocks stay the subject.

          It listens on the window (track), not on its own box: this
          layer is pointer-events-none and underneath the tiles, so it
          would otherwise never receive an event.

          It is pointer-events-none and aria-hidden: purely atmosphere,
          never something to tab into or read out. `enabled` drops it
          the moment a case study opens, because the panel floods the
          screen with its own colour and a swarm crawling underneath is
          both invisible and a GPU loop running for nothing. */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
        <SwarmCursor
          color="#000000"
          accentColor="#000000"
          count={4
          }
          glow={0}
          size={10}
          merge={0.65}
          speed={2}
          spread={0}
          wander={0}
          trail={0.1}
          opacity={1}
          enabled={!active}
          track="window"
          scatterOnClick
        />
      </div>

      {/* ---------- HOME: the mosaic ---------- */}
      {/* The container no longer fades as a whole. The chosen shape is
          being taken over by the expanding panel, so fading everything
          hid the siblings behind it rather than letting them react.
          Each tile handles its own exit below: the chosen one holds,
          the rest collapse to nothing. */}
      <div
        className="absolute inset-0 z-10 grid place-items-center p-4 sm:p-6"
        style={{ pointerEvents: active ? "none" : undefined }}
        aria-hidden={Boolean(active)}
      >
        <div
          className="relative h-[60svh] w-[min(56rem,86vw)] portrait:h-[66svh] portrait:w-[92vw]"
        >
          {ORDER.map((p, i) => {
            const lift = hover === p.slug;
            const dim = hover !== null && !lift;
            /* When one shape is chosen, the others shrink to nothing.
               They collapse from their own centres so the composition
               reads as clearing a path for the panel rather than as a
               layer fading out. The chosen one stays exactly where it
               is and at full size: the panel grows out of its rect, so
               anything else would show a seam at the start of the
               expansion. */
            const chosen = active?.slug === p.slug;
            const banished = Boolean(active) && !chosen;
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
                  borderRadius: shapeRadius(boxes[i], silhouette, grid),
                  /* The collapse runs on the panel's own curve and a
                     fraction of its duration, so the shapes are gone
                     well before the expansion fills the screen —
                     matching the rest of the site's timing rather than
                     inventing a number. */
                  /* Opacity trails the scale and runs on a linear
                     curve deliberately: --ease front-loads its change,
                     so the shapes went transparent while still near
                     full size and the collapse was never actually
                     seen. Fading late means what reads is the shrink. */
                  transition: banished
                    ? "transform calc(var(--dur-panel) * 0.45) var(--ease-panel), opacity calc(var(--dur-panel) * 0.3) linear calc(var(--dur-panel) * 0.15)"
                    : [
                        "left var(--dur-move) var(--ease-move)",
                        "top var(--dur-move) var(--ease-move)",
                        "width var(--dur-move) var(--ease-move)",
                        "height var(--dur-move) var(--ease-move)",
                        "border-radius var(--dur-move) var(--ease-move)",
                        "opacity var(--dur) var(--ease)",
                        "transform var(--dur) var(--ease)",
                        "box-shadow var(--dur) var(--ease)",
                      ].join(", "),
                  transform: banished
                    ? "scale(0)"
                    : ready
                      ? lift
                        ? "scale(1.035)"
                        : "none"
                      : "translateY(16px)",
                  opacity: banished ? 0 : ready ? (dim ? 0.62 : 1) : 0,
                  zIndex: lift ? 2 : 1,
                  boxShadow: lift ? "0 14px 36px rgb(0 0 0 / 0.22)" : "none",
                  /* Shapes furthest from the chosen one leave last, so
                     the clearing travels outward from the click. */
                  transitionDelay: banished
                    ? `${Math.abs(i - ORDER.findIndex((o) => o.slug === active!.slug)) * 28}ms`
                    : ready
                      ? "0ms"
                      : `${i * 35}ms`,
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
  // Which edge zone (outer 20% of the viewport) the cursor is over, if
  // any — drives both the arrow cursor and what a click there does.
  const [edgeZone, setEdgeZone] = useState<-1 | 0 | 1>(0);
  /* How far the current overscroll has gone toward closing, 0..1, and
     at which end. Drives the arrow in the void: it is the same number
     the close threshold uses, so what the reader sees growing IS the
     thing being measured. */
  /* The arrows are driven from the RAF loop through refs, not from
     `pull` state. The wheel fires roughly every 50ms while the display
     refreshes every 16ms, so rendering straight from the event made the
     arrow hold one size for ~20 frames and then jump — four visible
     steps across the whole gesture. The loop eases toward the target
     every frame instead. */
  const chevronRefs = useRef<(SVGSVGElement | null)[]>([null, null]);
  // The RAF loop closes the panel, and it must not re-subscribe when a
  // new onClose identity arrives.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const maxScroll = useRef(0);
  const railRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const rafId = useRef<number | null>(null);
  /* Where the rail should rest once it exists. The open effect measures
     this before Lenis has mounted, so it is parked here and consumed by
     the Lenis effect rather than applied directly. */
  const restX = useRef(0);

  /* Guards the open animation to one run per activation. `setLiveOrigin`
     below re-renders, and `from` is a dependency of that effect, so
     without this the expansion fired twice — visibly, as a second
     animation restarting from the tile. */
  const openedFor = useRef<string | null>(null);

  /* Clicking the shot grows it to fill the screen, then leaves for the
     live site. The picture becoming the window is the whole point: the
     reader watches the thing they were looking at turn into the thing
     itself, rather than a new tab appearing out of nowhere.

     Same trick as the tile→panel open — measure the element's rect, then
     animate a fixed clone from that rect to the full viewport. The clone
     is what moves; the original stays put underneath so there is no
     layout shift in the rail if the reader comes back. */
  const shotRef = useRef<HTMLButtonElement>(null);
  const [launching, setLaunching] = useState(false);

  const launch = useCallback(() => {
    const el = shotRef.current;
    if (!p.live || !el || launching) return;

    /* Someone who asked for less motion wants the destination, not the
       journey — a full-screen zoom is exactly the effect they turned off. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.open(p.live, "_blank", "noopener,noreferrer");
      return;
    }
    setLaunching(true);

    const r = el.getBoundingClientRect();
    const clone = el.cloneNode(true) as HTMLElement;
    /* A cloned <button> keeps its disabled styling and can swallow the
       pointer; this is scenery for ~520ms, so strip it to a plain box. */
    clone.removeAttribute("disabled");
    clone.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:80;pointer-events:none;border-radius:${getComputedStyle(el).borderRadius};overflow:hidden;`;
    document.body.appendChild(clone);

    const anim = clone.animate(
      [
        { transform: "translate(0,0) scale(1)", borderRadius: getComputedStyle(el).borderRadius },
        {
          transform: `translate(${-r.left + window.innerWidth / 2 - r.width / 2}px, ${
            -r.top + window.innerHeight / 2 - r.height / 2
          }px) scale(${Math.max(window.innerWidth / r.width, window.innerHeight / r.height)})`,
          borderRadius: "0px",
        },
      ],
      { duration: 520, easing: "cubic-bezier(0.7, 0, 0.2, 1)", fill: "forwards" },
    );

    anim.finished
      .catch(() => {})
      .finally(() => {
        window.open(p.live, "_blank", "noopener,noreferrer");
        /* Leave the clone up for a beat: the new tab takes the
           foreground, and tearing the expansion down first would flash
           the rail back before the site appears. */
        setTimeout(() => {
          clone.remove();
          setLaunching(false);
        }, 260);
      });
  }, [p.live, launching]);

  /* How far past an end the wheel must travel before the panel closes.
     Deliberately large: a flick to the end of the rail is ~1-2 notches
     of overscroll, and closing on that made the panel feel like it shut
     itself. This is roughly six firm notches. */
  const closingRef = useRef(false);


  // Phase state machine for opening & closing
  useEffect(() => {
    if (active) {
      if (openedFor.current === p.slug) return;
      openedFor.current = p.slug;
      closingRef.current = false;
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
          /* Park the rail on the title, not on the leading void.

             The rail opens with a full screen of empty colour, so
             resting at 0 would show the reader nothing with the title
             off to the right. The void stays behind as the edge to
             scroll back into. */
          const railEl = railRef.current;
          const titleEl = railEl?.children[1] as HTMLElement | undefined;
          if (railEl && titleEl) {
            /* Now that the rail is a real scroll container, `restX` is
               an ordinary scroll position: 0 is the leading void and
               `offsetLeft` — measured from the rail's own start — is
               already in that same space, so nothing has to be
               rebased. */
            /* Rest with the HEADING's left edge a fixed 10% of the
               viewport in from the left, not centred: centring put a
               large title's start off-screen, since the box grows
               rightward from wherever the centre lands it. A fixed
               left inset keeps the first glyph in the same place
               regardless of how wide the title is. */
            const glyphs = (titleEl.querySelector("h2") ??
              titleEl) as HTMLElement;
            const rest =
              titleEl.offsetLeft + glyphs.offsetLeft - window.innerWidth * 0.1;
            restX.current = rest;
          }
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
          restX.current = 0; // the rail returns to the origin on reopen
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

  /* The full travel range, voids included.

     x = 0 shows the leading void, x = max shows the trailing one, so
     both are ordinary scrollable space the reader can reach. Overscroll
     — and the arrow growing — begins only once they push PAST an end,
     which is why the voids read as a runway rather than a wall. */
  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return 0;
    maxScroll.current = Math.max(0, el.scrollWidth - window.innerWidth);
    return maxScroll.current;
  }, []);

  /* Lenis drives the rail.

     Everything below used to be hand-written: a per-frame lerp, a wheel
     normaliser, a rubber-band, and a touch-inertia drag handler. Lenis
     is the same physics done properly — it tracks the input device
     rather than a fixed per-frame factor, so a slow drag stays glued to
     the finger while a flick still coasts. The site keeps only what is
     its own: reading the position to drive the arrow and the close. */
  useEffect(() => {
    if (!isVisible) return;
    const wrapper = wrapperRef.current;
    const content = railRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      orientation: "horizontal",
      /* The wheel is vertical on most mice; without this the rail only
         answers to horizontal trackpad gestures. */
      gestureOrientation: "both",
      /* Responsive AND springy: a high lerp tracks the gesture closely
         while the rail keeps coasting after it ends. The old 0.085
         per-frame factor was the sluggish half of that tradeoff. */
      lerp: 0.12,
      wheelMultiplier: SCROLL_GAIN,
      /* Glue the rail to the finger on touch, then release into
         inertia — the default (false) falls back to native-feeling
         momentum that fights the transform. */
      syncTouch: true,
      touchMultiplier: 1.6,
      overscroll: false,
    });
    lenisRef.current = lenis;

    measure();
    // Park on the title measured during the open.
    if (restX.current) lenis.scrollTo(restX.current, { immediate: true });

    let lastProgress = -1;

    const loop = (time: number) => {
      lenis.raf(time);

      const max = maxScroll.current;
      const x = lenis.scroll;

      if (max > 0) {
        const pct = Math.max(0, Math.min(1, x / max));
        if (Math.abs(pct - lastProgress) > 0.005) {
          lastProgress = pct;
          setProgress(pct);
        }
      }

      /* The arrow tracks the scroll, frame by frame.

         The voids at the ends of the rail are the runway: travelling
         into one grows the arrow in lockstep with how far through it
         the reader is, so the gesture and the growth are one motion
         rather than two things that happen near each other. Entering
         the void is nothing; its far edge is full size.

         Position runs through --ease-panel, so the growth carries the
         same curve as the panel expansion, and Lenis's own smoothing
         carries it — the position moves every frame even while the
         wheel is between events.

         Written as a TRANSFORM: animating width/height would relayout
         the SVG on every frame. */
      const vw = window.innerWidth;
      let dir: -1 | 0 | 1 = 0;
      let through = 0;
      if (x < vw) {
        dir = -1;
        through = Math.min(1, (vw - x) / vw);
      } else if (x > max - vw) {
        dir = 1;
        through = Math.min(1, (x - (max - vw)) / vw);
      }
      const t = through > 0 ? easePanel(through) : 0;

      /* Crossing the void closes the panel. `through` reaches 1 at its
         far edge, so the arrow is already at full size — the close
         lands as the end of a motion rather than a cutoff. */
      if (through >= 1 && !closingRef.current) {
        closingRef.current = true;
        onCloseRef.current();
      }

      chevronRefs.current.forEach((el, i) => {
        if (!el) return;
        const mySide = i === 0 ? -1 : 1;
        const shown = dir === mySide ? t : 0;
        // 2.5rem at rest out of a 26rem box, growing to full size.
        const REST = 2.5 / 26;
        const k = REST + shown * (1 - REST);
        el.style.transform = `scaleX(${mySide}) scale(${k.toFixed(4)})`;
        el.style.opacity = `${(0.25 + shown * 0.75).toFixed(3)}`;
      });

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", onResize);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isVisible, measure]);

  // Keyboard nav — one screen per press, on Lenis's own curve.
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      const lenis = lenisRef.current;
      if (!lenis) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        lenis.scrollTo(lenis.scroll + window.innerWidth * 0.65);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        lenis.scrollTo(lenis.scroll - window.innerWidth * 0.65);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  /* Edge zones: the outer 20% of the viewport on either side. Hovering
     one shows the arrow cursor; clicking anywhere in it scrolls the
     rail exactly one screen toward that edge. */
  const zoneAt = (x: number): -1 | 0 | 1 => {
    const vw = window.innerWidth;
    if (x < vw * 0.2) return -1;
    if (x > vw * 0.8) return 1;
    return 0;
  };

  const onRailMouseMove = useCallback((e: React.MouseEvent) => {
    setEdgeZone(zoneAt(e.clientX));
  }, []);

  const onRailMouseLeave = useCallback(() => setEdgeZone(0), []);

  const onRailClick = useCallback((e: React.MouseEvent) => {
    const zone = zoneAt(e.clientX);
    if (zone === 0) return;
    const lenis = lenisRef.current;
    if (!lenis) return;
    e.preventDefault();
    lenis.scrollTo(lenis.scroll + zone * window.innerWidth);
  }, []);

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
        /* No CSS transition while opening: WAAPI drives that, and
           leaving one declared meant React setting clipPath to the tile
           rect ALSO started a CSSTransition on the same property. Both
           ran at once and the expansion visibly played twice. Closing
           is still CSS, which is why it keeps its transition. */
        transition: isClosing
          ? "clip-path var(--dur-panel-close) var(--ease-panel-close)"
          : "none",
        willChange: "clip-path",
        pointerEvents: active ? "auto" : "none",
        zIndex: active ? 30 : isClosing ? 25 : 0,
        visibility: isVisible ? "visible" : "hidden",
      }}
    >
      {/* ---------- Travelling Rail ----------

          A real horizontal scroll container, driven by Lenis. The rail
          used to be a transform moved by a hand-written lerp, which
          meant re-implementing wheel normalisation, touch inertia and
          rubber-banding by hand — Lenis does all three, and tracks the
          input device far more responsively than a fixed per-frame
          factor could. The scrollbar is hidden; the motion is the only
          affordance. */}
      <div
        ref={wrapperRef}
        onMouseMove={onRailMouseMove}
        onMouseLeave={onRailMouseLeave}
        onClick={onRailClick}
        className="absolute inset-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          overscrollBehavior: "none",
          cursor: edgeZone === -1 ? arrowCursor(-1, fg) : edgeZone === 1 ? arrowCursor(1, fg) : undefined,
        }}
      >
      <div
        ref={railRef}
        className="flex h-full w-max touch-none items-center"
      >
        {/* 0 — Leading void.

            A full screen of nothing before the title. It gives the
            composition somewhere to breathe on arrival, and it is what
            makes the start of the rail legible as a START: scrolling
            back into empty colour is an obvious edge, so the close that
            follows reads as leaving rather than as something breaking. */}
        <div className="grid h-full w-screen shrink-0 place-items-center" aria-hidden>
          <Chevron dir={-1} fg={fg} elRef={(el) => (chevronRefs.current[0] = el)} />
        </div>

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
          className="flex h-full w-[min(90vw,44rem)] shrink-0 flex-col justify-center gap-6 px-[4vw]"
          style={rise(isOpen, 0.7)}
        >
          <p className="t-body font-medium leading-relaxed font-sans" style={{ opacity: 0.94 }}>
            {p.line}
          </p>

          {/* Two columns, not three: with the larger type a 3-up grid
              wrapped "Design and frontend" onto two lines and stranded
              the fourth stat alone on a second row. */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-current/20 py-5 font-sans">
            <div>
              <dt className="t-label" style={{ color: fg, opacity: 0.65 }}>Year</dt>
              <dd className="t-small font-semibold mt-0.5" style={{ color: fg }}>{p.year}</dd>
            </div>
            <div>
              <dt className="t-label" style={{ color: fg, opacity: 0.65 }}>Role</dt>
              <dd className="t-small font-semibold mt-0.5" style={{ color: fg }}>{p.role}</dd>
            </div>
            {p.commits ? (
              <div>
                <dt className="t-label" style={{ color: fg, opacity: 0.65 }}>Commits</dt>
                <dd className="t-small font-semibold tabular-nums mt-0.5" style={{ color: fg }}>
                  {p.commits.toLocaleString()}
                </dd>
              </div>
            ) : null}
            {p.loc ? (
              <div>
                <dt className="t-label" style={{ color: fg, opacity: 0.65 }}>Lines</dt>
                <dd className="t-small font-semibold tabular-nums mt-0.5" style={{ color: fg }}>
                  {p.loc.toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>

          {/* A gated or dead live link is stated outright — a button that
              goes nowhere reads as rot, a labelled one reads as a fact. */}
          {p.status ? (
            <p className="t-small font-medium font-sans" style={{ color: fg, opacity: 0.7 }}>
              {p.status}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {p.tech.map((t) => (
              <span
                key={t}
                className="t-label rounded-full bg-current/15 px-3 py-1 font-semibold backdrop-blur-sm font-sans"
                style={{ color: fg }}
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

        {/* 3 — The part worth reading.

            Each beat is one scraped fact about what is actually hard in
            the project. Numbered so the eye can rest between them, and
            skipped entirely when there is nothing verified to say. */}
        {p.detail?.length ? (
          <div
            className="flex h-full w-[min(90vw,46rem)] shrink-0 flex-col justify-center gap-5 px-[4vw]"
            style={rise(isOpen, 0.74)}
          >
            <h3 className="t-label" style={{ color: fg, opacity: 0.65 }}>
              What&rsquo;s under it
            </h3>
            <ul className="flex flex-col gap-4">
              {p.detail.map((d, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="t-small shrink-0 pt-1 text-xs font-semibold tabular-nums font-sans"
                    style={{ color: fg, opacity: 0.45 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p
                    className="t-body font-medium leading-relaxed font-sans"
                    style={{ color: fg, opacity: 0.92 }}
                  >
                    {d}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 4 — Screenshots.

            The shots are 1440x900, so the frame carries that aspect
            directly and the image fills it edge to edge. The old box was
            36rem wide against 62vh tall — a landscape picture in an
            upright hole, which `object-contain` then letterboxed down to
            a stamp with bars on both sides. Sized from height so it
            scales with the viewport, capped at 92vw so a wide screen
            cannot push it past the fold. */}
        <div className="flex h-full shrink-0 items-center gap-[4vw] px-[4vw]" style={rise(isOpen, 0.78)}>
          {p.shot ? (
            <button
              type="button"
              ref={shotRef}
              onClick={() => launch()}
              disabled={!p.live || launching}
              tabIndex={active ? 0 : -1}
              aria-label={p.live ? `Open the live ${p.name} site` : `${p.name} interface`}
              className="group relative shrink-0 overflow-hidden rounded-2xl border border-current/15 bg-current/5 shadow-2xl backdrop-blur-md transition-transform duration-500 enabled:hover:scale-[1.02] enabled:cursor-pointer disabled:cursor-default"
              style={{
                transformOrigin: "center",
                /* Fit the 16:10 shot inside both axes. Setting a width
                   cap alongside `aspect-ratio` let the cap win and
                   squeezed the frame narrower than its own ratio, which
                   `object-cover` then paid for by cropping the sides —
                   so width is derived from height and clamped, and the
                   height follows from that same width. */
                width: "min(92vw, calc(78vh * 1.6))",
                height: "calc(min(92vw, calc(78vh * 1.6)) / 1.6)",
              }}
            >
              <Image
                src={p.shot}
                alt={`${p.name} interface`}
                fill
                sizes="92vw"
                className="object-cover object-top"
                priority={active}
              />
              {/* Only promise the jump when there is somewhere to jump to. */}
              {p.live ? (
                <span
                  className="t-label pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 font-semibold opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: fg, color: TONE[p.slug] ?? "#000" }}
                >
                  Open the live site
                </span>
              ) : null}
            </button>
          ) : (
            <div
              className="grid shrink-0 place-items-center rounded-2xl border border-dashed border-current/25 bg-current/5 font-sans"
              style={{
                width: "min(92vw, calc(78vh * 1.6))",
                height: "calc(min(92vw, calc(78vh * 1.6)) / 1.6)",
              }}
            >
              <span className="t-label font-medium" style={{ color: fg, opacity: 0.7 }}>
                Interactive preview coming soon
              </span>
            </div>
          )}
        </div>

        {/* 5 — Trailing void.

            The mirror of the leading one: a full screen of empty colour
            that marks the end of the case study. Running out of content
            is what tells the reader they are at the end, so the close
            that follows is a deliberate exit rather than a surprise. */}
        <div className="grid h-full w-screen shrink-0 place-items-center" aria-hidden>
          <Chevron dir={1} fg={fg} elRef={(el) => (chevronRefs.current[1] = el)} />
        </div>
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
/**
 * Evaluate --ease-panel at progress `x`.
 *
 * Control points are parsed from the CSS token rather than repeated
 * here, so the arrow and the panel expansion cannot drift onto
 * different curves.
 *
 * CSS solves y for a given x on a parametric cubic; this does the same
 * with a short bisection. Ten iterations lands within ~1e-3 of the
 * browser's own result, checked against WAAPI — far finer than a
 * subpixel at any size the arrow reaches.
 */
let easeCache: [number, number, number, number] | null = null;

function easePanel(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (!easeCache) {
    const m = cssValue("--ease-panel").match(/-?[\d.]+/g);
    easeCache =
      m && m.length === 4
        ? ([+m[0], +m[1], +m[2], +m[3]] as [number, number, number, number])
        : [0.4, 0, 0.2, 1];
  }
  const [p0, p1, p2, p3] = easeCache;
  const cx = (u: number) =>
    3 * (1 - u) * (1 - u) * u * p0 + 3 * (1 - u) * u * u * p2 + u * u * u;
  const cy = (u: number) =>
    3 * (1 - u) * (1 - u) * u * p1 + 3 * (1 - u) * u * u * p3 + u * u * u;

  let lo = 0;
  let hi = 1;
  let u = x;
  for (let i = 0; i < 10; i++) {
    if (cx(u) - x > 0) hi = u;
    else lo = u;
    u = (lo + hi) / 2;
  }
  return cy(u);
}

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

/** A small chevron cursor, in the site's own arrow shape, pointing the
 * direction a click in that edge zone will scroll. `fg` keeps it
 * visible against whichever tone the open panel is wearing. */
const arrowCursorCache = new Map<string, string>();
function arrowCursor(dir: -1 | 1, fg: string): string {
  const key = `${dir}:${fg}`;
  const cached = arrowCursorCache.get(key);
  if (cached) return cached;
  const color = fg.replace("#", "%23");
  const path = dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7";
  const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='${path}'/%3E%3C/svg%3E`;
  const value = `url("${svg}") 12 12, ${dir === 1 ? "e-resize" : "w-resize"}`;
  arrowCursorCache.set(key, value);
  return value;
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

/**
 * The arrow that lives in a void at the end of the rail.
 *
 * At rest it is a small chevron — just enough to say "there is an edge
 * here". As the reader pushes past the end it grows toward the size of
 * the project title, and at full size the panel closes. So the growth
 * is not decoration: it is the close threshold made visible, drawn from
 * the same accumulated distance the handler tests, which means the
 * arrow reaching full size and the block closing are the same event.
 */
function Chevron({
  dir,
  fg,
  elRef,
}: {
  dir: -1 | 1;
  fg: string;
  elRef: (el: SVGSVGElement | null) => void;
}) {
  return (
    <svg
      ref={elRef}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fg}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        /* Laid out at FULL size and scaled DOWN to rest, never up.
           Scaling a small SVG up magnifies the raster the browser
           already produced, which is what made the arrow blurry as it
           grew; starting large means every size is a downscale of a
           sharp original. Growth is still a transform, so no relayout. */
        width: "26rem",
        height: "26rem",
        opacity: 0.25,
        // dir -1 is the leading void: flip to point left, the way the
        // reader is travelling. The base path points right.
        transform: `scaleX(${dir}) scale(${(2.5 / 26).toFixed(4)})`,
        willChange: "transform, opacity",
      }}
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
