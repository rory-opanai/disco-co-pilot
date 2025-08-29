"use client";
import React, { useMemo } from "react";

const CATS = [
  "Pain",
  "Impact",
  "Current Solution",
  "Desired Outcome",
  "Use Case",
  "Stakeholders",
  "Budget",
  "Timeline",
  "Decision Process",
  "Risks",
  "Metrics",
  "Compliance",
];

export default function ChecklistMeter({ coverage }: { coverage: Record<string, string> }) {
  const pct = useMemo(() => {
    const tot = CATS.length;
    const got = CATS.filter((c) => ["known", "partial"].includes(coverage[c])).length;
    return Math.round((got / tot) * 100);
  }, [coverage]);

  return (
    <div>
      <div className="mb-2">Progress: <span className="font-semibold">{pct}%</span></div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {CATS.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: dotColor(coverage[c]) }} />
            <span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function dotColor(status?: string) {
  switch (status) {
    case "known":
      return "#16a34a"; // green
    case "partial":
      return "#f59e0b"; // amber
    case "unknown":
    default:
      return "#9ca3af"; // gray
  }
}

