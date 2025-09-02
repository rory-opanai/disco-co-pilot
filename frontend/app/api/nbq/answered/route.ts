import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOpenAI, RESPONSES_MODEL } from "../../../../lib/server/openai";

export const runtime = "nodejs";

/*
  Request body: { nbqs: [{ id, question }], recentUtterances: string[] }
  Response: { answeredIds: string[] }
*/
export async function POST(req: Request) {
  try {
    const rid = randomUUID();
    const t0 = Date.now();
    if (process.env.APP_TOKEN) {
      const token = (req.headers.get("x-auth-token") || req.headers.get("X-Auth-Token") || "").trim();
      if (token !== process.env.APP_TOKEN) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const nbqs = Array.isArray(body?.nbqs) ? body.nbqs : [];
    const recentUtterances: string[] = Array.isArray(body?.recentUtterances) ? body.recentUtterances : [];
    if (nbqs.length === 0) return NextResponse.json({ answeredIds: [] });

    const sys = `Given a list of Next Best Questions (NBQs) and 1-3 recent customer utterances, return the IDs of NBQs that were likely ANSWERED by those utterances. Be conservative — only mark answered if the utterances provide a substantive response.`;
    const user = `NBQs:\n${nbqs.map((n: any) => `- (${n.id}) ${n.question}`).join('\n')}\n\nRecent utterances:\n${recentUtterances.map(u => `• ${u}`).join('\n')}`;
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        answeredIds: { type: "array", items: { type: "string" } }
      },
      required: ["answeredIds"]
    } as const;

    const openai = getOpenAI();
    const resp = await (openai.responses.create as any)({
      model: RESPONSES_MODEL,
      input: [ { role: 'system', content: sys }, { role: 'user', content: user } ],
      text: { format: { type: 'json_schema', name: 'answered', schema, strict: true } }
    });
    const out = resp.output_text?.trim();
    const parsed = out ? JSON.parse(out) : { answeredIds: [] };
    const ms = Date.now() - t0;
    console.log(`[nbq.answered] rid=${rid} ms=${ms} cnt=${nbqs.length}`);
    return NextResponse.json({ answeredIds: Array.isArray(parsed.answeredIds) ? parsed.answeredIds : [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 });
  }
}

