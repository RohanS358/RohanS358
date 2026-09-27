import gsap from "gsap";
import { Page, type PageOptions } from "../core/Page";

/** Below this the rail turns vertical; a phone has no room to travel sideways. */
const MOBILE = 768;
/* The stylesheet switches to the vertical rail on the WINDOW width, so
   the JS must ask the same question. Measuring the panel instead (it's
   narrower than the window inside the bento) runs the phone maths on a
   desktop layout: zero travel, and the title slides off on its own. */
let phone: MediaQueryList | undefined;
const isMobile = () => (phone ??= window.matchMedia(`(max-width: ${MOBILE}px)`)).matches;

/** Wheel distance past an end, in px, before the panel takes it as "leave". */
const OVERSCROLL = 10;

/** Shared duration for the project exit UI, matching the mosaic motion. */
export const EXIT_FADE = 0.6;
/** Shared by page entrances, exits, and the return handoff. */
export const TRANSITION_EASE = "expo.inOut";

/**
 * A case study, read sideways.
 *
 * The content is a single wide strip moved with a per-frame lerp rather
 * than native scrolling: the rail has to be readable as one continuous
 * surface, with parallax inside individual panels, and native scroll
 * gives no frame hook to drive that from.
 *
 * Running out of strip at either end and pushing further closes the
 * page. That is the primary way out — the close button is the
 * affordance, but the gesture is the one that gets used.
 */
export class Project extends Page {
  private scroll = { current: 0, target: 0, last: 0, lerp: 0.1 };
  private touch = { x: { start: 0, end: 0 }, y: { start: 0, end: 0 }, down: false, distance: 0 };
  private closing = false;
  private closableStart = false;
  private closableEnd = false;

  private width = 0;
  private height = 0;

