import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reports to Charts Studio — Evident",
  description:
    "Turn messy research material into polished, slide-ready charts with extracted data, source traceability, and analyst-style captions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-evident-motif antialiased">
        {children}
      </body>
    </html>
  );
}
