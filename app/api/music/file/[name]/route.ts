import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MUSIC_DIR, isStoredName } from "@/lib/tracks";

const TYPE: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  webm: "audio/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Streams an uploaded track, honouring Range requests — without them the
 * browser can't seek, and the player's scrubber would do nothing.
 */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const raw = (await params).name;
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    /* already decoded */
  }
  if (!isStoredName(name)) return new Response("not found", { status: 404 });
  const file = path.join(MUSIC_DIR, name);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return new Response("not found", { status: 404 });

  const type = TYPE[name.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
  const size = info.size;
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);

  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
      status: 206,
      headers: {
        "content-type": type,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${size}`,
        "accept-ranges": "bytes",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "content-type": type,
      "content-length": String(size),
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=3600",
    },
  });
}
