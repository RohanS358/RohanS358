"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Clipboard, Check } from "lucide-react";
import Corkboard from "./Corkboard";
import Player from "./Player";
import StackView, { StackQueue } from "./StackView";
import Dashboard from "./Dashboard";
import Profile from "./Profile";
import Gallery from "./Gallery";
import Ambient from "./Ambient";
import ContactForm from "./ContactForm";
import { AdminProvider } from "./Admin";
import type { GithubStats } from "@/lib/github";
import { TECH } from "./stack";
import { PROFILE } from "./content";
import { TONE } from "./HomeMarkup";
import type { Track } from "@/lib/tracks";

/**
 * The bento shell.
 *
 * It lives OUTSIDE the class router's `.app`, which is passed in as
 * `children` and mounted in the Products slot. That split is the point:
 * the router swaps `.app` when a project opens, and everything here —
 * the music, the corkboard, the tab — survives the round trip.
 *
 * Tabs are announced on window as `bento:tab` so the Home page class
 * (lib/pages/Home.ts) can play its mosaic entrance when Products opens.
 */

export type Tab = "info" | "contact" | "products" | "projects" | "profile" | "gallery" | "social" | "stack";

const EASE = "expo.inOut";

const NAV: { tab: Tab; label: string }[] = [
  { tab: "products", label: "Products" },
  { tab: "projects", label: "Projects" },
  { tab: "profile", label: "Profile" },
  { tab: "gallery", label: "Designs" },
  { tab: "social", label: "Socials" },
];

