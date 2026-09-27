"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowUpToLine,
  Check,
  CreditCard,
  Image as ImageIcon,
  ListChecks,
  LogOut,
  Palette,
  RotateCw,
  Spline,
  Stamp,
  StickyNote,
  Tag,
  Ticket,
  X,
} from "lucide-react";
import type { Board, BoardItem, Thread } from "@/lib/admin";
import { AdminLogin, logout, useAdmin } from "./Admin";

/**
 * The corkboard: the Information tab's resting state.
 *
 * Everyone sees it; only the admin (rohan / admin, see lib/admin.ts)
 * can pin, drag, edit and bin things. Positions are stored as percent
 * of the board so a pin lands in the same spot on any screen size.
 */

type Kind = BoardItem["type"];

const PALETTE: Record<Kind, string[]> = {
  note: ["yellow", "pink", "mint", "blue", "orange"],
  ticket: ["peach", "lilac", "mint", "yellow"],
  stamp: ["red", "blue", "green"],
  card: ["cream", "white"],
  photo: ["white"],
  tag: ["kraft"],
  todo: ["white", "yellow"],
};

const uid = () => Math.random().toString(36).slice(2, 10);
const jitter = (n: number) => (Math.random() * 2 - 1) * n;

function fresh(type: Kind, z: number, src?: string): BoardItem {
  const base = {
    id: uid(),
    type,
    x: 30 + jitter(18),
    y: 26 + jitter(16),
    rot: jitter(7),
    z,
    color: PALETTE[type][Math.floor(Math.random() * PALETTE[type].length)],
    fastener: (Math.random() > 0.5 ? "pin" : "tape") as "pin" | "tape",
  };
  switch (type) {
    case "note": return { ...base, text: "new thought.\nprobably genius." };
    case "photo": return { ...base, src, text: "caption goes here" };
    case "card": return { ...base, title: "title", text: "write something smart. or don't." };
    case "ticket": return { ...base, fastener: undefined, title: "EVENT NAME", text: "date / place / vibes" };
    case "tag": return { ...base, fastener: undefined, text: "a link", href: "https://" };
    case "todo": return { ...base, title: "to do", todos: [{ t: "something", done: false }] };
    case "stamp": return { ...base, fastener: undefined, text: "SHIPPED" };
  }
}

/** Shrink an upload so the board JSON doesn't balloon. A small GIF is
    kept as-is so it still moves; a big one is flattened like a photo. */
