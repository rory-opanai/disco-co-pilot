import { NextResponse } from "next/server";
import { getOpenAI, RESPONSES_MODEL, TRANSCRIBE_MODEL } from "../../../../lib/server/openai";
import { query } from "../../../../lib/server/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const { rows: t } = await query<{ content: string }>(`SELECT content FROM transcripts WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1`, [sessionId]);
  const { rows: s } = await query<{ payload: any }>(`SELECT payload FROM summary_packs WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1`, [sessionId]);
  return NextResponse.json({ transcript: t[0]?.content || null, summary: s[0]?.payload || null });
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params;
    const form = await req.formData();
    const file = form.get("audio") as File | null;
    if (!file) return NextResponse.json({ error: "missing audio" }, { status: 400 });

    const openai = getOpenAI();
    const res = await (openai as any).audio.transcriptions.create({
      file,
      model: TRANSCRIBE_MODEL
    });
    const transcript = res.text as string;

    const sys = `You produce a structured discovery summary JSON. Follow the provided JSON schema strictly. If any section cannot be generated, set it to null and include missing_reason at root with explanation.`;
    const user = `Transcript (verbatim):\n${transcript}`;
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
    return NextResponse.json({ sessionId, transcriptId: tRows[0]?.id, summary: pack });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "internal" }, { status: 500 });
  }
}
