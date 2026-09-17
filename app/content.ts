/**
 * Everything the site says, in one place.
 *
 * Rule: nothing here is invented. Every figure traces to the GitHub API,
 * the README, or a project's own docs. Unknowns are empty strings that
 * render as visible placeholders — never a plausible guess.
 */

export type Project = {
  slug: string;
  name: string;
  /** One line. What it is, said plainly. */
  line: string;
  year: number;
  role: string;
  /** Short list — three or four, not a logo wall. */
  tech: string[];
  live?: string;
  repo?: string;
  /** Screenshot in /public. Missing ones render as a labelled placeholder. */
  shot?: string;
  /** Verified lifetime commit count, public repos only. */
  commits?: number;
  featured?: boolean;
};

export const PROFILE = {
  name: "Rohan Singh",
  handle: "RohanS358",
  email: "rohan.nandu358@gmail.com",
  github: "https://github.com/RohanS358",
  location: "Bhaktapur, Nepal",
  /** Plain and specific. No "crafting digital experiences". */
  bio: "I'm a computer engineering student in Nepal who builds things that run — physics engines, circuit solvers, AI tools, and the occasional website with no reason to exist.",
  /** The one line that appears above the work. Everything else waits. */
  shortBio: "I build things that run — physics engines, circuit solvers, AI tools.",
  // TODO(rohan): send these and they light up automatically.
  linkedin: "",
  resume: "",
} as const;

export const PROJECTS: Project[] = [
  {
    slug: "simblip",
    name: "Simblip",
    line: "An engineering notebook that simulates. Draw a circle, tell it it's a rigid body, press play — it falls.",
    year: 2026,
    role: "Design, architecture, engineering",
    tech: ["Next.js", "Matter.js", "MNA solver", "Supabase"],
    live: "https://simblip.vercel.app",
    repo: "https://github.com/RohanS358/simblip",
    shot: "/project_simblip.png",
    commits: 509,
    featured: true,
  },
  {
    slug: "rover",
    name: "Rover",
    line: "An AI website builder for local businesses. It asks questions, then hands back a live site.",
    year: 2025,
    role: "Full-stack, AI integration",
    tech: ["Next.js", "Python", "Gemini"],
    live: "https://rover-theta.vercel.app",
    repo: "https://github.com/RohanS358/rover-ai-website-builder",
    commits: 44,
    featured: true,
  },
  {
    slug: "rotary",
    name: "Rotary Club",
    line: "A public site plus an admin CMS, built so volunteers can run it without ever calling me.",
    year: 2026,
    role: "Design and build",
    tech: ["Next.js", "Supabase"],
    live: "https://rotary-steel.vercel.app",
    repo: "https://github.com/RohanS358/rotary-club-website",
    commits: 16,
    featured: true,
  },
  {
    slug: "saul",
    name: "Saul",
    line: "Local-first AI legal research. Agentic RAG with multipass retrieval, running entirely on your own hardware.",
    year: 2026,
    role: "Everything",
    tech: ["Python", "Ollama", "Postgres", "Redis"],
    shot: "/project_saul.png",
  },
  {
    slug: "looni",
    name: "Looni",
    line: "An agentic assistant that actually operates your computer. You talk, it does things.",
    year: 2026,
    role: "Everything",
    tech: ["Python", "Ollama"],
    shot: "/project_looni.png",
  },
  {
    slug: "copaila",
    name: "CoPaila",
    line: "Carbon auditing for schools, except the students get virtual pets and XP for it.",
    year: 2026,
    role: "Frontend and backend",
    tech: ["NestJS", "Prisma", "OMR scanning"],
    live: "https://copaila-carbon-frontend.vercel.app",
    repo: "https://github.com/RohanS358/copaila-carbon-frontend",
    commits: 13,
  },
  {
    slug: "bijulibatti",
    name: "Bijulibatti",
    line: "A smart electricity grid dashboard for Nepal — live meter maps and IoT load control.",
    year: 2026,
    role: "Design and frontend",
    tech: ["Next.js", "TypeScript"],
    live: "https://bijulibatti-smart-grid.vercel.app",
    repo: "https://github.com/RohanS358/bijulibatti-smart-grid",
    commits: 5,
  },
  {
    slug: "orbital",
    name: "Orbital Physics Sim",
    line: "N-body gravity with real constants. Planets, black holes, neutron stars. Built to watch things orbit.",
    year: 2026,
    role: "Solo",
    tech: ["Python", "Pygame", "Pymunk"],
    repo: "https://github.com/RohanS358/orbital-physics-sim",
    commits: 3,
  },
  {
    slug: "refill",
    name: "Refill Nutrition",
    line: "A brand site with an inline CMS, so staff can change copy without a redeploy.",
    year: 2026,
    role: "Client work",
    tech: ["Next.js", "TypeScript"],
    live: "https://refill-pied.vercel.app",
    repo: "https://github.com/RohanS358/refill-nutrition",
    commits: 13,
  },
  {
    slug: "fraud",
    name: "Credit Fraud Detection",
    line: "RandomForest over 555K transactions, with SMOTE for the class imbalance that is the whole problem.",
    year: 2025,
    role: "Solo",
    tech: ["Python", "scikit-learn"],
    repo: "https://github.com/RohanS358/credit-fraud-detection",
    commits: 3,
  },
  {
    slug: "hackforbusiness",
    name: "Hack for Business",
    line: "A blockchain local-business platform with wallets and loyalty, built in a weekend with two friends.",
    year: 2025,
    role: "Team of three",
    tech: ["TypeScript", "EJS"],
    live: "https://spartans-hackforbusiness.vercel.app",
    repo: "https://github.com/RohanS358/hack-for-business",
    commits: 33,
  },
];

/**
 * Real repos with real descriptions. He actually named them this.
 * This is the personality section — found, not written.
 */
export const ASIDES: { name: string; note: string; href: string }[] = [
  {
    name: "mino",
    note: "An endless runner. Not a chrome dino. Legally distinct.",
    href: "https://rohans358.github.io/RohanS358/",
  },
  {
    name: "dontclick",
    note: "just dont",
    href: "https://github.com/RohanS358/dontclick",
  },
  {
    name: "diary",
    note: "my brain structure",
    href: "https://github.com/RohanS358/diary",
  },
  {
    name: "rice",
    note: "my rice",
    href: "https://github.com/RohanS358/rice",
  },
  {
    name: "nothing_she",
    note: "deded",
    href: "https://github.com/RohanS358/nothing_she",
  },
  {
    name: "ui",
    note: "a personal trial and error bank for ui components",
    href: "https://github.com/RohanS358/ui",
  },
];

export const STACK = [
  "TypeScript",
  "React",
  "Next.js",
  "Python",
  "NestJS",
  "Postgres",
  "Supabase",
  "Redis",
  "Ollama",
  "Three.js",
  "Matter.js",
  "scikit-learn",
];
