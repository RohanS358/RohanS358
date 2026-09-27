import type { Metadata } from "next";
import "./globals.css";
import { PROFILE } from "./content";
import { WEBSITE } from "./cv";
import { DM_Sans, Caveat } from "next/font/google";
import { cn } from "@/lib/utils";

/* Rethink Sans — used everywhere across the site. */

/* DM Sans is the Figma's face; Caveat is the corkboard's handwriting. */
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand" });

const TITLE = `${PROFILE.name} — builds things that run`;

export const metadata: Metadata = {
  metadataBase: new URL(WEBSITE),
  title: { default: TITLE, template: `%s — ${PROFILE.name}` },
  description: PROFILE.bio,
  keywords: ["Rohan Singh", "frontend developer", "UI/UX designer", "Next.js developer", "web developer Nepal", "Bhaktapur", "portfolio"],
  authors: [{ name: PROFILE.name, url: WEBSITE }],
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: PROFILE.bio, type: "website", url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: PROFILE.bio },
};

/* Who this site is about, for search engines (schema.org Person). */
const PERSON = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  name: PROFILE.name,
  url: WEBSITE,
  email: `mailto:${PROFILE.email}`,
  jobTitle: "Frontend Developer and UI/UX Designer",
  description: PROFILE.bio,
  image: `${WEBSITE}/ui/me.png`,
  address: { "@type": "PostalAddress", addressLocality: "Bhaktapur", addressCountry: "NP" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Khwopa College of Engineering" },
  sameAs: [PROFILE.github, PROFILE.linkedin, PROFILE.instagram],
});

/* Picks a warm palette before first paint — never the same as last
   visit — so the page is a different colour each time it opens. Inline
   and synchronous on purpose: done in an effect, the page would flash
   the default first. */
const PALETTE_SCRIPT = `(function(){try{var p=["peach","butter","blush","apricot","sand","sage"],l=localStorage.getItem("palette"),c=p.filter(function(x){return x!==l}),k=c[Math.floor(Math.random()*c.length)];document.documentElement.dataset.palette=k;localStorage.setItem("palette",k)}catch(e){document.documentElement.dataset.palette="peach"}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full", "font-sans", sans.variable, hand.variable)}
      suppressHydrationWarning
    >
       
 
      <body className="min-h-full font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: PALETTE_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: PERSON }} />
        <a
          href="#work"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to work
        </a>
        {children}
        
      </body>

    </html>
  );
}