/** A tiny preview inside each nav tile, hinting at what it opens. */
function TileGlyph({ tab }: { tab: Tab }) {
  switch (tab) {
    case "products":
      return (
        <span className="tile__mosaic" aria-hidden>
          {Object.values(TONE).map((c, i) => <i key={i} style={{ background: c }} />)}
        </span>
      );
    case "projects":
      return (
        <span className="tile__glyph tile__glyph--bars" aria-hidden>
          {[40, 75, 55, 100, 30, 65].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
        </span>
      );
    case "profile":
      return (
        <span className="tile__glyph tile__glyph--cv" aria-hidden>
          <i /><i /><i /><i />
        </span>
      );
    case "gallery":
      return (
        <span className="tile__glyph tile__glyph--masonry" aria-hidden>
          <i /><i /><i /><i /><i />
        </span>
      );
    case "social":
      return (
        <span className="tile__glyph tile__glyph--social" aria-hidden>
          {["instagram", "behance", "dribbble"].map((n) => (
            <i key={n} className="logo" style={{ maskImage: `url(/stack/${n}.svg)`, WebkitMaskImage: `url(/stack/${n}.svg)` }} />
          ))}
        </span>
      );
    default:
      return null;
  }
}


const Plus = () => (
  <span className="pill__icon" aria-hidden>
    <i />
    <i />
  </span>
);

export default function Bento({
  children,
  tracks,
  stats,
  initialTab = "info",
  intro = true,
}: {
  children: React.ReactNode;
  tracks: Track[];
  stats: GithubStats | null;
  initialTab?: Tab;
  intro?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const reveal = useRef<gsap.core.Timeline | null>(null);
  const [stage, setStage] = useState<"intro" | "bento">(intro ? "intro" : "bento");
  /* True once the intro has fully cleared — the pins wait for it. */
  const [revealed, setRevealed] = useState(!intro);
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [copied, setCopied] = useState(false);
  /* Phones only: the main panel opens as a full-screen sheet over the
     menu, instead of somewhere below the fold. CSS ignores it on desktop. */
  const [sheet, setSheet] = useState(false);
  /* The player sits low until hovered. */
  const [playerOpen, setPlayerOpen] = useState(false);
  const [tech, setTech] = useState(TECH[0].name);

  /* ---------- Intro → bento ----------

     The intro's white page doesn't cut away: it IS the main panel,
     shrunk. Its clip-path closes from the full viewport onto the main
     panel's exact rect while the portrait lifts out, the aside cards
     slide in from the left and the player morphs from the intro's
     loose credit into the expanded card. Reversing the same timeline
     is the way back. */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const cards = q(".bento__aside > *");

    /* A context, reverted on cleanup: Strict Mode runs this twice, and
       a second `from()` would otherwise capture the first one's hidden
       start state as its end state. */
    const ctx = gsap.context(() => {}, el);

    if (!intro) {
      ctx.add(() => gsap.from(cards, { xPercent: -110, duration: 1.1, ease: "expo.out", stagger: 0.07, clearProps: "transform" }));
      return () => ctx.revert();
    }

    /* A phone gets its own exit: transforms and opacity only, which the
       GPU composites. Clip-path and blur are repainted on the CPU every
       frame, and that's what stuttered. */
    const phone = window.matchMedia("(max-width: 900px)").matches;

    ctx.add(() => {
      gsap.set(cards, phone ? { y: 40, autoAlpha: 0 } : { xPercent: -115 });
      /* The greeting arrives too. */
      gsap.from(q(".intro__portrait, .intro__line, .intro__hint"), {
        y: 40,
        autoAlpha: 0,
        duration: 1.3,
        ease: "expo.out",
        stagger: 0.09,
        delay: 0.1,
      });
      gsap.from(q(".intro__circle"), { scale: 0.6, autoAlpha: 0, duration: 1.6, ease: "expo.out" });
      gsap.from(q(".intro__corner"), { scale: 0, autoAlpha: 0, duration: 1.2, ease: "expo.out", stagger: 0.06, delay: 0.3 });
    });

    const build = () => {
      const main = q(".bento__main")[0].getBoundingClientRect();
      const { innerWidth: w, innerHeight: h } = window;
      const inset = `inset(${main.top}px ${w - main.right}px ${h - main.bottom}px ${main.left}px round 24px)`;

      const tl = gsap.timeline({
        paused: true,
        onStart: () => setStage("bento"),
        onComplete: () => setRevealed(true),
        onReverseComplete: () => setStage("intro"),
      });

      /* On a phone the panel is a sheet parked off-screen, so there's
         nothing to close onto: the whole intro lifts off the top like a
         page, uncovering the menu rising underneath. */
      if (phone) {
        tl.to(q(".intro__portrait, .intro__line"), { y: -40, autoAlpha: 0, duration: 0.5, ease: "power2.in", stagger: 0.04 }, 0)
          .to(q(".intro__hint, .intro__corner, .intro__circle"), { autoAlpha: 0, duration: 0.3 }, 0)
          .to(q(".intro"), { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, 0.2)
          .to(cards, { y: 0, autoAlpha: 1, duration: 0.8, ease: "expo.out", stagger: 0.05 }, 0.5)
          .set(q(".intro"), { autoAlpha: 0 });
        return tl;
      }

      tl.to(q(".intro__portrait"), { y: -60, scale: 0.86, autoAlpha: 0, filter: "blur(8px)", duration: 0.9, ease: "power3.in" }, 0)
        .to(q(".intro__circle"), { scale: 1.6, autoAlpha: 0, duration: 1, ease: "power3.in" }, 0)
        .to(q(".intro__line"), { y: -30, autoAlpha: 0, duration: 0.7, ease: "power3.in", stagger: 0.05 }, 0.05)
        .to(q(".intro__hint"), { autoAlpha: 0, duration: 0.3 }, 0)
        .to(q(".intro__corner"), { scale: 1.8, autoAlpha: 0, duration: 0.8, ease: "power3.in" }, 0)
        .fromTo(q(".intro"), { clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: inset, duration: 1.2, ease: EASE }, 0.35)
        .to(cards, { xPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.07 }, 0.75)
        .to(q(".intro"), { autoAlpha: 0, duration: 0.35, ease: "power1.out" }, 1.5);
      return tl;
    };

    ctx.add(() => (reveal.current = build()));

    /* The rect the intro closes onto moves with the window. */
    const onResize = () => {
      const progress = reveal.current?.progress() ?? 0;
      /* Rewind before killing: a fresh timeline records each tween's
         start from whatever is on screen, and recording it from the
         finished state left the intro half-faded over the panel. */
      reveal.current?.progress(0, true).kill();
      ctx.add(() => (reveal.current = build()));
      reveal.current?.progress(progress, true);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, [intro]);

  /* Any downward intent leaves the intro: wheel, swipe, or keys. */
  useEffect(() => {
    if (stage !== "intro") return;
    let touchY = 0;
    const go = () => {
      const tl = reveal.current;
      if (tl && !tl.isActive()) tl.timeScale(1).play();
    };
    const onWheel = (e: WheelEvent) => e.deltaY > 8 && go();
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const onTouchEnd = (e: TouchEvent) => touchY - e.changedTouches[0].clientY > 40 && go();
    const onKey = (e: KeyboardEvent) => ["ArrowDown", "PageDown", " ", "Enter"].includes(e.key) && go();
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [stage]);

  const backToIntro = () => {
    if (!intro || !reveal.current) return;
    if (tab !== "info") setTab("info");
    setRevealed(false);
    reveal.current.timeScale(1.4).reverse();
  };

  /* ---------- Tabs ---------- */

  const setTab = (next: Tab, instant = false) => {
    if (next === tab) return;
    if (slotOf(next) === slotOf(tab)) return void setTabState(next);
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const out = q(`.bento__slot[data-slot="${slotOf(tab)}"] .bento__view`);
    const into = q(`.bento__slot[data-slot="${slotOf(next)}"] .bento__view`);

    /* Behind a closed sheet nobody sees the crossfade — swap now, so the
       sheet slides up already holding its content. */
    if (instant) {
      gsap.killTweensOf([...out, ...into]);
      gsap.set(out, { autoAlpha: 0 });
      gsap.set(into, { autoAlpha: 1, clearProps: "transform" });
      setTabState(next);
      window.dispatchEvent(new CustomEvent("bento:tab", { detail: next }));
      return;
    }

    gsap.to(out, { autoAlpha: 0, y: -16, scale: 0.985, duration: 0.45, ease: "power3.in" });
    gsap.fromTo(
      into,
      { autoAlpha: 0, y: 24, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "expo.out", delay: 0.3, clearProps: "transform" },
    );
    setTabState(next);
    window.dispatchEvent(new CustomEvent("bento:tab", { detail: next }));
  };

  /* Anything picked from the menu. */
  const open = (next: Tab) => {
    const phone = window.matchMedia("(max-width: 900px)").matches;
    setTab(next, phone && !sheet);
    setSheet(true);
  };

  /* A chip in the stack queue opens that tool's page in the main panel. */
  const openTech = (name: string) => {
    setTech(name);
    open("stack");
  };

  /* "open it" from a tool page: go to Products, let the mosaic land,
     then press that project's tile — the normal grow-into-project. */
  const openProject = (slug: string) => {
    setTab("products");
    setTimeout(() => (document.getElementById(slug) as HTMLElement | null)?.click(), 1300);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${PROFILE.email}`;
    }
  };

  const mode = stage === "intro" ? "intro" : playerOpen ? "expanded" : "compact";

  return (
    <AdminProvider>
    <div className="bento" ref={root} data-tab={tab} data-stage={stage} data-sheet={sheet || undefined}>
      <Ambient />
      {intro ? (
        <section className="intro" aria-label="Intro">
          <span className="intro__corner intro__corner--tl" aria-hidden />
          <span className="intro__corner intro__corner--tr" aria-hidden />
          <span className="intro__corner intro__corner--bl" aria-hidden />

          <div className="intro__stage">
            <div className="intro__portrait">
              <span className="intro__circle" aria-hidden />
              <span className="intro__clip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="intro__photo" src="/ui/me.png" alt={PROFILE.name} draggable={false} />
              </span>
            </div>
            <h1 className="intro__line intro__hello">Hey! I&apos;m {PROFILE.name}</h1>
            <p className="intro__line intro__role">A UI/UX Designer, Frontend Developer</p>
          </div>

          <button className="intro__hint" onClick={() => reveal.current?.play()}>
            scroll. it doesn&apos;t bite
            <span aria-hidden />
          </button>
        </section>
      ) : null}

      <aside className="bento__aside">
        <div className="bento__top">
          <button className="bento__avatar" onClick={backToIntro} aria-label="Back to the intro">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/character.svg" alt="" draggable={false} />
          </button>
          <nav className="pills" aria-label="Sections">
            <button className="pill" data-active={tab === "info" || undefined} onClick={() => open("info")}>
              <span>board</span>
              <Plus />
            </button>
            <button className="pill" data-active={tab === "contact" || undefined} onClick={() => open("contact")}>
              <span>contact</span>
              <Plus />
            </button>
          </nav>
        </div>

        <section className="card bento__id">
          <h2 className="bento__name">{PROFILE.name}</h2>
          <p className="bento__role">A UI/UX Designer, Frontend Developer</p>
          <p className="bento__bio">
            40+ projects · 8+ organisations, REFILL and Rotary included. Design, motion, AI, web.
          </p>
        </section>

        <StackQueue active={tab === "stack" ? tech : null} onPick={openTech} />

        <nav className="card bento__nav" aria-label="Work">
          {NAV.map(({ tab: t, label }) => (
            <button key={t} className={`tile tile--${t}`} data-active={tab === t || undefined} onClick={() => open(t)}>
              <TileGlyph tab={t} />
              <span className="tile__label">{label}</span>
            </button>
          ))}
        </nav>

        <footer className="card bento__foot">
          <button className="mail" onClick={copyEmail} title={PROFILE.email}>
            <span>{copied ? "copied!" : PROFILE.email}</span>
            {copied ? <Check size={13} /> : <Clipboard size={13} />}
          </button>
          <div className="socials">
            <a href={PROFILE.github} aria-label="GitHub" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.82 1.19 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg>
            </a>
            {PROFILE.linkedin ? (
              <a href={PROFILE.linkedin} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" /></svg>
              </a>
            ) : null}
            {PROFILE.instagram ? (
              <a href={PROFILE.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 2.2c-2.7 0-3 0-4 .06-3.9.18-5.6 2-5.8 5.8C2.2 9 2.2 9.3 2.2 12s0 3 .06 4c.18 3.9 1.9 5.6 5.8 5.8 1 .05 1.3.06 4 .06s3 0 4-.06c3.9-.18 5.6-1.9 5.8-5.8.05-1 .06-1.3.06-4s0-3-.06-4C21.6 4.2 19.9 2.4 16 2.3c-1-.06-1.3-.06-4-.06Z" /></svg>
              </a>
            ) : null}
          </div>
        </footer>
      </aside>

      <main className="bento__main">
        <button className="bento__sheet-x" onClick={() => setSheet(false)} aria-label="Close">
          <span aria-hidden />
        </button>
        <button className="bento__sheet-close" onClick={() => setSheet(false)}>
          ← menu
        </button>
        <div className="bento__slot" data-slot="info" data-on={tab === "info" || undefined}>
          <div className="bento__view">
            <Corkboard active={revealed && tab === "info"} />
          </div>
        </div>

        <div className="bento__slot" data-slot="contact" data-on={tab === "contact" || undefined}>
          <div className="bento__view contact">
            <p className="contact__kicker">contact</p>
            <h2 className="contact__title">say hi. I reply faster than my code compiles.</h2>
            <button className="contact__mail" onClick={copyEmail}>
              {PROFILE.email}
              <span>{copied ? "copied!" : "click to copy"}</span>
            </button>
            <ContactForm />
            <p className="contact__meta">
              based in {PROFILE.location} ·{" "}
              <a href={PROFILE.github} target="_blank" rel="noopener noreferrer">github</a> ·{" "}
              <a href={PROFILE.resume} download="Rohan-Singh-Resume.pdf">résumé (pdf)</a>
            </p>
          </div>
        </div>

        <div className="bento__slot" data-slot="products" data-on={tab === "products" || undefined}>
          <div className="bento__view bento__view--products">{children}</div>
        </div>

        <div className="bento__slot" data-slot="stack" data-on={tab === "stack" || undefined}>
          <div className="bento__view">
            <StackView name={tech} active={tab === "stack"} onOpen={openProject} />
          </div>
        </div>

        <div className="bento__slot" data-slot="projects" data-on={tab === "projects" || undefined}>
          <div className="bento__view">
            <Dashboard stats={stats} active={tab === "projects"} onOpen={openProject} />
          </div>
        </div>

        <div className="bento__slot" data-slot="profile" data-on={tab === "profile" || undefined}>
          <div className="bento__view">
            <Profile active={tab === "profile"} />
          </div>
        </div>

        <div className="bento__slot" data-slot="gallery" data-on={tab === "gallery" || undefined}>
          <div className="bento__view">
            <Gallery kind="gallery" active={tab === "gallery"} />
          </div>
        </div>

        <div className="bento__slot" data-slot="social" data-on={tab === "social" || undefined}>
          <div className="bento__view">
            <Gallery kind="social" active={tab === "social"} />
          </div>
        </div>

        <Player tracks={tracks} mode={mode} onToggle={setPlayerOpen} />
      </main>

    </div>
    </AdminProvider>
  );
}

const slotOf = (t: Tab) => t;
