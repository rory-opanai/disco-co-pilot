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
  const [nbqQueued, setNbqQueued] = useState<any | null>(null);
  const [nbqLockedUntil, setNbqLockedUntil] = useState<number>(0);
  const nbqDebounceRef = useRef<any>(null);
  const nbqInFlightRef = useRef<boolean>(false);
  const [goal, setGoal] = useState<string>("");
  const tRef = useRef(transcript);
  const cRef = useRef(coverage);
  const goalRef = useRef(goal);
  useEffect(() => { tRef.current = transcript; }, [transcript]);
  useEffect(() => { cRef.current = coverage; }, [coverage]);
  useEffect(() => { goalRef.current = goal; }, [goal]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEvents, setDebugEvents] = useState<{ t: string; type?: string; data: any }[]>([]);
  const lastReqTsRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const NBQ_DEBOUNCE_MS = 2500; // 2–3s
  const NBQ_CONF_DELTA = 0.1;   // min improvement to replace
  const NBQ_STICKY_MS = 10000;  // 8–12s lock

  function considerNbqCandidate(candidate: any) {
    const now = Date.now();
    const current = nbq as any | null;
    const curConf = typeof current?.confidence === "number" ? current.confidence : 0;
    const newConf = typeof candidate?.confidence === "number" ? candidate.confidence : 0;
    const improved = !current || (newConf - curConf) >= NBQ_CONF_DELTA;
    if (!current) {
      setNbq(candidate);
      setNbqQueued(null);
      setNbqLockedUntil(now + NBQ_STICKY_MS);
      return;
    }
    // If within sticky period, queue improvements silently
    if (now < nbqLockedUntil) {
      if (improved) {
        setNbqQueued(candidate);
      }
      return;
    }
    // Not locked; only replace if improved
    if (improved) {
      setNbq(candidate);
      setNbqQueued(null);
      setNbqLockedUntil(now + NBQ_STICKY_MS);
    }
  }

  useEffect(() => {
    const rc = new RealtimeClient();
    rc.on(async (evt) => {
      // Capture debug events (last 200)
      setDebugEvents((arr) => {
        const next = [...arr, { t: new Date().toISOString(), type: evt?.type, data: evt }];
        if (next.length > 200) next.shift();
        return next;
      });
      // Ignore assistant response events entirely to avoid echo/self-transcription.

      // Commit final transcript for each user speech turn
      if (evt.type === "conversation.item.input_audio_transcription.completed") {
        const tr = (evt.transcript || "").trim();
        if (tr) {
          setTranscript((t) => [...t, { speaker: "Customer", text: tr, timestamp: new Date().toISOString() }]);
          // Also trigger coverage/NBQ using the finalized utterance, subject to throttle
          const now = Date.now();
          if (!inFlightRef.current && now - lastReqTsRef.current >= 1500) {
            inFlightRef.current = true;
            const transcriptWindow = [...tRef.current, { speaker: "Customer", text: tr, timestamp: new Date().toISOString() }]
              .slice(-40)
              .map(t => t.text)
              .join(" ");
            if (transcriptWindow) {
              (async () => {
                try {
                  const lastUtter = tr;
                  const cov = await fetch("/api/coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcriptWindow }) }).then(r => r.json());
                  if (Array.isArray(cov.coverage)) {
                    const next: Record<string, string> = { ...cRef.current };
                    for (const c of cov.coverage) next[c.category] = c.status;
                    setCoverage(next);
                  }
                  // Debounce NBQ refresh: wait for a quiet window post-turn
                  if (nbqDebounceRef.current) {
                    clearTimeout(nbqDebounceRef.current as number);
                  }
                  nbqDebounceRef.current = window.setTimeout(async () => {
                    if (nbqInFlightRef.current) return;
                    nbqInFlightRef.current = true;
                    try {
                      const nbqRes = await fetch("/api/nbq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastUtterance: lastUtter, checklist: cRef.current, goal: goalRef.current }) }).then(r => r.json());
                      if (nbqRes?.nbq) considerNbqCandidate(nbqRes.nbq);
                    } finally {
                      nbqInFlightRef.current = false;
                    }
                  }, NBQ_DEBOUNCE_MS);
                  setErrorMsg(null);
                } catch (e: any) {
                  setErrorMsg(e?.message || "Failed to compute coverage/NBQ");
                } finally {
                  lastReqTsRef.current = Date.now();
                  inFlightRef.current = false;
                }
              })();
            } else {
              inFlightRef.current = false;
            }
          }
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
        <div className="flex items-center gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="End goal (optional): e.g., qualify for pilot"
            className="text-sm border rounded px-2 py-1 w-56"
          />
          <button
            onClick={async () => {
              // Collapse transcript into a single string and finalize
              const text = tRef.current
                .map((t) => `${t.speaker}: ${t.text}`)
                .join("\n");
              try {
                const res = await fetch(`/api/finalize/${sessionId}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ transcript: text, goal })
                });
                // Try to parse JSON either way to capture summary on DB errors
                const payload = await res.json().catch(async () => ({ error: await res.text() }));
                // Persist locally as a fallback for dashboard rendering
                try {
                  if (payload?.summary) {
                    localStorage.setItem(`summary:${sessionId}`, JSON.stringify(payload.summary));
                  }
                  if (text) {
                    localStorage.setItem(`transcript:${sessionId}`, text);
                  }
                } catch {}
                if (!res.ok) {
                  // If DB failed but we have a summary, route with local flag
                  if (payload?.summary) {
                    router.push(`/dashboard/${sessionId}?local=1`);
                    return;
                  }
                  throw new Error(payload?.error || `HTTP ${res.status}`);
                }
                router.push(`/dashboard/${sessionId}`);
              } catch (e: any) {
                setErrorMsg(e?.message || "Failed to finalize session");
              }
            }}
            className="bg-slate-800 text-white px-3 py-2 rounded"
          >
            End & Save Summary
          </button>
        </div>
      </div>
      {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
      <Overlay
        sessionId={sessionId}
        connected={connected}
        transcript={transcript}
        coverage={coverage}
        nbq={nbq}
        nbqRefreshAvailable={!!nbqQueued}
        onNbqRefreshNow={() => {
          if (nbqQueued) {
            considerNbqCandidate(nbqQueued);
            setNbqQueued(null);
          }
        }}
        onNbqAction={(action) => {
          // On accept/skip, clear current and queued, and release lock
          setNbq(null);
          setNbqQueued(null);
          setNbqLockedUntil(0);
        }}
      />
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
