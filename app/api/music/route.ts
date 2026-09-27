import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin";
import { AUDIO, MUSIC_DIR, getTracks, isStoredName, safeName } from "@/lib/tracks";

/* The playlist (anyone) · add / remove tracks (admin). */

const MAX_AUDIO = 120 * 1024 * 1024;
const MAX_COVER = 8 * 1024 * 1024;
const COVER_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const deny = () => NextResponse.json({ error: "admins only" }, { status: 401 });

export async function GET() {
  return NextResponse.json({ tracks: getTracks() });
}

export async function POST(req: Request) {
  if (!isAdmin(req.headers.get("cookie"))) return deny();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const cover = form?.get("cover");
  if (!(file instanceof File) || !AUDIO.test(file.name) || !file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "mp3, m4a, ogg, wav, flac or webm audio only" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO) return NextResponse.json({ error: "that one's over 120MB" }, { status: 413 });

  /* "Artist - Title" from the form if given, else from the file's own name. */
  const ext = file.name.match(AUDIO)![0].toLowerCase();
  const artist = safeName(String(form?.get("artist") ?? ""));
  const title = safeName(String(form?.get("title") ?? ""));
  let base = safeName(artist && title ? `${artist} - ${title}` : file.name.replace(AUDIO, "")) || "untitled";
  for (let n = 2; existsSync(path.join(MUSIC_DIR, base + ext)); n++) base = `${base.replace(/ \(\d+\)$/, "")} (${n})`;

  try {
    await mkdir(MUSIC_DIR, { recursive: true });
    await writeFile(path.join(MUSIC_DIR, base + ext), Buffer.from(await file.arrayBuffer()));
    if (cover instanceof File && COVER_EXT[cover.type] && cover.size <= MAX_COVER) {
      await writeFile(path.join(MUSIC_DIR, `${base}.${COVER_EXT[cover.type]}`), Buffer.from(await cover.arrayBuffer()));
    }
  } catch (e) {
    return NextResponse.json({ error: `could not save: ${(e as Error).message}` }, { status: 500 });
  }
  return NextResponse.json({ tracks: getTracks() });
}

export async function DELETE(req: Request) {
  if (!isAdmin(req.headers.get("cookie"))) return deny();
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!isStoredName(name) || !AUDIO.test(name)) return NextResponse.json({ error: "no such track" }, { status: 400 });
  const base = name.replace(AUDIO, "");
  await rm(path.join(MUSIC_DIR, name), { force: true });
  for (const e of ["jpg", "jpeg", "png", "webp"]) await rm(path.join(MUSIC_DIR, `${base}.${e}`), { force: true });
  return NextResponse.json({ tracks: getTracks() });
}
