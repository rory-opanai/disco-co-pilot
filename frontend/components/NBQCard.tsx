"use client";
import React, { useEffect } from "react";

type Props = { nbq: any | null; onAction: (action: "accept" | "skip") => void };

export default function NBQCard({ nbq, onAction }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!nbq) return;
      if (e.key.toLowerCase() === "n") onAction("accept");
      if (e.key.toLowerCase() === "s") onAction("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nbq, onAction]);

  if (!nbq) return <div className="text-slate-500">Awaiting next suggestion…</div>;
  return (
    <div className="space-y-2">
      <div className="text-sm text-slate-600">Category: {nbq.checklist_category}</div>
      <div className="text-lg">{nbq.question}</div>
      <div className="flex gap-2">
        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => onAction("accept")}>Accept (N)</button>
        <button className="bg-slate-300 text-slate-900 px-3 py-1 rounded" onClick={() => onAction("skip")}>Skip (S)</button>
      </div>
    </div>
  );
}

