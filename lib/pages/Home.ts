import gsap from "gsap";
import { Page, type PageOptions } from "../core/Page";
import { HEADER_FADE, TRANSITION_EASE } from "./Project";

/** How many authored layouts exist as `.home--N` rules in the stylesheet. */
export const LAYOUTS = 6;

/** Seconds a composition holds before the next one. */
const DWELL = 2;

/** The shared curve. Every move on this page runs on it. */
const EASE = TRANSITION_EASE;

/**
 * The mosaic.
 *
 * The layouts are NOT computed here. Each is a `.home--N` rule in the
 * stylesheet that positions all eleven blocks, and this class only swaps
 * which class the container wears. That is the whole cycle.
 *
 * Keeping them in CSS is what makes the rearrangement free: the blocks
 * carry a transition, so changing the class animates every one of them
 * without a single per-frame calculation. It also means a layout can do
 * anything CSS can — overlap, bleed off the edge, any corner radius —
 * without the JS knowing what a layout is.
 */
export class Home extends Page {
  /** Which layout is showing. */
  private index = 0;
  /** The pending advance, so hover can cancel it. */
  private rotation: gsap.core.Tween | null = null;
  /** The block that was clicked, animated into the project page. */
  private openingId: string | null = null;

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      classes: { animating: "home--animating" },
      element: ".home",
      elements: {
        media: ".home__media",
        links: ".home__media__element",
        link: ".home__link",
      },
    });
  }

  async show(previous?: Page | null) {
    /* `openingId` was set by `onOpen` when this same instance was last
       hidden, and survives the round trip through Project because Home
       is created once and reused — it names the tile to shrink back
       into, not whatever `previous` happens to be. Read it before
       clearing it: this call IS the return trip that consumes it. */
    const incomingId = this.openingId;
    this.openingId = null;

    /* Suppress the per-block CSS transition for the length of the
       entrance: the blocks are being placed by GSAP here, and leaving
       the transition on means every tween fights a CSS animation of the
       same property. */
    this.element.classList.add(this.classes.animating);

    await this.randomize();

    const returnDelay = previous?.element?.classList.contains("project") ? HEADER_FADE : 0;
    const timeline = gsap.timeline({
      onComplete: () => this.element.classList.remove(this.classes.animating),
    });

    timeline.set(this.element, { autoAlpha: 1 }, returnDelay);
    timeline.fromTo(
      this.one("link"),
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 1, ease: EASE },
      returnDelay,
    );

    const media = this.one("media");
    const bounds = media?.getBoundingClientRect();

    for (const block of this.list("links")) {
      const el = block as HTMLElement;

      if (el.id && el.id === incomingId && bounds) {
        /* The block we came back from: it is currently full-screen, so
           it shrinks back into its cell. Reversing the open makes the
           return read as the same motion played backwards rather than a
           new page appearing. */
        timeline.from(
          el,
          {
            borderRadius: 0,
            clearProps: "height,width",
            duration: 1,
            ease: EASE,
            height: "100vh",
            pointerEvents: "none",
            width: "100vw",
            x: -bounds.x - el.offsetLeft,
            y: -bounds.y - el.offsetTop,
            onComplete: () => gsap.set(el, { clearProps: "all" }),
          },
          returnDelay,
        );
      } else {
        /* Everything else pops in from nothing, each on its own random
           offset so the grid assembles rather than appearing at once. */
        timeline.fromTo(
          el,
          { scale: 0, transition: "none" },
          {
            delay: gsap.utils.random(0, 0.4, true),
            duration: 0.6,
            ease: EASE,
            scale: 1,
            onComplete: () => gsap.set(el, { clearProps: "all" }),
          },
          returnDelay,
        );
      }
    }

    return super.show(previous, timeline);
  }

  async hide(next?: Page | null) {
    this.stopRotation();

    /* Let the cancelled rotation and any class change settle before
       measuring: a rect read in the same frame as a layout swap is the
       old layout's. */
    await new Promise((resolve) => requestAnimationFrame(resolve));

    /* Leaving for About is not a shared-element move, so the grid gets
       one last rearrangement to land on before it goes. */
    if (next?.element?.classList.contains("about")) {
      await this.randomize(0);
      await new Promise((resolve) => gsap.delayedCall(0.6, resolve));
    }

    const timeline = gsap.timeline();
    timeline.to(this.one("link"), { autoAlpha: 0, duration: 1, ease: EASE });

    const media = this.one("media");
    const bounds = media?.getBoundingClientRect();

    for (const block of this.list("links")) {
      const el = block as HTMLElement;

      if (el.id && el.id === this.openingId && bounds) {
        /* The clicked block becomes the project page: it grows to fill
           the viewport from exactly where it sits, so the thing the
           reader pressed is the thing that opens. */
        timeline.to(
          el,
          {
            borderRadius: 0,
            duration: 1,
            ease: EASE,
            height: "100vh",
            transition: "none",
            width: "100vw",
            x: -bounds.x - el.offsetLeft,
            y: -bounds.y - el.offsetTop,
          },
          0,
        );

        /* The title text is already sized and positioned to match
           `.project__header__title` (see `.home__media__media` in
           globals.css) — it doesn't need its own tween. Growing the
           tile above is what reveals more of it; showing it here is
           only for the sliver of a frame before the tile's grow starts
           painting, so the reader never sees it clipped mid-tile. */
        const label = el.firstElementChild;
        if (label) timeline.set(label, { autoAlpha: 1, transition: "none" }, 0);
      } else {
        timeline.to(
          el,
          {
            delay: gsap.utils.random(0, 0.4, true),
            duration: 0.6,
            ease: EASE,
            transition: "none",
            scale: 0,
          },
          0,
        );
      }
    }

    return super.hide(next, timeline);
  }

  /**
   * Wear the next layout.
   *
   * Resolves on the frame after the class lands, so a caller that needs
   * to measure the new arrangement is not reading the old one.
   */
  randomize(to = gsap.utils.random(0, LAYOUTS - 1, 1)): Promise<void> {
    this.stopRotation();
    this.rotation = gsap.delayedCall(DWELL, () => this.randomize());

    this.element.classList.remove(`home--${this.index}`);
    this.index = to;

    return new Promise((resolve) => {
      this.element.classList.add(`home--${this.index}`);
      requestAnimationFrame(() => resolve());
    });
  }

  private stopRotation() {
    this.rotation?.kill();
    this.rotation = null;
  }

  /* Hovering holds the composition still: the cycle exists to be looked
     at, and moving out from under a cursor that is reading a block is
     the one time it should not advance. */
  private onMouseEnter = () => this.stopRotation();

  private onMouseLeave = () => {
    this.stopRotation();
    this.rotation = gsap.delayedCall(DWELL, () => this.randomize());
  };

  private onOpen = (e: Event) => {
    this.openingId = (e.currentTarget as HTMLElement).id;
  };

  addEventListeners() {
    const media = this.one("media");
    if (media) {
      this.listen(media, "mouseenter", this.onMouseEnter);
      this.listen(media, "mouseleave", this.onMouseLeave);
    }
    for (const block of this.list("links")) {
      this.listen(block, "click", this.onOpen);
    }
  }

  destroy() {
    this.stopRotation();
    super.destroy();
  }
}
