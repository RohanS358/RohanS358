import { readdirSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./paths";

/**
 * The playlist: audio in /public/music (bundled with the site) plus
 * anything uploaded through the admin player (kept in DATA_DIR/music,
 * served by /api/music/file/[name], so it survives redeploys).
 *
 * Name files "Artist - Title.mp3". A same-named .jpg/.png/.webp next to
 * a track becomes its vinyl label.
 */

export type Track = {
  src: string;
  title: string;
  artist: string;
  cover?: string;
  /** Uploaded through the admin — the only kind that can be deleted. */
  uploaded?: string;
};

export const AUDIO = /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)$/i;
const IMAGE = /\.(jpe?g|png|webp)$/i;

export const MUSIC_DIR = path.join(DATA_DIR, "music");

function list(dir: string, url: (f: string) => string, uploaded: boolean): Track[] {
  let files: string[];
  try {
    files = readdirSync(dir).sort();
  } catch {
    return [];
  }
  const covers = new Map(files.filter((f) => IMAGE.test(f)).map((f) => [f.replace(IMAGE, ""), f]));
  return files
    .filter((f) => AUDIO.test(f))
    .map((f) => {
      const base = f.replace(AUDIO, "");
      const [artist, ...rest] = base.split(" - ");
      const cover = covers.get(base);
      return {
        src: url(f),
        title: rest.length ? rest.join(" - ") : base,
        artist: rest.length ? artist : "unknown artist",
        cover: cover ? url(cover) : undefined,
        uploaded: uploaded ? f : undefined,
      };
    });
}

export function getTracks(): Track[] {
  return [
    ...list(path.join(process.cwd(), "public", "music"), (f) => `/music/${encodeURIComponent(f)}`, false),
    ...list(MUSIC_DIR, (f) => `/api/music/file/${encodeURIComponent(f)}`, true),
  ];
}

/**
 * Keep the "Artist - Title" shape but nothing that could climb out of
 * the folder or confuse a URL: path separators, control characters and
 * leading dots are dropped.
 */
export function safeName(name: string) {
  return name
    .replace(/[/\\\u0000-\u001f]/g, "")
    .replace(/[^\p{L}\p{N}\s\-_.(),'&!]/gu, "")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 140);
}

/** A stored file name is valid only if it's exactly what safeName would keep. */
export const isStoredName = (n: string) => !!n && n === safeName(n) && (AUDIO.test(n) || IMAGE.test(n));
