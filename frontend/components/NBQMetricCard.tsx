"use client";
import React from "react";

type Props = {
  title: string;
  nbq?: { question: string; checklist_category?: string; confidence?: number } | null;
  onAccept?: () => void;
  onSkip?: () => void;
};

export default function NBQMetricCard({ title, nbq, onAccept, onSkip }: Props) {
  const conf = typeof nbq?.confidence === "number" ? Math.round(nbq!.confidence * 100) : null;
  return (
    <div className="card h-full flex flex-col">
      <div className="text-xs text-slate-500 mb-1">{title}</div>
      {nbq ? (
        <>
          <div className="text-sm text-slate-600 mb-1">{nbq.checklist_category || "General"}</div>
          <div className="text-base font-medium leading-snug flex-1">{nbq.question}</div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">{conf !== null ? `Confidence ${conf}%` : ""}</div>
            <div className="flex gap-1">
              {onSkip && <button className="btn btn-secondary" onClick={onSkip}>Skip</button>}
              {onAccept && <button className="btn btn-success" onClick={onAccept}>Ask</button>}
            </div>
          </div>
        </>
      ) : (
        <div className="text-slate-500">Awaiting suggestion…</div>
      )}
    </div>
  );
}

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
