"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Music2, Plus, SkipBack, SkipForward, X } from "lucide-react";
import type { Track } from "@/lib/tracks";
import { useAdmin } from "./Admin";
import { beat } from "@/lib/beat";

/**
 * The vinyl player.
 *
 * One <audio> for the life of the page — it sits in the bento shell,
 * outside the router's swapped `.app`, so opening a project never cuts
 * the song. Three layouts share the same nodes (`intro`, `expanded`,
 * `compact`); the stylesheet morphs between them.
 *
 * The record spins on a GSAP tween whose timeScale is eased between 0
 * and 1, so it spins up and winds down like a platter instead of
 * snapping between stopped and full speed.
 */

export type PlayerMode = "intro" | "expanded" | "compact";

const fmt = (s: number) =>
  Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

export default function Player({
  tracks: initialTracks,
  mode,
  onToggle,
}: {
  tracks: Track[];
  mode: PlayerMode;
  /** Ask the shell to open (hover) or close the expanded card. */
  onToggle?: (open: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const { admin, setAdmin } = useAdmin();
  /* The page's build-time list, then the live one — uploads made after
     the build only exist on the server. */
  const [tracks, setTracks] = useState(initialTracks);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/music")
      .then((r) => r.json())
      .then((d) => d.tracks && setTracks(d.tracks))
      .catch(() => {});
  }, []);

  const addTrack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    for (const f of files) {
      setUploading(`adding ${f.name}…`);
      const form = new FormData();
      form.set("file", f);
      const res = await fetch("/api/music", { method: "POST", body: form }).catch(() => null);
      if (res?.status === 401) setAdmin(false);
      const body = await res?.json().catch(() => null);
      if (res?.ok && body?.tracks) setTracks(body.tracks);
      else {
        setUploading(body?.error ?? "upload failed");
        return;
      }
    }
    setUploading(null);
  };

  const removeTrack = async (t: Track) => {
    if (!t.uploaded || !window.confirm(`Delete “${t.title}”?`)) return;
    const res = await fetch(`/api/music?name=${encodeURIComponent(t.uploaded)}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.tracks) {
      const current = tracks[index]?.src;
      setTracks(body.tracks);
      const at = body.tracks.findIndex((x: Track) => x.src === current);
      setIndex(at >= 0 ? at : 0);
    }
  };
  const disc = useRef<HTMLDivElement>(null);
  const spin = useRef<gsap.core.Tween | null>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const track = tracks[index];
  const empty = tracks.length === 0;

  useEffect(() => {
    if (!disc.current) return;
    spin.current = gsap.to(disc.current, { rotation: "+=360", duration: 1.8, ease: "none", repeat: -1 });
    spin.current.timeScale(0);
    return () => void spin.current?.kill();
  }, []);

  useEffect(() => {
    if (spin.current) gsap.to(spin.current, { timeScale: playing ? 1 : 0, duration: playing ? 1.2 : 1.6, ease: "power2.out" });
  }, [playing]);

  /* ---------- The beat ----------

     A Web Audio analyser on the <audio> element. Low-frequency energy is
     smoothed with a fast attack and slow release, so the page "hits" on
     kicks and eases off between them; it's written to --beat on the
     shell and to the shared `beat` object for the canvas. The context
     can only start after a user gesture, which is when play() happens. */
  const analyser = useRef<AnalyserNode | null>(null);
  const ensureAnalyser = () => {
    const a = audio.current;
    if (!a || analyser.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(a);
      const node = ctx.createAnalyser();
      node.fftSize = 512;
      node.smoothingTimeConstant = 0.6;
      src.connect(node);
      node.connect(ctx.destination);
      analyser.current = node;
      void ctx.resume();
    } catch {
      /* No Web Audio: the music still plays, the page just doesn't dance. */
    }
  };

  useEffect(() => {
    beat.playing = playing;
    if (!playing) {
      beat.level = 0;
      document.querySelector<HTMLElement>(".bento")?.style.setProperty("--beat", "0");
      return;
    }
    const bins = new Uint8Array(256);
    const shell = document.querySelector<HTMLElement>(".bento");
    let level = 0;
    let raf = 0;
    const tick = () => {
      const node = analyser.current;
      if (node) {
        node.getByteFrequencyData(bins);
        /* ~0–350 Hz at 44.1kHz / 512 — kick and bass. */
        let sum = 0;
        for (let i = 1; i < 8; i++) sum += bins[i];
        const now = Math.min(1, Math.max(0, (sum / 7 - 90) / 140));
        level = now > level ? now : level * 0.9;
        beat.level = level;
        shell?.style.setProperty("--beat", level.toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  /* ---------- Autoplay ----------

     Browsers refuse sound before the visitor interacts, so the first
     click, tap or key press anywhere starts the music. If the browser
     does allow it outright, it just plays. */
  useEffect(() => {
    if (!tracks.length) return;
    /* The analyser is only ever created inside a real gesture: made
       outside one, its AudioContext starts suspended and — since the
       audio is routed through it — silences the music. */
    const start = () => {
      const a = audio.current;
      if (!a) return;
      ensureAnalyser();
      if (a.paused) void a.play().catch(() => {});
    };
    const tryNow = setTimeout(() => {
      const a = audio.current;
      if (a?.paused) void a.play().catch(() => {});
    }, 400);
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const once = () => {
      start();
      for (const ev of events) window.removeEventListener(ev, once, true);
    };
    for (const ev of events) window.addEventListener(ev, once, true);
    return () => {
      clearTimeout(tryNow);
      for (const ev of events) window.removeEventListener(ev, once, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length > 0]);

  const toggle = () => {
    const a = audio.current;
    if (!a || empty) return;
    ensureAnalyser();
    if (a.paused) void a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  const go = (to: number) => {
    if (empty) return;
    setIndex((to + tracks.length) % tracks.length);
    setTime(0);
  };

  /* A track change keeps playing if we were playing. */
  useEffect(() => {
    const a = audio.current;
    if (!a || empty) return;
    a.load();
    if (playing) void a.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audio.current;
    if (a && duration) a.currentTime = (Number(e.target.value) / 1000) * duration;
  };

  /* Hover opens the full card; leaving lets it sink back after a beat,
     so skimming past the corner doesn't make it flap. */
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enter = () => {
    if (mode === "intro" || !onToggle) return;
    if (closing.current) clearTimeout(closing.current);
    onToggle(true);
  };
  const leave = () => {
    if (!onToggle) return;
    if (closing.current) clearTimeout(closing.current);
    closing.current = setTimeout(() => onToggle(false), 350);
  };
  useEffect(() => () => void (closing.current && clearTimeout(closing.current)), []);

  const title = track?.title ?? "silence (for now)";
  const artist = track?.artist ?? "drop mp3s in /public/music";

  return (
    <div
      className="player"
      data-mode={mode}
      data-playing={playing || undefined}
      ref={root}
      onPointerEnter={enter}
      onPointerLeave={leave}
    >
      <div className="player__card">
        <div className="player__head">
          <Music2 className="player__note" size={16} strokeWidth={2.5} aria-hidden />
          <div className="player__meta">
            <p className="player__title" title={title}>{title}</p>
            <p className="player__artist" title={artist}>{artist}</p>
          </div>

          <button
            className="player__vinyl"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            disabled={empty}
          >
            <div className="player__disc" ref={disc}>
              <span
                className="player__label"
                style={track?.cover ? { backgroundImage: `url("${track.cover}")` } : undefined}
              />
            </div>
            <span className="player__icon" aria-hidden>
              {playing ? (
                <svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>
              ) : (
                <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
              )}
            </span>
            <svg className="player__arm" viewBox="0 0 40 60" aria-hidden>
              <circle cx="32" cy="7" r="5" fill="#d4d4d4" stroke="#8a8a8a" />
              <path d="M32 7 L30 40 L22 52" stroke="#bdbdbd" strokeWidth="3" fill="none" strokeLinecap="round" />
              <rect x="17" y="49" width="9" height="6" rx="1.5" fill="#6b6b6b" transform="rotate(35 21 52)" />
            </svg>
          </button>
        </div>

        <div className="player__body">
          <div className="player__transport">
            <button onClick={() => go(index - 1)} aria-label="Previous track" disabled={empty}>
              <SkipBack size={14} />
            </button>
            <input
              className="player__seek"
              type="range"
              min={0}
              max={1000}
              value={duration ? Math.round((time / duration) * 1000) : 0}
              onChange={seek}
              aria-label="Seek"
              disabled={empty}
              style={{ "--p": `${duration ? (time / duration) * 100 : 0}%` } as React.CSSProperties}
            />
            <button onClick={() => go(index + 1)} aria-label="Next track" disabled={empty}>
              <SkipForward size={14} />
            </button>
          </div>
          <p className="player__time">
            {fmt(time)} <span>/ {fmt(duration)}</span>
          </p>

          <ol className="player__list">
            {empty
              ? [0, 1, 2, 3].map((i) => <li key={i} className="player__row player__row--ghost" />)
              : tracks.map((t, i) => (
                  <li key={t.src} className="player__item">
                    <button
                      className="player__row"
                      data-current={i === index || undefined}
                      onClick={() => (i === index ? toggle() : go(i))}
                    >
                      <span className="player__row__eq" aria-hidden><i /><i /><i /></span>
                      <span className="player__row__title">{t.title}</span>
                      <span className="player__row__artist">{t.artist}</span>
                    </button>
                    {admin && t.uploaded ? (
                      <button className="player__remove" onClick={() => void removeTrack(t)} aria-label={`Delete ${t.title}`}>
                        <X size={11} />
                      </button>
                    ) : null}
                  </li>
                ))}
          </ol>

          {admin ? (
            <div className="player__admin">
              <button onClick={() => picker.current?.click()} disabled={!!uploading && uploading.startsWith("adding")}>
                <Plus size={12} /> add track
              </button>
              <span title={uploading ?? undefined}>{uploading ?? "“Artist - Title.mp3” names itself"}</span>
              <input ref={picker} type="file" accept="audio/*" multiple hidden onChange={(e) => void addTrack(e)} />
            </div>
          ) : null}
        </div>
      </div>

      {track ? (
        <audio
          ref={audio}
          src={track.src}
          preload="metadata"
          loop={tracks.length === 1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => go(index + 1)}
        />
      ) : null}
    </div>
  );
}
