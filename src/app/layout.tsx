import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Daily Quiz",
  description: "Play the news. Daily quiz powered by real-time global headlines.",
  metadataBase: new URL("https://the-daily-quiz.vercel.app"),
  openGraph: {
    title: "The Daily Quiz",
    description: "Think you know what's happening in the world? Prove it. 6 categories. 6 questions. New every day.",
    siteName: "The Daily Quiz",
    type: "website",
    url: "https://the-daily-quiz.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Daily Quiz",
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