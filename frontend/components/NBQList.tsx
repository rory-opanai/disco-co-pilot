"use client";
import React from "react";
import NBQCard from "./NBQCard";

type NBQ = {
  id: string;
  question: string;
  checklist_category?: string;
  confidence?: number;
  source?: "fast" | "refine";
};

type Props = {
  items: NBQ[];
  onAction: (index: number, action: "accept" | "skip") => void;
  onRefreshNow?: () => void;
};

export default function NBQList({ items, onAction, onRefreshNow }: Props) {
  return (
    <div className="space-y-3">
      {items.length === 0 && <div className="text-slate-500">Awaiting suggestions…</div>}
      {items.map((it, idx) => (
        <div key={it.id} className="border rounded p-2">
          <div className="flex items-center justify-between mb-1 text-xs text-slate-600">
            <div>
              {it.source === "fast" ? (
                <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 mr-2">Fast</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 mr-2">Refined</span>
              )}
              <span>Category: {it.checklist_category || "General"}</span>
            </div>
            {typeof it.confidence === "number" && (
              <div>Conf: {(it.confidence * 100).toFixed(0)}%</div>
            )}
          </div>
          {/* Disable per-card hotkeys to avoid conflicts when showing 5 */}
          <NBQCard nbq={it} onAction={(a) => onAction(idx, a)} hasQueuedUpdate={false} onRefreshNow={onRefreshNow} disableHotkeys />
        </div>
      ))}
    </div>
  );
}

