"use client";

import { useEffect, useState } from "react";
import { PROFILE, PROJECTS } from "./content";

/* ============================================================
   Fixed header. The year underneath the name tracks whichever
   project is currently under the reading line, so scrolling the
   page is also moving through time.

   It reads the DOM rather than owning scroll: no hijacking, no
   smooth-scroll library, native scrolling stays intact. That is
   the whole trick — the header is a readout, not a controller.
   ============================================================ */

const YEARS = [...new Set(PROJECTS.map((p) => p.year))].sort((a, b) => b - a);
const NEWEST = YEARS[0];

export default function Header() {
  const [year, setYear] = useState<number>(NEWEST);

  useEffect(() => {
    const plates = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("[data-year]"),
      );

    let raf = 0;
    const read = () => {
      raf = 0;
      // The reading line sits a third of the way down the viewport.
      const line = window.innerHeight * 0.34;
      let current = NEWEST;
      for (const el of plates()) {
        const r = el.getBoundingClientRect();
        if (r.top <= line) {
          const y = Number(el.dataset.year);
          if (!Number.isNaN(y)) current = y;
        }
      }
      setYear((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      // Coalesce to one read per frame.
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-5 pb-6 pt-5 sm:px-8 sm:pt-7">
      {/* Fade to paper behind the header so content scrolling underneath
          never collides with the name. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-paper via-paper/95 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl items-start justify-between">
        <div className="pointer-events-auto">
          <a href="#top" className="t-head block link">
            {PROFILE.name}
          </a>
          {/* aria-live is deliberately off: this changes on every scroll
              and would flood a screen reader. The year is decorative
              context; the real year lives on each project row. */}
          <p className="t-head tabular-nums text-ink-3" aria-hidden>
            {year}
          </p>
        </div>

        <nav
          className="pointer-events-auto flex flex-col items-end gap-0.5 sm:flex-row sm:gap-5"
          aria-label="Primary"
        >
          <a href="#work" className="t-small link">
            Work
          </a>
          <a href="#about" className="t-small link">
            About
          </a>
          <a href={`mailto:${PROFILE.email}`} className="t-small link">
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
