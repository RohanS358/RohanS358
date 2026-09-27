import { NextResponse } from "next/server";
import { COOKIE, checkLogin, isAdmin, sessionToken } from "@/lib/admin";

/* Who am I / log in / log out, for the corkboard. */

export async function GET(req: Request) {
  return NextResponse.json({ admin: isAdmin(req.headers.get("cookie")) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!checkLogin(body?.username, body?.password)) {
    return NextResponse.json({ admin: false, error: "nope. wrong combo." }, { status: 401 });
  }
  const res = NextResponse.json({ admin: true });
  res.cookies.set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ admin: false });
  res.cookies.delete(COOKIE);
  return res;
}
