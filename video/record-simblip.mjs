// Records Simblip actually being used, for the "in use" half of the video.
// Same local-mode flow as simblip/scripts/capture-docs.mjs — in-browser DB,
// seeded local account, nothing touches production.
//
//   (in ../simblip)  NEXT_PUBLIC_CLOUD=0 npm run build && NEXT_PUBLIC_CLOUD=0 npx next start -p 3114
//   node record-simblip.mjs      -> public/simblip-use.mp4 + public/simblip-use.json

import { chromium } from "playwright-core";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = "http://localhost:3114";
const ACCOUNT = { email: "aalubhentakobhi@simblip.dev", password: "loonivaislobhi", id: "user-operator" };
const TERMS_VERSION = "2026-08-13";
const VIEWPORT = { width: 1440, height: 900 };
const consent = ([v, id]) => {
  try {
    localStorage.setItem(`simblip-consent:${id}`, JSON.stringify({ state: { acceptedVersion: v, analytics: false, storageNoticeSeen: true }, version: 0 }));
  } catch {}
};

const browser = await chromium.launch({ executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome` });

// 1. Sign in + burn the first-run walkthrough, off camera.
let ctx = await browser.newContext({ viewport: VIEWPORT });
let page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.locator("input[type=text]").fill(ACCOUNT.email);
await page.locator("input[type=password]").fill(ACCOUNT.password);
await page.locator('button:has-text("Sign in")').click();
await page.waitForTimeout(6000);
let state = await ctx.storageState();
await ctx.close();

ctx = await browser.newContext({ viewport: VIEWPORT, storageState: state });
await ctx.addInitScript(consent, [TERMS_VERSION, ACCOUNT.id]);
page = await ctx.newPage();
await page.goto(`${BASE}/notebook`, { waitUntil: "networkidle" });
await page.waitForTimeout(9000);
const exit = page.locator('button[title="Exit Walkthrough"]');
if (await exit.count()) { await exit.first().click({ force: true }); await page.waitForTimeout(1200); }
state = await ctx.storageState();
await ctx.close();

// 2. The take. Board prepared off camera would be cheating less than it looks,
//    but the palette clicks ARE the "using it naturally" part, so they stay in.
ctx = await browser.newContext({
  viewport: VIEWPORT,
  storageState: state,
  deviceScaleFactor: 2,
});
await ctx.addInitScript(consent, [TERMS_VERSION, ACCOUNT.id]);
// Headless video has no cursor; draw one that follows the real pointer events.
await ctx.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#0d0d0d" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", transition: "transform 90ms" });
    document.body.append(c);
    const at = (e) => (c.style.left = e.clientX - 3 + "px", c.style.top = e.clientY - 2 + "px");
    addEventListener("mousemove", at, true);
    addEventListener("mousedown", (e) => { at(e); c.style.transform = "scale(.82)"; }, true);
    addEventListener("mouseup", () => (c.style.transform = ""), true);
  });
});
page = await ctx.newPage();
// Chrome's own screencast: captures at device pixels (Playwright's recordVideo is 1x only).
const FR = "out/frames";
rmSync(FR, { recursive: true, force: true }); mkdirSync(FR, { recursive: true });
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const f = `${FR}/${String(frames.length).padStart(5, "0")}.jpg`;
  writeFileSync(f, Buffer.from(data, "base64"));
  frames.push({ f, t: metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 2880, maxHeight: 1800 });
const t0 = Date.now();
const startWall = t0 / 1000;
const marks = {};
const cursor = [];
const mark = (k) => (marks[k] = Date.now() / 1000 - startWall);

await page.goto(`${BASE}/notebook`, { waitUntil: "networkidle" });
await page.waitForTimeout(5000);
const exit2 = page.locator(`button[title="Exit Walkthrough"]`);
if (await exit2.count()) { await exit2.first().click({ force: true }); await page.waitForTimeout(800); }

let cur = { x: 1100, y: 500 };
const glide = async (x, y) => {
  // Eased, slightly curved path — reads like a hand, not a teleport.
  const n = 28, mx = (cur.x + x) / 2 + (y - cur.y) * 0.12, my = (cur.y + y) / 2 - (x - cur.x) * 0.12;
  for (let i = 1; i <= n; i++) {
    const t = i / n, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2, u = 1 - e;
    const px = u * u * cur.x + 2 * u * e * mx + e * e * x, py = u * u * cur.y + 2 * u * e * my + e * e * y;
    await page.mouse.move(px, py);
    cursor.push([+(Date.now() / 1000 - startWall).toFixed(3), Math.round(px), Math.round(py)]);
    await page.waitForTimeout(12);
  }
  cur = { x, y };
};
const clickAt = async (x, y) => { await glide(x, y); await page.waitForTimeout(120); await page.mouse.click(x, y); await page.waitForTimeout(380); };
const clickEl = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  await clickAt(b.x + b.width / 2, b.y + b.height / 2);
};
const pressed = async (l) => (await page.locator(`button[aria-label="${l}"]`).first().getAttribute("aria-pressed")) === "true";
const section = async (l) => { if (!(await pressed(l))) { await clickEl(page.locator(`button[aria-label="${l}"]`).first()); await page.waitForTimeout(700); } };
const arm = async (name, ...pts) => {
  await section("Components");
  await clickEl(page.locator("button").filter({ hasText: new RegExp(`^${name}$`) }).first());
  for (const [x, y] of pts) await clickAt(x, y);
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
};

// Fresh whiteboard.
await section("Notebook");
await clickEl(page.locator('button[aria-label="Add page"]').first()); await page.waitForTimeout(900);
await clickEl(page.locator('button:has-text("Whiteboard")').first()); await page.waitForTimeout(700);
const nb = page.locator("[role=dialog] input").first();
if (await nb.count()) await nb.fill("Homework, but it moves");
await clickEl(page.locator('[role=dialog] button:has-text("Create")').first()); await page.waitForTimeout(2000);

mark("build");
await arm("Ground", [950, 640]);
await arm("Mass", [850, 170], [990, 110]);
await arm("Block", [1080, 210]);
for (const l of ["Components", "Notebook", "Properties", "Tools"]) if (await pressed(l)) { await clickEl(page.locator(`button[aria-label="${l}"]`).first()); break; }
await page.waitForTimeout(600);
await glide(...(await (async () => { const b = await page.locator('button[aria-label="Play"]').first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; })()));
await page.waitForTimeout(250);
mark("play");
await page.mouse.down(); await page.mouse.up();
await page.waitForTimeout(4500);
mark("end");

await cdp.send("Page.stopScreencast");
await ctx.close();
// Frames arrive only on repaint, so stitch them with their real durations, then
// resample to a constant 30fps. Timeline stays in wall-clock seconds from t0.
const list = frames.map((x, i) => `file '${x.f.slice(4)}'\nduration ${((frames[i + 1]?.t ?? x.t + 0.5) - x.t).toFixed(4)}`).join("\n");
writeFileSync("out/frames.txt", list + `\nfile '${frames.at(-1).f.slice(4)}'\n`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-i", "out/frames.txt", "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "14", "public/simblip-use.mp4"]);
rmSync(FR, { recursive: true, force: true }); rmSync("out/frames.txt");
// Shift marks so they're relative to the first captured frame.
const off = frames[0].t - startWall;
for (const k in marks) marks[k] = +(marks[k] - off).toFixed(3);
marks.cursor = cursor.map(([t, x, y]) => [+(t - off).toFixed(3), x, y]);
writeFileSync("public/simblip-use.json", JSON.stringify(marks));
await browser.close();
console.log(marks.build, marks.play, marks.end, marks.cursor.length);
