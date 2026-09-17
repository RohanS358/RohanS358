import Shell from "./Shell";
import { PROFILE, PROJECTS, ASIDES } from "./content";

/* ============================================================
   The page is one screen. Shell owns every view.

   The markup below Shell is a static, visually hidden copy of the
   same content. Not duplication for its own sake: it is what
   search engines and screen readers read linearly, and what a
   visitor gets if the JS never runs. The interactive shell is the
   enhancement, not the source of truth.
   ============================================================ */

export default function Home() {
  return (
    <>
      <Shell />

      <div className="sr-only">
        <h1>
          {PROFILE.name} — {PROFILE.shortBio}
        </h1>
        <p>{PROFILE.bio}</p>

        <h2>Work</h2>
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.slug}>
              <h3>{p.name}</h3>
              <p>{p.line}</p>
              <p>
                {p.year} · {p.role} · {p.tech.join(", ")}
                {p.commits ? ` · ${p.commits} commits` : ""}
              </p>
              {p.live ? <a href={p.live}>Live site</a> : null}
              {p.repo ? <a href={p.repo}>Source code</a> : null}
            </li>
          ))}
        </ul>

        <h2>Other things</h2>
        <ul>
          {ASIDES.map((a) => (
            <li key={a.name}>
              <a href={a.href}>{a.name}</a> — {a.note}
            </li>
          ))}
        </ul>

        <h2>Contact</h2>
        <p>
          <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
        </p>
        <p>
          <a href={PROFILE.github}>GitHub</a>
        </p>
      </div>
    </>
  );
}
