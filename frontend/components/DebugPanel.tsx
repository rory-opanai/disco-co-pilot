"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onToggle: () => void;
  events: { t: string; type?: string; data: any }[];
  onClear: () => void;
};

export default function DebugPanel({ open, onToggle, events, onClear }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [events.length]);

  return (
    <div className="border rounded">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100">
        <div className="font-medium">Realtime Debug</div>
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded bg-slate-200" onClick={onToggle}>{open ? "Hide" : "Show"}</button>
          <button className="text-xs px-2 py-1 rounded bg-slate-200" onClick={onClear}>Clear</button>
        </div>
      </div>
      {open && (
        <div className="max-h-64 overflow-auto p-2 text-xs font-mono">
          {events.length === 0 && <div className="text-slate-500">No events yet…</div>}
          {events.map((ev, i) => (
            <div key={i} className="mb-2">
              <div className="text-slate-500">[{ev.t}] {ev.type || "event"}</div>
              <pre className="whitespace-pre-wrap break-words">{safeStringify(ev.data)}</pre>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

function safeStringify(v: any) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

