import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PROFILE } from "./content";

export const alt = `${PROFILE.name} — builds things that run`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const pub = (f: string) => readFile(join(process.cwd(), "public", f));

/* The link-preview card: peach paper, the photo, the one-line bio. */
export default async function Image() {
  const [serif, photo] = await Promise.all([pub("Spectral-SemiBold.ttf"), pub("ui/me.png")]);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fcf3ec", padding: 72, alignItems: "center", gap: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, color: "#0d0d0d" }}>
          <div style={{ fontSize: 30, color: "#b8542c", letterSpacing: 2 }}>{PROFILE.location.toUpperCase()}</div>
          <div style={{ fontSize: 96, lineHeight: 1, marginTop: 16 }}>{PROFILE.name}</div>
          <div style={{ fontSize: 40, lineHeight: 1.3, marginTop: 28, color: "#3a3a3a" }}>{PROFILE.shortBio}</div>
        </div>
        <img alt=""
          src={`data:image/png;base64,${photo.toString("base64")}`}
          width={360}
          height={427}
          style={{ borderRadius: 24, border: "10px solid #ff9c78", objectFit: "cover" }}
        />
      </div>
    ),
    { ...size, fonts: [{ name: "Spectral", data: serif, weight: 600 }] },
  );
}
