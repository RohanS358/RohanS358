"use client";

import { useEffect, useRef, useState } from "react";
import { PROJECTS } from "./content";

/* ============================================================
   The opening composition.

   No headline, no paragraph. A block per project, sized by how
   much work actually went into it (verified commit counts), in
   the same reverse-chronological order as the page below.

   It is also navigation: hovering names the project, clicking
   scrolls to it. So the first screen is a picture AND a table of
   contents, with essentially no copy.

   Motion: the blocks morph corner-radius using the single shared
   --ease/--dur, the way the reference sites do. One idea, applied
   uniformly, is what makes it read as harmony rather than effects.
   ============================================================ */

const ORDER = [...PROJECTS].sort((a, b) => b.year - a.year);

/* A quiet, non-neon palette. Assigned by index so it is stable
   between renders and server/client. */
const TONES = [
  "#2b57ff",
  "#0d0d0f",
  "#c8cad0",
  "#ff5147",
  "#1f9c6b",
  "#ffc93f",
  "#7b61ff",
  "#0d0d0f",
  "#c8cad0",
  "#2b57ff",
  "#1f9c6b",
];

export default function Opening() {
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Blocks settle in on load. Once only — no scroll listener.
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const go = (slug: string) => {
    document
      .getElementById(`p-${slug}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /**
   * Touch has no hover, so a single tap would jump before the visitor
   * ever saw which project they picked. First tap names it, second tap
   * goes. Pointer devices keep the immediate click.
   */
  const onActivate = (i: number, slug: string) => {
    const coarse = window.matchMedia("(hover: none)").matches;
    if (coarse && active !== i) {
      setActive(i);
      return;
    }
    go(slug);
  };

  // Weight by commits so the composition reflects real effort.
  // Private repos have no public count; they get the base weight
  // rather than an invented one.
  const weight = (c?: number) => (c ? Math.max(1, Math.log10(c + 1)) : 1);

  return (
    <section aria-label="Projects overview" className="mb-8">
      <div
        ref={ref}
        className="flex h-[52svh] min-h-64 w-full gap-1.5 sm:h-[62svh]"
        onMouseLeave={() => setActive(null)}
      >
        {ORDER.map((p, i) => (
          <button
            key={p.slug}
            onClick={() => onActivate(i, p.slug)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            aria-label={`${p.name}, ${p.year}. Jump to project.`}
            className="m group relative h-full overflow-hidden"
            style={{
              flexGrow: weight(p.commits),
              flexBasis: 0,
              background: TONES[i % TONES.length],
              // The morph: square at rest, rounded when touched.
              borderRadius: active === i ? "1.75rem" : "0.375rem",
              transform: shown
                ? active === i
                  ? "translateY(-6px)"
                  : "none"
                : "translateY(14px)",
              opacity: shown ? (active === null || active === i ? 1 : 0.45) : 0,
              transitionDelay: shown ? "0ms" : `${i * 45}ms`,
            }}
          />
        ))}
      </div>

      {/* One live line of text. Reads as a caption, not a headline. */}
      <p className="t-small mt-3 h-5" aria-live="polite">
        {active === null ? (
          <span className="text-ink-3">
            {ORDER.length} projects
            {/* Hover means nothing on touch; say the right thing per device. */}
            <span className="hidden sm:inline"> — hover to name, click to jump</span>
            <span className="sm:hidden"> — tap one to jump</span>
          </span>
        ) : (
          <>
            {ORDER[active].name}
            <span className="text-ink-3">
              {" — "}
              {ORDER[active].year}
              {ORDER[active].commits
                ? `, ${ORDER[active].commits.toLocaleString()} commits`
                : ""}
            </span>
          </>
        )}
      </p>
    </section>
  );
}
