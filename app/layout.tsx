import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://ams-official-website.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Alliance Master Series",
    template: "%s | Alliance Master Series"
  },
  description:
    "The Alliance Master Series is a structured competitive alliance league for Supremacy: World War 3.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Alliance Master Series",
    description:
      "A modern tournament and league platform for competitive alliances.",
    type: "website",
    url: "/"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
