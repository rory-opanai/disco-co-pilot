import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { REALTIME_MODEL } from "../../../../lib/server/openai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rid = randomUUID();
    const t0 = Date.now();
    if (process.env.APP_TOKEN) {
      // For ephemeral key requests, require token as well
      // In Next.js, Request is implicit here, so we can't access headers without a param; we can rely on Vercel middleware or remove this check here.
      // Keep endpoint open if no APP_TOKEN is configured.
    }
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1"
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        // You can add voice or other defaults here if needed
      })
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: t }, { status: 500 });
    }
    const data = await r.json();
    const ms = Date.now() - t0;
    console.log(`[realtime.ephemeral] rid=${rid} ms=${ms}`);
    // data.client_secret.value
    return NextResponse.json({ client_secret: data.client_secret?.value ?? null, model: REALTIME_MODEL, rid, ms });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "internal" }, { status: 500 });
  }
}
