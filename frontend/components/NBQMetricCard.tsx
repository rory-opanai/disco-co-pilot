"use client";
import React, { useMemo, useState } from "react";

type NBQ = { id: string; question: string; grounded_in?: string; checklist_category?: string; confidence?: number; source?: "fast" | "refine" };

export default function NBQMetricCard({
  title,
  nbq,
  onAccept,
  onSkip,
  onQueue,
  bridgeQuote,
  bridgeTimestamp,
}: {
  title: string;
  nbq?: NBQ;
  onAccept?: () => void;
  onSkip?: () => void;
  onQueue?: () => void;
  bridgeQuote?: string;
  bridgeTimestamp?: string;
}) {
  const [tone, setTone] = useState<'consultative' | 'curious' | 'exec' | 'casual'>('consultative');
  const [transform, setTransform] = useState<{ soften?: boolean; shorten?: boolean; open?: boolean; empath?: boolean }>({});
  const [bridge, setBridge] = useState<'reflect' | 'clarify' | 'transition' | null>('reflect');

  const display = useMemo(() => {
    if (!nbq) return '';
    let q = nbq.question || '';
    // Basic transforms
    if (transform.open) q = toOpenEnded(q);
    if (transform.soften) q = soften(q);
    if (transform.empath) q = empathetic(q);
    if (transform.shorten) q = shorten(q);
    // Tone
    q = applyTone(q, tone);
    // Bridge with customer quote
    if (bridge && bridgeQuote) {
      const qt = bridgeQuote.trim().slice(0, 100);
      const stamp = bridgeTimestamp ? ` (${formatTime(bridgeTimestamp)})` : '';
      if (bridge === 'reflect') q = `You mentioned “${qt}”${stamp}. ${q}`;
      if (bridge === 'clarify') q = `Just to clarify on “${qt}”${stamp}, ${q}`;
      if (bridge === 'transition') q = `To build on “${qt}”${stamp}, ${q}`;
    }
    return q;
  }, [nbq, tone, transform, bridge, bridgeQuote, bridgeTimestamp]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="text-slate-600 text-sm mb-2 flex items-center justify-between">
        <div className="font-medium">{title}</div>
        {nbq?.source && (
          <span className={"badge " + (nbq.source === 'fast' ? 'badge-soft-primary' : 'badge-soft-success')}>
            {nbq.source === 'fast' ? 'Fast' : 'Refined'}
          </span>
        )}
      </div>
      {nbq ? (
        <div className="space-y-3">
          <div className="text-xl font-semibold leading-snug">{display}</div>
          {/* Why this question */}
          <div className="text-xs text-slate-600">Why: {nbq.grounded_in || nbq.checklist_category || 'Guidance'}</div>
          {/* Tone & transforms */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex gap-1" role="group" aria-label="Tone">
              {[
                ['consultative','Consultative'],
                ['curious','Curious'],
                ['exec','Executive'],
                ['casual','Casual'],
              ].map(([key,label]) => (
                <button key={key} className={`px-2 py-0.5 rounded border ${tone===key? 'bg-slate-900 text-white':'bg-white text-slate-800'}`} onClick={() => setTone(key as any)}>{label}</button>
              ))}
            </div>
            <div className="flex gap-1" role="group" aria-label="Transforms">
              <button className="px-2 py-0.5 rounded border" onClick={() => setTransform(t => ({...t, soften: !t.soften}))}>Soften</button>
              <button className="px-2 py-0.5 rounded border" onClick={() => setTransform(t => ({...t, shorten: !t.shorten}))}>Shorten</button>
              <button className="px-2 py-0.5 rounded border" onClick={() => setTransform(t => ({...t, open: !t.open}))}>Open‑ended</button>
              <button className="px-2 py-0.5 rounded border" onClick={() => setTransform(t => ({...t, empath: !t.empath}))}>Empathetic</button>
            </div>
            <div className="flex gap-1" role="group" aria-label="Bridge">
              <button className={`px-2 py-0.5 rounded border ${bridge==='reflect'?'bg-slate-100':''}`} onClick={() => setBridge('reflect')}>Reflect</button>
              <button className={`px-2 py-0.5 rounded border ${bridge==='clarify'?'bg-slate-100':''}`} onClick={() => setBridge('clarify')}>Clarify</button>
              <button className={`px-2 py-0.5 rounded border ${bridge==='transition'?'bg-slate-100':''}`} onClick={() => setBridge('transition')}>Transition</button>
            </div>
          </div>
          <div className="flex gap-2">
            {onAccept && <button className="btn btn-success text-xs px-2 py-1" onClick={onAccept}>Accept</button>}
            {onSkip && <button className="btn btn-secondary text-xs px-2 py-1" onClick={onSkip}>Skip</button>}
            {onQueue && <button className="btn btn-secondary text-xs px-2 py-1" onClick={onQueue} title="Show on next pause">Queue for next pause</button>}
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">Awaiting suggestion…</div>
      )}
    </div>
  );
}

function soften(q: string) {
  return q.replace(/^what\b/i, 'What').replace(/\?*$/, '')
    .replace(/^(.+)$/, (m) => `Could you share ${lowercaseFirst(m).replace(/^could you share\s+/i,'')}`) + '?';
}
function shorten(q: string) {
  const base = q.split(/[.;:!?]/)[0];
  return base.length > 120 ? base.slice(0, 120) + '…?' : base + (base.endsWith('?')?'':'?');
}
function toOpenEnded(q: string) {
  return q.replace(/^\s*(is|are|do|does|did|can|would|could|should)\b.*\?*$/i, (m) => m.replace(/^(is|are)/i, 'How').replace(/^(do|does|did)/i, 'How').replace(/^(can|would|could|should)/i, 'What')).replace(/\?*$/, '?');
}
function empathetic(q: string) {
  return q.replace(/^(.+)$/, (m) => `Appreciate what you shared — ${lowercaseFirst(m)}`);
}
function applyTone(q: string, tone: string) {
  if (tone === 'consultative') return q;
  if (tone === 'curious') return q.replace(/^(.+)$/, (m) => `I'm curious — ${lowercaseFirst(m)}`);
  if (tone === 'exec') return q.replace(/^(.+)$/, (m) => `From a business outcomes standpoint, ${lowercaseFirst(m)}`);
  if (tone === 'casual') return q.replace(/^(.+)$/, (m) => `Quick one — ${lowercaseFirst(m)}`);
  return q;
}
function lowercaseFirst(s: string) { return s.slice(0,1).toLowerCase() + s.slice(1); }
function formatTime(ts?: string) { try { const d = new Date(ts || ''); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
