"use client";
import React from "react";
import TranscriptFeed from "./TranscriptFeed";
import ChecklistMeter from "./ChecklistMeter";
import NBQMetricCard from "./NBQMetricCard";

type Props = {
  sessionId: string;
  connected: boolean;
  transcript: { speaker: string; text: string; timestamp: string }[];
  coverage: Record<string, string>;
  nbqItems: any[];
  goodMoment?: boolean;
  onNbqActionAt: (index: number, action: "accept" | "skip") => void;
  onNbqRefreshNow?: () => void;
  onQueueForPauseAt?: (index: number) => void;
};

export default function Overlay({ sessionId, connected, transcript, coverage, nbqItems, goodMoment, onNbqActionAt, onNbqRefreshNow }: Props) {
  // Dashboard-style layout: 4 stat cards for NBQs + transcript in "Ticket Volume"
  const cards = [
    { title: "Open Questions", idx: 0 },
    { title: "Avg Response Time", idx: 1 },
    { title: "Resolved Today", idx: 2 },
    { title: "High Priority", idx: 3 },
  ];
  const lastCustomer = [...transcript].reverse().find((t) => t.speaker === 'Customer');
  const lastQuote = lastCustomer?.text || '';
  const lastTs = lastCustomer?.timestamp || '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <NBQMetricCard
            key={c.title}
            title={c.title}
            nbq={nbqItems[c.idx]}
            onAccept={nbqItems[c.idx] ? () => onNbqActionAt(c.idx, "accept") : undefined}
            onSkip={nbqItems[c.idx] ? () => onNbqActionAt(c.idx, "skip") : undefined}
          />
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Transcription</div>
            <div className="text-xs flex items-center gap-2">
              {goodMoment ? (
                <span className="text-emerald-700 bg-emerald-100 rounded px-2 py-0.5">Now’s a good moment</span>
              ) : (
                <span className={connected ? "text-green-600" : "text-red-600"}>{connected ? "Listening…" : "Connecting..."}</span>
              )}
            </div>
          </div>
          <TranscriptFeed items={transcript} />
        </div>
        <div className="card">
          <div className="font-semibold mb-2">Checklist Progress</div>
          <ChecklistMeter coverage={coverage} />
        </div>
      </div>
      <div className="text-xs text-slate-500">NBQs auto-refresh and replace when answered.</div>
    </div>
  );
}
