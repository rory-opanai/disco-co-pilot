"use client";
import React, { useEffect } from "react";

type Props = { nbq: any | null; onAction: (action: "accept" | "skip") => void; hasQueuedUpdate?: boolean; onRefreshNow?: () => void; disableHotkeys?: boolean };

export default function NBQCard({ nbq, onAction, hasQueuedUpdate, onRefreshNow, disableHotkeys }: Props) {
  useEffect(() => {
    if (disableHotkeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (!nbq) return;
      if (e.key.toLowerCase() === "n") onAction("accept");
      if (e.key.toLowerCase() === "s") onAction("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nbq, onAction, disableHotkeys]);

  if (!nbq) return <div className="text-slate-500">Awaiting next suggestion…</div>;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Category: {nbq.checklist_category}</div>
        {hasQueuedUpdate ? (
          <button className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800" onClick={onRefreshNow} title="A better suggestion is ready">
            Refresh available
          </button>
        ) : null}
      </div>
      <div className="text-lg">{nbq.question}</div>
      <div className="flex gap-2">
        <button className="btn btn-success" onClick={() => onAction("accept")}>Accept (N)</button>
        <button className="btn btn-secondary" onClick={() => onAction("skip")}>Skip (S)</button>
      </div>
    </div>
  );
}
