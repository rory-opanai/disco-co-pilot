"use client";
export const dynamic = "force-dynamic";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Overlay from "../../components/Overlay";
import { RealtimeClient } from "../../lib/realtimeClient";
import DebugPanel from "../../components/DebugPanel";

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
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEvents, setDebugEvents] = useState<{ t: string; type?: string; data: any }[]>([]);
  const lastReqTsRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const rc = new RealtimeClient();
    rc.on(async (evt) => {
      // Capture debug events (last 200)
      setDebugEvents((arr) => {
        const next = [...arr, { t: new Date().toISOString(), type: evt?.type, data: evt }];
        if (next.length > 200) next.shift();
        return next;
      });
      if (evt.type === "response.output_text.delta") {
        const text: string = evt.delta || "";
        if (text.trim()) {
          setTranscript((t) => [...t, { speaker: "Customer", text, timestamp: new Date().toISOString() }]);
        }
      }
      if (evt.type === "response.completed") {
        // Throttle downstream coverage/NBQ calls to reduce cost and jitter
        const now = Date.now();
        if (inFlightRef.current || now - lastReqTsRef.current < 1500) {
          return;
        }
        inFlightRef.current = true;
        const window = tRef.current.slice(-40).map(t => t.text).join(" ");
        if (window) {
          try {
            const lastUtter = window.split(/\n|\.\s/).slice(-1)[0] || window;
            const [cov, nbqRes] = await Promise.all([
              fetch("/api/coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcriptWindow: window }) }).then(r => r.json()),
              fetch("/api/nbq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastUtterance: lastUtter, checklist: cRef.current }) }).then(r => r.json())
            ]);
            if (Array.isArray(cov.coverage)) {
              const next: Record<string, string> = { ...cRef.current };
              for (const c of cov.coverage) next[c.category] = c.status;
              setCoverage(next);
            }
            if (nbqRes.nbq) setNbq(nbqRes.nbq);
            setErrorMsg(null);
          } catch (e: any) {
            setErrorMsg(e?.message || "Failed to compute coverage/NBQ");
          } finally {
            lastReqTsRef.current = Date.now();
            inFlightRef.current = false;
          }
        }
        // Immediately request next response to keep turns flowing
        setTimeout(() => rc.createResponse(), 200);
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
      {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
      <Overlay sessionId={sessionId} connected={connected} transcript={transcript} coverage={coverage} nbq={nbq} onNbqAction={(action) => setNbq(null)} />
      <DebugPanel open={debugOpen} onToggle={() => setDebugOpen((v) => !v)} events={debugEvents} onClear={() => setDebugEvents([])} />
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
