import { PROJECTS } from "./content";

/* The mosaic's markup.

   Eleven blocks in a fixed order — the CSS layouts address them by
   `nth-child`, so this order IS the mapping from project to cell, and
   reordering here rearranges every layout at once.

   Each block carries its project's slug as `id`, which is what the open
   animation matches on to know which one to grow. */

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

const ORDER = [...PROJECTS].sort((a, b) => b.year - a.year);

export default function HomeMarkup() {
  return (
    <div className="home">
      <div className="home__content">
        <div className="home__media">
          {ORDER.map((p, i) => (
            <a
              key={p.slug}
              id={p.slug}
              href={`/p/${p.slug}`}
              className={`home__media__element home__media__element--${i}`}
              /* The tone rides on a data attribute, not the inline
                 style: the entrance timeline ends each block with
                 `clearProps: "all"`, which wipes inline styles and would
                 take the colour with it. The stylesheet keys off this. */
              data-tone={p.slug}
              aria-label={`${p.name}, ${p.year}`}
            >
              {p.shot ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="home__media__media" src={p.shot} alt="" aria-hidden />
              ) : null}
            </a>
          ))}
        </div>

        <a href="/about" className="home__link">
          About
        </a>
      </div>

    </div>
  );
}
