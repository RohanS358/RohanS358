import { ASIDES, PROFILE, PROJECTS } from "./content";
import { TECH } from "./stack";

/**
 * The Profile tab's CV.
 *
 * LinkedIn blocks scraping (it serves a sign-up wall to anything not
 * logged in), so this is assembled from sources that can be checked:
 * the GitHub profile (school, location, site), content.ts (the work,
 * with its own clients and roles), and the Figma bio Rohan wrote.
 *
 * TODO(rohan): LinkedIn has the rest — dates, positions, certificates.
 * Export it (LinkedIn → More → Save to PDF) and fill `EDUCATION` dates,
 * `EXPERIENCE` and `CERTIFICATES` below. Empty lists simply don't render.
 */

export const LINKEDIN = "https://www.linkedin.com/in/rohansinghcodes/";
export const WEBSITE = "https://www.rohan-singh.com.np";

export const HEADLINE = "UI/UX Designer · Frontend Developer";

export const SUMMARY =
  "I turn ideas into experiences through design, motion, AI, and the web. With 40+ projects and experience working with 8+ social organizations, including REFILL and Rotary, I build things that look intentional, work beautifully, and leave an impact.";

/** A number worth bragging about, shown when the entry is hovered. */
export type Stat = { value: string; label: string };

export type Entry = {
  title: string;
  org: string;
  when?: string;
  where?: string;
  points?: string[];
  href?: string;
  stats?: Stat[];
};

/**
 * The measurable part of each project — every figure is from its own
 * write-up in content.ts (commit and line counts were counted, not
 * estimated). Keyed by slug.
 */
const PROJECT_STATS: Record<string, Stat[]> = {
  simblip: [
    { value: "509", label: "commits" },
    { value: "107,582", label: "lines of code" },
    { value: "120 Hz", label: "physics loop" },
  ],
  rotary: [
    { value: "18,077", label: "lines of code" },
    { value: "100%", label: "of the public site CMS-driven" },
    { value: "1998", label: "club founded" },
  ],
  copaila: [
    { value: "17,128", label: "lines of code" },
    { value: "10", label: "carbon-audit categories" },
    { value: "2", label: "languages, Nepali + English" },
  ],
  bijulibatti: [
    { value: "10,597", label: "lines of code" },
    { value: "5", label: "commits to ship it" },
  ],
  refill: [
    { value: "14,614", label: "lines of code" },
    { value: "4", label: "product families modelled" },
    { value: "0", label: "redeploys to change copy" },
  ],
  rover: [
    { value: "44", label: "commits" },
    { value: "9,855", label: "lines of code" },
    { value: "6", label: "onboarding steps → a live site" },
  ],
  saul: [
    { value: "5", label: "stage agentic RAG" },
    { value: "3", label: "isolated vector collections" },
    { value: "7/10", label: "grounding score to pass" },
  ],
  orbital: [
    { value: "4", label: "body types, planet → black hole" },
    { value: "419", label: "lines of Python" },
  ],
  fraud: [
    { value: "555,719", label: "transactions modelled" },
    { value: "99.92%", label: "accuracy" },
    { value: "0.37", label: "F1 — the honest number" },
  ],
  hackforbusiness: [
    { value: "33", label: "commits in a weekend" },
    { value: "4", label: "loyalty tiers" },
    { value: "3", label: "people on the team" },
  ],
};


export const EDUCATION: Entry[] = [
  {
    title: "Bachelor's in Computer Engineering",
    org: "Khwopa College of Engineering",
    where: "Bhaktapur, Nepal",
    when: "", // TODO(rohan): years
  },
  {
    title: "Secondary & Higher Secondary (+2)",
    org: "SOS Hermann Gmeiner School",
    where: "Sanothimi, Bhaktapur",
  },
  {
    title: "Primary school · up to class 5",
    org: "Apple International School",
  },
];

/**
 * Roles, from his event badges, with details confirmed online where the
 * web had them (Hult Prize at KhEC lists him as Campus Director).
 * TODO(rohan): years for each role.
 */
export const EXPERIENCE: Entry[] = [
  {
    title: "Hult Prize at Khwopa College of Engineering",
    org: "Campus Director · also Marketing Team Lead and Media Manager",
    stats: [
      { value: "3", label: "roles held on the team" },
      { value: "US$1M", label: "global prize the round feeds into" },
    ],
    points: [
      "Runs the campus round of the Hult Prize — the global student social-entrepreneurship challenge — at KhEC.",
    ],
  },
  {
    title: "Rotaract · District 3292",
    org: "International Service Chair · Service Project Chair",
    stats: [
      { value: "2", label: "chair portfolios" },
      { value: "3292", label: "Rotary district" },
    ],
    points: ["Held the club's service-project and international-service portfolios."],
  },
  {
    title: "Vibe-a-thon",
    org: "Organising team · KhEC IT Circle × Khwopa IT Circle",
    stats: [
      { value: "5", label: "day AI-stack bootcamp" },
      { value: "2", label: "college IT clubs co-running it" },
    ],
    points: ["A 5-day AI-stack bootcamp plus a mini hackathon — “build faster, smarter.”"],
  },
];

export const CERTIFICATES: Entry[] = [];

/** Work for real organisations — each one verifiable on this site. */
export const CLIENT_WORK: Entry[] = PROJECTS.filter((p) =>
  ["rotary", "refill", "copaila", "bijulibatti"].includes(p.slug),
).map((p) => ({
  title: p.name,
  org: p.role,
  when: String(p.year),
  points: [p.line, ...(p.detail?.slice(0, 1) ?? [])],
  href: p.live,
  stats: PROJECT_STATS[p.slug],
}));

