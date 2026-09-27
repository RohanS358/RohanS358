import { notFound } from "next/navigation";
import Boot from "../../Boot";
import Bento from "../../Bento";
import { getTracks } from "@/lib/tracks";
import { getGithubStats } from "@/lib/github";
import ProjectMarkup from "../../ProjectMarkup";
import { PROJECTS } from "../../content";

/* Every project is a real route, not a client-side state.

   That is what makes the class router work: it fetches this page's HTML
   and lifts the `.app` element out of it, so the same URL serves a full
   document on a cold load and a fragment to swap on a warm one. */
export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PROJECTS.find((x) => x.slug === slug);
  return p ? { title: p.name, description: p.line } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PROJECTS.find((x) => x.slug === slug);
  if (!p) notFound();

  return (
    <>
      {/* The shell is here too so closing a cold-loaded project lands
          on the bento, Products open, not on a blank page. */}
      <Bento tracks={getTracks()} stats={await getGithubStats()} initialTab="products" intro={false}>
        <div className="app" data-template="project">
          <ProjectMarkup p={p} />
        </div>
      </Bento>
      <Boot />
    </>
  );
}
