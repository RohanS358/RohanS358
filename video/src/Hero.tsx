import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { PROJECTS } from "../../app/content";

// Same palette as `.bento` in app/globals.css.
export const C = {
  ground: "#e6e6e4",
  soft: "#f7f7f7",
  deep: "#6b6b6b",
  ink: "#0d0d0d",
  pink: "#f7a6f2",
  green: "#b8e4b0",
};

loadFont({ family: "Spectral", url: staticFile("Spectral-SemiBold.ttf"), weight: "600" });
loadFont({ family: "Spectral", url: staticFile("Spectral-LightItalic.ttf"), weight: "300", style: "italic" });
loadFont({ family: "Rethink", url: staticFile("RethinkSans-VariableFont_wght.ttf") });

const ease = Easing.bezier(0.45, 0, 0.2, 1);

export const Hero = ({ slug }: { slug: string }) => {
  const p = PROJECTS.find((x) => x.slug === slug)!;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames: D } = useVideoConfig();
  const portrait = height > width;
  const tallShot = p.slug === "saul" || p.slug === "looni";

  // Camera: one slow, uninterrupted push-in across the whole 8s.
  const cam = interpolate(frame, [0, D], [1, 1.14], { easing: ease });
  // Product arrives once, then holds perfectly still in frame.
  const rise = spring({ frame, fps, config: { damping: 200, mass: 1.2 }, durationInFrames: 45 });
  const tilt = interpolate(frame, [0, D], [10, 2], { easing: ease });
  const blur = interpolate(frame, [0, 24], [14, 0], { extrapolateRight: "clamp" });

  // Size the window against the frame, not the image, so every project sits the same.
  const shotW = 1440;
  const shotH = tallShot ? 1541 : 900;
  const maxW = width * (portrait ? 0.8 : 0.6);
  const maxH = height * (portrait ? 0.5 : 0.56);
  const scale = Math.min(maxW / shotW, maxH / (shotH + 60));
  const winW = (tallShot ? 1206 : shotW) * scale;
  const winH = shotH * scale;

  // A single glass reflection that crosses once — the "studio light" moment.
  const sweep = interpolate(frame, [40, 110], [-60, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  const fadeUp = (start: number) => ({
    opacity: interpolate(frame, [start, start + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [start, start + 24], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })}px)`,
  });

  const u = Math.min(width, height) / 1080; // type scale unit
  const host = p.live ? new URL(p.live).host : p.repo?.replace("https://", "") ?? "";
  const drift = (a: number, speed: number) => Math.sin((frame / fps) * speed + a);

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden", fontFamily: "Rethink" }}>
      {/* Subtle background motion: two soft tints and a dot grid, all barely moving. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 50% at ${30 + drift(0, 0.35) * 6}% ${30 + drift(1, 0.3) * 5}%, ${C.pink}55, transparent 70%),
                       radial-gradient(45% 55% at ${72 + drift(2, 0.28) * 6}% ${70 + drift(3, 0.33) * 5}%, ${C.green}66, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${C.ink}14 1.2px, transparent 1.4px)`,
          backgroundSize: `${28 * u}px ${28 * u}px`,
          backgroundPosition: `${frame * 0.25}px ${frame * 0.15}px`,
          maskImage: "radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 85%)",
        }}
      />

      {/* Corner mark */}
      <div style={{ position: "absolute", top: 56 * u, left: 64 * u, fontSize: 22 * u, color: C.deep, letterSpacing: "0.02em", ...fadeUp(6) }}>
        rohan singh <span style={{ color: C.pink }}>●</span> {p.year}
      </div>

      {/* Camera */}
      <AbsoluteFill style={{ transform: `scale(${cam})`, perspective: 2400, alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `translateY(${(1 - rise) * 220 * u + (portrait ? -110 : -90) * u}px) rotateX(${tilt}deg)`,
            opacity: rise,
            filter: `blur(${blur}px)`,
          }}
        >
          {/* Contact shadow on the "surface" */}
          <div
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              bottom: -38 * u,
              height: 60 * u,
              background: `radial-gradient(50% 50% at 50% 50%, ${C.ink}40, transparent 70%)`,
              filter: `blur(${16 * u}px)`,
            }}
          />
          <div
            style={{
              width: winW,
              borderRadius: 22 * u,
              background: C.soft,
              overflow: "hidden",
              position: "relative",
              boxShadow: `0 ${50 * u}px ${120 * u}px -${30 * u}px ${C.ink}55, 0 0 0 1px ${C.ink}14`,
            }}
          >
            {/* Browser chrome with the real URL */}
            <div style={{ height: 52 * u, display: "flex", alignItems: "center", gap: 10 * u, padding: `0 ${20 * u}px` }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} style={{ width: 13 * u, height: 13 * u, borderRadius: 99, background: c }} />
              ))}
              <div
                style={{
                  marginLeft: 16 * u,
                  flex: 1,
                  maxWidth: winW * 0.5,
                  height: 30 * u,
                  borderRadius: 99,
                  background: "#ececec",
                  color: C.deep,
                  fontSize: 15 * u,
                  padding: `0 ${16 * u}px`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                  lineHeight: `${30 * u}px`,
                }}
              >
                {host}
              </div>
            </div>
            <Img src={staticFile(p.shot!.slice(1))} style={{ display: "block", width: winW, height: winH, objectFit: "cover", objectPosition: "top" }} />
            {/* Glass sweep */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(105deg, transparent ${sweep - 18}%, #ffffff55 ${sweep}%, transparent ${sweep + 18}%)`,
                mixBlendMode: "screen",
              }}
            />
          </div>
        </div>
      </AbsoluteFill>

      {/* Title block — outside the camera so text never scales or blurs. */}
      <div
        style={{
          position: "absolute",
          left: 64 * u,
          right: 64 * u,
          bottom: (portrait ? 90 : 64) * u,
          display: "flex",
          flexDirection: portrait ? "column" : "row",
          justifyContent: "space-between",
          alignItems: portrait ? "flex-start" : "flex-end",
          gap: 28 * u,
        }}
      >
        <div style={{ maxWidth: portrait ? "100%" : "58%" }}>
          <div style={{ fontFamily: "Spectral", fontWeight: 600, fontSize: 96 * u, lineHeight: 0.95, color: C.ink, letterSpacing: "-0.02em", ...fadeUp(30) }}>
            {p.name}
          </div>
          <div style={{ fontSize: 30 * u, lineHeight: 1.3, color: C.deep, marginTop: 18 * u, ...fadeUp(48) }}>{p.line}</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12 * u,
            padding: `${14 * u}px ${24 * u}px`,
            borderRadius: 99,
            background: C.ink,
            color: C.soft,
            fontSize: 24 * u,
            whiteSpace: "nowrap",
            ...fadeUp(150),
          }}
        >
          <span style={{ width: 12 * u, height: 12 * u, borderRadius: 99, background: C.pink }} />
          {p.live ? `${host} ↗` : "github.com/RohanS358"}
        </div>
      </div>
    </AbsoluteFill>
  );
};
