import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Newzplay",
  description: "Play the news. Daily quiz powered by real-time global headlines.",
  metadataBase: new URL("https://newzplay.vercel.app"),
  openGraph: {
    title: "Newzplay",
    description: "Think you know what's happening in the world? Prove it. 6 categories. 6 questions. New every day.",
    siteName: "Newzplay",
    type: "website",
    url: "https://newzplay.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Newzplay",
    description: "Think you know what's happening in the world? Prove it.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}