import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoW Swap Explorer",
  description: "Fetch real swap quotes from CoW Protocol — a DevRel integration tutorial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
