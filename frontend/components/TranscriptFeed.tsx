"use client";
import React from "react";

type Item = { speaker: string; text: string; timestamp: string };

export default function TranscriptFeed({ items }: { items: Item[] }) {
  return (
    <div className="h-96 overflow-y-auto">
      {items.map((it, i) => (
        <div key={i} className={"text-sm px-2 py-1 " + (i % 2 === 0 ? "bg-white" : "bg-slate-50") }>
          <span className={"mr-2 inline-flex items-center gap-1"}>
            <span className={"chip " + (it.speaker === 'Customer' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700')}>{it.speaker}</span>
            <span className="text-xs font-mono text-slate-500">{formatTime(it.timestamp)}</span>
          </span>
          <span>{it.text}</span>
        </div>
      ))}
    </div>
  );
}

function formatTime(ts?: string) {
  try { const d = new Date(ts || ''); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
