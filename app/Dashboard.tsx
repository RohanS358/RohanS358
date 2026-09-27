"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, Code2 } from "lucide-react";
import type { GithubStats, RepoStat } from "@/lib/github";
import { useAdmin } from "./Admin";
import { TECH } from "./stack";

/** Skills, measured: how many of his projects shipped with each tool. */
const SKILLS = TECH.filter((t) => t.uses.length > 0);

/**
 * Projects: the receipts.
 *
 * Every number is live from GitHub (lib/github.ts). All three charts are
 * single-series magnitude, so each is one ink hue with direct labels —
 * no legend to decode — plus a hover tooltip for the detail. Numbers
 * count up and bars grow from their baseline when the tab opens.
 */

const ago = (iso: string) => {
  const d = (Date.now() - +new Date(iso)) / 864e5;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)} days ago`;
  if (d < 365) return `${Math.floor(d / 30)} mo ago`;
  return `${(d / 365).toFixed(1)} yr ago`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (key: string) => {
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

type Tip = { x: number; y: number; title: string; body: string } | null;

export default function Dashboard({
  stats,
  active,
  onOpen,
}: {
  stats: GithubStats | null;
  active: boolean;
  onOpen: (slug: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { admin } = useAdmin();
  const [tip, setTip] = useState<Tip>(null);

  useLayoutEffect(() => {
    if (!active || !root.current || !stats) return;
    const ctx = gsap.context(() => {
      gsap.from(".dash__head > *, .dash__card", { y: 30, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 });
      for (const el of gsap.utils.toArray<HTMLElement>("[data-count]")) {
        const to = Number(el.dataset.count);
        const n = { v: 0 };
        gsap.to(n, {
          v: to,
          duration: 1.6,
          ease: "expo.out",
          delay: 0.2,
          onUpdate: () => (el.textContent = Math.round(n.v).toLocaleString()),
        });
      }
    }, root);
    return () => ctx.revert();
  }, [active, stats]);

  /* The folded charts grow in when unfolded, same as the tiles did. */
  const grow = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open) return;
    const q = gsap.utils.selector(e.currentTarget);
    gsap.from(q(".bar__fill"), { scaleX: 0, duration: 1.2, ease: "expo.out", stagger: 0.04 });
    gsap.from(q(".skill__pips i[data-on]"), { scale: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.012 });
    gsap.from(q(".cadence__col i"), { scaleY: 0, duration: 0.9, ease: "expo.out", stagger: 0.02 });
  };

  const show = (e: React.PointerEvent, title: string, body: string) => {
    const r = root.current!.getBoundingClientRect();
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top + root.current!.scrollTop, title, body });
  };

  if (!stats) {
    return (
      <div className="dash dash--empty">
        <p className="dash__kicker">projects</p>
        <h2 className="dash__title">GitHub&apos;s rate limit said &ldquo;later&rdquo;.</h2>
        <p className="dash__sub">the receipts reload on their own. try again in a bit.</p>
      </div>
    );
  }

  const { totals, repos, languages, timeline } = stats;
  const top = repos.filter((r) => r.commits > 0).slice(0, 10);
  const maxCommits = Math.max(1, ...top.map((r) => r.commits));
  const maxLang = Math.max(1, ...languages.map((l) => l.repos));
  const maxMonth = Math.max(1, ...timeline.map((t) => t.repos));
  const busiest = timeline.reduce((a, b) => (b.repos > a.repos ? b : a), timeline[0]);
  /* Best work = shipped work: a live site or a case study on this page,
     ranked by commits. The profile README and notes repos don't count. */
  const hitters = repos.filter((r) => r.homepage || r.slug).slice(0, 3);
  const viewed = stats.hasViews ? [...repos].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5) : [];
  const share = totals.commits ? Math.round((repos[0].commits / totals.commits) * 100) : 0;

  const TILES: { value: number; label: string; note: string }[] = [
    { value: totals.commits, label: "commits", note: `${share}% of them on ${repos[0]?.name}` },
    { value: totals.live, label: "live deploys", note: "things you can click right now" },
    { value: totals.repos, label: "public repos", note: "and counting" },
    { value: totals.months, label: "months shipping", note: `since ${monthName(timeline[0].month)}` },
  ];

  const links = (r: RepoStat) => (
    <div className="hit__links">
      {r.homepage ? (
        <a href={r.homepage.startsWith("http") ? r.homepage : `https://${r.homepage}`} target="_blank" rel="noopener noreferrer">
          live <ArrowUpRight size={12} />
        </a>
      ) : null}
      <a href={r.url} target="_blank" rel="noopener noreferrer">
        code <Code2 size={12} />
      </a>
      {r.slug ? <button onClick={() => onOpen(r.slug!)}>case study →</button> : null}
    </div>
  );

  return (
    <div className="dash" ref={root} onPointerLeave={() => setTip(null)}>
      <header className="dash__head">
        <p className="dash__kicker">projects</p>
        <h2 className="dash__title">the receipts.</h2>
        <p className="dash__sub">
          live from github.com/RohanS358 · refreshed {ago(stats.fetchedAt)}
        </p>
      </header>

      <section className="dash__tiles">
        {TILES.map((t) => (
          <div className="dash__card tile-stat" key={t.label}>
            <span className="tile-stat__value" data-count={t.value}>{t.value.toLocaleString()}</span>
            <span className="tile-stat__label">{t.label}</span>
            <span className="tile-stat__note">{t.note}</span>
          </div>
        ))}
      </section>

      <section className="dash__hitters">
        <h3 className="dash__section">heavy hitters</h3>
        <div className="hits">
          {hitters.map((r, i) => (
            <article className="dash__card hit" key={r.name}>
              <span className="hit__rank">#{i + 1}</span>
              <h4 className="hit__name">{r.name}</h4>
              <p className="hit__desc">{r.description || "no description. the code speaks."}</p>
              <dl className="hit__facts">
                <div><dt>commits</dt><dd>{r.commits}</dd></div>
                <div><dt>language</dt><dd>{r.language ?? "—"}</dd></div>
                <div><dt>last push</dt><dd>{ago(r.pushed)}</dd></div>
              </dl>
              {links(r)}
            </article>
          ))}
        </div>
      </section>

      <details className="more dash__more" onToggle={grow}>
        <summary>the nerdy charts</summary>
      <div className="dash__grid">
        <section className="dash__card dash__chart dash__chart--commits">
          <h3>where the commits went</h3>
          <p className="dash__hint">my commits per repo, top {top.length}</p>
          <ol className="bars">
            {top.map((r) => (
              <li
                key={r.name}
                className="bar"
                onPointerMove={(e) => show(e, r.name, `${r.commits} commits · ${r.language ?? "—"} · pushed ${ago(r.pushed)}`)}
                onPointerLeave={() => setTip(null)}
              >
                <span className="bar__name">{r.name}</span>
                <span className="bar__track">
                  <span className="bar__fill" style={{ width: `${(r.commits / maxCommits) * 100}%` }} />
                </span>
                <span className="bar__value">{r.commits}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="dash__card dash__chart">
          <h3>languages</h3>
          <p className="dash__hint">repos written mostly in each</p>
          <ol className="bars bars--compact">
            {languages.map((l) => (
              <li
                key={l.name}
                className="bar"
                onPointerMove={(e) => show(e, l.name, `${l.repos} repo${l.repos === 1 ? "" : "s"}`)}
                onPointerLeave={() => setTip(null)}
              >
                <span className="bar__name">{l.name}</span>
                <span className="bar__track">
                  <span className="bar__fill" style={{ width: `${(l.repos / maxLang) * 100}%` }} />
                </span>
                <span className="bar__value">{l.repos}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="dash__card dash__chart dash__chart--wide">
          <h3>skills, by what shipped with them</h3>
          <p className="dash__hint">projects built with each tool · hover for which</p>
          <ol className="skills">
            {SKILLS.map((t) => (
              <li
                key={t.name}
                className="skill"
                style={{ "--brand": t.color } as React.CSSProperties}
                onPointerMove={(e) => show(e, t.name, t.uses.map((u) => u.name).join(" · "))}
                onPointerLeave={() => setTip(null)}
              >
                <span className="skill__name">{t.name}</span>
                <span className="skill__pips" aria-label={`${t.uses.length} projects`}>
                  {Array.from({ length: SKILLS[0].uses.length }, (_, i) => (
                    <i key={i} data-on={i < t.uses.length || undefined} />
                  ))}
                </span>
                <span className="bar__value">{t.uses.length}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="dash__card dash__chart dash__chart--wide">
          <h3>shipping cadence</h3>
          <p className="dash__hint">
            new repos per month · busiest: {monthName(busiest.month)} ({busiest.repos})
          </p>
          <div className="cadence">
            {timeline.map((t) => (
              <span
                key={t.month}
                className="cadence__col"
                data-peak={t === busiest || undefined}
                onPointerMove={(e) => show(e, monthName(t.month), `${t.repos} new repo${t.repos === 1 ? "" : "s"}`)}
                onPointerLeave={() => setTip(null)}
              >
                <i style={{ height: `${(t.repos / maxMonth) * 100}%` }} />
              </span>
            ))}
          </div>
          <div className="cadence__axis">
            <span>{monthName(timeline[0].month)}</span>
            <span>{monthName(timeline[timeline.length - 1].month)}</span>
          </div>
        </section>
      </div>

      {viewed.length ? (
        <section className="dash__hitters">
          <h3 className="dash__section">most viewed · last 14 days</h3>
          <ol className="viewed">
            {viewed.map((r) => (
              <li key={r.name}>
                <span>{r.name}</span>
                <strong>{r.views}</strong> views · {r.uniques} people
              </li>
            ))}
          </ol>
        </section>
      ) : admin ? (
        <p className="dash__note">
          admin note: GitHub only shows repo views to the owner. add a <code>GITHUB_TOKEN</code> with repo
          read access to the env and &ldquo;most viewed&rdquo; appears here.
        </p>
      ) : null}

      </details>

      {tip ? (
        <div className="dash__tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.title}</strong>
          <span>{tip.body}</span>
        </div>
      ) : null}
    </div>
  );
}
