import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

const ALLOWED_EVENTS = new Set(["page_view", "audit_waitlist", "scorecard"]);
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,}$/;

// 단순 인메모리 레이트리밋 (서버리스 인스턴스 단위 — LP 규모엔 충분)
const hits = new Map<string, { n: number; t: number }>();
const WINDOW_MS = 60_000;
const MAX_HITS = 20;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > MAX_HITS;
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    if (rateLimited(ip)) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // 허니팟 — 봇이면 성공한 척하고 버림
    if (typeof body.website === "string" && body.website.length > 0) {
      return NextResponse.json({ ok: true });
    }

    const event = String(body.event ?? "");
    if (!ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: "bad_event" }, { status: 400 });
    }

    let email: string | null = null;
    if (event !== "page_view") {
      email = String(body.email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email) || email.length > 254) {
        return NextResponse.json({ ok: false, error: "bad_email" }, { status: 400 });
      }
    }

    let appUrl: string | null = null;
    if (event === "scorecard" && body.app_url) {
      const raw = String(body.app_url).trim().slice(0, 500);
      try {
        const u = new URL(raw);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
        appUrl = u.href;
      } catch {
        return NextResponse.json({ ok: false, error: "bad_url" }, { status: 400 });
      }
    }

    const clean = (v: unknown) => String(v ?? "").slice(0, 100) || null;
    const ipHash = crypto
      .createHash("sha256")
      .update(ip + (process.env.IP_SALT ?? "sv"))
      .digest("hex")
      .slice(0, 32);

    const { error } = await supabase.from("fd_events").insert({
      event,
      email,
      app_url: appUrl,
      utm_source: clean(body.utm_source),
      utm_campaign: clean(body.utm_campaign),
      utm_content: clean(body.utm_content),
      ip_hash: ipHash,
    });

    // 중복 가입(unique 위반)은 성공으로 처리 (멱등)
    if (error && error.code !== "23505") {
      console.error("[track] insert error:", error.code, error.message);
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[track] unhandled:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
