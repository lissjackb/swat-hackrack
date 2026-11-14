import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hackro — Swarthmore demo",
  description: "What to put on your plate before you walk into the dining hall.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/* Same Google Fonts stylesheet as the mockup (line 7–8). PORT_PLAN
            suggests next/font, but the mockup's inline `font:` shorthands name
            Inter / 'Barlow Condensed' literally in hundreds of places, and
            next/font renames families — the link keeps every declaration
            working verbatim. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
