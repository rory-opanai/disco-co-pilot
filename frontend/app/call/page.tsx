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
  type NBQItem = { id: string; question: string; checklist_category?: string; confidence?: number; source?: 'fast' | 'refine' };
  const [nbqItems, setNbqItems] = useState<NBQItem[]>([]);
  const nbqRef = useRef<NBQItem[]>([]);
  useEffect(() => { nbqRef.current = nbqItems; }, [nbqItems]);
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
  const [finalizing, setFinalizing] = useState<boolean>(false);

  // Seed initial NBQs so the panel isn't empty at start
  useEffect(() => {
    if (nbqItems.length === 0) {
      const initSeeds = fastSeedCandidates('', cRef.current, goalRef.current, NBQ_TARGET_COUNT);
      setNbqItems(uniqByQuestion(initSeeds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When coverage flips to "covered/complete", drop NBQs targeting that category
  useEffect(() => {
    setNbqItems((prev) => prev.filter((it) => !isCoveredStatus(coverage[it.checklist_category || ''])));
  }, [coverage]);

  const NBQ_DEBOUNCE_MS = 1200; // faster follow-up
  const NBQ_TARGET_COUNT = 5;

  function uniqByQuestion(items: NBQItem[]) {
    const seen = new Set<string>();
    const out: NBQItem[] = [];
    for (const it of items) {
      const key = it.question.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(it); }
    }
    return out;
  }

  const STOPWORDS = new Set<string>([
    'the','and','for','with','that','this','from','your','you','are','our','was','were','have','has','had','will','would','could','should','about','into','over','above','below','what','when','where','which','who','how','why','does','do','did','is','it','to','in','on','as','of','at','by','an','a','or','be'
  ]);

  function tokenize(text: string): string[] {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && w.length >= 4 && !STOPWORDS.has(w));
  }

  function isLikelyQuestion(text: string): boolean {
    const t = (text || '').trim();
    return t.endsWith('?') || /^(what|how|why|when|who|which|do|does|did|is|are|can|could|would|should)\b/i.test(t);
  }

  function isLikelyAnswerTo(question: string, utterance: string): boolean {
    if (!utterance || !question) return false;
    // If the utterance is itself a question, assume not answered
    if (isLikelyQuestion(utterance)) return false;
    const qTok = new Set(tokenize(question));
    const uTok = new Set(tokenize(utterance));
    let overlap = 0;
    qTok.forEach(t => { if (uTok.has(t)) overlap++; });
    const minBasis = Math.max(2, Math.min(qTok.size, 6));
    const ratio = overlap / minBasis;
    // Heuristics: enough topical overlap and the utterance is declarative
    return overlap >= 2 && ratio >= 0.4;
  }

  function isCoveredStatus(status?: string) {
    if (!status) return false;
    const s = status.toLowerCase();
    // Live coverage uses: known | partial | unknown
    return s === 'known';
  }

  function fastSeedCandidates(windowText: string, cov: Record<string,string>, goalText: string, max: number): NBQItem[] {
    // Value-Based Discovery Blueprint pillars
    const pillars: Array<{ key: string; label: string; templates: string[] }> = [
      { key: 'context', label: 'Context & Rapport', templates: [
        'What does your organization do, and what’s your role in it?',
        'What are your top business priorities this quarter or year?',
        'How is success measured for you and your team?',
      ]},
      { key: 'current_situation', label: 'Current Situation', templates: [
        'What tools, systems, or processes are you using today?',
        'What’s working well right now?',
        'Where are the biggest challenges or bottlenecks?',
      ]},
      { key: 'drivers_challenges', label: 'Business Drivers & Challenges', templates: [
        'What key initiatives or strategic projects are underway?',
        'What challenges are preventing you from hitting those goals?',
        'Who is most impacted by these challenges?',
        'What happens if these challenges aren’t solved?',
      ]},
      { key: 'metrics_impact', label: 'Metrics & Impact', templates: [
        'How do you measure the impact of these challenges today (time, cost, revenue, risk, CSAT)?',
        'Can you quantify the cost of the problem (lost revenue, wasted hours, missed opportunities)?',
        'What would solving this challenge unlock for you?',
      ]},
      { key: 'decision_process', label: 'Decision & Buying Process', templates: [
        'Who is typically involved in evaluating or approving solutions like this?',
        'What does your internal decision-making process look like?',
        'What is your expected timeline for solving this problem?',
        'Are there any budget considerations or constraints we should be aware of?',
      ]},
      { key: 'success_criteria', label: 'Success Criteria', templates: [
        'What does success look like for you 6–12 months from now?',
        'How will you evaluate if a solution is delivering value?',
        'Are there specific KPIs or outcomes you must hit?',
      ]},
      { key: 'next_steps', label: 'Next Steps', templates: [
        'If we can help you solve this, what would be the best next step?',
        'Who else should we bring into the conversation?',
        'Would you like us to outline a tailored solution or business case for review?',
      ]},
      { key: 'risks', label: 'Risks', templates: [
        'Are there any risks or unknowns that would worry you about moving forward?',
      ]},
    ];
    const gaps = Object.entries(cov || {}).filter(([_, v]) => !isCoveredStatus(v)).map(([k]) => k.toLowerCase());
    const picks: NBQItem[] = [];
    const lowerGoal = (goalText || '').toLowerCase();
    for (const p of pillars) {
      if (picks.length >= max) break;
      // prioritize if pillar name or related signals appear in goal or window
      const boost = lowerGoal.includes(p.key) || windowText.toLowerCase().includes(p.key);
      const category = p.label;
      if (boost || gaps.length === 0 || gaps.some(g => category.toLowerCase().includes(g))) {
        for (const q of p.templates) {
          if (picks.length >= max) break;
          picks.push({ id: `fast_${p.key}_${q.length}_${Math.random().toString(36).slice(2,6)}`, question: q, checklist_category: category, confidence: 0.55, source: 'fast' });
        }
      }
    }
    return picks.slice(0, max);
  }

  async function refineTopUp(lastUtter: string) {
    try {
      if (nbqInFlightRef.current) return;
      nbqInFlightRef.current = true;
      const need = Math.max(0, NBQ_TARGET_COUNT - nbqItems.length);
      const res = await fetch('/api/nbq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastUtterance: lastUtter, checklist: cRef.current, goal: goalRef.current, count: Math.max(1, Math.min(3, need)) }) });
      const json = await res.json();
      const items = (json.nbqs || (json.nbq ? [json.nbq] : [])).map((it: any) => ({ ...it, source: 'refine' as const }));
      if (items.length) {
        setNbqItems((prev) => uniqByQuestion([...prev, ...items]).slice(0, NBQ_TARGET_COUNT));
      }
    } catch (e) {
      // no-op
    } finally {
      nbqInFlightRef.current = false;
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
          if (!inFlightRef.current && now - lastReqTsRef.current >= 1200) {
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
                  // Drop NBQs likely answered by the last 1-2 utterances (LLM check + heuristic)
                  const recent = [lastUtter, tRef.current.slice(-2)[0]?.text].filter(Boolean) as string[];
                  // Heuristic quick filter
                  setNbqItems((prev) => prev.filter(it => !recent.some(u => isLikelyAnswerTo(it.question, u))));
                  // Server check for better semantics (non-blocking)
                  try {
                    const resAns = await fetch('/api/nbq/answered', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nbqs: nbqRef.current.map(({ id, question }) => ({ id, question })), recentUtterances: recent }) });
                    const ansJson = await resAns.json();
                    const ids = Array.isArray(ansJson.answeredIds) ? new Set(ansJson.answeredIds) : new Set<string>();
                    if (ids.size) setNbqItems((prev) => prev.filter(it => !ids.has(it.id)));
                  } catch {}
                  // Fast path: top-up with heuristic seeds immediately
                  setNbqItems((prev) => {
                    const seeds = fastSeedCandidates(transcriptWindow, cRef.current, goalRef.current, NBQ_TARGET_COUNT);
                    return uniqByQuestion([...prev, ...seeds]).slice(0, NBQ_TARGET_COUNT);
                  });
                  // Debounced refine path: replace/improve items
                  if (nbqDebounceRef.current) clearTimeout(nbqDebounceRef.current as number);
                  nbqDebounceRef.current = window.setTimeout(() => { refineTopUp(lastUtter); }, NBQ_DEBOUNCE_MS);
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
    rc.start()
      .then(() => setConnected(true))
      .catch((e: any) => {
        setConnected(false);
        setErrorMsg(e?.message || "Failed to connect to realtime API");
      });
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
            disabled={finalizing}
            onClick={async () => {
              // Collapse transcript into a single string and finalize
              const text = tRef.current
                .map((t) => `${t.speaker}: ${t.text}`)
                .join("\n");
              try {
                setFinalizing(true);
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
              } finally {
                setFinalizing(false);
              }
            }}
            className={"bg-slate-800 text-white px-3 py-2 rounded flex items-center gap-2 " + (finalizing ? 'opacity-60 cursor-not-allowed' : '')}
          >
            {finalizing && (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            )}
            <span>{finalizing ? 'Saving…' : 'End & Save Summary'}</span>
          </button>
        </div>
      </div>
      {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
      <Overlay
        sessionId={sessionId}
        connected={connected}
        transcript={transcript}
        coverage={coverage}
        nbqItems={nbqItems}
        onNbqActionAt={(index, action) => {
          setNbqItems((prev) => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
          });
          // Quick top-up with a fast seed; refine will also run on next turn
          const windowText = tRef.current.slice(-40).map(t => t.text).join(' ');
          const seeds = fastSeedCandidates(windowText, cRef.current, goalRef.current, 1);
          if (seeds.length) setNbqItems((prev) => uniqByQuestion([...prev, ...seeds]).slice(0, NBQ_TARGET_COUNT));
        }}
        onNbqRefreshNow={() => {
          // Force a refine top-up now if user wants fresher options
          const lastUtter = tRef.current.slice(-1)[0]?.text || '';
          refineTopUp(lastUtter);
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
