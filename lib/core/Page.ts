import type gsap from "gsap";
import { Component, type ComponentOptions } from "./Component";

/**
 * A route's view.
 *
 * Pages are created once and reused: `create()` re-resolves selectors
 * against whatever markup is currently mounted, so the same instance
 * serves every visit rather than being rebuilt. That is what lets a page
 * keep scroll state and listeners across navigations.
 *
 * `show()` and `hide()` resolve when their timeline finishes, so the
 * router can await one side of a transition and overlap the other.
 */

/** A component class the page instantiates for each matching element. */
export type Dataset = {
  selector: string;
  component: new (opts: { element: Element }) => Component;
};

export type PageOptions = ComponentOptions & {
  datasets?: Dataset[];
};

export class Page extends Component {
  /** Every child component this page owns, flattened for fan-out. */
  components: Component[] = [];
  protected datasets: Dataset[];

  constructor({ datasets = [], ...options }: PageOptions) {
    // Pages resolve their DOM in create(), which the router calls once
    // the new markup is in the document — mounting here would query an
    // element that is not there yet.
    super({ ...options, autoMount: false });
    this.datasets = datasets;
  }

  create() {
    super.create();
    this.components = [];
    this.createDatasets();
  }

  private createDatasets() {
    for (const { selector, component: Klass } of this.datasets) {
      const root = this.element ?? document;
      for (const element of root.querySelectorAll(selector)) {
        this.components.push(new Klass({ element }));
      }
    }
  }

  /**
   * Play the entrance.
   *
   * Subclasses build a timeline and pass it up; awaiting the tween
   * rather than a fixed delay means a retimed animation cannot leave the
   * router resolving early and overlapping the next page.
   */
  async show(_previous?: Page | null, timeline?: gsap.core.Timeline): Promise<void> {
    if (timeline) await timeline.play();
  }

  async hide(_next?: Page | null, timeline?: gsap.core.Timeline): Promise<void> {
    if (timeline) await timeline.play();
  }

  /* Lifecycle fan-out. The app drives one RAF and one set of window
     listeners; pages forward to their children so a component never
     subscribes to window on its own. */

  onResize() {
    for (const c of this.components) (c as Component & { onResize?: () => void }).onResize?.();
  }

  update() {
    for (const c of this.components) (c as Component & { update?: () => void }).update?.();
  }

  destroy() {
    for (const c of this.components) c.destroy();
    this.components = [];
    super.destroy();
  }
}
