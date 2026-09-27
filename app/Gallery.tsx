"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUp, ArrowUpRight, ImagePlus, LogOut, Pencil, X } from "lucide-react";
import type { MediaItem, MediaKind } from "@/lib/media";
import { AdminLogin, logout, useAdmin } from "./Admin";
import { PROFILE } from "./content";

/**
 * Masonry for Rohan's work — the Gallery and Socials sections.
 *
 * Layout is computed, not CSS columns: each piece drops into the
 * shortest column, and every brick is absolutely placed with a
 * transform. That's what makes it fluid — filtering or resizing only
 * changes numbers, and the CSS transition glides every brick to its new
 * spot instead of the grid snapping. Bricks unmask as they scroll into
 * view, and a "view ↗" cursor follows the pointer over them.
 */

const PLATFORMS = ["instagram", "behance", "dribbble", "linkedin", "x", "youtube", "pinterest", "tiktok", "facebook", "threads"];

const GAP = 16;
/* Big pictures first: two wide columns on most screens, three only
   when the panel is genuinely huge. */
const columnsFor = (w: number) => (w < 640 ? 1 : w < 1500 ? 2 : 3);
const file = (name: string) => `/api/media/file/${name}`;

/** Decode once, keep the original untouched, send a ~1400px webp preview alongside.
    A GIF is its own preview: a canvas would freeze it on the first frame. */
async function prepare(f: File) {
  const bitmap = await createImageBitmap(f);
  if (f.type === "image/gif") return { preview: f as Blob, w: bitmap.width, h: bitmap.height };
  const k = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * k);
  c.height = Math.round(bitmap.height * k);
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  const preview = await new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("preview failed"))), "image/webp", 0.86),
  );
  return { preview, w: bitmap.width, h: bitmap.height };
}

