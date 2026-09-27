"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import { TECH, type Tech } from "./stack";

/** A tool's logo: the simple-icons glyph as a mask, so it takes any
    colour, or a monogram when there's no official mark. */
export function TechLogo({ tech, className }: { tech: Tech; className?: string }) {
  return tech.icon ? (
    <i
      className={`logo ${className ?? ""}`}
      style={{ WebkitMaskImage: `url(/stack/${tech.icon}.svg)`, maskImage: `url(/stack/${tech.icon}.svg)` }}
      aria-hidden
    />
  ) : (
    <i className={`logo logo--mono ${className ?? ""}`} aria-hidden>
      {tech.name.replace(/[^A-Za-z]/g, "").slice(0, 2)}
    </i>
  );
}

/**
 * The stack queue: every tool on a loop.
 *
 * Driven from the GSAP ticker rather than a CSS animation so the wheel
 * can grab it: scrolling over the bar adds velocity (either way), which
 * decays back to the idle drift. The list is rendered twice and the
 * offset wraps at one copy's width, so the loop has no seam. Hovering
 * slows the drift so a chip can be clicked without chasing it.
 */
export function StackQueue({ active, onPick }: { active: string | null; onPick: (name: string) => void }) {
  const bar = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    const tr = track.current;
    if (!el || !tr) return;
    let x = 0;
    let velocity = 0;
    let drift = 0.35;
    const setX = gsap.quickSetter(tr, "x", "px");

    const tick = (_t: number, dt: number) => {
      const half = tr.scrollWidth / 2;
      if (!half) return;
      const k = dt / 16.67;
      x -= (drift + velocity) * k;
      velocity *= Math.pow(0.92, k);
      x = gsap.utils.wrap(-half, 0, x);
      setX(x);
    };
    gsap.ticker.add(tick);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      /* Keep the wheel ours: the project rail listens on window too. */
      e.stopPropagation();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      velocity = gsap.utils.clamp(-40, 40, velocity + d * 0.08);
    };
    const slow = () => (drift = 0.08);
    const resume = () => (drift = 0.35);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerenter", slow);
    el.addEventListener("pointerleave", resume);
    return () => {
      gsap.ticker.remove(tick);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerenter", slow);
      el.removeEventListener("pointerleave", resume);
    };
  }, []);

  return (
    <section className="card bento__stack" aria-label="Tech stack — scroll to spin" ref={bar}>
      <div className="stack__track" ref={track}>
        {[...TECH, ...TECH].map((t, i) => {
          const copy = i >= TECH.length;
          return (
            <button
              key={i}
              className="chip"
              data-active={active === t.name || undefined}
              onClick={() => onPick(t.name)}
              aria-hidden={copy || undefined}
              tabIndex={copy ? -1 : 0}
              title={t.name}
              style={{ "--brand": t.color } as React.CSSProperties}
            >
              <TechLogo tech={t} />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The sentence, with the tool's name picked out wherever it appears. */
function Highlight({ text, tech }: { text: string; tech: Tech }) {
  const re = new RegExp(`(${tech.aliases.map(escape).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

const verdict = (n: number) =>
  n === 0
    ? "in the toolbox. no public project shows it off yet."
    : n === 1
      ? "used in 1 project."
      : n >= 4
        ? `used in ${n} projects. basically lives here.`
        : `used in ${n} projects.`;

export default function StackView({
  name,
  active,
  onOpen,
}: {
  name: string;
  active: boolean;
  onOpen: (slug: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const tech = TECH.find((t) => t.name === name) ?? TECH[0];

  /* Each tool change re-deals the cards. */
  useLayoutEffect(() => {
    if (!active || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".stackview__head > *", { y: 28, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.06 });
      gsap.from(".stackview__logo", { scale: 0.4, rotation: -30, duration: 1.1, ease: "elastic.out(1, 0.55)" });
      gsap.from(".use", { y: 40, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.07, delay: 0.12 });
    }, root);
    return () => ctx.revert();
  }, [name, active]);

  return (
    <div className="stackview" ref={root} style={{ "--brand": tech.color } as React.CSSProperties}>
      <header className="stackview__head">
        <span className="stackview__logo">
          <TechLogo tech={tech} />
        </span>
        <p className="stackview__kicker">tech stack</p>
        <h2 className="stackview__title">{tech.name}</h2>
        <p className="stackview__count">{verdict(tech.uses.length)}</p>
      </header>

      <ol className="stackview__list">
        {tech.uses.map((u) => (
          <li className="use" key={u.slug}>
            <div className="use__top">
              <span className="use__year">{u.year}</span>
              <h3 className="use__name">{u.name}</h3>
              <button className="use__open" onClick={() => onOpen(u.slug)}>
                open it <ArrowUpRight size={14} />
              </button>
            </div>
            <p className="use__role">{u.role}</p>
            <p className="use__line">{u.line}</p>
            {u.notes.length ? (
              <details className="more">
                <summary>how {tech.name} was used</summary>
                {u.notes.map((n, i) => (
                  <blockquote className="use__note" key={i}>
                    <Highlight text={n} tech={tech} />
                  </blockquote>
                ))}
              </details>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
