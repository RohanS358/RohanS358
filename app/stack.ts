import { PROJECTS, STACK } from "./content";

/**
 * Every tool Rohan has shipped with, and where.
 *
 * Built from the projects' own `tech` lists (plus the STACK list for the
 * tools no public project shows yet), so adding a project to content.ts
 * adds it here too. The "how" is never written by hand: it is the
 * project's own detail sentences that mention the tool.
 */

export type Use = {
  slug: string;
  name: string;
  year: number;
  role: string;
  line: string;
  notes: string[];
};

export type Tech = {
  name: string;
  /** simple-icons file in /public/stack, when one exists. */
  icon?: string;
  /** Brand colour for the logo and the accent in the detail view. */
  color: string;
  /** Words that count as a mention in a project's prose. */
  aliases: string[];
  uses: Use[];
};

/** Versions and flavours fold into one tool. */
const CANON: Record<string, string> = {
  "Next.js 14": "Next.js",
  "Next.js 16": "Next.js",
  "React 19": "React",
  Tailwind: "Tailwind CSS",
  Postgres: "PostgreSQL",
};

/** Techniques, not tools — they live in the project write-ups instead. */
const SKIP = new Set(["MNA solver", "OMR scanning"]);

const META: Record<string, { icon?: string; color: string; aliases?: string[] }> = {
  "Next.js": { icon: "nextdotjs", color: "#000000", aliases: ["next.js", "nextjs"] },
  React: { icon: "react", color: "#149eca", aliases: ["react"] },
  TypeScript: { icon: "typescript", color: "#3178c6" },
  "Tailwind CSS": { icon: "tailwindcss", color: "#06b6d4", aliases: ["tailwind"] },
  Vite: { icon: "vite", color: "#8f63ff" },
  Supabase: { icon: "supabase", color: "#3ecf8e" },
  Gemini: { icon: "googlegemini", color: "#8e75b2" },
  "Three.js": { icon: "threedotjs", color: "#000000", aliases: ["three.js", "webgl"] },
  "React Three Fiber": { icon: "threedotjs", color: "#000000", aliases: ["react three fiber", "r3f"] },
  FastAPI: { icon: "fastapi", color: "#009688" },
  Ollama: { icon: "ollama", color: "#000000", aliases: ["ollama", "local model", "local llm", "local ai"] },
  Python: { icon: "python", color: "#3776ab" },
  NestJS: { icon: "nestjs", color: "#e0234e", aliases: ["nest"] },
  Prisma: { icon: "prisma", color: "#2d3748" },
  "scikit-learn": { icon: "scikitlearn", color: "#f7931e", aliases: ["scikit", "sklearn"] },
  pandas: { icon: "pandas", color: "#150458" },
  Express: { icon: "express", color: "#000000" },
  MongoDB: { icon: "mongodb", color: "#47a248", aliases: ["mongo"] },
  PostgreSQL: { icon: "postgresql", color: "#4169e1", aliases: ["postgres"] },
  Redis: { icon: "redis", color: "#ff4438" },
  "Matter.js": { color: "#76f09b", aliases: ["matter.js", "rigid body"] },
  ChromaDB: { color: "#ff6446", aliases: ["chroma"] },
  Pygame: { color: "#5da02e" },
  Pymunk: { color: "#c9a227" },
};

const canon = (t: string) => CANON[t] ?? t;

function build(): Tech[] {
  const byName = new Map<string, Tech>();
  const get = (name: string) => {
    let t = byName.get(name);
    if (!t) {
      const meta = META[name] ?? { color: "#111111" };
      t = {
        name,
        icon: meta.icon,
        color: meta.color,
        aliases: [name.toLowerCase(), ...(meta.aliases ?? [])],
        uses: [],
      };
      byName.set(name, t);
    }
    return t;
  };

  for (const p of [...PROJECTS].sort((a, b) => b.year - a.year)) {
    for (const raw of p.tech) {
      if (SKIP.has(raw)) continue;
      const tech = get(canon(raw));
      if (tech.uses.some((u) => u.slug === p.slug)) continue;
      tech.uses.push({
        slug: p.slug,
        name: p.name,
        year: p.year,
        role: p.role,
        line: p.line,
        notes: (p.detail ?? []).filter((d) =>
          tech.aliases.some((a) => d.toLowerCase().includes(a)),
        ),
      });
    }
  }
  for (const s of STACK) get(canon(s));

  /* Most-used first: the queue leads with what he actually reaches for. */
  return [...byName.values()].sort((a, b) => b.uses.length - a.uses.length || a.name.localeCompare(b.name));
}

export const TECH = build();
