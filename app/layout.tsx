import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureVibes — Security Audits for Vibe-Coded Apps",
  description:
    "Most AI-built apps ship with 8–14 security issues. Manual security audit for apps built with Lovable, Bolt, Cursor, v0 and Claude Code. Exposed keys, missing RLS, unverified webhooks — found before attackers do.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
