"use client";

import { useEffect, useRef } from "react";
import { beat } from "@/lib/beat";

/**
 * The ground the bento sits on, living its own life.
 *
 * One canvas behind the cards, seen through the margins and gaps:
 * soft clouds drifting, a sun turning in the corner, birds crossing now
 * and then, dust motes rising. Everything is kept faint — it's texture,
 * not content. Colours come from the palette the page picked on load.
 * It draws one still frame when reduced motion is requested.
 */

type Cloud = { x: number; y: number; s: number; v: number };
type Bird = { x: number; y: number; v: number; t: number; dir: 1 | -1 };
type Mote = { x: number; y: number; v: number; r: number; t: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function Ambient() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(cv.parentElement!);
    const ground = css.getPropertyValue("--ground").trim() || "#e6e6e4";
    const accent = css.getPropertyValue("--pink").trim() || "#f7a6f2";
    const deep = css.getPropertyValue("--deep").trim() || "#6b6b6b";

    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth;
      H = innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    const clouds: Cloud[] = Array.from({ length: 7 }, () => ({
      x: rand(0, W), y: rand(-10, H), s: rand(0.6, 1.6), v: rand(5, 13),
    }));
    const motes: Mote[] = Array.from({ length: 26 }, () => ({
      x: rand(0, W), y: rand(0, H), v: rand(6, 16), r: rand(1, 2.4), t: rand(0, 10),
    }));
    const birds: Bird[] = [];
    let nextBird = rand(2, 5);
    let sun = 0;

    const cloud = (c: Cloud) => {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      const r = 26 * c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.arc(c.x + r * 1.1, c.y - r * 0.35, r * 1.2, 0, Math.PI * 2);
      ctx.arc(c.x + r * 2.3, c.y, r * 0.9, 0, Math.PI * 2);
      ctx.rect(c.x, c.y, r * 2.3, r * 0.9);
      ctx.fill();
    };

    const bird = (b: Bird) => {
      const flap = Math.sin(b.t * 9) * 5;
      ctx.strokeStyle = deep;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - 7, b.y - flap);
      ctx.quadraticCurveTo(b.x - 3, b.y - 2, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y - 2, b.x + 7, b.y - flap);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const draw = (dt: number) => {
      const b = beat.level;
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, W, H);
      /* On a kick the whole ground flushes toward the accent. */
      if (b > 0.02) {
        ctx.globalAlpha = b * 0.1;
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      /* Sun, peeking in from the top-right corner, turning slowly. */
      sun += dt * 0.15;
      ctx.save();
      ctx.translate(W - 8, 8);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, 38 * (1 + b * 0.35), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 3;
      ctx.strokeStyle = accent;
      ctx.lineCap = "round";
      for (let i = 0; i < 12; i++) {
        const a = sun + (i * Math.PI) / 6;
        ctx.beginPath();
        const reach = 62 + b * 26;
        ctx.moveTo(Math.cos(a) * 48, Math.sin(a) * 48);
        ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      for (const c of clouds) {
        c.x += c.v * dt;
        if (c.x > W + 40) {
          c.x = -140 * c.s;
          c.y = rand(-10, H);
        }
        cloud(c);
      }

      ctx.fillStyle = accent;
      for (const m of motes) {
        m.t += dt;
        m.y -= m.v * (1 + b * 4) * dt;
        m.x += Math.sin(m.t * 0.8) * 6 * dt;
        if (m.y < -6) {
          m.y = H + 6;
          m.x = rand(0, W);
        }
        ctx.globalAlpha = 0.16 + Math.sin(m.t * 2) * 0.07;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * (1 + b * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      nextBird -= dt;
      if (nextBird <= 0) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const flock = Math.random() < 0.4 ? 3 : 1;
        const y = rand(H * 0.08, H * 0.7);
        for (let i = 0; i < flock; i++) {
          birds.push({ x: dir > 0 ? -20 - i * 18 : W + 20 + i * 18, y: y + i * 10, v: rand(55, 85), t: rand(0, 3), dir });
        }
        nextBird = rand(5, 11);
      }
      for (let i = birds.length - 1; i >= 0; i--) {
        const b = birds[i];
        b.t += dt;
        b.x += b.v * b.dir * dt;
        b.y += Math.sin(b.t * 1.5) * 8 * dt;
        if (b.x < -60 || b.x > W + 60) birds.splice(i, 1);
        else bird(b);
      }

    };

    if (still) {
      draw(0);
      return () => removeEventListener("resize", resize);
    }

    let raf = 0;
    let last = performance.now();
    const bento = cv.closest(".bento");
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      /* Nobody sees the ground under a phone's full-screen sheet; don't
         spend the frame budget painting it while the sheet moves. */
      if (!bento?.hasAttribute("data-sheet") || innerWidth > 900) draw(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="ambient" ref={canvas} aria-hidden />;
}
