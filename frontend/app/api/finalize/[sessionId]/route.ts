import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOpenAI, RESPONSES_MODEL } from "../../../../lib/server/openai";
import { query } from "../../../../lib/server/db";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const rid = randomUUID();
    const t0 = Date.now();
    if (process.env.APP_TOKEN) {
      const token = (req.headers.get("x-auth-token") || req.headers.get("X-Auth-Token") || "").trim();
      if (token !== process.env.APP_TOKEN) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { sessionId } = params;
    const body = await req.json().catch(() => ({}));
    const transcript: string = (body?.transcript || "").toString();
    const goal: string | undefined = body?.goal ? String(body.goal) : undefined;
    if (!transcript || !transcript.trim()) return NextResponse.json({ error: "transcript required" }, { status: 400 });

    const openai = getOpenAI();
    const sys = `You produce a structured discovery summary JSON. Follow the provided JSON schema strictly. If any section cannot be generated, set it to null and include missing_reason at root with explanation.`;
    const user = `Transcript (verbatim):\n${transcript}\n\n${goal ? `Conversation goal/context: ${goal}` : ''}`.trim();
    const schema = {
      type: "object",
      properties: {
        coverage_table: { type: "array", items: { type: "object", properties: { category: { type: "string" }, status: { type: "string" }, evidence: { type: "array", items: { type: "string" } } }, required: ["category", "status", "evidence"] } },
        missed_questions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, expected_category: { type: "string" }, reason_for_omission: { type: "string" } }, required: ["question", "expected_category", "reason_for_omission"] } },
        risks_and_blockers: { type: "array", items: { type: "object", properties: { description: { type: "string" }, impact_level: { type: "string" }, linked_to: { type: "string" } }, required: ["description", "impact_level", "linked_to"] } },
        recommended_agenda: { type: "array", items: { type: "object", properties: { agenda_item: { type: "string" }, objective: { type: "string" }, priority: { type: "number" } }, required: ["agenda_item", "objective", "priority"] } },
        follow_up_email: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" }, action_items: { type: "array", items: { type: "string" } } }, required: ["subject", "body", "action_items"] },
        demo_plan_suggestions: { type: "array", items: { type: "object", properties: { suggestion: { type: "string" }, justification: { type: "string" } }, required: ["suggestion", "justification"] } },
        discovery_depth_score: { type: "object", properties: { percentage: { type: "number" }, interpretation: { type: "string" } }, required: ["percentage", "interpretation"] },
        missing_reason: { type: "string" }
      },
      required: ["coverage_table","missed_questions","risks_and_blockers","recommended_agenda","follow_up_email","demo_plan_suggestions","discovery_depth_score"]
    } as const;

    const resp = await (openai.responses.create as any)({
      model: RESPONSES_MODEL,
      input: [ { role: "system", content: sys }, { role: "user", content: user } ],
      response_format: { type: "json_schema", json_schema: { name: "summary_pack", schema, strict: true } }
    });
    const jsonText = resp.output_text?.trim();
    const pack = jsonText ? JSON.parse(jsonText) : { coverage_table: null, missed_questions: null, risks_and_blockers: null, recommended_agenda: null, follow_up_email: null, demo_plan_suggestions: null, discovery_depth_score: null, missing_reason: "No output" };

    await query(`INSERT INTO sessions(id, created_at, finalized_at) VALUES($1, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET finalized_at = NOW()`, [sessionId]);
    const { rows: tRows } = await query<{ id: string }>(`INSERT INTO transcripts(session_id, content) VALUES($1, $2) RETURNING id`, [sessionId, transcript]);
    await query(`INSERT INTO summary_packs(session_id, payload) VALUES($1, $2)`, [sessionId, pack]);
    if (pack.discovery_depth_score) {
      await query(`INSERT INTO depth_scores(session_id, percentage, interpretation) VALUES($1, $2, $3)`, [sessionId, pack.discovery_depth_score.percentage, pack.discovery_depth_score.interpretation]);
    }
    const ms = Date.now() - t0;
    console.log(`[finalize] rid=${rid} ms=${ms} transcript_chars=${transcript.length}`);
    return NextResponse.json({ sessionId, transcriptId: tRows[0]?.id, summary: pack, rid, ms });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "internal" }, { status: 500 });
  }
}

