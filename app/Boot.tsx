"use client";

import { useEffect, useRef } from "react";
import { App } from "@/lib/core/App";
import { Home } from "@/lib/pages/Home";
import { About } from "@/lib/pages/About";
import { Project } from "@/lib/pages/Project";
import { Link } from "@/lib/components/Link";
import { Reveal, REVEALS } from "@/lib/components/Reveal";

/**
 * Where the class system takes over.
 *
 * React renders the markup once and then stays out of the way: from
 * here down the DOM belongs to App, which mutates it directly. That
 * division is deliberate — the animations move real nodes between
 * layouts and pages, and a re-render that replaced those nodes would
 * cut every tween mid-flight.
 *
 * So this component renders nothing. It boots the app on mount and
 * tears it down on unmount, and React never touches the subtree again.
 */
export default function Boot() {
  const app = useRef<App | null>(null);

  useEffect(() => {
    /* Guarded because Strict Mode mounts effects twice in development;
       without this the second pass builds a second App over the same
       DOM, and both drive their own RAF. */
    if (app.current) return;

    const instance = new App();
    app.current = instance;

    /* Shared by every page: the in-view reveals the stylesheet fades. */
    const datasets = REVEALS.map(({ selector, attribute }) => ({
      selector,
      create: (element: Element) => new Reveal({ element, attribute }),
    }));

    instance.mount([
      { template: "home", page: new Home({ datasets }) },
      { template: "about", page: new About({ datasets }) },
      { template: "project", page: new Project({ datasets }) },
    ]);

    /* Anchors are upgraded after mount so they can route through the
       app rather than reloading the document. */
    const links = [...document.querySelectorAll("a")].map((element) => {
      const link = new Link({ element });
      link.on("click", ((href: string) => void instance.navigate(href)) as never);
      return link;
    });

    /* Swapped pages add anchors after the initial mount. Delegate internal
       clicks so those links use the same animated router as the first page. */
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.classList.contains("skip")) return;

      const href = anchor.href;
      if (!href.startsWith(window.location.origin)) return;

      event.preventDefault();
      void instance.navigate(href);
    };
    document.addEventListener("click", onDocumentClick);

    return () => {
      document.removeEventListener("click", onDocumentClick);
      for (const link of links) link.destroy();
      instance.destroy();
      app.current = null;
    };
  }, []);

  return null;
}
