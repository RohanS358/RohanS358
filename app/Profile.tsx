"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight, Download } from "lucide-react";
import { PROFILE } from "./content";
import {
  ALL_PROJECTS,
  ASIDES,
  CERTIFICATES,
  CLIENT_WORK,
  CONTACT,
  CURRENTLY,
  EDUCATION,
  EXPERIENCE,
  HACKATHONS,
  HEADLINE,
  SKILLS,
  SUMMARY,
  type Entry,
} from "./cv";

/**
 * Profile: the CV. Data lives in app/cv.ts; this only lays it out.
 * "download résumé" hands over public/resume.pdf, the plain version
 * printed from app/resume/page.tsx.
 */

/* "107,582" / "99.92%" / "120 Hz" / "US$1M" → count the number part,
   keep whatever wraps it. Words like "Finalist" just fade in. */
const NUMBER = /^([^\d]*)([\d,]*\.?\d+)(.*)$/;

function countUp(e: React.PointerEvent | React.FocusEvent) {
  for (const el of (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[data-stat]")) {
    const target = el.dataset.stat!;
    const m = target.match(NUMBER);
    if (!m) continue;
    const [, pre, num, post] = m;
    const to = Number(num.replace(/,/g, ""));
    const decimals = num.includes(".") ? num.split(".")[1].length : 0;
    const commas = num.includes(",");
    const n = { v: 0 };
    gsap.killTweensOf(n);
    gsap.to(n, {
      v: to,
      duration: 1.1,
      ease: "expo.out",
      onUpdate: () => {
        const v = decimals ? n.v.toFixed(decimals) : Math.round(n.v);
        el.textContent = `${pre}${commas ? Number(v).toLocaleString("en-US") : v}${post}`;
      },
      onComplete: () => void (el.textContent = target),
    });
  }
}

/** An entry reads as one line — title, org, when. Hover, focus or tap
    opens the numbers and the bullets underneath. */
function EntryItem({ e }: { e: Entry }) {
  const deep = !!(e.stats?.length || e.points?.length);
  return (
    <li
      className="cv__entry"
      data-stats={deep ? "" : undefined}
      tabIndex={deep ? 0 : undefined}
      onPointerEnter={e.stats?.length ? countUp : undefined}
      onFocus={e.stats?.length ? countUp : undefined}
    >
      <div className="cv__entry-head">
        <h4>
          {e.href ? (
            <a href={e.href} target="_blank" rel="noopener noreferrer">
              {e.title} <ArrowUpRight size={13} />
            </a>
          ) : (
            e.title
          )}
        </h4>
        {e.when ? <span className="cv__when">{e.when}</span> : null}
      </div>
      <p className="cv__org">
        {e.org}
        {e.where ? ` · ${e.where}` : ""}
      </p>
      <div className="cv__stats">
        <div className="cv__stats-inner">
          {e.stats?.map((st, i) => (
            <div className="cv__stat" key={st.label} style={{ "--i": i } as React.CSSProperties}>
              <strong data-stat={st.value}>{st.value}</strong>
              <span>{st.label}</span>
            </div>
          ))}
          {e.points?.length ? (
            <ul className="cv__points">
              {e.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** The first few, and the rest one click away. */
function Section({ title, entries, show = 3 }: { title: string; entries: Entry[]; show?: number }) {
  if (!entries.length) return null;
  /* Folding away a single entry saves nothing. */
  if (entries.length <= show + 1) show = entries.length;
  const rest = entries.slice(show);
  return (
    <section className="cv__section">
      <h3 className="cv__label">{title}</h3>
      <ol className="cv__entries">
        {entries.slice(0, show).map((e) => <EntryItem e={e} key={e.title + e.org} />)}
      </ol>
      {rest.length ? (
        <details className="more">
          <summary>+{rest.length} more</summary>
          <ol className="cv__entries">
            {rest.map((e) => <EntryItem e={e} key={e.title + e.org} />)}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

/** Name, year, links. The line and the numbers wait for a hover. */
const projectRow = (p: (typeof ALL_PROJECTS)[number]) => (
  <li key={p.slug} data-stats="" tabIndex={0} onPointerEnter={countUp} onFocus={countUp}>
    <span className="cv__when">{p.year}</span>
    <div>
      <h4>{p.name}</h4>
      <p className="cv__org">{p.role}</p>
      <div className="cv__stats">
        <div className="cv__stats-inner">
          {p.stats?.map((st, i) => (
            <div className="cv__stat" key={st.label} style={{ "--i": i } as React.CSSProperties}>
              <strong data-stat={st.value}>{st.value}</strong>
              <span>{st.label}</span>
            </div>
          ))}
          <p className="cv__line">{p.line} <em>{p.tech.join(" · ")}</em></p>
        </div>
      </div>
    </div>
    <span className="cv__links">
      {p.live ? <a href={p.live} target="_blank" rel="noopener noreferrer">live <ArrowUpRight size={12} /></a> : null}
      {p.repo ? <a href={p.repo} target="_blank" rel="noopener noreferrer">code <ArrowUpRight size={12} /></a> : null}
    </span>
  </li>
);

export default function Profile({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".cv__side > *, .cv__section", { y: 26, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 });
      gsap.from(".cv__rule", { scaleX: 0, transformOrigin: "left", duration: 1.2, ease: "expo.inOut", delay: 0.1 });
    }, root);
    return () => ctx.revert();
  }, [active]);

  /* The bio's own claims, then the counted ones. */
  const glance = [
    { value: "40+", label: "projects" },
    { value: "8+", label: "organisations" },
    { value: String(HACKATHONS.length), label: "hackathons & comps" },
    { value: "1", label: "national finalist" },
  ];

  return (
    <div className="cv" ref={root}>
      <aside className="cv__side">
        <p className="cv__kicker">profile · cv</p>
        <h2 className="cv__name">{PROFILE.name}</h2>
        <p className="cv__headline">{HEADLINE}</p>
        <span className="cv__rule" aria-hidden />

        <dl className="cv__glance">
          {glance.map((g) => (
            <div key={g.label}>
              <dt>{g.label}</dt>
              <dd>{g.value}</dd>
            </div>
          ))}
        </dl>

        <dl className="cv__contact">
          <div><dt>email</dt><dd><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div>
          <div><dt>based in</dt><dd>{CONTACT.location}</dd></div>
          <div><dt>web</dt><dd><a href={CONTACT.website} target="_blank" rel="noopener noreferrer">rohan-singh.com.np</a></dd></div>
        </dl>

        <div className="cv__skills">
          <h3 className="cv__label">design</h3>
          <p>{SKILLS.design.join(" · ")}</p>
          <h3 className="cv__label">build</h3>
          <p>{SKILLS.build.slice(0, 6).join(" · ")}</p>
          {SKILLS.build.length > 6 ? (
            <details className="more">
              <summary>+{SKILLS.build.length - 6} more</summary>
              <p>{SKILLS.build.slice(6).join(" · ")}</p>
            </details>
          ) : null}
        </div>

        <div className="cv__actions">
          {/* The plain résumé, printed from /resume — not this page. */}
          <a href="/resume.pdf" download="Rohan-Singh-Resume.pdf">
            <Download size={14} /> download résumé
          </a>
          <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">
            full LinkedIn <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>

      <div className="cv__main">
        <section className="cv__section">
          <h3 className="cv__label">about</h3>
          <p className="cv__summary">{SUMMARY}</p>
        </section>

        <section className="cv__section">
          <h3 className="cv__label">currently</h3>
          <ul className="cv__now">
            {CURRENTLY.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </section>

        <Section title="leadership & roles" entries={EXPERIENCE} />
        <Section title="work for organisations" entries={CLIENT_WORK} />
        <Section title={`hackathons & competitions · ${HACKATHONS.length}`} entries={HACKATHONS} />


        <section className="cv__section">
          <h3 className="cv__label">projects · {ALL_PROJECTS.length}</h3>
          <ol className="cv__projects">{ALL_PROJECTS.slice(0, 4).map(projectRow)}</ol>
          <details className="more">
            <summary>+{ALL_PROJECTS.length - 4} more</summary>
            <ol className="cv__projects">{ALL_PROJECTS.slice(4).map(projectRow)}</ol>
          </details>
        </section>

        <Section title="education" entries={EDUCATION} />
        <Section title="certificates" entries={CERTIFICATES} />

        <details className="cv__section more">
          <summary>built for no reason · {ASIDES.length}</summary>
          <ul className="cv__asides">
            {ASIDES.map((a) => (
              <li key={a.name}>
                <a href={a.href} target="_blank" rel="noopener noreferrer">{a.name}</a>
                <span>{a.note}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
