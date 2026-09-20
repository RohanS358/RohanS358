import Boot from "./Boot";
import HomeMarkup from "./HomeMarkup";
import { PROFILE, PROJECTS, ASIDES } from "./content";

/* ============================================================
   One screen, owned by the class app.

   `.app` and its `data-template` are the contract: App reads the
   attribute to know which page is showing, and swaps the markup
   inside on navigation. React renders this once and then leaves
   the subtree alone — see Boot.

   The sr-only block below is a static, linear copy of the same
   content. Not duplication for its own sake: it is what search
   engines and screen readers read, and what a visitor gets if the
   JS never runs. The animated mosaic is the enhancement.
   ============================================================ */

export default function Home() {
  return (
    <>
      <div className="app" data-template="home">
        <HomeMarkup />
      </div>
      <Boot />

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
