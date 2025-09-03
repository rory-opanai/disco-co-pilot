"use client";
import React from "react";

type NBQ = { id: string; question: string; checklist_category?: string; confidence?: number; source?: "fast" | "refine" };

export default function NBQMetricCard({
  title,
  nbq,
  onAccept,
  onSkip,
}: {
  title: string;
  nbq?: NBQ;
  onAccept?: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="text-slate-600 text-sm mb-2 flex items-center justify-between">
        <div className="font-medium">{title}</div>
        {nbq?.source && (
          <span className={"text-[10px] px-1.5 py-0.5 rounded " + (nbq.source === 'fast' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700')}>
            {nbq.source === 'fast' ? 'Fast' : 'Refined'}
          </span>
        )}
      </div>
      {nbq ? (
        <div className="space-y-3">
          <div className="text-xl font-semibold leading-snug">{nbq.question}</div>
          <div className="flex gap-2">
            {onAccept && <button className="bg-green-600 text-white text-xs px-2 py-1 rounded" onClick={onAccept}>Accept</button>}
            {onSkip && <button className="bg-slate-200 text-slate-900 text-xs px-2 py-1 rounded" onClick={onSkip}>Skip</button>}
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">Awaiting suggestion…</div>
      )}
    </div>
  );
}

