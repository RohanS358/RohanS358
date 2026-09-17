import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PROFILE } from "./content";

const sans = Inter({
  variable: "--font-sans-ui",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-ui",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PROFILE.name}`,
  description: PROFILE.bio,
  openGraph: {
    title: PROFILE.name,
    description: PROFILE.bio,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
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
