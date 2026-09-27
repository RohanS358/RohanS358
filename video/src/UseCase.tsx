import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import take from "../public/simblip-use.json";
import { C } from "./Hero";

// Timeline (frames @30fps). Physics is never sped up — only the setup is.
const PROBLEM = 84;
const BUILD = 132;
const PLAY = 84;
export const USE_DURATION = PROBLEM + BUILD + PLAY;

const SRC = { w: 1440, h: 900 };
const buildFrom = take.build - 0.3;
const buildTo = take.play - 0.9;
const RATE = (buildTo - buildFrom) / (BUILD / 30);

const ease = Easing.bezier(0.45, 0, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Source-video seconds shown at composition frame f. */
const srcTime = (f: number) =>
  f < PROBLEM + BUILD ? buildFrom + ((f - PROBLEM) / 30) * RATE : buildTo + (f - PROBLEM - BUILD) / 30;

/** Cursor position averaged over ±1.5s of source time: an operator following
 *  the action, lagging and smoothing, never snapping. */
const follow = (t: number) => {
  const pts = take.cursor.filter(([ct]) => Math.abs(ct - t) < 1.5);
  if (!pts.length) {
    const last = [...take.cursor].reverse().find(([ct]) => ct <= t) ?? take.cursor[0];
    return { x: last[1], y: last[2] };
  }
  return { x: pts.reduce((s, p) => s + p[1], 0) / pts.length, y: pts.reduce((s, p) => s + p[2], 0) / pts.length };
};

/** Low-frequency, layered sines — reads as a steady hand, not a shaky one. */
const hand = (f: number, u: number) => ({
  x: (5 * Math.sin(f * 0.071) + 2.5 * Math.sin(f * 0.19 + 1.3)) * u,
  y: (4 * Math.sin(f * 0.058 + 2) + 2 * Math.sin(f * 0.23 + 0.4)) * u,
  r: 0.22 * Math.sin(f * 0.047 + 0.8),
});

const Caption = ({ children, at, u, portrait }: { children: React.ReactNode; at: number; u: number; portrait: boolean }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: "Spectral",
        fontWeight: 600,
        fontSize: (portrait ? 64 : 72) * u,
        lineHeight: 1.02,
        letterSpacing: "-0.02em",
        color: C.ink,
        opacity: interpolate(f, [at, at + 12], [0, 1], clamp),
        transform: `translateY(${interpolate(f, [at, at + 18], [16, 0], { ...clamp, easing: ease })}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Problem = ({ u, portrait }: { u: number; portrait: boolean }) => {
  const f = useCurrentFrame();
  const h = hand(f + 40, u);
  const push = interpolate(f, [0, PROBLEM], [1.06, 1.12]);
  return (
    <AbsoluteFill style={{ background: "#fbf8f1" }}>
      {/* A textbook page, shot close. Static on purpose — that's the problem. */}
      <AbsoluteFill
        style={{
          transform: `translate(${h.x}px, ${h.y}px) rotate(${h.r - 1.2}deg) scale(${push})`,
          padding: `${(portrait ? 180 : 110) * u}px ${(portrait ? 90 : 260) * u}px`,
          fontFamily: "Spectral",
          color: "#2b2620",
        }}
      >
        <div style={{ fontSize: 24 * u, letterSpacing: "0.12em", color: "#8a7f70" }}>CHAPTER 4 · MECHANICS</div>
        <div style={{ fontSize: 54 * u, fontWeight: 600, marginTop: 10 * u }}>4.2 Bodies released from rest</div>
        <svg viewBox="0 0 600 300" style={{ width: "100%", marginTop: 30 * u, maxHeight: (portrait ? 560 : 460) * u }}>
          <defs>
            <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#2b2620" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect x="120" y="250" width="360" height="14" fill="url(#hatch)" stroke="#2b2620" strokeWidth="1.5" />
          <circle cx="240" cy="70" r="30" fill="none" stroke="#2b2620" strokeWidth="2" />
          <rect x="350" y="90" width="80" height="58" fill="none" stroke="#2b2620" strokeWidth="2" />
          {[240, 390].map((x, i) => (
            <g key={x} stroke="#2b2620" strokeWidth="1.5" strokeDasharray="5 5">
              <line x1={x} y1={i ? 160 : 112} x2={x} y2="228" />
              <path d={`M${x - 6} 220 L${x} 232 L${x + 6} 220`} strokeDasharray="0" fill="none" />
            </g>
          ))}
          <text x="252" y="190" fontSize="20" fontStyle="italic" fill="#2b2620">g</text>
        </svg>
        <div style={{ fontSize: 24 * u, fontStyle: "italic", color: "#6d6456", marginTop: 12 * u }}>
          Fig. 4.2 — Both bodies are released. Assume they fall.
        </div>
      </AbsoluteFill>
      {/* Paper light falloff */}
      <AbsoluteFill style={{ background: "radial-gradient(90% 80% at 45% 40%, transparent 55%, #00000026)" }} />
    </AbsoluteFill>
  );
};

export const UseCase = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const u = Math.min(width, height) / 1080;

  // Camera over the real recording: visible source width W, centre (cx, cy).
  const inPlay = frame >= PROBLEM + BUILD;
  const t = srcTime(frame);
  const cur = follow(t);
  const W = inPlay
    ? interpolate(frame, [PROBLEM + BUILD, USE_DURATION], portrait ? [640, 600] : [1250, 1150], { easing: ease })
    : portrait ? 700 : 1150;
  const s = width / W;
  const H = height / s;
  // Build: loosely follow the hand. Play: settle on the bodies and hold.
  const settle = interpolate(frame, [PROBLEM + BUILD - 10, PROBLEM + BUILD + 14], [0, 1], { ...clamp, easing: ease });
  // Site: bodies sit right of the captions. LinkedIn: bodies above them.
  const target = portrait ? { x: 990, y: 480 } : { x: 700, y: 432 };
  const k = portrait ? 0.8 : 0.55;
  let cx = cur.x * k + (portrait ? 700 : 760) * (1 - k);
  let cy = cur.y * 0.4 + 430 * 0.6;
  cx = cx + (target.x - cx) * settle;
  cy = cy + (target.y - cy) * settle;
  // Never show past the page edges or the account footer.
  cx = Math.min(Math.max(cx, W / 2), SRC.w - W / 2);
  cy = Math.min(Math.max(cy, H / 2), 880 - H / 2);
  const h = hand(frame, u);

  const cut = interpolate(frame, [PROBLEM - 6, PROBLEM + 4], [0, 1], clamp);
  const end = frame > USE_DURATION - 40;

  return (
    <AbsoluteFill style={{ background: "#f8f7f4", overflow: "hidden", fontFamily: "Rethink" }}>
      <Sequence from={PROBLEM - 6} durationInFrames={BUILD + 6} layout="none">
        <Footage cx={cx} cy={cy} s={s} h={h} startFrom={Math.round(buildFrom * 30 - 6 * RATE)} rate={RATE} />
      </Sequence>
      <Sequence from={PROBLEM + BUILD} layout="none">
        <Footage cx={cx} cy={cy} s={s} h={h} startFrom={Math.round(buildTo * 30)} rate={1} />
      </Sequence>

      <Sequence durationInFrames={PROBLEM} layout="none">
        <AbsoluteFill style={{ opacity: 1 - cut }}>
          <Problem u={u} portrait={portrait} />
        </AbsoluteFill>
      </Sequence>

      {/* Legibility wash under the captions — only where text sits. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${inPlay || frame >= PROBLEM ? "#f8f7f4f2" : "#fbf8f1f2"} 0%, transparent ${portrait ? 34 : 38}%)`,
        }}
      />

      <div style={{ position: "absolute", top: 48 * u, left: 56 * u, fontSize: 22 * u, color: C.deep, zIndex: 2 }}>
        rohan singh <span style={{ color: C.pink }}>●</span> simblip
      </div>

      <div style={{ position: "absolute", left: 56 * u, right: 56 * u, bottom: 56 * u, zIndex: 2 }}>
        <Sequence durationInFrames={PROBLEM} layout="none">
          <Caption at={8} u={u} portrait={portrait}>The textbook says it falls.</Caption>
          <div style={{ marginTop: 10 * u }}>
            <Caption at={36} u={u} portrait={portrait}><span style={{ color: C.deep, fontWeight: 300, fontStyle: "italic" }}>You just have to trust it.</span></Caption>
          </div>
        </Sequence>
        <Sequence from={PROBLEM} durationInFrames={BUILD} layout="none">
          <Caption at={6} u={u} portrait={portrait}>So build it instead.</Caption>
          <div style={{ fontSize: 28 * u, color: C.deep, marginTop: 12 * u, opacity: interpolate(frame, [PROBLEM + 20, PROBLEM + 32], [0, 1], clamp) }}>
            Simblip — ground, mass, block, straight from the palette.
          </div>
        </Sequence>
        <Sequence from={PROBLEM + BUILD} layout="none">
          <Caption at={4} u={u} portrait={portrait}>Press play. It actually falls.</Caption>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12 * u,
              marginTop: 18 * u,
              padding: `${12 * u}px ${22 * u}px`,
              borderRadius: 99,
              background: C.ink,
              color: C.soft,
              fontSize: 24 * u,
              opacity: end ? interpolate(frame, [USE_DURATION - 40, USE_DURATION - 28], [0, 1], clamp) : 0,
            }}
          >
            <span style={{ width: 11 * u, height: 11 * u, borderRadius: 99, background: C.pink }} />
            simblip.vercel.app ↗
          </div>
        </Sequence>
      </div>

      {/* Honesty label: setup is sped up, physics is real-time. */}
      <div
        style={{
          position: "absolute",
          top: 44 * u,
          right: 56 * u,
          zIndex: 2,
          fontSize: 20 * u,
          padding: `${8 * u}px ${16 * u}px`,
          borderRadius: 99,
          background: "#ffffffd9",
          boxShadow: `0 0 0 1px ${C.ink}14`,
          color: C.deep,
          opacity: frame >= PROBLEM ? 1 : 0,
        }}
      >
        {inPlay ? "real-time physics" : `${RATE.toFixed(1)}× speed`}
      </div>
    </AbsoluteFill>
  );
};

const Footage = ({ cx, cy, s, h, startFrom, rate }: { cx: number; cy: number; s: number; h: ReturnType<typeof hand>; startFrom: number; rate: number }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ transform: `translate(${h.x}px, ${h.y}px) rotate(${h.r}deg) scale(1.02)` }}>
      <OffthreadVideo
        src={staticFile("simblip-use.mp4")}
        startFrom={startFrom}
        playbackRate={rate}
        muted
        style={{
          position: "absolute",
          width: SRC.w,
          height: SRC.h,
          maxWidth: "none",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${width / 2 - cx * s}px, ${height / 2 - cy * s}px) scale(${s})`,
        }}
      />
    </AbsoluteFill>
  );
};
