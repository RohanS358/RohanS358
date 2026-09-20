"use client";

import { useEffect, useRef } from "react";
import { App } from "@/lib/core/App";
import { Home } from "@/lib/pages/Home";
import { About } from "@/lib/pages/About";
import { Project } from "@/lib/pages/Project";
import { Link } from "@/lib/components/Link";

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

    instance.mount([
      { template: "home", page: new Home() },
      { template: "about", page: new About() },
      { template: "project", page: new Project() },
    ]);

    /* Anchors are upgraded after mount so they can route through the
       app rather than reloading the document. */
    const links = [...document.querySelectorAll("a")].map((element) => {
      const link = new Link({ element });
      link.on("click", ((href: string) => void instance.navigate(href)) as never);
      return link;
    });

    return () => {
      for (const link of links) link.destroy();
      instance.destroy();
      app.current = null;
    };
  }, []);

  return null;
}
