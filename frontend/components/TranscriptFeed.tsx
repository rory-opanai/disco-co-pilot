"use client";
import React from "react";

type Item = { speaker: string; text: string; timestamp: string };

export default function TranscriptFeed({ items }: { items: Item[] }) {
  return (
    <div className="h-96 overflow-y-auto space-y-1">
      {items.map((it, i) => (
        <div key={i} className="text-sm">
          <span className={"font-medium " + (it.speaker === "Customer" ? "text-rose-700" : "text-sky-700")}>{it.speaker}:</span> {it.text}
        </div>
      ))}
    </div>
  );
}

