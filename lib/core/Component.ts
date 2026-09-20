import { createEmitter, type Emitter, type Unsubscribe } from "./emitter";

/**
 * The base every page and widget extends.
 *
 * It exists to remove three chores that otherwise get rewritten in every
 * class: resolving selectors to elements, binding methods so they can be
 * passed straight to addEventListener, and carrying an emitter.
 *
 * Selectors are resolved once in `create()` rather than looked up at use
 * site, so a class states its DOM dependencies at the top as data and a
 * missing element shows up as `null` at construction instead of a
 * `querySelector(...) is null` somewhere in a handler.
 */

/** A selector, a live element, or a list of them. */
export type Target = string | Element | Window | NodeListOf<Element> | Element[];

export type ComponentOptions = {
  /** The component's own root. */
  element?: Target;
  /** Named selectors resolved onto `this.elements`. */
  elements?: Record<string, Target>;
  /** Class names this component toggles. Kept as data, never inlined. */
  classes?: Record<string, string>;
  /** Skip `addEventListeners()` during create. */
  autoListeners?: boolean;
  /** Skip `create()` in the constructor — subclasses that need to set up
      their own fields first call it themselves. */
  autoMount?: boolean;
  id?: string;
};

/** One resolved entry: an element, a list, or null when nothing matched. */
export type Resolved = Element | Window | Element[] | null;

export class Component {
  element!: Element;
  elements: Record<string, Resolved> = {};
  classes: Record<string, string>;
  id?: string;
  emitter!: Emitter;

  protected selector?: Target;
  protected selectors: Record<string, Target>;
  protected autoListeners: boolean;

  /** Unsubscribes and listener removals collected for `destroy()`. */
  protected teardown: Unsubscribe[] = [];

  constructor({
    autoListeners = true,
    autoMount = true,
    classes = {},
    element,
    elements,
    id,
  }: ComponentOptions = {}) {
    this.autoListeners = autoListeners;
    this.classes = classes;
    this.selector = element;
    this.selectors = elements ?? {};
    this.id = id;

    /* Bind every own method up front so `this.onResize` can be handed
       directly to addEventListener and still reach the instance — and,
       critically, so the SAME reference comes back later to remove it. */
    this.bindMethods();

    if (autoMount) this.create();
  }

  private bindMethods() {
    /* Walk from the most-derived prototype up, and bind each name only
       ONCE — the first definition found is the override that should win.
       Binding on every level instead would have a base-class method
       overwrite the subclass one that shadows it, which silently
       discards every override on the instance. */
    const bound = new Set<string>();
    let proto = Object.getPrototypeOf(this);

    while (proto && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === "constructor" || bound.has(key)) continue;
        const desc = Object.getOwnPropertyDescriptor(proto, key);
        /* Descriptor, not `this[key]` — reading a getter here would run
           it during construction, before its fields exist. */
        if (desc && typeof desc.value === "function") {
          bound.add(key);
          (this as Record<string, unknown>)[key] = desc.value.bind(this);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
  }

  create() {
    this.initElement(this.selector);
    this.initElements(this.selectors);
    this.emitter = createEmitter();
    if (this.autoListeners) this.addEventListeners();
  }

  private initElement(target?: Target) {
    if (!target) return;
    this.element =
      target instanceof Element ? target : (document.querySelector(target as string) as Element);
  }

  /**
   * Resolve each named selector.
   *
   * A selector matching exactly one node collapses to that node, and one
   * matching none becomes null — so `elements.close.addEventListener` is
   * the normal case and an empty list cannot silently do nothing.
   */
  private initElements(targets: Record<string, Target>) {
    this.elements = {};
    for (const [name, target] of Object.entries(targets)) {
      if (target === window) {
        this.elements[name] = window;
      } else if (target instanceof Element) {
        this.elements[name] = target;
      } else if (Array.isArray(target)) {
        this.elements[name] = target;
      } else if (target instanceof NodeList) {
        this.elements[name] = [...target] as Element[];
      } else {
        const root = this.element ?? document;
        const found = [...root.querySelectorAll(target as string)];
        this.elements[name] = found.length === 0 ? null : found.length === 1 ? found[0] : found;
      }
    }
  }

  /** Every resolved match for `name`, as a list, whatever the arity. */
  protected list(name: string): Element[] {
    const found = this.elements[name];
    if (!found || found === window) return [];
    return Array.isArray(found) ? found : [found as Element];
  }

  /** One resolved match, or null. */
  protected one(name: string): Element | null {
    const found = this.elements[name];
    if (!found || found === window) return null;
    return Array.isArray(found) ? (found[0] ?? null) : (found as Element);
  }

  /**
   * Listen, and remember how to stop.
   *
   * Everything registered through this is undone by `destroy()`, which is
   * what keeps a page that is created and torn down repeatedly from
   * stacking duplicate handlers on window.
   */
  protected listen<K extends keyof WindowEventMap>(
    target: Window | Element,
    type: K | string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(type as string, handler, options);
    this.teardown.push(() => target.removeEventListener(type as string, handler, options));
  }

  on(name: string, fn: (...args: never[]) => void): Unsubscribe {
    const off = this.emitter.on(name, fn);
    this.teardown.push(off);
    return off;
  }

  /** Subclasses override; `listen()` inside keeps teardown automatic. */
  addEventListeners() {}

  removeEventListeners() {
    for (const off of this.teardown) off();
    this.teardown = [];
  }

  destroy() {
    this.removeEventListeners();
  }
}
