"use client";
import React, { useEffect, useMemo, useState } from "react";
import TranscriptFeed from "./TranscriptFeed";
import NBQList from "./NBQList";
import ChecklistMeter from "./ChecklistMeter";

type Props = {
  sessionId: string;
  connected: boolean;
  transcript: { speaker: string; text: string; timestamp: string }[];
  coverage: Record<string, string>;
  nbqItems: any[];
  onNbqActionAt: (index: number, action: "accept" | "skip") => void;
  onNbqRefreshNow?: () => void;
};

export default function Overlay({ sessionId, connected, transcript, coverage, nbqItems, onNbqActionAt, onNbqRefreshNow }: Props) {
  // Parent manages all state; this component renders UI only.

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Live Transcript</div>
          <div className={"text-xs " + (connected ? "text-green-600" : "text-red-600")}>{connected ? "Connected" : "Connecting..."}</div>
        </div>
        <TranscriptFeed items={transcript} />
      </div>
      <div className="space-y-4">
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Checklist Progress</div>
          <ChecklistMeter coverage={coverage} />
        </div>
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Next Best Questions (5)</div>
          <NBQList items={nbqItems} onAction={onNbqActionAt} onRefreshNow={onNbqRefreshNow} />
          <div className="text-xs text-slate-500 mt-2">Click Accept/Skip to manage; list auto-refreshes.</div>
        </div>
      </div>
    </div>
  );
}
