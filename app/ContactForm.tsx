"use client";

import { useState } from "react";

/* Name, email, message → /api/contact. The hidden "website" field is a
   honeypot: people never see it, bots fill it in. */
export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setState("sending");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    }).catch(() => null);
    if (res?.ok) {
      form.reset();
      setState("sent");
    } else {
      setState((await res?.json().catch(() => null))?.error ?? "couldn't send — copy the address instead");
    }
  };

  if (state === "sent") return <p className="contact__meta">got it. I&apos;ll write back soon.</p>;

  return (
    <form className="contact__form" onSubmit={submit}>
      <input name="name" placeholder="your name" required maxLength={80} autoComplete="name" aria-label="Your name" />
      <input name="email" type="email" placeholder="your email" required maxLength={120} autoComplete="email" aria-label="Your email" />
      <textarea name="message" placeholder="what's up?" required minLength={2} maxLength={5000} rows={4} aria-label="Message" />
      <input name="website" tabIndex={-1} autoComplete="off" className="contact__trap" aria-hidden="true" />
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "sending…" : "send it →"}</button>
      {state !== "idle" && state !== "sending" ? <p className="contact__err" role="alert">{state}</p> : null}
    </form>
  );
}
