import { Composition } from "remotion";
import { PROJECTS } from "../../app/content";
import { Hero } from "./Hero";
import { UseCase, USE_DURATION } from "./UseCase";

export const FPS = 30;
export const DURATION = 8 * FPS;

// Site gets 16:9, LinkedIn gets 4:5 (the tallest the feed shows uncropped).
export const FORMATS = {
  site: { width: 1920, height: 1080 },
  linkedin: { width: 1080, height: 1350 },
} as const;

export const SHOWN = PROJECTS.filter((p) => p.shot);

export const Root = () => (
  <>
    {SHOWN.flatMap((p) =>
      Object.entries(FORMATS).map(([fmt, size]) => (
        <Composition
          key={`${p.slug}-${fmt}`}
          id={`${p.slug}-${fmt}`}
          component={Hero}
          durationInFrames={DURATION}
          fps={FPS}
          {...size}
          defaultProps={{ slug: p.slug }}
        />
      )),
    )}
    {Object.entries(FORMATS).map(([fmt, size]) => (
      <Composition key={fmt} id={`simblip-use-${fmt}`} component={UseCase} durationInFrames={USE_DURATION} fps={FPS} {...size} />
    ))}
  </>
);
