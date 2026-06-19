import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

const FROM = "SecureVibes <support@securevibes.dev>";
const TO = "support@securevibes.dev"; // Cloudflare로 Gmail 포워딩됨

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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

    // page_view는 신호가 아니므로 메일 발송 없이 조용히 통과
    if (event === "page_view") {
      return NextResponse.json({ ok: true });
    }

    let email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ ok: false, error: "bad_email" }, { status: 400 });
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

    const clean = (v: unknown) => String(v ?? "").slice(0, 100) || "—";
    const ipHash = crypto
      .createHash("sha256")
      .update(ip + (process.env.IP_SALT ?? "sv"))
      .digest("hex")
      .slice(0, 32);

    const label = event === "audit_waitlist" ? "Claim my spot" : "Free scorecard";
    const subject =
      event === "audit_waitlist"
        ? `[Claim my spot] ${email}`
        : `[Free scorecard] ${email}`;

    const html = `
      <h2>New SecureVibes lead — ${esc(label)}</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-family:monospace;font-size:14px">
        <tr><td><b>Event</b></td><td>${esc(event)}</td></tr>
        <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
        <tr><td><b>App URL</b></td><td>${esc(appUrl ?? "—")}</td></tr>
        <tr><td><b>utm_source</b></td><td>${esc(clean(body.utm_source))}</td></tr>
        <tr><td><b>utm_campaign</b></td><td>${esc(clean(body.utm_campaign))}</td></tr>
        <tr><td><b>utm_content</b></td><td>${esc(clean(body.utm_content))}</td></tr>
        <tr><td><b>ip_hash</b></td><td>${esc(ipHash)}</td></tr>
        <tr><td><b>received</b></td><td>${new Date().toISOString()}</td></tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email, // 바로 답장하면 리드에게 감
      subject,
      html,
    });

    if (error) {
      console.error("[track] resend error:", error);
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[track] unhandled:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
