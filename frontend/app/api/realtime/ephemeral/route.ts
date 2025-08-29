import { NextResponse } from "next/server";
import { REALTIME_MODEL } from "../../../../lib/server/openai";

export const runtime = "nodejs";

export async function GET() {
  try {
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
    // data.client_secret.value
    return NextResponse.json({ client_secret: data.client_secret?.value ?? null, model: REALTIME_MODEL });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "internal" }, { status: 500 });
  }
}
