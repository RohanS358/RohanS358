import type { Metadata } from "next";
import { PROFILE } from "../content";
import { LINKEDIN, WEBSITE } from "../cv";

export const metadata: Metadata = {
  title: "Résumé",
  description: `${PROFILE.name}: frontend developer and UI/UX designer in ${PROFILE.location}. Education, client work, projects, leadership and skills.`,
  alternates: { canonical: "/resume" },
};

/* The plain résumé an employer downloads, in the Harvard Mignone Center
   format: Education first, organisation bold with location right, title
   italic with dates right, action-verb bullets, no pronouns, no
   abbreviations. The Profile tab is the show; this is the paperwork.
   public/resume.pdf is printed from this page.

   TODO(rohan): dates for college, school, Hult Prize and Rotaract are
   blank — fill `when` and reprint. */

type Entry = { org: string; where?: string; title: string; when?: string; points: string[] };

const EDUCATION: Entry[] = [
  {
    org: "Khwopa College of Engineering",
    where: "Bhaktapur, Nepal",
    title: "Bachelor of Engineering in Computer Engineering",
    when: "",
    points: [],
  },
  {
    org: "SOS Hermann Gmeiner School",
    where: "Sanothimi, Bhaktapur, Nepal",
    title: "Secondary and Higher Secondary Education",
    when: "",
    points: [],
  },
];

const EXPERIENCE: Entry[] = [
  {
    org: "Rotary Club of Pashupati Kathmandu",
    where: "Kathmandu, Nepal",
    title: "Web Designer and Developer",
    when: "2026",
    points: [
      "Designed and built the club's public website and administration system in Next.js and Supabase.",
      "Made every public page database-driven, so volunteers publish projects, members and news without a developer, and added a treasury module for club finances.",
    ],
  },
  {
    org: "Refill Enterprises Private Limited",
    where: "Kathmandu, Nepal",
    title: "Web Developer",
    when: "2026",
    points: [
      "Developed the brand website for a clinical nutrition company in Next.js, TypeScript and Tailwind CSS.",
      "Implemented in-place content editing, so staff change site copy without a redeployment.",
    ],
  },
];

const PROJECTS: Entry[] = [
  {
    org: "Simblip",
    title: "Designer and Engineer",
    when: "2026",
    points: [
      "Engineered a simulation notebook licensed to institutions: 120 Hz rigid-body physics, a nodal-analysis circuit solver and a digital logic simulator.",
      "Delivered a classroom platform with paired boards, per-student assignments and a submission dashboard; 509 commits, 107,000 lines of code.",
    ],
  },
  {
    org: "CoPaila",
    title: "Full-Stack Developer",
    when: "2026",
    points: [
      "Built a school carbon-audit platform covering Scope 1, 2 and 3 emissions across ten categories in NestJS, Prisma and React.",
      "Integrated a Python optical mark recognition scanner so schools without internet access submit audits on paper.",
    ],
  },
  {
    org: "Saul, CodeYatra 2.0 Hackathon",
    title: "Frontend Developer, team of three",
    when: "2026",
    points: [
      "Built the Next.js interface for a local legal research assistant using a five-stage retrieval-augmented generation pipeline.",
    ],
  },
  {
    org: "Rover",
    title: "Full-Stack Developer",
    when: "2025",
    points: [
      "Created an artificial intelligence website builder that turns a six-step form into a live business site with its own chat assistant.",
    ],
  },
];

const LEADERSHIP: Entry[] = [
  {
    org: "Hult Prize at Khwopa College of Engineering",
    where: "Bhaktapur, Nepal",
    title: "Campus Director; previously Marketing Team Lead and Media Manager",
    when: "",
    points: ["Direct the campus round of the global student social-entrepreneurship competition."],
  },
  {
    org: "Rotaract, District 3292",
    where: "Nepal",
    title: "International Service Chair and Service Project Chair",
    when: "",
    points: ["Led the club's service-project and international-service portfolios."],
  },
  {
    org: "Hackathons and Competitions",
    title: "Participant in 11 events",
    when: "2025 – 2026",
    points: [
      "Finalist, Nepal Electricity Authority Energy Hackathon 9.0 at LOCUS, 2026.",
      "Placed in the top 7 of 28 teams, UNESCO Hacking for a Carbon-Neutral Future, 2026.",
      "Co-organised Vibe-a-thon, a five-day artificial intelligence bootcamp and hackathon.",
    ],
  },
];

const SKILLS = [
  ["Technical", "TypeScript, React, Next.js, Node.js, NestJS, Express, FastAPI, Supabase, MongoDB, Prisma, Python, Three.js, Tailwind CSS"],
  ["Artificial intelligence", "Retrieval-augmented generation, Ollama, ChromaDB, Gemini, pandas, scikit-learn"],
  ["Design", "User interface and experience design, Figma, motion design"],
];

const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function Section({ name, entries }: { name: string; entries: Entry[] }) {
  return (
    <section>
      <h2>{name}</h2>
      {entries.map((e) => (
        <div className="resume__item" key={e.org + e.title}>
          <div className="resume__row"><strong>{e.org}</strong><span>{e.where}</span></div>
          <div className="resume__row"><em>{e.title}</em><span>{e.when}</span></div>
          {e.points.length ? <ul>{e.points.map((x) => <li key={x}>{x}</li>)}</ul> : null}
        </div>
      ))}
    </section>
  );
}

export default function Resume() {
  return (
    <main className="resume">
      <header>
        <h1>{PROFILE.name}</h1>
        <p className="resume__tag">Frontend developer and designer. Builds things that run.</p>
        <p>
          {PROFILE.location} · <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a> ·{" "}
          <a href={WEBSITE}>{host(WEBSITE)}</a> · <a href={PROFILE.github}>{host(PROFILE.github)}</a> · <a href={LINKEDIN}>{host(LINKEDIN)}</a>
        </p>
      </header>

      <Section name="Education" entries={EDUCATION} />
      <Section name="Experience" entries={EXPERIENCE} />
      <Section name="Projects" entries={PROJECTS} />
      <Section name="Leadership and Activities" entries={LEADERSHIP} />

      <section>
        <h2>Skills</h2>
        {SKILLS.map(([k, v]) => <p key={k}><strong>{k}:</strong> {v}</p>)}
      </section>

      <p className="resume__foot">
        Live projects and the interactive version of this résumé: <a href={WEBSITE}>{host(WEBSITE)}</a>
      </p>
    </main>
  );
}
