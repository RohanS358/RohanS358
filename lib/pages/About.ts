import gsap from "gsap";
import { Page, type PageOptions } from "../core/Page";

/** The about page: a plain fade, deliberately. */
export class About extends Page {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      classes: { active: "about--active" },
      element: ".about",
      elements: { close: ".about__close" },
    });
  }

  async show(previous?: Page | null) {
    /* Coming from home means the mosaic is still clearing; waiting lets
       it finish rather than crossing through it. */
    const fromHome = previous?.element?.classList.contains("home");

    const timeline = gsap.timeline();
    timeline.set(this.element, { autoAlpha: 1, delay: fromHome ? 0.6 : 0 });
    timeline.call(() => this.element.classList.add(this.classes.active));

    return super.show(previous, timeline);
  }

  async hide(next?: Page | null) {
    const timeline = gsap.timeline();
    timeline.to(this.element, { autoAlpha: 0, duration: 0.4 });
    return super.hide(next, timeline);
  }
}
