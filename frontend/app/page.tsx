"use client";
export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import React from "react";

export default function HomePage() {
  const router = useRouter();

  const start = () => {
    const id = `sess_${crypto.randomUUID()}`;
    router.push(`/call?sessionId=${id}`);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Discovery Co-Pilot</h1>
            <p className="subtle mt-2 max-w-2xl">
              Run better discovery calls with real-time next best questions, checklist coverage, and a post-call summary with follow-up email.
              Co‑Pilot now includes rephrase controls, bridge phrases using the customer’s own words, timing cues, and a short rationale for each suggestion — so prompts feel natural, not prescriptive.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={start} className="btn btn-primary">Start Call</button>
              <button onClick={() => router.push('/call')} className="btn btn-secondary">Quick Start</button>
            </div>
          </div>
          <div className="hidden md:block w-48 h-32 rounded-lg bg-gradient-to-br from-slate-200 to-slate-50 border" />
        </div>
      </div>

      {/* How it works */}
      <section>
        <h2 className="section-title">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <div className="text-sm font-medium mb-1">1. Start a call</div>
            <div className="subtle">We connect to the realtime API and begin live transcription.</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium mb-1">2. Get live guidance</div>
            <div className="subtle">You’ll see four Next Best Questions, bridge phrases quoting the customer, and a checklist progress meter.</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium mb-1">3. Save the summary</div>
            <div className="subtle">End the call to generate a structured summary and a draft follow-up email.</div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="section-title">Tips</h2>
        <ul className="grid md:grid-cols-2 gap-3">
          <li className="card">
            <div className="font-medium mb-1">Keyboard</div>
            <div className="subtle">Use Accept/Skip on NBQ cards to keep momentum.</div>
          </li>
          <li className="card">
            <div className="font-medium mb-1">Privacy</div>
            <div className="subtle">If the database is unavailable, summaries cache locally to render your dashboard.</div>
          </li>
          <li className="card">
            <div className="font-medium mb-1">Make it sound natural</div>
            <div className="subtle">Per-question controls let you pick a tone (Consultative, Curious, Executive, Casual), rephrase (Soften, Shorten, Open‑ended, Empathetic), and add bridge phrases.</div>
          </li>
          <li className="card">
            <div className="font-medium mb-1">Timing cues</div>
            <div className="subtle">Queue any NBQ for the next pause; watch for the “Now’s a good moment” indicator after the customer finishes speaking.</div>
          </li>
        </ul>
      </section>
    </div>
  );
}
