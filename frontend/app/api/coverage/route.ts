import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOpenAI, RESPONSES_MODEL } from "../../../lib/server/openai";

const CATS = [
  "Pain",
  "Impact",
  "Current Solution",
  "Desired Outcome",
  "Use Case",
  "Stakeholders",
  "Budget",
  "Timeline",
  "Decision Process",
  "Risks",
  "Metrics",
  "Compliance",
];

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
    const { transcriptWindow } = body || {};
    if (!transcriptWindow) return NextResponse.json({ error: "transcriptWindow required" }, { status: 400 });

    const sys = `Classify discovery coverage for the categories below. Output JSON exactly matching the schema.`;
    const user = `Transcript window:\n${transcriptWindow}\n\nCategories: ${CATS.join(", ")}`;
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        coverage: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string", enum: CATS },
              status: { type: "string", enum: ["known", "partial", "unknown"] },
              evidence: { type: "array", items: { type: "string" } }
            },
            required: ["category", "status", "evidence"]
          }
        }
      },
      required: ["coverage"]
    } as const;

    const openai = getOpenAI();
    const resp = await (openai.responses.create as any)({
      model: RESPONSES_MODEL,
      input: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ],
      text: { format: { type: "json_schema", name: "coverage", schema, strict: true } }
    });
    const text = resp.output_text?.trim();
    const parsed = text ? JSON.parse(text) : { coverage: [] };
    const coverage = Array.isArray(parsed.coverage) ? parsed.coverage : [];
    const ms = Date.now() - t0;
    console.log(`[coverage] rid=${rid} ms=${ms} len=${transcriptWindow.length}`);
    return NextResponse.json({ coverage, rid, ms });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "internal" }, { status: 500 });
  }
}
