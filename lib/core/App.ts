import { Component } from "./Component";
import type { Dataset, Page } from "./Page";

/**
 * The application shell.
 *
 * It owns the three things that must be singular: the RAF loop, the
 * window listeners, and the current page. Everything else subscribes
 * through it. A component that starts its own RAF or listens to resize
 * directly is a component that keeps running after its page is gone.
 *
 * Navigation fetches the next route's HTML, lifts the `.app` element out
 * of it, and swaps the markup in place — the document is never
 * discarded, so the outgoing and incoming pages are both mounted for the
 * length of the transition and can animate against each other.
 */

export type Route = {
  template: string;
  page: Page;
};

export class App extends Component {
  /** The `.app` element whose `data-template` names the current route. */
  content!: HTMLElement;
  template!: string;

  pages = new Map<string, Page>();
  page!: Page;
  components: Component[] = [];

  /** Fetched markup by path, so a revisit does not hit the network. */
  private cache = new Map<string, string>();
  private fetching = false;
  private frame: number | null = null;

  mouse = {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    distance: { x: 0, y: 0 },
  };

  constructor() {
    super({ autoMount: false, autoListeners: false });
  }

  /** Point the app at its container and read the route it is showing. */
  mount(routes: Route[]) {
    /* Resolve the container BEFORE create(): create() wires the window
       listeners, and those handlers reach for `this.content`. */
    this.content = document.querySelector(".app") as HTMLElement;
    if (!this.content) {
      throw new Error("App needs a `.app` element to run inside.");
    }
    this.template = this.content.getAttribute("data-template") ?? "";

    super.create();

    for (const { template, page } of routes) this.pages.set(template, page);

    const page = this.pages.get(this.template);
    if (!page) throw new Error(`No page registered for template "${this.template}"`);
    this.page = page;
    this.page.create();

    this.onResize();
    this.update();

    void this.page.show(null);
  }

  /* ---------- Navigation ---------- */

  /**
   * Go to `href`.
   *
   * Guarded by `fetching` rather than by disabling links: a second click
   * mid-transition would otherwise start a parallel swap and leave two
   * outgoing pages animating over each other.
   */
  async navigate(href: string, pushState = true) {
    if (this.fetching) return;
    this.fetching = true;

    const path = href.replace(window.location.origin, "");

    try {
      let markup = this.cache.get(path);
      if (!markup) {
        const res = await window.fetch(path);
        markup = await res.text();
        this.cache.set(path, markup);
      }
      await this.swap(path, markup, pushState);
    } catch (e) {
      /* A failed fetch should not strand the app mid-navigation with
         `fetching` stuck true and every link dead. */
      console.error("Navigation failed:", e);
      this.fetching = false;
    }
  }

  private async swap(path: string, markup: string, pushState: boolean) {
    const parsed = document.createElement("div");
    parsed.innerHTML = markup;

    const incoming = parsed.querySelector(".app");
    if (!incoming) {
      this.fetching = false;
      throw new Error(`Response for ${path} has no .app element`);
    }

    const template = incoming.getAttribute("data-template") ?? "";
    const next = this.pages.get(template);
    if (!next) {
      this.fetching = false;
      throw new Error(`No page registered for template "${template}"`);
    }

    /* Append the new markup BEFORE removing the old: both are in the
       document for the transition, which is what allows a shared-element
       move between them. The old node is dropped after. */
    const holder = document.createElement("div");
    holder.innerHTML = incoming.innerHTML;
    this.content.setAttribute("data-template", template);
    this.content.appendChild(holder.firstElementChild as Node);

    window.scrollTo(0, 0);

    const previous = this.page;
    this.page = next;
    this.page.create();
    this.page.onResize();

    /* Opening a project is a handoff, not a crossfade: the tile-grow
       lives in Home.hide(), and Project.show() must not cut in until
       that has fully finished, or the project page appears over a tile
       still mid-flight. Closing runs the opposite way — the shrink-back
       lives in Home.show(), and Project.hide() only fades the text and
       chrome sitting on top of the still-full-screen tone. Those two
       need to run together: awaiting Project.hide() first would leave
       the shrink waiting behind a fade that has nothing left to reveal. */
    if (template === "project") {
      await previous.hide(this.page);
      await this.page.show(previous);
    } else if (this.template === "project") {
      await Promise.all([previous.hide(this.page), this.page.show(previous)]);
    } else {
      void this.page.show(previous);
      await previous.hide(this.page);
    }

    this.template = template;

    requestAnimationFrame(() => {
      this.page.onResize();
      // Drop the outgoing markup — it is the first child, the new one
      // was appended after it.
      const stale = this.content.firstElementChild;
      if (stale && this.content.children.length > 1) stale.remove();
      previous.destroy();
      this.fetching = false;
      if (pushState) window.history.pushState({}, "", path);
    });
  }

  onPopState = () => {
    void this.navigate(window.location.href, false);
  };

  /* ---------- Global input, fanned out ---------- */

  private point(e: MouseEvent | TouchEvent) {
    if ("touches" in e && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    const m = e as MouseEvent;
    return { x: m.clientX, y: m.clientY };
  }

  onMouseDown = (e: MouseEvent | TouchEvent) => {
    this.mouse.start = this.point(e);
    this.dispatch("onMouseDown", e);
  };

  onMouseMove = (e: MouseEvent | TouchEvent) => {
    this.mouse.end = this.point(e);
    this.mouse.distance = {
      x: this.mouse.start.x - this.mouse.end.x,
      y: this.mouse.start.y - this.mouse.end.y,
    };
    this.dispatch("onMouseMove", e);
  };

  onMouseUp = (e: MouseEvent | TouchEvent) => {
    this.dispatch("onMouseUp", e);
  };

  private dispatch(name: string, e: Event) {
    const payload = { originalEvent: e, mouse: this.mouse };
    type Handler = Record<string, ((p: unknown) => void) | undefined>;
    for (const c of this.components) (c as unknown as Handler)[name]?.(payload);
    (this.page as unknown as Handler)[name]?.(payload);
  }

  onResize = () => {
    /* One place sets the viewport height variable. Mobile browsers
       report a 100vh that includes the retracting toolbar, so layouts
       that must not jump read --100vh instead. */
    document.documentElement.style.setProperty("--100vh", `${window.innerHeight}px`);
    for (const c of this.components) (c as Component & { onResize?: () => void }).onResize?.();
    this.page?.onResize();
  };

  update = () => {
    this.page?.update();
    for (const c of this.components) (c as Component & { update?: () => void }).update?.();
    this.frame = requestAnimationFrame(this.update);
  };

  addEventListeners() {
    this.listen(window, "mousedown", this.onMouseDown as EventListener);
    this.listen(window, "mousemove", this.onMouseMove as EventListener);
    this.listen(window, "mouseup", this.onMouseUp as EventListener);
    this.listen(window, "touchstart", this.onMouseDown as EventListener, { passive: true });
    this.listen(window, "touchmove", this.onMouseMove as EventListener, { passive: true });
    this.listen(window, "touchend", this.onMouseUp as EventListener);
    this.listen(window, "resize", this.onResize);
    this.listen(window, "popstate", this.onPopState);
  }

  destroy() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    for (const page of this.pages.values()) page.destroy();
    this.pages.clear();
    super.destroy();
  }
}

export type { Dataset };
