import type { Project } from "./content";

/* A case study, as the horizontal rail reads it.

   The structure is load-bearing, not decorative: the Project class
   measures `.project__content` for the travel limit, sticks
   `.project__sections__header` while its section passes, and reveals
   `[data-title]` / `[data-description]` / `[data-media]` as they cross
   the viewport. Renaming any of those detaches the behaviour.

   Sections are full-viewport panels laid side by side; the rail slides
   the strip left rather than scrolling it. */

/* The project's colour floods the whole page, so it lives here rather
   than on a block. */
const TONE: Record<string, string> = {
  simblip: "#55E6C1",
  saul: "#292522",
  looni: "#EF476F",
  rotary: "#4E7D32",
  copaila: "#86B83F",
  bijulibatti: "#8067D6",
  orbital: "#FFD166",
  refill: "#39735A",
  rover: "#126782",
  fraud: "#75645D",
  hackforbusiness: "#D1493F",
};

/* Dark tones need light type. Measured against the same relative
   luminance the rest of the site uses rather than eyeballed. */
const LIGHT_ON = new Set(["saul", "rover", "refill", "rotary", "fraud", "bijulibatti"]);

export default function ProjectMarkup({ p }: { p: Project }) {
  return (
    <section
      className="project"
      id={p.slug}
      style={{
        background: TONE[p.slug],
        color: LIGHT_ON.has(p.slug) ? "#fff" : "#0a0a0a",
      }}
    >
      <div className="project__wrapper">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
            the class router intercepts this; next/link would navigate
            before the exit animation had a chance to run. */}
        <a className="project__close" href="/">
          <span className="project__close__icon" /> Back to Home
        </a>

        {/* Edge zones, a tenth of the viewport each. Hovering one
            shows an arrow that tracks the cursor; clicking steps to the
            neighbouring panel. `cursor: none` hides the system pointer
            so the arrow IS the cursor while you are in the zone. */}
        <button className="project__button project__button--previous" aria-label="Previous section">
          <svg className="project__button__arrow" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button className="project__button project__button--next" aria-label="Next section">
          <svg className="project__button__arrow" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="project__content">
          {/* The title panel: one screen of nothing but the name. */}
          <header className="project__header">
            <div className="project__header__wrapper">
              <h1 className="project__header__title">{p.name}</h1>
            </div>
          </header>

          <div className="project__sections">
            <div className="project__sections__header">
              <p className="project__sections__header__title">
                <span className="project__sections__header__title__text">{p.name}</span>
              </p>
            </div>

            {/* The line, and the facts that back it. */}
            <div className="project__sections__section">
              <div className="project__sections__section__wrapper">
                <article className="project__sections__content">
                  <div className="project__sections__content__wrapper">
                    <div className="project__sections__content__description">
                      <h1 data-title>{p.line}</h1>
                      <p data-description>
                        {p.year} · {p.role}
                        {p.commits ? ` · ${p.commits.toLocaleString()} commits` : ""}
                        {p.loc ? ` · ${p.loc.toLocaleString()} lines` : ""}
                      </p>
                      <p data-description>{p.tech.join(" · ")}</p>
                      {/* A gated or dead link is stated outright — a
                          button that goes nowhere reads as rot. */}
                      {p.status ? <p data-description>{p.status}</p> : null}
                      <p data-description>
                        {p.live ? <a href={p.live}>Open the live site</a> : null}
                        {p.live && p.repo ? " · " : ""}
                        {p.repo ? <a href={p.repo}>Source</a> : null}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            {/* The screenshot. */}
            {p.shot ? (
              <div className="project__sections__section">
                <div className="project__sections__section__wrapper">
                  <article className="project__sections__media">
                    <div className="project__sections__media__wrapper" data-media>
                      <div className="project__sections__media__gallery project__sections__media__gallery--1">
                        <figure className="project__sections__media__item">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={`${p.name} interface`}
                            className="project__sections__media__item__image"
                            src={p.shot}
                          />
                        </figure>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            ) : null}

            {/* One panel per beat — the part worth reading. */}
            {p.detail?.map((d, i) => (
              <div className="project__sections__section" key={i}>
                <div className="project__sections__section__wrapper">
                  <article className="project__sections__content">
                    <div className="project__sections__content__wrapper">
                      <div className="project__sections__content__description">
                        <h1 data-title>{d}</h1>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
