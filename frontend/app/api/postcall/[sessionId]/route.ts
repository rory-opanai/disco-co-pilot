import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOpenAI, RESPONSES_MODEL, TRANSCRIBE_MODEL } from "../../../../lib/server/openai";
import { query } from "../../../../lib/server/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  if (process.env.APP_TOKEN) {
    // In GET, Next.js Request headers are available on _req, keep same header name convention
    const token = (typeof _req !== 'undefined' ? ((_req as any).headers?.get?.("x-auth-token") || (_req as any).headers?.get?.("X-Auth-Token")) : "") || "";
    if ((token as string).trim() !== process.env.APP_TOKEN) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { sessionId } = params;
  const { rows: t } = await query<{ content: string }>(`SELECT content FROM transcripts WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1`, [sessionId]);
  const { rows: s } = await query<{ payload: any }>(`SELECT payload FROM summary_packs WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1`, [sessionId]);
  return NextResponse.json({ transcript: t[0]?.content || null, summary: s[0]?.payload || null });
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const rid = randomUUID();
    const t0 = Date.now();
    if (process.env.APP_TOKEN) {
      const token = (req.headers.get("x-auth-token") || req.headers.get("X-Auth-Token") || "").trim();
      if (token !== process.env.APP_TOKEN) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
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

    const sys = `You produce a structured discovery summary JSON. Follow the provided JSON schema strictly. If any section cannot be generated, set it to null and include missing_reason at root with explanation.

When creating follow_up_email, ensure the body is clear, concise, and actionable. Include:
- A brief appreciation and one-sentence recap of the conversation.
- A section "Open questions" that lists the missed_questions (use their wording) so the recipient can answer.
- A section "Risks or considerations" that summarizes risks_and_blockers with impact.
- A section "Proposed next steps" that mirrors recommended_agenda (agenda_item — objective) with a scheduling CTA.
Return plain text for the email body.`;
    const user = `Transcript (verbatim):\n${transcript}`;
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        coverage_table: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string" },
              status: { type: "string" },
              evidence: { type: "array", items: { type: "string" } }
            },
            required: ["category", "status", "evidence"]
          }
        },
        missed_questions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: { type: "string" },
              expected_category: { type: "string" },
              reason_for_omission: { type: "string" }
            },
            required: ["question", "expected_category", "reason_for_omission"]
          }
        },
        risks_and_blockers: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: { type: "string" },
              impact_level: { type: "string" },
              linked_to: { type: "string" }
            },
            required: ["description", "impact_level", "linked_to"]
          }
        },
        recommended_agenda: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              agenda_item: { type: "string" },
              objective: { type: "string" },
              priority: { type: "number" }
            },
            required: ["agenda_item", "objective", "priority"]
          }
        },
        follow_up_email: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            action_items: { type: "array", items: { type: "string" } }
          },
          required: ["subject", "body", "action_items"]
        },
        demo_plan_suggestions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              suggestion: { type: "string" },
              justification: { type: "string" }
            },
            required: ["suggestion", "justification"]
          }
        },
        discovery_depth_score: {
          type: "object",
          additionalProperties: false,
          properties: {
            percentage: { type: "number" },
            interpretation: { type: "string" }
          },
          required: ["percentage", "interpretation"]
        },
        missing_reason: { type: "string" }
      },
      required: ["coverage_table","missed_questions","risks_and_blockers","recommended_agenda","follow_up_email","demo_plan_suggestions","discovery_depth_score","missing_reason"]
    } as const;

    const resp = await (openai.responses.create as any)({
      model: RESPONSES_MODEL,
      input: [ { role: "system", content: sys }, { role: "user", content: user } ],
      text: { format: { type: "json_schema", name: "summary_pack", schema, strict: true } }
    });
    const jsonText = resp.output_text?.trim();
    const pack = jsonText ? JSON.parse(jsonText) : { coverage_table: null, missed_questions: null, risks_and_blockers: null, recommended_agenda: null, follow_up_email: null, demo_plan_suggestions: null, discovery_depth_score: null, missing_reason: "No output" };
    pack.follow_up_email = buildFollowUpEmail(pack, transcript);

    await query(`INSERT INTO sessions(id, created_at, finalized_at) VALUES($1, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET finalized_at = NOW()`, [sessionId]);
    const { rows: tRows } = await query<{ id: string }>(`INSERT INTO transcripts(session_id, content) VALUES($1, $2) RETURNING id`, [sessionId, transcript]);
    await query(`INSERT INTO summary_packs(session_id, payload) VALUES($1, $2)`, [sessionId, pack]);
    if (pack.discovery_depth_score) {
      await query(`INSERT INTO depth_scores(session_id, percentage, interpretation) VALUES($1, $2, $3)`, [sessionId, pack.discovery_depth_score.percentage, pack.discovery_depth_score.interpretation]);
    }
    const ms = Date.now() - t0;
    console.log(`[postcall] rid=${rid} ms=${ms} transcript_chars=${transcript.length}`);
    return NextResponse.json({ sessionId, transcriptId: tRows[0]?.id, summary: pack, rid, ms });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "internal" }, { status: 500 });
  }
}

function buildFollowUpEmail(pack: any, transcript: string, goal?: string) {
  const missed = Array.isArray(pack?.missed_questions) ? pack.missed_questions : [];
  const risks = Array.isArray(pack?.risks_and_blockers) ? pack.risks_and_blockers : [];
  const agenda = Array.isArray(pack?.recommended_agenda) ? pack.recommended_agenda : [];
  const subject = pack?.follow_up_email?.subject || `Follow-up${goal ? `: ${goal}` : ''}`;
  const lines: string[] = [];
  lines.push("Hi,");
  lines.push("");
  lines.push("Thanks for the conversation — sharing notes and next steps below.");
  if (goal) { lines.push(`Goal/Context: ${goal}`); lines.push(""); }
  if (missed.length) {
    lines.push("Open questions (please reply with answers):");
    for (const q of missed) {
      const cat = q?.expected_category ? ` (${q.expected_category})` : "";
      lines.push(`- ${q?.question || ''}${cat}`.trim());
    }
    lines.push("");
  }
  if (risks.length) {
    lines.push("Risks or considerations:");
    for (const r of risks) {
      const imp = r?.impact_level ? ` [${r.impact_level}]` : "";
      const desc = r?.description || '';
      lines.push(`- ${desc}${imp}`.trim());
    }
    lines.push("");
  }
  if (agenda.length) {
    lines.push("Proposed next steps:");
    let i = 1;
    for (const a of agenda) {
      const item = a?.agenda_item || 'Next step';
      const obj = a?.objective ? ` — ${a.objective}` : '';
      lines.push(`${i}. ${item}${obj}`.trim());
      i += 1;
    }
    lines.push("");
  }
  lines.push("Would you be open to a 30-minute follow-up to review these and align on next steps?");
  lines.push("");
  lines.push("Best,\nYour Team");
  const body = lines.join("\n");
  const action_items: string[] = [];
  if (missed.length) action_items.push(`Answer: ${missed.map((m: any) => m.question).join('; ')}`);
  if (agenda.length) action_items.push(...agenda.map((a: any) => a.agenda_item).filter(Boolean));
  return { subject, body, action_items };
}
