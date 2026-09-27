import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths";

/**
 * The corkboard's one admin, and where the board lives.
 *
 * Credentials come from ADMIN_USER / ADMIN_PASS and fall back to the
 * pair Rohan asked for (rohan / admin). The session cookie is an HMAC
 * keyed on the password, so changing the password logs every session
 * out, and knowing the cookie format is useless without the password.
 */

const USER = process.env.ADMIN_USER ?? "rohan";
const PASS = process.env.ADMIN_PASS ?? "admin";
export const COOKIE = "board_admin";

const token = () =>
  createHmac("sha256", `${process.env.ADMIN_SECRET ?? ""}:${PASS}`).update(USER).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const checkLogin = (user: unknown, pass: unknown) =>
  typeof user === "string" && typeof pass === "string" && same(user, USER) && same(pass, PASS);

export const sessionToken = token;

export function isAdmin(cookieHeader: string | null | undefined) {
  const value = cookieHeader
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return !!value && same(value, token());
}

/* ---------- Board storage ----------

   ponytail: a JSON file on disk. Works in dev and on any host with a
   writable disk; Vercel's filesystem is read-only, so production saves
   need Blob/KV swapped in behind readBoard/writeBoard. */

const FILE = path.join(DATA_DIR, "board.json");

export type BoardItem = {
  id: string;
  type: "note" | "photo" | "card" | "ticket" | "tag" | "todo" | "stamp";
  x: number;
  y: number;
  rot: number;
  z: number;
  color?: string;
  fastener?: "pin" | "tape";
  title?: string;
  text?: string;
  src?: string;
  href?: string;
  todos?: { t: string; done: boolean }[];
};

/** A red string tied between two pins, by their ids. */
export type Thread = { id: string; a: string; b: string };

export type Board = { items: BoardItem[]; threads?: Thread[] };

const SEED: Board = {
  items: [
    { id: "s1", type: "note", x: 6, y: 8, rot: -4, z: 1, color: "yellow", fastener: "pin", text: "welcome to my corkboard.\nI pin stuff here.\nyou can look. no touching." },
    { id: "s2", type: "stamp", x: 58, y: 10, rot: 8, z: 2, color: "red", text: "WIP" },
    { id: "s3", type: "todo", x: 32, y: 36, rot: 2, z: 3, fastener: "tape", title: "today", todos: [
      { t: "finish portfolio", done: false },
      { t: "drink water", done: true },
      { t: "touch grass", done: false },
    ] },
    { id: "s4", type: "ticket", x: 62, y: 44, rot: -6, z: 4, color: "peach", title: "SIMBLIP v2", text: "509 commits and counting" },
    { id: "s5", type: "card", x: 8, y: 52, rot: 3, z: 5, fastener: "pin", title: "currently", text: "building things that run.\nbreaking things that don't." },
    { id: "s6", type: "tag", x: 40, y: 72, rot: 12, z: 6, text: "github", href: "https://github.com/RohanS358" },
  ],
  threads: [
    { id: "t1", a: "s1", b: "s3" },
    { id: "t2", a: "s3", b: "s4" },
    { id: "t3", a: "s5", b: "s3" },
  ],
};

export async function readBoard(): Promise<Board> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Board;
  } catch {
    return SEED;
  }
}

const TYPES = new Set(["note", "photo", "card", "ticket", "tag", "todo", "stamp"]);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const num = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;

/** Whitelist every field: the board is rendered to every visitor. */
export function sanitize(input: unknown): Board | null {
  const items = (input as Board)?.items;
  if (!Array.isArray(items) || items.length > 200) return null;
  const out: BoardItem[] = [];
  for (const i of items) {
    if (!i || !TYPES.has(i.type) || typeof i.id !== "string") return null;
    const src = str(i.src, 3_000_000);
    const href = str(i.href, 500);
    out.push({
      id: i.id.slice(0, 40),
      type: i.type,
      x: num(i.x, 0, 100),
      y: num(i.y, 0, 100),
      rot: num(i.rot, -30, 30),
      z: num(i.z, 0, 10_000),
      color: str(i.color, 20),
      fastener: i.fastener === "tape" ? "tape" : i.fastener === "pin" ? "pin" : undefined,
      title: str(i.title, 200),
      text: str(i.text, 2000),
      src: src && /^(data:image\/(png|jpeg|webp|gif);base64,|\/(?!\/)|https:\/\/)/.test(src) ? src : undefined,
      href: href && /^https?:\/\//.test(href) ? href : undefined,
      todos: Array.isArray(i.todos)
        ? i.todos.slice(0, 20).map((t) => ({ t: str(t?.t, 200) ?? "", done: !!t?.done }))
        : undefined,
    });
  }
  const ids = new Set(out.map((i) => i.id));
  const raw = (input as Board).threads;
  const threads = Array.isArray(raw)
    ? raw
        .slice(0, 300)
        .filter((t) => t && typeof t.id === "string" && ids.has(t.a) && ids.has(t.b) && t.a !== t.b)
        .map((t) => ({ id: t.id.slice(0, 40), a: t.a, b: t.b }))
    : [];
  return { items: out, threads };
}

export async function writeBoard(board: Board) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(board));
}
