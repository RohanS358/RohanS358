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
  /**
   * The part worth reading: what's actually hard or unusual in here.
   * Three or four beats, each a fact from the source — not a feature list.
   */
  detail?: string[];
  /** Lines of tracked application source. Counted, not estimated. */
  loc?: number;
  /** Shown when the live link is down or gated, so a dead link isn't a mystery. */
  status?: string;
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
  linkedin: "https://www.linkedin.com/in/rohansinghcodes/",
  instagram: "https://www.instagram.com/r0han_slngh/",
  resume: "/resume.pdf",
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
    loc: 107582,
    featured: true,
    status: "Licensed to institutions — no public sign-up",
    detail: [
      "Geometry and behaviour are separate. A circle is a circle until you attach Rigid Body; then Matter.js runs it at 120 Hz with gravity and drag as page variables you edit mid-swing.",
      "Circuits are solved, not drawn: a modified nodal analysis engine handles R/L/C, diodes, op-amps and BJTs, and a separate digital solver runs gates to flip-flops with every pin live.",
      "The double-slit is a real Huygens–Fresnel phasor sum at 1 px = 1 µm, and in Play mode photons land one at a time at Born-rule positions — the fringes emerge from the wave equation, not a picture of one.",
      "A C++ interpreter runs inside the page so data structures animate as you step your own code, and a local AI agent builds pages from a description without anything leaving the machine.",
      "It ships as an institution platform: QR-paired classroom boards, per-student assignment copies, and a live opened → submitted → reviewed dashboard.",
    ],
  },
  {
    slug: "rover",
    name: "Rover",
    line: "An AI website builder for local businesses. It asks questions, then hands back a live site.",
    year: 2025,
    role: "Full-stack, AI integration",
    tech: ["React", "Vite", "Supabase", "Gemini"],
    live: "https://rover-theta.vercel.app",
    repo: "https://github.com/RohanS358/rover-ai-website-builder",
    shot: "/project_rover.png",
    commits: 44,
    loc: 9855,
    featured: true,
    detail: [
      "A six-step onboarding form — basics, contact, features, gallery, team, socials — is the entire input; the generated site renders from that row in Supabase at /:businessName.",
      "A FastAPI microservice backed by Gemini suggests copy while the owner is still filling the form, so the blank-page problem never arrives.",
      "Every generated site carries its own chat widget, so visitors ask about hours and services instead of phoning.",
      "Ships live as WebCraft, with an owner dashboard for visitor stats and a per-site QR code.",
    ],
  },
  {
    slug: "rotary",
    name: "Rotary Club",
    line: "A public site plus an admin CMS, built so volunteers can run it without ever calling me.",
    year: 2026,
    role: "Design and build",
    tech: ["Next.js", "Supabase", "React Three Fiber"],
    live: "https://rotary-steel.vercel.app",
    repo: "https://github.com/RohanS358/rotary-club-website",
    shot: "/project_rotary.png",
    commits: 16,
    loc: 18077,
    featured: true,
    detail: [
      "Built for the Rotary Club of Pashupati Kathmandu — District 3292, established 1998.",
      "Nothing on the public side is hardcoded: projects, board members, leadership messages, testimonials and stat counters all read from Supabase at request time.",
      "The admin dashboard covers projects, news, members and a treasury module, because the club's actual pain was finances, not publishing.",
      "A combined news-and-publications calendar and a gallery round out the public side.",
    ],
  },
  {
    slug: "saul",
    name: "Saul",
    line: "Local-first AI legal research. Agentic RAG that never lets a citation go unchecked — on your own hardware.",
    year: 2026,
    role: "Frontend, on a team of three",
    tech: ["Next.js", "FastAPI", "ChromaDB", "Ollama"],
    repo: "https://github.com/Adarsha-Shrestha/codeyatra2.0_MUNCHLAX_SAUL",
    shot: "/project_saul.png",
    detail: [
      "Built at CodeYatra 2.0 as team Munchlax; I took the Next.js frontend — chat interface, analytics dashboard, theme system.",
      "Five-stage agentic RAG: retrieve, rank, generate, judge, retry. A judge LLM scores every answer for grounding and hallucination, and anything under 7/10 is regenerated with that feedback, up to three times.",
      "Three isolated ChromaDB collections — statutes, past rulings, and the client's own case files — keep law and client data from contaminating each other.",
      "Law documents are chunked on Article and Section boundaries rather than token counts, so a citation never splits mid-provision.",
      "Everything runs on-premise through Ollama, because client case files are exactly the thing you cannot send to a cloud API.",
    ],
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
    tech: ["NestJS", "Prisma", "React", "OMR scanning"],
    live: "https://copaila-carbon-frontend.vercel.app",
    repo: "https://github.com/RohanS358/copaila-carbon-backend",
    shot: "/project_copaila.png",
    commits: 8,
    loc: 17128,
    detail: [
      "A GHG Protocol audit across Scope 1/2/3 and ten activity categories — electricity, generator and vehicle fuel, cooking fuel, refrigerants, commuting, paper, food, waste, water — normalised per student into a letter grade.",
      "Every data point is tagged Measured, Estimated or Default, and the report says what percentage of the total rests on each. A number you can't trust is labelled as such instead of being quietly averaged in.",
      "Schools without reliable internet print a bubble sheet: the API spawns a Python OMR scanner, parses the marks, and submits them as an audit. One device processes a whole school.",
      "Students get the other half — XP, an evolving pet, daily quests, a Duolingo-style lesson path and class/school/global leaderboards — because the audit data only improves if they engage with it.",
      "Bilingual English/Nepali throughout, including text-to-speech in the student portal.",
    ],
  },
  {
    slug: "bijulibatti",
    name: "Bijulibatti",
    line: "A smart electricity grid dashboard for Nepal — live meter maps and IoT load control.",
    year: 2026,
    role: "Design and frontend",
    tech: ["Next.js 16", "React 19", "Three.js"],
    live: "https://bijulibatti-smart-grid.vercel.app",
    repo: "https://github.com/RohanS358/bijulibatti-smart-grid",
    shot: "/project_bijulibatti.png",
    commits: 5,
    loc: 10597,
    detail: [
      "An interactive map of transformers and consumer meters, health colour-coded, drilling down into per-device metrics.",
      "Dynamic pricing that responds to live grid conditions — forecast rates and peak-shaving recommendations to move load off the peak.",
      "IoT device scheduling with automated load shedding, which is the polite name for choosing what turns off before the grid decides for you.",
      "The admin dashboard polls a Django API for active meters, consumption, peak demand and alerts; the marketing side is WebGL sphere and wave work in React Three Fiber.",
    ],
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
    loc: 419,
    detail: [
      "Every body attracts every other by Newton's law — orbits, binaries and slingshots emerge from the force calculation rather than being scripted paths.",
      "Collisions conserve momentum and merge masses, and bodies evolve by mass alone: past 700 a planet becomes a star, 3,500 a neutron star, 17,500 a black hole.",
      "The real G is in the source next to the scaled one actually used, because 6.674e-11 produces forces far too small to see on a screen.",
      "Gravitational field vectors are sampled on a grid, so you can watch the field itself rather than only its effects.",
    ],
  },
  {
    slug: "refill",
    name: "Refill Nutrition",
    line: "A brand site with an inline CMS, so staff can change copy without a redeploy.",
    year: 2026,
    role: "Client work",
    tech: ["Next.js", "TypeScript", "Tailwind"],
    live: "https://refill-pied.vercel.app",
    repo: "https://github.com/RohanS358/refill-nutrition",
    shot: "/project_refill.png",
    commits: 13,
    loc: 14614,
    detail: [
      "Built for Refill Enterprises Pvt. Ltd. — a Kathmandu clinical nutrition company founded in 2020.",
      "Four product families carry their real chemistry: calcium citrate malate with a D₃ co-factor, leucine/glutamine/arginine amino acid profiles, triglyceride-bound EPA and DHA, and renal, hepatic and glycaemic metabolic formulations.",
      "Every section reads its copy through a text() helper with a default baked in, so an admin edit changes the page and a missing value still renders.",
      "The timeline is honest about status — founded, portfolio, devices marked done; sports nutrition active; domestic manufacturing still planned.",
    ],
  },
  {
    slug: "fraud",
    name: "Credit Fraud Detection",
    line: "RandomForest over 555K transactions, with SMOTE for the class imbalance that is the whole problem.",
    year: 2025,
    role: "Solo",
    tech: ["Python", "scikit-learn", "pandas"],
    repo: "https://github.com/RohanS358/credit-fraud-detection",
    commits: 3,
    detail: [
      "555,719 simulated transactions across 1,000 cardholders and 800 merchants, two years of data, IQR-filtered down to 373,641 rows.",
      "Features built from behaviour, not just the row: haversine distance from home, deviation from a card's average spend, rolling 24h and 7d counts, and a composite rule-based fraud score.",
      "RandomForest won at 99.92% accuracy — and the writeup says plainly that this means little when fraud is 0.1% of the data. The F1 of 0.37 is the honest number.",
      "Late-night hours (22:00–23:00) carried the clearest fraud signal; cardholder-to-merchant distance carried almost none.",
    ],
  },
  {
    slug: "hackforbusiness",
    name: "Hack for Business",
    line: "A blockchain local-business platform with wallets and loyalty, built in a weekend with two friends.",
    year: 2025,
    role: "Team of three",
    tech: ["Next.js 14", "Express", "MongoDB"],
    repo: "https://github.com/RohanS358/hack-for-business",
    commits: 33,
    status: "Live deployment currently down",
    detail: [
      "A blockchain written from scratch — block, chain, miner, wallet, transaction — mining to MongoDB with chain validation, rather than a token on someone else's network.",
      "Every user and business gets a wallet with a generated address and key; transfers are peer-to-peer and settle against that chain.",
      "Businesses issue and redeem loyalty credits across bronze to platinum tiers, with QR codes for the payment flow.",
      "Committed as-is after the hackathon, scratch files and all — Downloads/final is the working version, and the README says so rather than pretending otherwise.",
    ],
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
