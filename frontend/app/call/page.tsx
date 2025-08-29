"use client";
export const dynamic = "force-dynamic";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Overlay from "../../components/Overlay";
import { RealtimeClient } from "../../lib/realtimeClient";

function CallInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const sessionId = sp.get("sessionId") || `sess_${Date.now()}`;
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState<{ speaker: string; text: string; timestamp: string }[]>([]);
  const [coverage, setCoverage] = useState<Record<string, string>>({});
  const [nbq, setNbq] = useState<any | null>(null);
  const tRef = useRef(transcript);
  const cRef = useRef(coverage);
  useEffect(() => { tRef.current = transcript; }, [transcript]);
  useEffect(() => { cRef.current = coverage; }, [coverage]);

  useEffect(() => {
    const rc = new RealtimeClient();
    rc.on(async (evt) => {
      if (evt.type === "response.output_text.delta") {
        const text: string = evt.delta || "";
        if (text.trim()) {
          setTranscript((t) => [...t, { speaker: "Customer", text, timestamp: new Date().toISOString() }]);
        }
      }
      if (evt.type === "response.completed") {
        const window = tRef.current.slice(-40).map(t => t.text).join(" ");
        if (window) {
          try {
            const cov = await fetch("/api/coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcriptWindow: window }) }).then(r => r.json());
            if (Array.isArray(cov.coverage)) {
              const next: Record<string, string> = { ...cRef.current };
              for (const c of cov.coverage) next[c.category] = c.status;
              setCoverage(next);
            }
            const lastUtter = window.split(/\n|\.\s/).slice(-1)[0] || window;
            const nbqRes = await fetch("/api/nbq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastUtterance: lastUtter, checklist: cRef.current }) }).then(r => r.json());
            if (nbqRes.nbq) setNbq(nbqRes.nbq);
          } catch {}
        }
      }
    });
    rc.start().then(() => setConnected(true)).catch(() => setConnected(false));
    return () => { rc.stop(); };
  }, [sessionId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Live Discovery</h1>
        <button onClick={() => router.push(`/dashboard/${sessionId}`)} className="bg-slate-800 text-white px-3 py-2 rounded">End & View Summary</button>
      </div>
      <Overlay sessionId={sessionId} connected={connected} transcript={transcript} coverage={coverage} nbq={nbq} onNbqAction={(action) => setNbq(null)} />
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <CallInner />
    </Suspense>
  );
}
