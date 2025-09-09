"use client";
import React from "react";

type NBQ = { id: string; question: string; grounded_in?: string; checklist_category?: string; confidence?: number; source?: "fast" | "refine" };

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
          <span className={"badge " + (nbq.source === 'fast' ? 'badge-soft-primary' : 'badge-soft-success')}>
            {nbq.source === 'fast' ? 'Fast' : 'Refined'}
          </span>
        )}
      </div>
      {nbq ? (
        <div className="space-y-3">
          <div className="text-xl font-semibold leading-snug">{nbq.question}</div>
          <div className="flex gap-2">
            {onAccept && <button className="btn btn-success text-xs px-2 py-1" onClick={onAccept}>Accept</button>}
            {onSkip && <button className="btn btn-danger text-xs px-2 py-1" onClick={onSkip}>Skip</button>}
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">Awaiting suggestion…</div>
      )}
    </div>
  );
}
