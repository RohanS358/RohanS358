import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths";
import { PROJECTS } from "@/app/content";

/**
 * Rohan's GitHub, as numbers worth flexing.
 *
 * Everything here comes straight from the GitHub API — nothing is
 * estimated. Commits are his own contributions per repo (the
 * contributors endpoint, default branch). Responses are cached for six
 * hours, which keeps a full refresh (~35 calls) inside the 60/hour
 * anonymous limit.
 *
 * Set GITHUB_TOKEN to lift the limit AND unlock traffic: GitHub only
 * shows a repo's views to its owner, so "most viewed" exists only when
 * the token belongs to Rohan.
 */

const USER = "RohanS358";

/* The last good snapshot. GitHub's anonymous limit is 60 calls an hour,
   so a rate-limited refresh serves this instead of an empty dashboard. */
const SNAPSHOT = path.join(DATA_DIR, "github.json");
const REVALIDATE = 60 * 60 * 6;

export type RepoStat = {
  name: string;
  description: string;
  language: string | null;
  commits: number;
  homepage: string | null;
  url: string;
  pushed: string;
  created: string;
  sizeKB: number;
  stars: number;
  forks: number;
  /** Views in the last 14 days — only with an owner token. */
  views?: number;
  uniques?: number;
  /** The matching case study on this site, if there is one. */
  slug?: string;
};

export type GithubStats = {
  since: string;
  followers: number;
  totals: {
    commits: number;
    repos: number;
    live: number;
    languages: number;
    sizeMB: number;
    months: number;
  };
  repos: RepoStat[];
  languages: { name: string; repos: number }[];
  timeline: { month: string; repos: number }[];
  hasViews: boolean;
  fetchedAt: string;
};

async function gh<T>(path: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: REVALIDATE },
  });
  if (res.status === 204 || res.status === 404 || res.status === 409) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return (await res.json()) as T;
}

type RawRepo = {
  name: string;
  description: string | null;
  fork: boolean;
  language: string | null;
  homepage: string | null;
  html_url: string;
  pushed_at: string;
  created_at: string;
  size: number;
  stargazers_count: number;
  forks_count: number;
};

export async function getGithubStats(): Promise<GithubStats | null> {
  const fresh = await fetchStats();
  const saved = await readFile(SNAPSHOT, "utf8").then((t) => JSON.parse(t) as GithubStats).catch(() => null);
  /* A complete refresh replaces the snapshot. A partial one (some repos
     rate-limited) only stands in when there's no snapshot at all. */
  if (fresh && !fresh.partial) {
    const stats: GithubStats = { ...fresh };
    delete (stats as { partial?: boolean }).partial;
    await mkdir(path.dirname(SNAPSHOT), { recursive: true }).catch(() => {});
    await writeFile(SNAPSHOT, JSON.stringify(stats)).catch(() => {});
    return stats;
  }
  return saved ?? fresh;
}

async function fetchStats(): Promise<(GithubStats & { partial?: boolean }) | null> {
  try {
    const [user, raw] = await Promise.all([
      gh<{ created_at: string; followers: number }>(`/users/${USER}`),
      gh<RawRepo[]>(`/users/${USER}/repos?per_page=100&type=owner`),
    ]);
    if (!user || !raw) return null;
    const own = raw.filter((r) => !r.fork);
    let failed = 0;
    const withViews = !!process.env.GITHUB_TOKEN;

    const repos: RepoStat[] = await Promise.all(
      own.map(async (r) => {
        /* One repo failing (rate limit mid-refresh) mustn't sink the rest:
           fall back to the count content.ts verified, if it has one. */
        const people = await gh<{ login: string; contributions: number }[]>(
          `/repos/${USER}/${r.name}/contributors?per_page=100`,
        ).catch(() => undefined);
        const traffic = withViews
          ? await gh<{ count: number; uniques: number }>(`/repos/${USER}/${r.name}/traffic/views`).catch(() => null)
          : null;
        const known = PROJECTS.find((p) => p.repo?.toLowerCase().endsWith(`/${r.name.toLowerCase()}`));
        const slug = known?.slug;
        if (people === undefined) failed++;
        return {
          name: r.name,
          description: r.description ?? "",
          language: r.language,
          commits:
            people === undefined
              ? (known?.commits ?? 0)
              : ((people ?? []).find((p) => p.login.toLowerCase() === USER.toLowerCase())?.contributions ?? 0),
          homepage: r.homepage || null,
          url: r.html_url,
          pushed: r.pushed_at,
          created: r.created_at,
          sizeKB: r.size,
          stars: r.stargazers_count,
          forks: r.forks_count,
          views: traffic?.count,
          uniques: traffic?.uniques,
          slug,
        };
      }),
    );
    /* Mostly failed = rate-limited; let the snapshot answer instead. */
    if (failed > own.length / 2) return null;
    repos.sort((a, b) => b.commits - a.commits);

    const langs = new Map<string, number>();
    for (const r of repos) if (r.language) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);

    /* One bar per month from his first repo to now, empty months included. */
    const first = new Date(Math.min(...repos.map((r) => +new Date(r.created)), +new Date(user.created_at)));
    const now = new Date();
    const timeline: GithubStats["timeline"] = [];
    for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d <= now; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      timeline.push({ month: key, repos: repos.filter((r) => r.created.startsWith(key)).length });
    }

    return {
      since: user.created_at,
      followers: user.followers,
      totals: {
        commits: repos.reduce((n, r) => n + r.commits, 0),
        repos: repos.length,
        live: repos.filter((r) => r.homepage).length,
        languages: langs.size,
        sizeMB: Math.round(repos.reduce((n, r) => n + r.sizeKB, 0) / 1024),
        months: timeline.length,
      },
      repos,
      languages: [...langs].map(([name, n]) => ({ name, repos: n })).sort((a, b) => b.repos - a.repos),
      timeline,
      hasViews: repos.some((r) => r.views !== undefined),
      fetchedAt: new Date().toISOString(),
      partial: failed > 0,
    };
  } catch (e) {
    console.error("GitHub stats unavailable:", (e as Error).message);
    return null;
  }
}
