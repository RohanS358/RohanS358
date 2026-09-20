import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PROFILE } from "./content";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

/* Rethink Sans — used everywhere across the site. */

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: PROFILE.name,
  description: PROFILE.bio,
  openGraph: {
    title: PROFILE.name,
    description: PROFILE.bio,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full", "font-sans", geist.variable)}
    >
       
 
      <body className="min-h-full font-sans antialiased">
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
