import { NextResponse } from "next/server";
import { pool } from "../../../../lib/server/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    if (process.env.APP_TOKEN) {
      const token = (req.headers.get("x-auth-token") || req.headers.get("X-Auth-Token") || "").trim();
      if (token !== process.env.APP_TOKEN) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const client = await pool.connect();
    try {
      const r = await client.query<{ now: string }>("SELECT NOW() as now");
      return NextResponse.json({ ok: true, now: r.rows?.[0]?.now || null });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