/**
 * Every hackathon and competition from his badges, best result first.
 * Event details are from the organisers' own pages (see the source
 * comment on each); where the web had nothing, only the badge is used.
 * TODO(rohan): years for HAXX 3.0, IT Meet, veel and AR Treasure Hunt.
 */
export const HACKATHONS: Entry[] = [
  {
    // Pulchowk Campus LOCUS; NEA-partnered Energy Hackathon
    title: "LOCUS 2026 · NEA Energy Hackathon 9.0",
    org: "Finalist · team Error.log · Demand Side Management track",
    stats: [
      { value: "Finalist", label: "national energy hackathon" },
      { value: "9th", label: "edition of the hackathon" },
      { value: "4", label: "day event" },
    ],
    when: "2026",
    points: [
      "Finalist at the Nepal Electricity Authority's Energy Hackathon, a pre-event of LOCUS — the national tech festival run by students of Pulchowk Campus (IOE).",
    ],
  },
  {
    // unesco.org — "Nepal's first youth-designed school carbon footprint calculator built"
    title: "Hacking for a Carbon-Neutral Future · UNESCO",
    org: "Team LeafNode",
    stats: [
      { value: "Top 7", label: "of 28 youth teams" },
      { value: "1st", label: "youth-led hackathon of its kind in Nepal" },
      { value: "3", label: "day build" },
    ],
    when: "Jun 2026",
    points: [
      "Nepal's first youth-led hackathon for a school carbon-footprint calculator, run by UNESCO with Shequal Foundation and funded by the Royal Norwegian Embassy.",
      "Out of 28 youth teams from across the provinces, the top 7 went into the 3-day build (24–26 June) — LeafNode was in the room.",
    ],
  },
  {
    // codeyatra.hcoe.edu.np
    title: "CodeYatra 2.0",
    org: "Team Munchlax · frontend",
    stats: [
      { value: "48 h", label: "to build it" },
      { value: "5", label: "stage agentic RAG" },
      { value: "3", label: "people on the team" },
    ],
    when: "2026",
    points: [
      "48-hour hackathon by Himalaya College of Engineering's IT club. Built Saul — local-first agentic RAG for legal research; I did the Next.js chat, analytics and theme system.",
    ],
  },
  {
    // iimscollege.edu.np, turboline.ai
    title: "Turboline × IIMS International Hackathon 2025",
    org: "Participant",
    stats: [
      { value: "72 h", label: "sprint" },
      { value: "International", label: "teams across Asia" },
    ],
    when: "Jul 2025",
    points: [
      "A 72-hour sprint on AI for sports and media, 10–12 July, with Kathmandu teams in person and international teams remote.",
    ],
  },
  {
    title: "Hack for Business 2025",
    org: "Team Spartans · team of three",
    stats: PROJECT_STATS.hackforbusiness,
    when: "2025",
    points: ["A from-scratch blockchain loyalty platform for local businesses, built in a weekend."],
  },
  {
    // codeyatra2025.devpost.com
    title: "CodeYatra",
    org: "Team Mars",
    stats: [{ value: "48 h", label: "hackathon" }],
    when: "Feb 2025",
    points: ["The first CodeYatra — 48 hours at Himalaya College of Engineering, 9–11 February."],
  },
  { title: "HAXX 3.0", org: "Team Cob-Web" },
  {
    // itmeet.kucc.ku.edu.np
    title: "IT Meet · Kathmandu University",
    org: "Participant",
    points: ["KU Computer Club's annual national-level tech event."],
  },
  {
    // instagram.com/ar_treasurehunt.itmeet
    title: "AR Treasure Hunt · IT Meet",
    org: "Team Evil Geniuses",
    points: ["Billed as the biggest treasure hunt in Nepal — an augmented-reality hunt across the KU campus."],
  },
  { title: "“Innovating Today, Preserving Tomorrow” hackathon (?)", org: "Team Clueless Coders" },
  { title: "veel", org: "Participant" },
];

export const SKILLS = {
  design: ["UI/UX design", "Motion design", "Figma"],
  build: TECH.filter((t) => t.uses.length > 0).map((t) => t.name),
};

export const CONTACT = {
  email: PROFILE.email,
  location: PROFILE.location,
  github: PROFILE.github,
  linkedin: LINKEDIN,
  website: WEBSITE,
};

export const SOCIALS = [
  { name: "GitHub", handle: "RohanS358", href: PROFILE.github, icon: "github" },
  { name: "LinkedIn", handle: "rohansinghcodes", href: PROFILE.linkedin, icon: "linkedin" },
  { name: "Instagram", handle: "@r0han_slngh", href: PROFILE.instagram, icon: "instagram" },
].filter((s) => s.href);

/** What he's on right now — both facts from his GitHub profile and content.ts. */
export const CURRENTLY = [
  "Studying Computer Engineering at Khwopa College of Engineering.",
  "Campus Director, Hult Prize at KhEC.",
  "Building Simblip — an engineering notebook that simulates, licensed to institutions.",
];

/** Every project, newest first, as the CV's full list. */
export const ALL_PROJECTS = [...PROJECTS]
  .sort((a, b) => b.year - a.year)
  .map((p) => ({
    slug: p.slug,
    name: p.name,
    year: p.year,
    role: p.role,
    line: p.line,
    tech: p.tech,
    live: p.live,
    repo: p.repo,
    stats: PROJECT_STATS[p.slug],
  }));

/** The personality section: real repos, his own descriptions. */
export { ASIDES };