function upload(form: FormData, onProgress: (p: number) => void) {
  return new Promise<MediaItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status < 300) resolve(body.item);
      else reject(new Error(body.error ?? `upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(form);
  });
}

function Uploader({ kind, labels, onDone }: { kind: MediaKind; labels: string[]; onDone: (i: MediaItem) => void }) {
  const [fileSel, setFileSel] = useState<File | null>(null);
  const [thumb, setThumb] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = (f?: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFileSel(f);
    setThumb(URL.createObjectURL(f));
    setError("");
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fileSel) return setError("pick an image first");
    const fields = new FormData(e.currentTarget);
    try {
      setProgress(0);
      const { preview, w, h } = await prepare(fileSel);
      const form = new FormData();
      form.set("full", fileSel);
      form.set(
        "preview",
        preview instanceof File ? preview : new File([preview], "preview.webp", { type: "image/webp" }),
      );
      form.set("kind", kind);
      form.set("w", String(w));
      form.set("h", String(h));
      for (const k of ["title", "href", "label"]) form.set(k, String(fields.get(k) ?? ""));
      const item = await upload(form, setProgress);
      onDone(item);
      setFileSel(null);
      setThumb("");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const options = kind === "social" ? [...new Set([...PLATFORMS, ...labels])] : labels;

  return (
    <form className="uploader" onSubmit={submit}>
      <button
        type="button"
        className="uploader__drop"
        data-over={over || undefined}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb ? <img src={thumb} alt="" /> : (
          <>
            <ImagePlus size={22} strokeWidth={1.5} />
            <span>drop a full-quality image<br />or click to pick</span>
          </>
        )}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="uploader__fields">
        <input name="title" placeholder="title" maxLength={120} />
        <input name="href" placeholder="link — https://…" type="url" />
        <input name="label" placeholder={kind === "social" ? "platform (instagram, behance…)" : "tag (branding, ui, 3d…)"} list={`labels-${kind}`} />
        <datalist id={`labels-${kind}`}>
          {options.map((l) => <option key={l} value={l} />)}
        </datalist>
        {error ? <p className="uploader__error">{error}</p> : null}
        <button type="submit" disabled={progress !== null}>
          {progress === null ? "pin it to the wall" : `uploading ${Math.round(progress * 100)}%`}
          {progress !== null ? <i style={{ width: `${progress * 100}%` }} /> : null}
        </button>
      </div>
    </form>
  );
}

export default function Gallery({ kind, active }: { kind: MediaKind; active: boolean }) {
  const { admin, setAdmin } = useAdmin();
  const [all, setAll] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [width, setWidth] = useState(0);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const wall = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    void fetch("/api/media").then((r) => r.json()).then((d) => setAll(d.items ?? []));
  }, []);
  useEffect(load, [load]);

  const items = useMemo(() => all.filter((i) => i.kind === kind), [all, kind]);
  const labels = useMemo(() => [...new Set(items.map((i) => i.label).filter(Boolean))], [items]);

  useLayoutEffect(() => {
    const el = wall.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Shortest-column packing. A filtered-out brick fades where it sits
     in the unfiltered wall, so the survivors visibly close the gap. */
  const pack = (list: MediaItem[]) => {
    const cols = columnsFor(width || 1000);
    const colW = ((width || 1000) - GAP * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    const place = new Map<string, { x: number; y: number; w: number; h: number; col: number }>();
    for (const item of list) {
      const col = heights.indexOf(Math.min(...heights));
      const h = (colW * item.h) / item.w;
      place.set(item.id, { x: col * (colW + GAP), y: heights[col], w: colW, h, col });
      heights[col] += h + GAP;
    }
    return { place, height: Math.max(0, ...heights) };
  };
  const layout = pack(filter === "all" ? items : items.filter((i) => i.label === filter));
  const everything = pack(items);

  /* Scroll reveal: a brick unmasks the first time it enters the panel.
     Reopening the tab re-arms it so the wall builds itself again. */
  useEffect(() => {
    const root = scroller.current;
    if (!active || !root || !wall.current) return;
    const bricks = [...wall.current.querySelectorAll<HTMLElement>(".brick")];
    bricks.forEach((b) => b.removeAttribute("data-in"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        }
      },
      { root, rootMargin: "0px 0px -8% 0px" },
    );
    const t = requestAnimationFrame(() => bricks.forEach((b) => io.observe(b)));
    return () => {
      cancelAnimationFrame(t);
      io.disconnect();
    };
  }, [active, items.length]);

  /* The follow cursor. */
  useEffect(() => {
    const c = cursor.current;
    const root = scroller.current;
    if (!c || !root) return;
    const x = gsap.quickTo(c, "x", { duration: 0.45, ease: "power3" });
    const y = gsap.quickTo(c, "y", { duration: 0.45, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      x(e.clientX - r.left);
      y(e.clientY - r.top);
      const on = (e.target as HTMLElement).closest(".brick:not([data-out])");
      c.toggleAttribute("data-on", !!on && !(e.target as HTMLElement).closest(".brick__tools"));
    };
    const leave = () => c.removeAttribute("data-on");
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", leave);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
    };
  }, []);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/media", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) setAdmin(false);
    else setAll((await res.json()).items);
  };

  const remove = async (id: string) => {
    const el = wall.current?.querySelector(`[data-brick="${id}"]`);
    if (el) await gsap.to(el, { scale: 0.85, autoAlpha: 0, duration: 0.4, ease: "power2.in" });
    await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    setAll((list) => list.filter((i) => i.id !== id));
  };

  const toFront = (id: string) => void patch({ order: [id, ...all.filter((i) => i.id !== id).map((i) => i.id)] });

  const title = kind === "social" ? "socials" : "designs";

  return (
    <div className="gallery" data-kind={kind}>
      <div className="gallery__scroll" ref={scroller}>
        <header className="gallery__head">
          <div>
            <p className="gallery__kicker">{title}</p>
            <h2 className="gallery__title">
              {kind === "social" ? "posted, on purpose." : "things I made look good."}
            </h2>
          </div>
          <div className="gallery__meta">
            {kind === "social" && PROFILE.instagram ? (
              <a className="gallery__follow" href={PROFILE.instagram} target="_blank" rel="noopener noreferrer">
                <i className="logo" style={{ maskImage: "url(/stack/instagram.svg)", WebkitMaskImage: "url(/stack/instagram.svg)" }} aria-hidden />
                @r0han_slngh <ArrowUpRight size={13} />
              </a>
            ) : null}
            <span className="gallery__count">
              {String(layout.place.size).padStart(2, "0")}
              <small>{layout.place.size === 1 ? "piece" : "pieces"}</small>
            </span>
            {admin ? (
              <div className="gallery__admin">
                <button className="gallery__add" onClick={() => setAdding((v) => !v)} data-open={adding || undefined}>
                  <ImagePlus size={15} /> {adding ? "close" : "add work"}
                </button>
                <button className="gallery__out" onClick={() => logout(setAdmin)} aria-label="Log out">
                  <LogOut size={14} />
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {labels.length > 1 ? (
          <nav className="gallery__filters" aria-label="Filter">
            {["all", ...labels].map((l) => (
              <button key={l} data-active={filter === l || undefined} onClick={() => setFilter(l)}>
                {kind === "social" && PLATFORMS.includes(l) ? (
                  <i className="logo" style={{ maskImage: `url(/stack/${l}.svg)`, WebkitMaskImage: `url(/stack/${l}.svg)` }} aria-hidden />
                ) : null}
                {l}
              </button>
            ))}
          </nav>
        ) : null}

        {admin && adding ? (
          <Uploader
            kind={kind}
            labels={labels}
            onDone={(item) => {
              setAll((list) => [item, ...list]);
              setFilter("all");
            }}
          />
        ) : null}

        <div className="gallery__wall" ref={wall} style={{ height: layout.height }}>
          {items.map((item, i) => {
            const p = layout.place.get(item.id) ?? everything.place.get(item.id);
            const out = !layout.place.has(item.id);
            if (!p) return null;
            return (
              <div
                key={item.id}
                data-brick={item.id}
                className="brick"
                data-out={out || undefined}
                style={
                  {
                    width: p.w,
                    height: p.h,
                    transform: `translate(${p.x}px, ${p.y}px)`,
                    "--d": `${(p.col * 70 + (i % 3) * 40)}ms`,
                  } as React.CSSProperties
                }
              >
                {/* `.skip` keeps the class router's link handler off it. */}
                <a
                  className="brick__link skip"
                  href={item.href || file(item.full)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.title || "open"}
                  tabIndex={out ? -1 : 0}
                >
                <span className="brick__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file(item.preview)} alt={item.title} loading="lazy" decoding="async" draggable={false} />
                </span>
                <span className="brick__caption">
                  {item.label ? (
                    <em>
                      {kind === "social" && PLATFORMS.includes(item.label) ? (
                        <i className="logo" style={{ maskImage: `url(/stack/${item.label}.svg)`, WebkitMaskImage: `url(/stack/${item.label}.svg)` }} aria-hidden />
                      ) : null}
                      {item.label}
                    </em>
                  ) : null}
                  {item.title ? <strong>{item.title}</strong> : null}
                </span>
                </a>

                {admin ? (
                  <span className="brick__tools">
                    <button aria-label="Edit" onClick={() => setEditing(editing === item.id ? null : item.id)}><Pencil size={12} /></button>
                    <button aria-label="Move to front" onClick={() => toFront(item.id)}><ArrowUp size={12} /></button>
                    <button aria-label="Delete" onClick={() => void remove(item.id)}><X size={12} /></button>
                  </span>
                ) : null}

                {admin && editing === item.id ? (
                  <span className="brick__edit">
                    {(["title", "href", "label"] as const).map((k) => (
                      <input
                        key={k}
                        defaultValue={item[k]}
                        placeholder={k === "href" ? "https://…" : k}
                        onBlur={(e) => e.target.value !== item[k] && void patch({ id: item.id, [k]: e.target.value })}
                      />
                    ))}
                    <button onClick={() => setEditing(null)}>done</button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p className="gallery__empty">
            {admin ? "empty wall. hit “add work” and flex a little." : "nothing hung up yet. rohan's picking frames."}
          </p>
        ) : null}
      </div>

      <div className="gallery__cursor" ref={cursor} aria-hidden>
        view <ArrowUpRight size={13} />
      </div>

      <AdminLogin className="gallery__login" />
    </div>
  );
}
