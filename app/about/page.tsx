import type { Metadata } from "next";
import Link from "next/link";
import Stickman from "./Stickman";
import { PROFILE, PROJECTS } from "../content";
import { EXPERIENCE, HACKATHONS } from "../cv";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description: `${PROFILE.name}, explained by a 3D stick figure. ${PROFILE.shortBio}`,
  alternates: { canonical: "/about" },
};

/* What the stick figure does while each entry is on screen, plus his
   running commentary. Cycles if the lists grow. */
const ACTS = [
  { pose: "point", note: "that one. he's pointing at it. very professional." },
  { pose: "shrug", note: "two chairs, zero idea how. shrugging accordingly." },
  { pose: "dance", note: "5 days of AI bootcamp. the dance is mandatory." },
  { pose: "think", note: "thinking really hard about energy. (it's 4am.)" },
  { pose: "run", note: "running to submit before the deadline. classic." },
  { pose: "celebrate", note: "shipped it. arms up. no notes." },
];

const ENTRIES = [...EXPERIENCE, ...HACKATHONS.slice(0, 3)];

export default function About() {
  return (
    <main className="stick">
      <Stickman />

      <header className="stick-chrome">
        <span>{PROFILE.name}</span>
        <nav>
          <Link href="/">the actual site</Link>
          <Link href="/resume">résumé</Link>
        </nav>
      </header>

      <section className="stick-hero" data-pose="wave">
        <h1>hi, i&apos;m Rohan</h1>
        <p>
          {PROFILE.bio} This little guy is me. Move your mouse, he looks at it. He&apos;s not
          very busy.
        </p>
        <span className="stick-cue">scroll, he&apos;ll explain</span>
      </section>

      <section id="stuff" className="stick-rail">
        <h2>stuff i&apos;ve done</h2>
        <ol className="stick-timeline">
          {ENTRIES.map((e, i) => {
            const act = ACTS[i % ACTS.length];
            return (
              <li key={e.title} data-pose={act.pose}>
                {e.when ? <time>{e.when}</time> : null}
                <h3>{e.title}</h3>
                <p className="stick-role">{e.org}</p>
                {e.points?.length ? (
                  <ul>
                    {e.points.slice(0, 2).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="stick-note">— {act.note}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="work-list" className="stick-rail" data-pose="point">
        <h2>things that run</h2>
        <ul className="stick-works">
          {PROJECTS.map((p) => (
            <li key={p.slug}>
              <Link href={`/p/${p.slug}`}>
                <strong>{p.name}</strong>
                <span>{p.line}</span>
                <em>{p.year}</em>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="stick-rail stick-end" data-pose="celebrate">
        <h2>say hi</h2>
        <p>
          <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a> · he&apos;ll wave back
        </p>
      </footer>
    </main>
  );
}
