import { Component } from "../core/Component";

/**
 * Reveals its element once it enters the viewport.
 *
 * The class does nothing but set an attribute; the fade lives in CSS
 * (`[data-title]`, `[data-description]`, `[data-media]`). Splitting it
 * that way means the timing is tunable in the stylesheet next to the
 * rest of the motion, and the observer never touches style directly.
 *
 * `attribute` is the marker to set, so one class serves all three kinds
 * rather than three near-identical ones.
 */
export class Reveal extends Component {
  private observer: IntersectionObserver | null = null;
  private attribute: string;

  constructor({ element, attribute }: { element: Element; attribute: string }) {
    super({ element, autoMount: false });
    this.attribute = attribute;
    this.create();
  }

  create() {
    super.create();
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.setAttribute(this.attribute, "");
        else entry.target.removeAttribute(this.attribute);
      }
    });
    this.observer.observe(this.element);
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    super.destroy();
  }
}

/** The three markers, as the page's dataset list wants them. */
export const REVEALS = [
  { selector: "[data-title]", attribute: "data-title-active" },
  { selector: "[data-description]", attribute: "data-description-active" },
  { selector: "[data-media]", attribute: "data-media-active" },
] as const;
