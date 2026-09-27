import { readFile } from "node:fs/promises";
import { FILE_NAME, filePath } from "@/lib/media";

const TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

/* Names are random ids and never reused, so a file can be cached forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!FILE_NAME.test(name)) return new Response("not found", { status: 404 });
  try {
    const data = await readFile(filePath(name));
    return new Response(data, {
      headers: {
        "content-type": TYPE[name.split(".").pop()!],
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
