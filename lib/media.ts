import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths";

/**
 * Gallery + socials: Rohan's uploaded work.
 *
 * Every upload is stored twice — the untouched original and a ~1400px
 * preview the browser makes before sending — so the masonry loads light
 * while nothing is ever downscaled at the source. Files live under
 * data/media and are served by /api/media/file/[name], not /public, so
 * uploads made after a production build are still reachable.
 *
 * ponytail: disk storage, same caveat as the board — on Vercel this
 * needs Blob behind readMedia/writeMedia/saveFile.
 */

export type MediaKind = "gallery" | "social";

export type MediaItem = {
  id: string;
  kind: MediaKind;
  title: string;
  /** Where clicking the piece goes. */
  href: string;
  /** Gallery: a tag ("branding", "ui"). Socials: the platform. */
  label: string;
  w: number;
  h: number;
  full: string;
  preview: string;
  created: number;
};

const ROOT = path.join(DATA_DIR, "media");
const INDEX = path.join(DATA_DIR, "media.json");

export const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const FILE_NAME = /^[a-z0-9]{6,20}-(full|preview)\.(jpg|png|webp|avif|gif)$/;

export async function readMedia(): Promise<MediaItem[]> {
  try {
    return JSON.parse(await readFile(INDEX, "utf8")) as MediaItem[];
  } catch {
    return [];
  }
}

export async function writeMedia(items: MediaItem[]) {
  await mkdir(path.dirname(INDEX), { recursive: true });
  await writeFile(INDEX, JSON.stringify(items, null, 1));
}

export async function saveFile(name: string, data: ArrayBuffer) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, name), Buffer.from(data));
}

export async function deleteFile(name: string) {
  if (FILE_NAME.test(name)) await rm(path.join(ROOT, name), { force: true });
}

export const filePath = (name: string) => path.join(ROOT, name);

/** Only http(s) links, trimmed; anything else becomes no link. */
export const cleanHref = (v: unknown) =>
  typeof v === "string" && /^https?:\/\/\S+$/.test(v.trim()) ? v.trim().slice(0, 500) : "";

export const cleanText = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
