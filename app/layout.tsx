import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Alliance Master Series",
    template: "%s | Alliance Master Series"
  },
  description:
    "The Alliance Master Series is a structured competitive alliance league for Supremacy: World War 3.",
  metadataBase: new URL("https://alliance-master-series.vercel.app"),
  openGraph: {
    title: "Alliance Master Series",
    description:
      "A modern tournament and league platform for competitive alliances.",
    type: "website"
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
