import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PROFILE } from "./content";
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";

/* Rethink Sans — everything structural: headers and body.
   Spectral Bold — subtitles and supporting information. */

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const spectral = localFont({
  src: [
    { path: "./fonts/Spectral-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Spectral-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-serif-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: PROFILE.name,
  description: PROFILE.bio,
  openGraph: {
    title: PROFILE.name,
    description: PROFILE.bio,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", spectral.variable, "font-sans", figtree.variable)}
    >
      <body className="min-h-full">
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
