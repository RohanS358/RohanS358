import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { isAdmin } from "@/lib/admin";
import {
  EXT,
  cleanHref,
  cleanText,
  deleteFile,
  readMedia,
  saveFile,
  writeMedia,
  type MediaItem,
} from "@/lib/media";

/* List (anyone) · upload / edit / reorder / delete (admin). */

const MAX = 60 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({ items: await readMedia() });
}

const deny = () => NextResponse.json({ error: "admins only" }, { status: 401 });

export async function POST(req: Request) {
  if (!isAdmin(req.headers.get("cookie"))) return deny();
  const form = await req.formData().catch(() => null);
  const full = form?.get("full");
  const preview = form?.get("preview");
  if (!(full instanceof File) || !(preview instanceof File)) {
    return NextResponse.json({ error: "need an image" }, { status: 400 });
  }
  const fullExt = EXT[full.type];
  const prevExt = EXT[preview.type];
  if (!fullExt || !prevExt) return NextResponse.json({ error: "jpg, png, webp, avif or gif only" }, { status: 400 });
  if (full.size > MAX) return NextResponse.json({ error: "that one's over 60MB" }, { status: 413 });

  const id = randomBytes(6).toString("hex");
  const item: MediaItem = {
    id,
    kind: form?.get("kind") === "social" ? "social" : "gallery",
    title: cleanText(form?.get("title")),
    href: cleanHref(form?.get("href")),
    label: cleanText(form?.get("label"), 40).toLowerCase(),
    w: Math.max(1, Number(form?.get("w")) || 1),
    h: Math.max(1, Number(form?.get("h")) || 1),
    full: `${id}-full.${fullExt}`,
    preview: `${id}-preview.${prevExt}`,
    created: Date.now(),
  };

  try {
    await saveFile(item.full, await full.arrayBuffer());
    await saveFile(item.preview, await preview.arrayBuffer());
    await writeMedia([item, ...(await readMedia())]);
  } catch (e) {
    return NextResponse.json({ error: `could not save: ${(e as Error).message}` }, { status: 500 });
  }
  return NextResponse.json({ item });
}

/** Edit text fields, or reorder with `{ order: id[] }`. */
export async function PATCH(req: Request) {
  if (!isAdmin(req.headers.get("cookie"))) return deny();
  const body = await req.json().catch(() => null);
  let items = await readMedia();
  if (Array.isArray(body?.order)) {
    const rank = new Map((body.order as unknown[]).map((id, i) => [String(id), i]));
    items = [...items].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
  } else {
    items = items.map((i) =>
      i.id === body?.id
        ? {
            ...i,
            title: body.title !== undefined ? cleanText(body.title) : i.title,
            href: body.href !== undefined ? cleanHref(body.href) : i.href,
            label: body.label !== undefined ? cleanText(body.label, 40).toLowerCase() : i.label,
          }
        : i,
    );
  }
  await writeMedia(items);
  return NextResponse.json({ items });
}

export async function DELETE(req: Request) {
  if (!isAdmin(req.headers.get("cookie"))) return deny();
  const id = new URL(req.url).searchParams.get("id");
  const items = await readMedia();
  const gone = items.find((i) => i.id === id);
  if (gone) {
    await deleteFile(gone.full);
    await deleteFile(gone.preview);
  }
  await writeMedia(items.filter((i) => i.id !== id));
  return NextResponse.json({ ok: true });
}
