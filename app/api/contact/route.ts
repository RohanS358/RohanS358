import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { PROFILE } from "@/app/content";

/* The contact form. Sends through the host's sendmail (every cPanel box
   has one) — no mail service, no dependency. SENDMAIL overrides the path. */

const SENDMAIL = process.env.SENDMAIL ?? "/usr/sbin/sendmail";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ponytail: per-process memory, resets on restart; fine for one small box.
const recent = new Map<string, number>();

/* Header values get one line, trimmed, capped — no header injection. */
const line = (s: unknown, max: number) => String(s ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ ok: true }); // honeypot: bots get a fake yes

  const name = line(body.name, 80);
  const email = line(body.email, 120);
  const message = String(body.message ?? "").trim().slice(0, 5000);
  if (!name || !EMAIL.test(email) || message.length < 2) {
    return NextResponse.json({ error: "need a name, a real email and a message" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "?";
  const now = Date.now();
  if (now - (recent.get(ip) ?? 0) < 60_000) {
    return NextResponse.json({ error: "one message a minute, please" }, { status: 429 });
  }
  recent.set(ip, now);

  const mail = [
    `To: ${PROFILE.email}`,
    `Reply-To: ${name} <${email}>`,
    `Subject: [site] ${name}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    message,
    "",
    `— ${name} <${email}>`,
  ].join("\n");

  try {
    await new Promise<void>((ok, fail) => {
      const p = spawn(SENDMAIL, ["-t", "-i"]);
      p.on("error", fail);
      p.on("close", (code) => (code === 0 ? ok() : fail(new Error(`sendmail exited ${code}`))));
      p.stdin.end(mail);
    });
  } catch (e) {
    console.error("contact:", e);
    return NextResponse.json({ error: "mail is down — copy the address instead" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
