"use client";
export const dynamic = "force-dynamic";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const backend = ""; // same origin
  const sp = useSearchParams();
  const local = sp.get("local") === "1";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (local) {
          // Prefer locally persisted data when flagged
          const summaryRaw = typeof window !== 'undefined' ? localStorage.getItem(`summary:${sessionId}`) : null;
          const transcriptRaw = typeof window !== 'undefined' ? localStorage.getItem(`transcript:${sessionId}`) : null;
          if (summaryRaw || transcriptRaw) {
            setData({ transcript: transcriptRaw, summary: summaryRaw ? JSON.parse(summaryRaw) : null, persisted: false });
            return;
          }
        }
        const res = await fetch(`/api/postcall/${sessionId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        // As a fallback, try local cache even without the flag
        try {
          const summaryRaw = typeof window !== 'undefined' ? localStorage.getItem(`summary:${sessionId}`) : null;
          const transcriptRaw = typeof window !== 'undefined' ? localStorage.getItem(`transcript:${sessionId}`) : null;
          if (summaryRaw || transcriptRaw) {
            setData({ transcript: transcriptRaw, summary: summaryRaw ? JSON.parse(summaryRaw) : null, persisted: false, error: String(e) });
            return;
          }
        } catch {}
        setData({ transcript: null, summary: null, error: String(e) });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId, local]);

  const upload = async (file: File) => {
    const form = new FormData();
    form.append("audio", file);
    const res = await fetch(`/api/postcall/${sessionId}`, { method: "POST", body: form });
    const json = await res.json();
    setData(json);
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return (
    <div className="space-y-4">
      <div className="text-slate-700">No data yet for this session.</div>
      <label className="inline-block">Upload call audio
        <input type="file" accept="audio/*" className="block mt-1" onChange={(e) => e.target.files && upload(e.target.files[0])} />
      </label>
    </div>
  );

  const { transcript, summary } = data;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Post-Call Summary</h1>
        <button
          onClick={() => {
            const newId = `sess_${Date.now()}`;
            router.push(`/call?sessionId=${newId}`);
          }}
          className="bg-slate-800 text-white px-3 py-2 rounded"
          aria-label="Start a new call session"
        >
          Start New
        </button>
      </div>
      <section>
        <h2 className="font-semibold mb-2">Discovery Depth Score</h2>
        <DepthScorePanel transcript={transcript} score={summary?.discovery_depth_score} />
      </section>
      <section>
        <h2 className="font-semibold mb-2">Coverage</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {summary?.coverage_table?.map((c: any, i: number) => (
            <div key={i} className="border rounded p-2">
              <div className="font-medium">{c.category}</div>
              <div className="text-sm">Status: {c.status}</div>
            </div>
          )) || <div className="text-slate-500">No coverage computed</div>}
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Missed Questions & Risks</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Missed Questions</div>
            <ul className="list-disc ml-5 space-y-1">
              {summary?.missed_questions?.map((q: any, i: number) => (
                <li key={i}>{q.question} <span className="text-xs text-slate-500">({q.expected_category})</span></li>
              )) || <div className="text-slate-500">None</div>}
            </ul>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Risks & Blockers</div>
            <ul className="list-disc ml-5 space-y-1">
              {summary?.risks_and_blockers?.map((r: any, i: number) => (
                <li key={i}>{r.description} <span className="text-xs text-slate-500">({r.impact_level})</span></li>
              )) || <div className="text-slate-500">None</div>}
            </ul>
          </div>
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Recommended Agenda</h2>
        <ol className="list-decimal ml-5 space-y-1">
          {summary?.recommended_agenda?.map((a: any, i: number) => (
            <li key={i}>{a.agenda_item} – <span className="text-slate-600">{a.objective}</span></li>
          )) || <div className="text-slate-500">None</div>}
        </ol>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Draft Follow-up Email</h2>
        <div className="border rounded p-3 space-y-2">
          <div className="font-medium">{summary?.follow_up_email?.subject || "No subject"}</div>
          <textarea className="w-full border rounded p-2 h-40" defaultValue={summary?.follow_up_email?.body || ""} />
          <div className="text-sm text-slate-500">Action Items: {summary?.follow_up_email?.action_items?.join(", ") || "None"}</div>
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Generate Summary</h2>
        <label className="inline-block">Upload call audio
          <input type="file" accept="audio/*" className="block mt-1" onChange={(e) => e.target.files && upload(e.target.files[0])} />
        </label>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Transcript</h2>
        <pre className="border rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{(data?.transcript as string) || "No transcript yet."}</pre>
      </section>
    </div>
  );
}

function DepthScorePanel({ transcript, score }: { transcript?: string; score?: { percentage: number; interpretation: string } }) {
  if (!score) return <div className="p-4 border rounded text-slate-600">Not available</div>;
  const words = String(transcript || '').split(/\s+/).filter(Boolean).length;
  // Cap the max score based on transcript length to avoid inflated percentages
  // Very short calls cannot realistically achieve high depth
  let cap = 100;
  if (words < 40) cap = 25;
  else if (words < 80) cap = 40;
  else if (words < 120) cap = 50;
  else if (words < 180) cap = 60;
  else if (words < 260) cap = 70;
  else if (words < 380) cap = 80;
  const pct = Math.min(Math.round(score.percentage), cap);
  const adjusted = pct !== Math.round(score.percentage);
  return (
    <div className="p-4 border rounded">
      <div className="text-4xl font-bold">{pct}%</div>
      <div className="text-slate-600">{score.interpretation}</div>
      {adjusted && <div className="text-xs text-slate-500 mt-1">Adjusted for transcript length ({words} words)</div>}
    </div>
  );
}