function downscale(file: File, max = 900): Promise<string> {
  if (file.type === "image/gif" && file.size < 2_000_000) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- Editable text ----------

   Plain-text contentEditable: React renders the value once per change
   from outside, and we read textContent on blur. Never innerHTML. */
function Editable({
  value,
  edit,
  onChange,
  className,
  tag: Tag = "span",
}: {
  value: string;
  edit: boolean;
  onChange: (v: string) => void;
  className?: string;
  tag?: "span" | "p" | "h3";
}) {
  return (
    <Tag
      className={className}
      contentEditable={edit}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => {
        const v = (e.currentTarget as HTMLElement).innerText.replace(/\n{3,}/g, "\n\n").trim();
        if (v !== value) onChange(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
      }}
    >
      {value}
    </Tag>
  );
}

function ItemBody({
  item,
  edit,
  patch,
}: {
  item: BoardItem;
  edit: boolean;
  patch: (p: Partial<BoardItem>) => void;
}) {
  const text = item.text ?? "";
  switch (item.type) {
    case "note":
      return <Editable tag="p" className="pin__note" value={text} edit={edit} onChange={(v) => patch({ text: v })} />;

    case "photo":
      return (
        <>
          <div className="pin__photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.src ? <img src={item.src} alt={text || "pinned photo"} draggable={false} /> : null}
          </div>
          <Editable tag="p" className="pin__caption" value={text} edit={edit} onChange={(v) => patch({ text: v })} />
        </>
      );

    case "card":
      return (
        <>
          <Editable tag="h3" className="pin__card-title" value={item.title ?? ""} edit={edit} onChange={(v) => patch({ title: v })} />
          <Editable tag="p" className="pin__card-text" value={text} edit={edit} onChange={(v) => patch({ text: v })} />
        </>
      );

    case "ticket":
      return (
        <>
          <span className="pin__ticket-stub" aria-hidden>ADMIT ONE</span>
          <div className="pin__ticket-main">
            <Editable tag="h3" className="pin__ticket-title" value={item.title ?? ""} edit={edit} onChange={(v) => patch({ title: v })} />
            <Editable tag="p" className="pin__ticket-text" value={text} edit={edit} onChange={(v) => patch({ text: v })} />
            <span className="pin__ticket-no" aria-hidden>No. {item.id.slice(0, 6).toUpperCase()}</span>
          </div>
        </>
      );

    case "tag": {
      const href = item.href && /^https?:\/\/.+\..+/.test(item.href) ? item.href : undefined;
      return (
        <>
          <span className="pin__tag-hole" aria-hidden />
          {edit ? (
            <>
              <Editable tag="p" className="pin__tag-text" value={text} edit onChange={(v) => patch({ text: v })} />
              <Editable tag="p" className="pin__tag-href" value={item.href ?? ""} edit onChange={(v) => patch({ href: v })} />
            </>
          ) : href ? (
            <a className="pin__tag-text" href={href} target="_blank" rel="noopener noreferrer">
              {text} ↗
            </a>
          ) : (
            <p className="pin__tag-text">{text}</p>
          )}
        </>
      );
    }

    case "todo": {
      const todos = item.todos ?? [];
      const set = (i: number, v: Partial<{ t: string; done: boolean }>) =>
        patch({ todos: todos.map((t, j) => (j === i ? { ...t, ...v } : t)) });
      return (
        <>
          <Editable tag="h3" className="pin__todo-title" value={item.title ?? ""} edit={edit} onChange={(v) => patch({ title: v })} />
          <ul className="pin__todo-list">
            {todos.map((t, i) => (
              <li key={i} data-done={t.done || undefined}>
                <button
                  className="pin__check"
                  onClick={() => edit && set(i, { done: !t.done })}
                  aria-label={t.done ? "Done" : "Not done"}
                  tabIndex={edit ? 0 : -1}
                >
                  {t.done ? <Check size={11} strokeWidth={3} /> : null}
                </button>
                <Editable
                  value={t.t}
                  edit={edit}
                  onChange={(v) =>
                    v ? set(i, { t: v }) : patch({ todos: todos.filter((_, j) => j !== i) })
                  }
                />
              </li>
            ))}
          </ul>
          {edit ? (
            <button
              className="pin__todo-add"
              onClick={() => patch({ todos: [...todos, { t: "another thing", done: false }] })}
            >
              + add line
            </button>
          ) : null}
        </>
      );
    }

    case "stamp":
      return <Editable className="pin__stamp" value={text} edit={edit} onChange={(v) => patch({ text: v })} />;
  }
}

/* ---------- Threads ----------

   Red string between two pins. Each end is tied to the pin's
   `.pin__anchor` (its fastener point), measured from the DOM every
   frame while the board is on screen — so a thread follows a pin
   through its drop-in, its drag and its springy settle without any of
   those animations knowing threads exist. The string sags with its
   length, like the real thing. */
function stringPath(ax: number, ay: number, bx: number, by: number) {
  const sag = Math.min(70, Math.hypot(bx - ax, by - ay) * 0.14);
  return `M${ax} ${ay} Q${(ax + bx) / 2} ${(ay + by) / 2 + sag} ${bx} ${by}`;
}

export default function Corkboard({ active }: { active: boolean }) {
  const board = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BoardItem[] | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const { admin, setAdmin } = useAdmin();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  /** The pin a thread is being tied from, while picking the other end. */
  const [linking, setLinking] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entered = useRef(false);
  const latest = useRef<Board>({ items: [], threads: [] });
  const cursor = useRef({ x: 0, y: 0 });

  useEffect(() => {
    void fetch("/api/board")
      .then((r) => r.json())
      .then((b: Board) => {
        latest.current = { items: b.items ?? [], threads: b.threads ?? [] };
        setItems(latest.current.items);
        setThreads(latest.current.threads ?? []);
      });
  }, []);

  /* The drop-in: every pin falls onto the board, a little rotated past
     where it ends up, and settles; then the strings draw themselves
     tight between them. Plays each time the tab opens. */
  useEffect(() => {
    if (!active || !items || !board.current) {
      entered.current = false;
      return;
    }
    if (entered.current) return;
    entered.current = true;
    const pins = board.current.querySelectorAll<HTMLElement>(".pin__inner");
    gsap.fromTo(
      pins,
      { y: -70, scale: 1.18, opacity: 0, rotation: () => jitter(14) },
      { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.9, ease: "back.out(1.6)", stagger: 0.06, delay: 0.15, clearProps: "transform,opacity" },
    );
    const strings = svg.current?.querySelectorAll(".thread__line, .thread__shadow");
    if (strings?.length) {
      gsap.fromTo(strings, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.12, delay: 0.15 + pins.length * 0.06 + 0.4 });
    }
  }, [active, items]);

  /* Re-measure every thread each frame while the board is showing. */
  useEffect(() => {
    if (!active) return;
    const draw = () => {
      const b = board.current;
      const layer = svg.current;
      if (!b || !layer) return;
      const origin = b.getBoundingClientRect();
      const anchor = (id: string) => {
        const r = b.querySelector(`[data-id="${id}"] .pin__anchor`)?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2 - origin.left, y: r.top + r.height / 2 - origin.top } : null;
      };
      for (const g of layer.querySelectorAll<SVGGElement>("[data-thread]")) {
        const p = anchor(g.dataset.a!);
        const q = anchor(g.dataset.b!);
        if (!p || !q) continue;
        const d = stringPath(p.x, p.y, q.x, q.y);
        for (const path of g.querySelectorAll("path")) path.setAttribute("d", d);
        const [k1, k2] = g.querySelectorAll("circle");
        k1?.setAttribute("cx", String(p.x)); k1?.setAttribute("cy", String(p.y));
        k2?.setAttribute("cx", String(q.x)); k2?.setAttribute("cy", String(q.y));
      }
      const live = layer.querySelector<SVGGElement>("[data-live]");
      if (live) {
        const p = anchor(live.dataset.a!);
        if (p) {
          const d = stringPath(p.x, p.y, cursor.current.x - origin.left, cursor.current.y - origin.top);
          for (const path of live.querySelectorAll("path")) path.setAttribute("d", d);
        }
      }
    };
    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  }, [active]);

  /* Parallax: pins hover at different heights over the fabric (the
     higher in the stack, the higher up) and drift against the cursor,
     so the board reads as a real surface you're leaning over. */
  useEffect(() => {
    const b = board.current;
    if (!active || !b || !items) return;
    if (!matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
    const pins = [...b.querySelectorAll<HTMLElement>(".pin")].map((el) => ({
      el,
      d: Number(el.dataset.depth),
      x: gsap.quickTo(el, "x", { duration: 1, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1, ease: "power3.out" }),
    }));
    const drift = (nx: number, ny: number) => {
      for (const p of pins) {
        if (p.el.classList.contains("pin--dragging")) continue;
        p.x(nx * -26 * p.d);
        p.y(ny * -18 * p.d);
      }
    };
    const move = (e: PointerEvent) => {
      const r = b.getBoundingClientRect();
      drift((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    };
    const leave = () => drift(0, 0);
    b.addEventListener("pointermove", move);
    b.addEventListener("pointerleave", leave);
    return () => {
      b.removeEventListener("pointermove", move);
      b.removeEventListener("pointerleave", leave);
    };
  }, [active, items]);

  /* Settle everything back flat when the tab closes. */
  useEffect(() => {
    if (!active) gsap.to(board.current?.querySelectorAll(".pin") ?? [], { x: 0, y: 0, duration: 0.4 });
  }, [active]);

  /** 0.3–1 by stacking order, fed to parallax distance and shadow size. */
  const depth = (item: BoardItem) => {
    const zs = (items ?? []).map((i) => i.z).sort((a, b) => a - b);
    const rank = zs.length > 1 ? zs.indexOf(item.z) / (zs.length - 1) : 0.5;
    return +(0.3 + rank * 0.7).toFixed(2);
  };

  /* One debounced save for pins and threads together. */
  const persist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const res = await fetch("/api/board", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(latest.current),
      }).catch(() => null);
      setStatus(res?.ok ? "saved" : "error");
      if (res?.status === 401) setAdmin(false);
    }, 500);
  }, [setAdmin]);

  const update = (fn: (list: BoardItem[]) => BoardItem[]) => {
    const next = fn(latest.current.items);
    latest.current = { ...latest.current, items: next };
    setItems(next);
    persist();
  };

  const updateThreads = (fn: (list: Thread[]) => Thread[]) => {
    const next = fn(latest.current.threads ?? []);
    latest.current = { ...latest.current, threads: next };
    setThreads(next);
    persist();
  };

  const patch = (id: string, p: Partial<BoardItem>) =>
    update((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const topZ = () => Math.max(0, ...(items ?? []).map((i) => i.z)) + 1;

  const add = (type: Kind, src?: string) => {
    const item = fresh(type, topZ(), src);
    update((list) => [...list, item]);
    requestAnimationFrame(() => {
      const el = board.current?.querySelector(`[data-id="${item.id}"] .pin__inner`);
      if (el) gsap.from(el, { y: -80, scale: 1.3, opacity: 0, rotation: jitter(20), duration: 0.8, ease: "back.out(1.8)" });
    });
  };

  const remove = (id: string) => {
    const el = board.current?.querySelector(`[data-id="${id}"] .pin__inner`);
    const drop = () => {
      updateThreads((list) => list.filter((t) => t.a !== id && t.b !== id));
      update((list) => list.filter((i) => i.id !== id));
    };
    if (el) gsap.to(el, { y: 60, rotation: 25, opacity: 0, scale: 0.8, duration: 0.45, ease: "power2.in", onComplete: drop });
    else drop();
  };

  /* Tie: first pin chosen from its toolbar, second by clicking it. */
  const tie = (to: string) => {
    const from = linking;
    setLinking(null);
    if (!from || from === to) return;
    const exists = (latest.current.threads ?? []).some(
      (t) => (t.a === from && t.b === to) || (t.a === to && t.b === from),
    );
    if (exists) return;
    const id = uid();
    updateThreads((list) => [...list, { id, a: from, b: to }]);
    requestAnimationFrame(() => {
      const paths = svg.current?.querySelectorAll(`[data-thread="${id}"] .thread__line, [data-thread="${id}"] .thread__shadow`);
      if (paths?.length) gsap.fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: "power3.out" });
    });
  };

  /* Snip: the string slackens and drops away before it's removed. */
  const cut = (id: string) => {
    const g = svg.current?.querySelector(`[data-thread="${id}"]`);
    const drop = () => updateThreads((list) => list.filter((t) => t.id !== id));
    if (g) gsap.to(g.querySelectorAll(".thread__line, .thread__shadow"), { strokeDashoffset: -1, opacity: 0, duration: 0.45, ease: "power2.in", onComplete: drop });
    else drop();
  };

  useEffect(() => {
    if (!linking) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLinking(null);
    const onMove = (e: PointerEvent) => (cursor.current = { x: e.clientX, y: e.clientY });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
    };
  }, [linking]);

  /* ---------- Dragging ----------

     Hand-rolled rather than Draggable so a click on text still focuses
     it: a drag only starts after the pointer travels 4px. The node is
     moved with a transform while dragging and the new percent position
     is committed once on release. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, item: BoardItem) => {
    if (!admin || e.button !== 0 || !board.current) return;
    if (linking) {
      e.preventDefault();
      return tie(item.id);
    }
    if ((e.target as HTMLElement).closest("button, a, .pin__tools")) return;
    const node = e.currentTarget;
    const inner = node.querySelector<HTMLElement>(".pin__inner");
    const start = { x: e.clientX, y: e.clientY };
    const rect = board.current.getBoundingClientRect();
    let dragging = false;
    let dx = 0;
    let dy = 0;

    const move = (ev: PointerEvent) => {
      dx = ev.clientX - start.x;
      dy = ev.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) > 4) {
        dragging = true;
        (document.activeElement as HTMLElement | null)?.blur();
        window.getSelection()?.removeAllRanges();
        node.classList.add("pin--dragging");
        node.style.zIndex = String(topZ() + 100);
        if (inner) gsap.to(inner, { scale: 1.06, rotation: -item.rot * 0.6, duration: 0.3, ease: "power2.out" });
      }
      if (dragging) {
        node.style.translate = `${dx}px ${dy}px`;
        /* Swing a little in the direction of travel. */
        if (inner) gsap.to(inner, { rotation: -item.rot * 0.6 + gsap.utils.clamp(-10, 10, ev.movementX * 0.8), duration: 0.4, overwrite: "auto" });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!dragging) return;
      node.classList.remove("pin--dragging");
      node.style.translate = "";
      const x = gsap.utils.clamp(0, 92, item.x + (dx / rect.width) * 100);
      const y = gsap.utils.clamp(0, 90, item.y + (dy / rect.height) * 100);
      patch(item.id, { x, y, z: topZ() });
      node.style.zIndex = "";
      if (inner) gsap.to(inner, { scale: 1, rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) add("photo", await downscale(file));
  };

  return (
    <div className="cork" data-admin={admin || undefined} data-linking={linking ? "" : undefined}>
      <div className="cork__board" ref={board}>
        {(items ?? []).map((item) => (
          <div
            key={item.id}
            data-id={item.id}
            className={`pin pin--${item.type}`}
            data-color={item.color}
            data-depth={depth(item)}
            style={{ left: `${item.x}%`, top: `${item.y}%`, zIndex: item.z, "--depth": depth(item) } as React.CSSProperties}
            onPointerDown={(e) => onPointerDown(e, item)}
          >
            {/* Rotated inside the (straight) shadowed layer, not on it: a
                filter that's rotated gets resampled as a bitmap and blurs. */}
            <div className="pin__inner" style={{ "--rot": `${item.rot}deg` } as React.CSSProperties}>
              <span className="pin__anchor" aria-hidden />
              {item.fastener === "pin" ? <span className="pin__pin" aria-hidden /> : null}
              {item.fastener === "tape" ? <span className="pin__tape" aria-hidden /> : null}
              <ItemBody item={item} edit={admin} patch={(p) => patch(item.id, p)} />
            </div>

            {admin ? (
              <div className="pin__tools">
                <button
                  aria-label="Tie a red thread from here"
                  onClick={(e) => {
                    cursor.current = { x: e.clientX, y: e.clientY };
                    setLinking(item.id);
                  }}
                >
                  <Spline size={12} />
                </button>
                <button aria-label="Rotate" onClick={() => patch(item.id, { rot: jitter(9) })}><RotateCw size={12} /></button>
                {PALETTE[item.type].length > 1 ? (
                  <button
                    aria-label="Colour"
                    onClick={() => {
                      const list = PALETTE[item.type];
                      patch(item.id, { color: list[(list.indexOf(item.color ?? "") + 1) % list.length] });
                    }}
                  >
                    <Palette size={12} />
                  </button>
                ) : null}
                <button aria-label="Bring to front" onClick={() => patch(item.id, { z: topZ() })}><ArrowUpToLine size={12} /></button>
                <button aria-label="Delete" onClick={() => remove(item.id)}><X size={12} /></button>
              </div>
            ) : null}
          </div>
        ))}

        <svg className="cork__threads" ref={svg} aria-hidden>
          {threads.map((t) => (
            <g key={t.id} data-thread={t.id} data-a={t.a} data-b={t.b}>
              <path className="thread__shadow" pathLength={1} />
              <path className="thread__line" pathLength={1} />
              <circle className="thread__knot" r={2.6} />
              <circle className="thread__knot" r={2.6} />
              {admin ? <path className="thread__hit" onClick={() => cut(t.id)} /> : null}
            </g>
          ))}
          {linking ? (
            <g data-live data-a={linking}>
              <path className="thread__shadow" />
              <path className="thread__line thread__line--live" />
            </g>
          ) : null}
        </svg>
      </div>

      {linking ? <p className="cork__hint">pick another pin to tie the string to · esc to cancel</p> : null}

      {admin ? (
        <div className="cork__dock">
          <button onClick={() => add("note")}><StickyNote size={16} /><span>note</span></button>
          <button onClick={() => fileInput.current?.click()}><ImageIcon size={16} /><span>photo</span></button>
          <button onClick={() => add("card")}><CreditCard size={16} /><span>card</span></button>
          <button onClick={() => add("ticket")}><Ticket size={16} /><span>ticket</span></button>
          <button onClick={() => add("tag")}><Tag size={16} /><span>link</span></button>
          <button onClick={() => add("todo")}><ListChecks size={16} /><span>list</span></button>
          <button onClick={() => add("stamp")}><Stamp size={16} /><span>stamp</span></button>
          <span className="cork__status" data-status={status}>
            {status === "saving" ? "saving…" : status === "saved" ? "saved" : status === "error" ? "save failed" : "admin"}
          </span>
          <button onClick={() => logout(setAdmin)} aria-label="Log out"><LogOut size={16} /></button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>
      ) : (
        <AdminLogin />
      )}
    </div>
  );
}