  /** Phone: how far the title slides sideways, and the last scrollTop drawn. */
  private travel = 0;
  private lastTop = -1;

  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      classes: { active: "project--active" },
      element: ".project",
      elements: {
        close: ".project__close",
        wrapper: ".project__wrapper",
        content: ".project__content",
        header: ".project__sections__header",
        /* The title panel doubles as the mobile "highlight", which
           travels on its own axis as the rail moves. */
        highlight: ".project__header",
        title: ".project__header__title",
        highlightWrapper: ".project__header__wrapper",
        buttonNext: ".project__button--next",
        buttonNextArrow: ".project__button--next .project__button__arrow",
        buttonPrevious: ".project__button--previous",
        buttonPreviousArrow: ".project__button--previous .project__button__arrow",
        /* Both the title panel and the sections: navigation steps
           between these, so they are one ordered list. */
        sections: ".project__header, .project__sections__section",
        scrollables: ".project__sections__section--scrollable",
        videos: "video",
        images: "img",
      },
    });
  }

  create() {
    super.create();

    this.scroll = { current: 0, target: 0, last: 0, lerp: 0.1 };
    this.closing = false;

    /* Hang each arrow off its button so the move handler can reach it
       from the event target alone. */
    for (const side of ["Previous", "Next"] as const) {
      const button = this.one(`button${side}`) as (HTMLElement & { arrow?: Element }) | null;
      const arrow = this.one(`button${side}Arrow`);
      if (button && arrow) button.arrow = arrow;
    }

    /* Videos play only while on screen. A dozen looping clips decoding
       off-screen is the difference between a smooth rail and a stuttering
       one. */
    this.observer = new IntersectionObserver((entries) => {
      for (const { isIntersecting, target } of entries) {
        const video = target as HTMLVideoElement;
        if (isIntersecting) {
          video.currentTime = 0;
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
    for (const video of this.list("videos")) this.observer.observe(video);

    /* An image arriving late changes the strip's width, and the rail's
       travel limit is derived from it. */
    for (const image of this.list("images")) {
      (image as HTMLImageElement).onload = this.onResize;
    }

    const wrapper = this.one("wrapper");
    if (wrapper) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(wrapper);
    }

    /* Measure now rather than waiting for a resize: the wheel handler
       is already live and reads `width` to decide whether a scroll runs
       off the end of the strip. */
    this.onResize();
  }

  async show(previous?: Page | null) {
    this.closing = false;
    const timeline = gsap.timeline();
    timeline.set(this.element, { autoAlpha: 1 });
    /* Keep reveal selectors hidden until the shared-element entrance has
       finished; the project tone is already visible during the handoff. */
    timeline.call(() => this.element.classList.add(this.classes.active));
    return super.show(previous, timeline);
  }

  async hide(next?: Page | null) {
    const timeline = gsap.timeline();
    const fading = [this.one("close"), this.one("content")].filter(Boolean);
    timeline.set(this.one("title"), { opacity: 1, visibility: "visible" });
    timeline.to(this.one("title"), {
      opacity: 0,
      duration: EXIT_FADE,
      ease: TRANSITION_EASE,
    });
    timeline.to(fading, {
      autoAlpha: 0,
      duration: EXIT_FADE,
      ease: TRANSITION_EASE,
    }, 0);
    /* The page's own tone fades out under the shrinking tile, so the
       colour drains away with it instead of vanishing in one frame when
       the stale page is removed at the end. */
    timeline.to(this.element, { autoAlpha: 0, duration: 0.9, ease: "power2.inOut" }, 0.15);
    timeline.call(() => this.element.classList.remove(this.classes.active));
    return super.hide(next, timeline);
  }

  /** How far the strip can travel before it runs out. */
  private get limit() {
    if (!isMobile()) {
      const content = this.one("content");
      return Math.max(0, (content?.getBoundingClientRect().width ?? 0) - this.width);
    }
    const wrapper = this.one("wrapper");
    return Math.max(0, (wrapper?.getBoundingClientRect().height ?? 0) - this.height);
  }

  private close() {
    if (this.closing) return;
    this.closing = true;
    (this.one("close") as HTMLElement | null)?.click();
  }

  private onWheel = (e: WheelEvent) => {
    /* A strip with no travel cannot be overscrolled out of.

       Without this the page closes on the first wheel event it ever
       sees: before the first resize `width` is 0, so `limit` is 0 too,
       and the at-the-end test is trivially true. */
    /* A phone scrolls natively; nothing to drive. */
    if (isMobile()) return;
    const limit = this.limit;
    if (limit <= 0) return;

    const atStart = this.scroll.current <= OVERSCROLL && this.scroll.target <= 0 && e.deltaY < 0;
    const atEnd =
      this.scroll.current >= limit - OVERSCROLL && this.scroll.target >= limit && e.deltaY > 0;

    if (atStart || atEnd) this.close();
    this.scroll.target += e.deltaY;
  };

  private onTouchStart = (e: TouchEvent) => {
    if (isMobile()) return;
    this.touch.down = true;
    const [t] = e.touches;
    this.touch.x.start = t.clientX;
    this.touch.y.start = t.clientY;
    this.scroll.last = this.scroll.current;
    this.closableStart = this.scroll.current < OVERSCROLL;
    this.closableEnd = this.scroll.current > this.limit - OVERSCROLL;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.touch.down || isMobile()) return;
    const [t] = e.changedTouches;
    this.touch.x.end = t.clientX;
    this.touch.y.end = t.clientY;

    /* Track whichever axis the layout actually travels on, so a portrait
       phone reading a vertical rail responds to a vertical drag. The x3
       matches finger distance to strip distance. */
    this.touch.distance =
      this.width < this.height
        ? (this.touch.y.start - this.touch.y.end) * 3
        : (this.touch.x.start - this.touch.x.end) * 3;

    this.scroll.target = this.scroll.last + this.touch.distance;
  };

  private onTouchEnd = () => {
    if (!this.touch.down) return;
    this.touch.down = false;
    if (this.limit <= 0) return;
    /* A firm flick past either end leaves. The threshold is high enough
       that arriving at the end and stopping does not trigger it. */
    if (this.touch.distance < -500 && this.closableStart) this.close();
    if (this.touch.distance > 500 && this.closableEnd) this.close();
  };

  /**
   * Step to the neighbouring section.
   *
   * Navigation lands ON a panel rather than moving a fixed distance:
   * the rail is a sequence of full-screen boards, so stopping between
   * two of them would leave the reader looking at neither. Running off
   * either end closes the page, which makes the panels and the exit one
   * continuous gesture.
   */
  private step(back: boolean) {
    const sections = this.list("sections");
    if (!sections.length) return;

    /* The current panel is whichever one holds the viewport's centre —
       more robust than nearest-edge when panels differ in width. */
    const centre = this.scroll.current + this.width * 0.5;
    const index = sections.findIndex((el) => {
      const left = (el as HTMLElement).offsetLeft;
      return centre >= left && centre <= left + el.clientWidth;
    });

    const next = sections[index + (back ? -1 : 1)] as HTMLElement | undefined;
    if (!next) return this.close();

    gsap.to(this.scroll, { duration: 1, ease: "expo.out", target: next.offsetLeft });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.close();
    else if (e.key === "ArrowLeft") this.step(true);
    else if (e.key === "ArrowRight") this.step(false);
  };

  /* The arrow follows the cursor inside its edge zone. `layerX/Y` is
     relative to the button, which is exactly the offset wanted. */
  private onButtonMove = (e: MouseEvent) => {
    const button = e.currentTarget as HTMLElement & { arrow?: HTMLElement };
    if (!button.arrow) return;
    button.arrow.style.transform = `translate(${e.offsetX}px, ${e.offsetY}px)`;
  };

  private onButtonClick = (e: MouseEvent) => {
    const button = e.currentTarget as HTMLElement;
    this.step(button.classList.contains("project__button--previous"));
  };

  onResize() {
    super.onResize();
    /* The page lives inside the bento's main panel, so the panel — not
       the window — is the "viewport". The CSS reads the same numbers
       through --pw / --ph. */
    const el = this.element as HTMLElement | undefined;
    this.width = el?.clientWidth || window.innerWidth;
    this.height = el?.clientHeight || window.innerHeight;
    el?.style.setProperty("--pw", `${this.width}px`);
    el?.style.setProperty("--ph", `${this.height}px`);

    if (!isMobile()) {
      /* Each scrollable panel holds a tall image that pans vertically as
         the rail passes it. The panel is widened by the image's overhang
         so the pan has exactly as much rail to happen over. */
      for (const panel of this.list("scrollables")) {
        const el = panel as HTMLElement & {
          image?: HTMLElement;
          imageHeight?: number;
          bounds?: DOMRect & { limit?: number };
        };
        const frame = el.querySelector(".project__sections__media__item") as HTMLElement | null;
        const image = el.querySelector(
          ".project__sections__media__item__image, .project__sections__media__item__video",
        ) as HTMLElement | null;
        if (!frame || !image) continue;

        const overhang = image.clientHeight - frame.clientHeight;
        const gutter = (100 * this.height) / 1390;
        el.image = image;
        el.imageHeight = overhang;
        el.style.width = `${overhang + gutter * 2 + this.width}px`;
        const bounds = el.getBoundingClientRect() as DOMRect & { limit?: number };
        bounds.limit = bounds.width - this.width;
        el.bounds = bounds;
      }
    } else {
      /* Give the title panel enough height for its horizontal text to
         finish travelling before the next panel arrives. */
      const highlight = this.one("highlight") as HTMLElement | null;
      const wrapper = this.one("highlightWrapper") as HTMLElement | null;
      if (highlight && wrapper) {
        const w = wrapper.scrollWidth;
        this.travel = Math.max(0, w - this.width);
        highlight.style.height = `${this.travel + this.height}px`;
        this.lastTop = -1;
      }
    }
  }

  update() {
    super.update();
    if (isMobile()) return this.updatePhone();

    this.scroll.target = gsap.utils.clamp(0, this.limit, this.scroll.target);
    this.scroll.current = gsap.utils.interpolate(
      this.scroll.current,
      this.scroll.target,
      this.scroll.lerp,
    );
    /* Snap the tail of the lerp: an asymptote that never lands leaves a
       transform at 0.003px forever and keeps the layer promoted. */
    if (Math.abs(this.scroll.current) < 0.01) this.scroll.current = 0;

    const content = this.one("content") as HTMLElement | null;
    if (!content) return;

    if (!isMobile()) {
      content.style.transform = `translate3d(-${this.scroll.current}px, 0, 0)`;

      /* The section header sticks: it holds at the left edge while its
         section passes, instead of scrolling away with it. */
      const header = this.one("header") as HTMLElement | null;
      if (header) {
        const offset = Math.max(this.scroll.current - header.offsetLeft, 0);
        header.style.transform = `translate3d(${offset}px, 0, 0)`;
      }

      for (const panel of this.list("scrollables")) {
        const el = panel as HTMLElement & {
          image?: HTMLElement;
          imageHeight?: number;
          bounds?: DOMRect & { limit?: number };
        };
        if (!el.bounds || !el.image) continue;

        const travelled = gsap.utils.clamp(
          0,
          el.bounds.limit ?? 0,
          this.scroll.current - el.bounds.left,
        );
        const panned = gsap.utils.mapRange(
          0,
          el.bounds.limit || 1,
          0,
          el.imageHeight ?? 0,
          travelled,
        );
        (el.firstElementChild as HTMLElement).style.transform = `translateX(${travelled}px)`;
        el.image.style.transform = `translateY(-${panned}px)`;
      }
    }
  }

  /* A phone scrolls the page natively — the finger IS the scroll, with
     the OS's own momentum, instead of a lerp trailing behind it. All
     that's left to drive is the title turning the corner: its wrapper
     is sticky (CSS), and slides left as the page scrolls down. Nothing
     here reads layout, and nothing is written when nothing moved. */
  private updatePhone() {
    const top = (this.element as HTMLElement | undefined)?.scrollTop ?? 0;
    if (top === this.lastTop) return;
    this.lastTop = top;
    this.scroll.current = this.scroll.target = top;
    const wrapper = this.one("highlightWrapper") as HTMLElement | null;
    if (wrapper) wrapper.style.transform = `translate3d(-${Math.min(top, this.travel)}px, 0, 0)`;
  }

  addEventListeners() {
    for (const side of ["Previous", "Next"] as const) {
      const button = this.one(`button${side}`);
      if (!button) continue;
      this.listen(button, "mouseenter", this.onButtonMove as EventListener);
      this.listen(button, "mousemove", this.onButtonMove as EventListener);
      this.listen(button, "click", this.onButtonClick as EventListener);
    }

    this.listen(window, "wheel", this.onWheel as EventListener, { passive: true });
    this.listen(window, "keydown", this.onKeyDown as EventListener);
    this.listen(window, "touchstart", this.onTouchStart as EventListener, { passive: true });
    this.listen(window, "touchmove", this.onTouchMove as EventListener, { passive: true });
    this.listen(window, "touchend", this.onTouchEnd as EventListener);
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    super.destroy();
  }
}
