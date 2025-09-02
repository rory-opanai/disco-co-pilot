"use client";
import React, { useEffect, useMemo, useState } from "react";
import TranscriptFeed from "./TranscriptFeed";
import NBQCard from "./NBQCard";
import ChecklistMeter from "./ChecklistMeter";

type Props = {
  sessionId: string;
  connected: boolean;
  transcript: { speaker: string; text: string; timestamp: string }[];
  coverage: Record<string, string>;
  nbq: any | null;
  nbqRefreshAvailable?: boolean;
  onNbqRefreshNow?: () => void;
  onNbqAction: (action: "accept" | "skip") => void;
};

export default function Overlay({ sessionId, connected, transcript, coverage, nbq, nbqRefreshAvailable, onNbqRefreshNow, onNbqAction }: Props) {
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
          <div className="font-semibold mb-2">Next Best Question</div>
          <NBQCard nbq={nbq} onAction={onNbqAction} hasQueuedUpdate={!!nbqRefreshAvailable} onRefreshNow={onNbqRefreshNow} />
          <div className="text-xs text-slate-500 mt-2">Hotkeys: N = accept, S = skip</div>
        </div>
      </div>
    </div>
  );
}
