"use client";

import { createContext, useContext, useEffect, useState } from "react";
import gsap from "gsap";
import { Lock } from "lucide-react";

/**
 * One admin session for the whole shell.
 *
 * The corkboard, the gallery and the socials all edit in place when
 * Rohan is logged in; this is the single source of that "am I admin"
 * state and the one login form they share.
 */

type Admin = { admin: boolean; setAdmin: (v: boolean) => void };

const Ctx = createContext<Admin>({ admin: false, setAdmin: () => {} });

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    void fetch("/api/admin").then((r) => r.json()).then((r) => setAdmin(!!r.admin)).catch(() => {});
  }, []);
  return <Ctx.Provider value={{ admin, setAdmin }}>{children}</Ctx.Provider>;
}

export const useAdmin = () => useContext(Ctx);

export async function logout(setAdmin: (v: boolean) => void) {
  await fetch("/api/admin", { method: "DELETE" });
  setAdmin(false);
}

/** The lock button and its little login note. */
export function AdminLogin({ className }: { className?: string }) {
  const { admin, setAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  if (admin) return null;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    if (res.ok) {
      setAdmin(true);
      setOpen(false);
      setError("");
    } else {
      setError("nope. wrong combo.");
      gsap.fromTo(e.currentTarget, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    }
  };

  return (
    <div className={`admin-login ${className ?? ""}`}>
      <button className="cork__lock" onClick={() => setOpen((v) => !v)} aria-label="Admin login">
        <Lock size={13} />
      </button>
      {open ? (
        <form className="cork__login" onSubmit={submit}>
          <p>staff only. that means rohan.</p>
          <input name="username" placeholder="username" autoComplete="username" required autoFocus />
          <input name="password" type="password" placeholder="password" autoComplete="current-password" required />
          {error ? <p className="cork__error">{error}</p> : null}
          <button type="submit">let me in</button>
        </form>
      ) : null}
    </div>
  );
}
