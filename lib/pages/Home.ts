import gsap from "gsap";
import { Page, type PageOptions } from "../core/Page";
import { TRANSITION_EASE } from "./Project";

/** How many authored layouts exist as `.home--N` rules in the stylesheet. */
export const LAYOUTS = 6;

/** Seconds a composition holds before the next one. */
const DWELL = 2;

/** The shared curve. Every move on this page runs on it. */
const EASE = TRANSITION_EASE;

/** Set on <html> while a tile is growing into, or shrinking out of, a
    project — a hook for anything that wants to react to the handoff. */
const EXPANDING = "is-expanding";

/** The slot's corner radius, which the growing tile lands on. */
const PANEL_RADIUS = 18;

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
 *
 * It lives in the bento's Products slot. Geometry is authored in `em`,
 * and `onResize` sets the font-size that fits the whole canvas into the
 * slot, so the mosaic scales to the panel rather than the viewport.
 * It only plays while Products is the open tab (`bento:tab`).
 */
export class Home extends Page {
  /** Which layout is showing. */
  private index = 0;
  /** The pending advance, so hover can cancel it. */
  private rotation: gsap.core.Tween | null = null;
  /** The block that was clicked, animated into the project page. */
  private openingId: string | null = null;
  /** Whether the mosaic is currently on screen. */
  private shown = false;
  /** The last tab the bento announced. The event fires before React
      commits the new `data-tab`, so the DOM can't be trusted then. */
  private tab: string | null = null;

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      classes: { animating: "home--animating" },
      element: ".home",
      elements: {
        media: ".home__media",
        links: ".home__media__element",
      },
    });
  }

  /** Products is the open tab — or there is no bento around us at all. */
  private get active() {
    const tab = this.tab ?? document.querySelector(".bento")?.getAttribute("data-tab");
    return tab == null || tab === "products";
  }

  async show(previous?: Page | null) {
    /* `openingId` was set by `onOpen` when this same instance was last
       hidden, and survives the round trip through Project because Home
       is created once and reused — it names the tile to shrink back
       into, not whatever `previous` happens to be. Read it before
       clearing it: this call IS the return trip that consumes it. */
    const incomingId = this.openingId;
    this.openingId = null;

    /* Mounted behind another tab: stay hidden until Products opens. */
    if (!incomingId && !this.active) {
      this.stopRotation();
      return;
    }

    this.shown = true;
    const blocks = this.list("links");
    gsap.killTweensOf(blocks);

    /* Suppress the per-block CSS transition for the length of the
       entrance: the blocks are being placed by GSAP here, and leaving
       the transition on means every tween fights a CSS animation of the
       same property. */
    this.element.classList.add(this.classes.animating);
    if (incomingId) document.documentElement.classList.add(EXPANDING);

    await this.randomize();

    const timeline = gsap.timeline({
      onComplete: () => {
        this.element.classList.remove(this.classes.animating);
        document.documentElement.classList.remove(EXPANDING);
      },
    });

    timeline.set(this.element, { autoAlpha: 1 });

    const media = this.one("media");
    const bounds = media?.getBoundingClientRect();
    /* The tile grows into the panel it sits in, not the whole screen:
       `.home` fills the Products slot, which is where the project opens. */
    const panel = this.element.getBoundingClientRect();

    for (const block of blocks) {
      const el = block as HTMLElement;

      if (el.id && el.id === incomingId && bounds) {
        /* The block we came back from: it currently fills the panel, so
           it shrinks back into its cell. Reversing the open makes the
           return read as the same motion played backwards rather than a
           new page appearing. */
        timeline.from(
          el,
          {
            borderRadius: PANEL_RADIUS,
            clearProps: "height,width",
            duration: 1,
            ease: EASE,
            height: panel.height,
            pointerEvents: "none",
            width: panel.width,
            x: panel.x - bounds.x - el.offsetLeft,
            y: panel.y - bounds.y - el.offsetTop,
            onComplete: () => gsap.set(el, { clearProps: "all" }),
          },
          0,
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
          0,
        );
      }
    }

    return super.show(previous, timeline);
  }

  async hide(next?: Page | null) {
    this.stopRotation();
    this.shown = false;
    const blocks = this.list("links");
    gsap.killTweensOf(blocks);

    /* Let the cancelled rotation and any class change settle before
       measuring: a rect read in the same frame as a layout swap is the
       old layout's. */
    await new Promise((resolve) => requestAnimationFrame(resolve));

    if (this.openingId) document.documentElement.classList.add(EXPANDING);

    const timeline = gsap.timeline();
    const media = this.one("media");
    const bounds = media?.getBoundingClientRect();
    /* The tile grows into the panel it sits in, not the whole screen:
       `.home` fills the Products slot, which is where the project opens. */
    const panel = this.element.getBoundingClientRect();

    for (const block of blocks) {
      const el = block as HTMLElement;

      if (el.id && el.id === this.openingId && bounds) {
        /* The clicked block becomes the project page: it grows to fill
           the panel from exactly where it sits, so the thing the
           reader pressed is the thing that opens. */
        timeline.to(
          el,
          {
            borderRadius: PANEL_RADIUS,
            duration: 1,
            ease: EASE,
            height: panel.height,
            transition: "none",
            width: panel.width,
            x: panel.x - bounds.x - el.offsetLeft,
            y: panel.y - bounds.y - el.offsetTop,
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

  /** Fit the em-authored canvas into whatever box the slot gives us. */
  onResize() {
    super.onResize();
    const media = this.one("media") as HTMLElement | null;
    if (!media || !this.element) return;
    media.style.fontSize = "1px";
    const w = media.offsetWidth;
    const h = media.offsetHeight;
    const box = this.element.getBoundingClientRect();
    if (!w || !h || !box.width) return;
    media.style.fontSize = `${Math.min((box.width * 0.86) / w, (box.height * 0.8) / h)}px`;
  }

  /* Hovering holds the composition still: the cycle exists to be looked
     at, and moving out from under a cursor that is reading a block is
     the one time it should not advance. */
  private onMouseEnter = () => this.stopRotation();

  private onMouseLeave = () => {
    if (!this.shown) return;
    this.stopRotation();
    this.rotation = gsap.delayedCall(DWELL, () => this.randomize());
  };

  private onOpen = (e: Event) => {
    this.openingId = (e.currentTarget as HTMLElement).id;
  };

  /* The bento's tabs: assemble on Products, scatter on leaving it. */
  private onTab = (e: Event) => {
    const tab = (e as CustomEvent<string>).detail;
    this.tab = tab;
    if (tab === "products" && !this.shown) {
      this.onResize();
      void this.show(null);
    } else if (tab !== "products" && this.shown) {
      void this.hide(null);
    }
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
    this.listen(window, "bento:tab", this.onTab);
  }

  destroy() {
    this.stopRotation();
    super.destroy();
  }
}
