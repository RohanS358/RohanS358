import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PROFILE } from "./content";

/* Rethink Sans — used everywhere across the site. */

const rethink = localFont({
  src: "./fonts/RethinkSans-VariableFont_wght.ttf",
  variable: "--font-sans-ui",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${rethink.variable} h-full`}
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
