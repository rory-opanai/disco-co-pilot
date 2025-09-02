import { NextResponse } from "next/server";
import { REALTIME_MODEL } from "../../../../lib/server/openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    const url = new URL(req.url);
    const model = url.searchParams.get("model") || REALTIME_MODEL;
    const sdp = await req.text();
    const r = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/sdp",
        Accept: "application/sdp",
        "OpenAI-Beta": "realtime=v1"
      },
      body: sdp
    });
    const body = await r.text();
    if (!r.ok) return NextResponse.json({ error: body || `HTTP ${r.status}` }, { status: r.status });
    return new NextResponse(body, { status: 200, headers: { "Content-Type": "application/sdp" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "internal" }, { status: 500 });
  }
}

