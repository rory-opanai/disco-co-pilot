import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOpenAI, RESPONSES_MODEL } from "../../../lib/server/openai";
import { searchPlaybooks } from "../../../lib/server/vector";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const rid = randomUUID();
    const t0 = Date.now();
    if (process.env.APP_TOKEN) {
      const token = (req.headers.get("x-auth-token") || req.headers.get("X-Auth-Token") || "").trim();
      if (token !== process.env.APP_TOKEN) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { lastUtterance, checklist, goal, count } = body || {};
    if (!lastUtterance) return NextResponse.json({ error: "lastUtterance required" }, { status: 400 });

    let kb: any[] = [];
    try {
      kb = await searchPlaybooks(lastUtterance, 5);
    } catch (err: any) {
      console.warn(`[nbq] playbook search failed: ${err?.message || err}`);
      kb = [];
    }
    const wantCount = Math.min(Math.max(parseInt(count || '1', 10) || 1, 1), 5);
    const sys = `You are a discovery co-pilot. Propose ${wantCount === 1 ? 'ONE' : String(wantCount)} next best question${wantCount === 1 ? '' : 's'} (NBQ) to advance discovery with B2B customers.
Rules:
- Be concise, single sentence.
- Target a checklist gap if present.
- Ground in the last customer comment and retrieved playbook snippets.
- Output strict JSON ${wantCount === 1 ? 'object' : 'array of objects'} with keys: question, grounded_in, checklist_category, confidence (0..1).`;

    const userText = `Last customer comment: ${lastUtterance}
Conversation goal (optional): ${goal || 'n/a'}
Checklist status: ${JSON.stringify(checklist || {})}
Retrieved playbooks:
${kb.map((k) => `Title: ${k.title}\n${k.content}`).join("\n---\n")}`;

    const baseItem = {
      type: "object",
      additionalProperties: false,
      properties: {
        question: { type: "string" },
        grounded_in: { type: "string" },
        checklist_category: { type: "string" },
        confidence: { type: "number" }
      },
      required: ["question", "grounded_in", "checklist_category", "confidence"]
    } as const;
    const schema = wantCount === 1 ? baseItem : { type: "array", items: baseItem } as const;

    const openai = getOpenAI();
    const resp = await (openai.responses.create as any)({
      model: RESPONSES_MODEL,
      input: [
        { role: "system", content: sys },
        { role: "user", content: userText }
      ],
      text: { format: { type: "json_schema", name: "nbq", schema, strict: true } }
    });
    const text = resp.output_text?.trim();
    if (!text) return NextResponse.json(wantCount === 1 ? { nbq: null } : { nbqs: [] });
    const parsed = JSON.parse(text);
    const makeItem = (p: any) => ({
      id: `nbq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question: p.question,
      grounded_in: p.grounded_in || "last_customer_comment",
      checklist_category: p.checklist_category || "General",
      confidence: typeof p.confidence === "number" ? p.confidence : 0.7
    });
    if (wantCount === 1) {
      const nbq = makeItem(parsed);
      const ms = Date.now() - t0;
      console.log(`[nbq] rid=${rid} ms=${ms} utter_len=${lastUtterance.length}`);
      return NextResponse.json({ nbq, rid, ms });
    }
    const nbqs = Array.isArray(parsed) ? parsed.map(makeItem) : [makeItem(parsed)];
    const ms = Date.now() - t0;
    console.log(`[nbq] rid=${rid} ms=${ms} utter_len=${lastUtterance.length}`);
    return NextResponse.json({ nbqs, rid, ms });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "internal" }, { status: 500 });
  }
}
