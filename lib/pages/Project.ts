import gsap from "gsap";
import { Page, type PageOptions } from "../core/Page";

/** Below this the rail turns vertical; a phone has no room to travel sideways. */
const MOBILE = 768;

/** Wheel distance past an end, in px, before the panel takes it as "leave". */
const OVERSCROLL = 10;

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
  }

  async show(previous?: Page | null) {
    this.closing = false;
    const timeline = gsap.timeline();
    timeline.call(() => this.element.classList.add(this.classes.active));
    timeline.set(this.element, { autoAlpha: 1 });
    return super.show(previous, timeline);
  }

  async hide(next?: Page | null) {
    const timeline = gsap.timeline();
    const fading = [this.one("close"), this.one("content")].filter(Boolean);
    timeline.to(fading, { autoAlpha: 0, duration: 0.4 });
    return super.hide(next, timeline);
  }

  /** How far the strip can travel before it runs out. */
  private get limit() {
    if (this.width > MOBILE) {
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
    const atStart = this.scroll.current <= OVERSCROLL && this.scroll.target <= 0 && e.deltaY < 0;
    const atEnd =
      this.scroll.current >= this.limit - OVERSCROLL &&
      this.scroll.target >= this.limit &&
      e.deltaY > 0;

    if (atStart || atEnd) this.close();
    this.scroll.target += e.deltaY;
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touch.down = true;
    const [t] = e.touches;
    this.touch.x.start = t.clientX;
    this.touch.y.start = t.clientY;
    this.scroll.last = this.scroll.current;
    this.closableStart = this.scroll.current < OVERSCROLL;
    this.closableEnd = this.scroll.current > this.limit - OVERSCROLL;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.touch.down) return;
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
    this.touch.down = false;
    /* A firm flick past either end leaves. The threshold is high enough
       that arriving at the end and stopping does not trigger it. */
    if (this.touch.distance < -500 && this.closableStart) this.close();
    if (this.touch.distance > 500 && this.closableEnd) this.close();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.close();
    else if (e.key === "ArrowLeft") this.scroll.target -= this.width * 0.65;
    else if (e.key === "ArrowRight") this.scroll.target += this.width * 0.65;
  };

  onResize() {
    super.onResize();
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    if (this.width > MOBILE) {
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
    }
  }

  update() {
    super.update();

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

    if (this.width > MOBILE) {
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
    } else {
      content.style.transform = `translate3d(0, -${this.scroll.current}px, 0)`;
    }
  }

  addEventListeners() {
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
