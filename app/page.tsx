import Image from "next/image";
import Header from "./Header";
import Opening from "./Opening";
import { PROFILE, PROJECTS, ASIDES, STACK, type Project } from "./content";

/* ============================================================
   One page. Work first, nothing in front of it.

   No hero statement, no metaphor, no gate. The references all
   do the same thing: name, two lines of context, then the work
   at full size. Everything here is static HTML — the only
   client component on the site is the header readout.
   ============================================================ */

function Plate({ p, i }: { p: Project; i: number }) {
  const href = p.live ?? p.repo;
  // Featured work gets a full-width plate; the rest sit two-up.
  const big = Boolean(p.featured);

  return (
    <article
      id={`p-${p.slug}`}
      data-year={p.year}
      className={`rise scroll-mt-28 ${big ? "sm:col-span-2" : ""}`}
    >
      <a
        href={href}
        target={href ? "_blank" : undefined}
        rel={href ? "noopener noreferrer" : undefined}
        className="group block"
      >
        {/* ---- the image is the design ---- */}
        <div
          className={`m relative mb-4 overflow-hidden rounded-lg bg-wash group-hover:rounded-3xl ${
            big ? "aspect-16/10" : "aspect-4/3"
          }`}
        >
          {/* Shots are tall poster cards, so contain rather than crop. */}
          {p.shot ? (
            <Image
              src={p.shot}
              alt={`${p.name} interface`}
              fill
              sizes={big ? "(max-width: 640px) 100vw, 70vw" : "(max-width: 640px) 100vw, 35vw"}
              className="m object-contain p-6 group-hover:scale-[1.02]"
              priority={i === 0}
            />
          ) : (
            // Honest placeholder. Better than a fake mockup, and it
            // tells Rohan exactly what to send me.
            <div className="absolute inset-0 grid place-items-center">
              <span className="t-label">Screenshot coming</span>
            </div>
          )}
        </div>

        {/* ---- the label ---- */}
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="t-head">{p.name}</h3>
          <span className="t-label tabular-nums">{p.year}</span>
        </div>

        <p className="t-body measure mt-1.5 text-ink-2">{p.line}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="t-label">{p.tech.join(", ")}</span>
          {p.commits ? (
            <span className="t-label tabular-nums">
              · {p.commits.toLocaleString()} commits
            </span>
          ) : null}
        </div>
      </a>
    </article>
  );
}

export default function Home() {
  // Reverse-chronological. The header year counts down as you scroll,
  // which only reads as time travel if the work is actually in order.
  // Featured work still gets a wider plate, but never jumps the queue.
  const ordered = [...PROJECTS].sort((a, b) => b.year - a.year);

  return (
    <>
      <Header />

      <main
        id="top"
        className="mx-auto max-w-6xl px-5 pb-32 pt-24 sm:px-8 sm:pt-28"
      >
        {/* ---- opening: a composition, not a paragraph ----
            The references open with almost no text. The bio moves down
            to About where someone can go looking for it. */}
        <Opening />

        {/* One line, and only because a recruiter needs it in 3 seconds. */}
        <h1 className="t-display measure mb-24 mt-10 sm:mb-32">
          {PROFILE.shortBio}
        </h1>

        {/* ---- work ---- */}
        <section id="work" className="scroll-mt-28">
          <h2 className="sr-only">Work</h2>
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2">
            {ordered.map((p, i) => (
              <Plate key={p.slug} p={p} i={i} />
            ))}
          </div>
        </section>

        {/* ---- asides: real repos, real descriptions ---- */}
        <section className="mt-32">
          <h2 className="t-label mb-6">Things built for no reason</h2>
          <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {ASIDES.map((a) => (
              <li key={a.name}>
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline gap-3"
                >
                  <span className="t-body link-out">{a.name}</span>
                  <span className="t-small text-ink-3">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- about ---- */}
        <section id="about" className="mt-32 scroll-mt-28">
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h2 className="t-label mb-4">About</h2>
              <p className="t-body measure text-ink-2">
                I like problems where the computer has to actually simulate
                something — physics, circuits, retrieval. Most of what I know
                came from building the thing and then rebuilding it once I
                understood it properly.
              </p>
              <p className="t-body measure mt-4 text-ink-2">
                Currently studying computer engineering in {PROFILE.location},
                and looking for work.
              </p>
            </div>

            <div>
              <h2 className="t-label mb-4">Tools</h2>
              <p className="t-body text-ink-2">{STACK.join(", ")}</p>
            </div>
          </div>
        </section>

        {/* ---- contact ---- */}
        <section className="mt-32">
          <h2 className="t-label mb-4">Contact</h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            <li>
              <a
                href={`mailto:${PROFILE.email}`}
                className="t-body link-out"
              >
                {PROFILE.email}
              </a>
            </li>
            <li>
              <a
                href={PROFILE.github}
                target="_blank"
                rel="noopener noreferrer"
                className="t-body link-out"
              >
                GitHub
              </a>
            </li>
            <li>
              {PROFILE.linkedin ? (
                <a
                  href={PROFILE.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-body link-out"
                >
                  LinkedIn
                </a>
              ) : (
                <span className="t-body text-ink-3">LinkedIn — soon</span>
              )}
            </li>
            <li>
              {PROFILE.resume ? (
                <a href={PROFILE.resume} className="t-body link-out">
                  Résumé
                </a>
              ) : (
                <span className="t-body text-ink-3">Résumé — soon</span>
              )}
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
