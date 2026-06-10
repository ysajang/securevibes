"use client";

import { useEffect, useRef, useState } from "react";

type Utm = { utm_source: string; utm_campaign: string; utm_content: string };

function useUtm(): Utm {
  const [utm, setUtm] = useState<Utm>({ utm_source: "", utm_campaign: "", utm_content: "" });
  const fired = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const u = {
      utm_source: p.get("utm_source") ?? "",
      utm_campaign: p.get("utm_campaign") ?? "",
      utm_content: p.get("utm_content") ?? "",
    };
    setUtm(u);
    if (!fired.current) {
      fired.current = true;
      track({ event: "page_view", ...u });
    }
  }, []);
  return utm;
}

async function track(payload: Record<string, string>) {
  try {
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function SignupForm({
  kind,
  utm,
  buttonLabel,
  withUrl,
}: {
  kind: "audit_waitlist" | "scorecard";
  utm: Utm;
  buttonLabel: string;
  withUrl?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const honeypot = useRef<HTMLInputElement>(null);

  async function submit() {
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    const ok = await track({
      event: kind,
      email: email.trim(),
      app_url: withUrl ? appUrl.trim() : "",
      website: honeypot.current?.value ?? "",
      ...utm,
    });
    setStatus(ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <p className="text-emerald-400 font-medium py-3">
        ✓ You&apos;re on the list. I&apos;ll email you personally — usually within 24h.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      <input
        ref={honeypot}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      {withUrl && (
        <input
          type="url"
          placeholder="https://your-app.com"
          value={appUrl}
          onChange={(e) => setAppUrl(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 outline-none focus:border-emerald-500"
        />
      )}
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 outline-none focus:border-emerald-500"
        />
        <button
          onClick={submit}
          disabled={status === "loading"}
          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-semibold px-5 py-3 whitespace-nowrap"
        >
          {status === "loading" ? "..." : buttonLabel}
        </button>
      </div>
      {status === "error" && (
        <p className="text-red-400 text-sm">Something went wrong — check the email and try again.</p>
      )}
    </div>
  );
}

const CHECKS = [
  "Supabase Row-Level Security actually enabled (not just \"it works\")",
  "API keys & secrets leaking into the client bundle",
  "Stripe / PayPal / Creem webhook signature verification",
  "Auth flows the AI \"simplified\" into bypasses",
  "IDOR — can user A read user B's data by changing an ID?",
  "Rate limiting on auth & payment endpoints",
  "CORS, security headers, verbose error leaks",
  "Payment & credit logic edge cases (double-grant, replay)",
];

export default function Page() {
  const utm = useUtm();


  return (
    <main className="mx-auto max-w-3xl px-6 py-16 flex flex-col gap-20">
      {/* Hero */}
      <section className="flex flex-col gap-6">
        <p className="text-emerald-400 font-mono text-sm">securevibes.dev</p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Your AI-built app works.
          <br />
          <span className="text-emerald-400">Is it safe to ship?</span>
        </h1>
        <p className="text-zinc-400 text-lg leading-relaxed">
          Most vibe-coded apps go live with <strong className="text-zinc-200">8–14 security issues</strong> —
          exposed API keys, disabled row-level security, unverified payment webhooks. Independent scans of
          200+ AI-built sites found an average security score of <strong className="text-zinc-200">52/100</strong>.
          I find these holes before your users — or attackers — do.
        </p>
        <p className="text-zinc-500 text-sm">
          For apps built with Lovable, Bolt, v0, Cursor, Replit or Claude Code.
        </p>
      </section>

      {/* Paid offer */}
      <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/60 p-8 flex flex-col gap-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold">Full Manual Security Audit</h2>
          <p className="text-3xl font-bold text-emerald-400">
            $249 <span className="text-sm font-normal text-zinc-500">launch price</span>
          </p>
        </div>
        <ul className="grid sm:grid-cols-2 gap-2 text-zinc-300 text-sm">
          {CHECKS.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="text-zinc-400 text-sm">
          Line-by-line manual review by a full-stack developer who has shipped 8+ production apps on the
          exact stack vibe coding tools generate (Next.js · Supabase · Stripe · PayPal · Creem) — and fixed
          these exact bugs in real products. You get a prioritized report with severity ratings and
          copy-paste fixes, delivered within 48 hours. Async only — no calls required.
        </p>
        <p className="text-zinc-300 font-medium">
          Audits are done personally, in order. Drop your email to claim a spot:
        </p>
        <SignupForm kind="audit_waitlist" utm={utm} buttonLabel="Claim my spot" />
      </section>

      {/* Free scorecard */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Not sure you need it?</h2>
        <p className="text-zinc-400">
          Get a <strong className="text-zinc-200">free external security scorecard</strong> — I scan what
          attackers can see from outside (exposed keys, headers, endpoints) and send you a short report.
          No code access needed.
        </p>
        <SignupForm kind="scorecard" utm={utm} buttonLabel="Get free scorecard" withUrl />
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-4 text-sm text-zinc-400">
        <h2 className="text-xl font-bold text-zinc-100">FAQ</h2>
        <p>
          <strong className="text-zinc-200">Do you need my code?</strong> For the full audit, yes —
          read-only repo access or a zip. The free scorecard needs only your URL.
        </p>
        <p>
          <strong className="text-zinc-200">What stacks do you cover?</strong> Anything Lovable / Bolt /
          v0 / Cursor / Claude Code produces. Deepest expertise: Next.js + Supabase + Stripe-family payments.
        </p>
        <p>
          <strong className="text-zinc-200">Is my code kept confidential?</strong> Yes. Access is revoked
          after delivery and nothing is shared or reused.
        </p>
      </section>

      <footer className="text-xs text-zinc-600 flex gap-4">
        <span>© 2026 SecureVibes</span>
        <a href="/privacy" className="underline hover:text-zinc-400">
          Privacy Policy
        </a>
      </footer>
    </main>
  );
}
