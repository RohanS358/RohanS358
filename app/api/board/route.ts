import { NextResponse } from "next/server";
import { isAdmin, readBoard, sanitize, writeBoard } from "@/lib/admin";

export async function GET() {
  return NextResponse.json(await readBoard());
}

export async function PUT(req: Request) {
  if (!isAdmin(req.headers.get("cookie"))) {
    return NextResponse.json({ error: "admins only" }, { status: 401 });
  }
  const board = sanitize(await req.json().catch(() => null));
  if (!board) return NextResponse.json({ error: "bad board" }, { status: 400 });
  try {
    await writeBoard(board);
  } catch (e) {
    /* Read-only filesystem (e.g. Vercel) lands here. */
    return NextResponse.json({ error: `could not save: ${(e as Error).message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
