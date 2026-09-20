import { Component } from "../core/Component";

/**
 * An anchor the app navigates rather than the browser.
 *
 * Only same-origin links are intercepted. A mail, tel, or external link
 * is left alone and given `target="_blank"` with `rel="noopener"` —
 * without that rel the opened page gets a handle on this window.
 *
 * An anchor with `.skip` opts out entirely, which is how a link that
 * must do a real page load says so.
 */
export class Link extends Component {
  constructor({ element }: { element: Element }) {
    super({ element });
  }

  private onClick = (e: Event) => {
    e.preventDefault();
    this.emitter.emit("click", (this.element as HTMLAnchorElement).href);
  };

  addEventListeners() {
    const el = this.element as HTMLAnchorElement;
    if (el.classList.contains("skip")) return;

    const href = el.href ?? "";
    const internal = href.startsWith(window.location.origin);

    if (internal) {
      this.listen(el, "click", this.onClick);
    } else if (href && !href.startsWith("mailto") && !href.startsWith("tel")) {
      el.rel = "noopener noreferrer";
      el.target = "_blank";
    }
  }
}
