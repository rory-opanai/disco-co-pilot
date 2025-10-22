"use client";
import React from "react";

export default function ToastList({ items }: { items: { id: string; text: string }[] }) {
  if (!items?.length) return null;
  return (
    <div className="fixed right-3 top-14 z-40 space-y-2">
      {items.map((t) => (
        <div key={t.id} className="card shadow-overlay bg-white/95">
          <div className="text-sm">{t.text}</div>
        </div>
      ))}
    </div>
  );
}

"use client";
import React from "react";

type Toast = { id: string; text: string };

export default function ToastList({ items, onClose }: { items: Toast[]; onClose?: (id: string) => void }) {
  return (
    <div className="fixed top-3 right-3 z-50 space-y-2">
      {items.map((t) => (
        <div key={t.id} className="bg-emerald-600 text-white text-sm px-3 py-2 rounded shadow">
          <span className="mr-2">✓</span>{t.text}
          {onClose && (
            <button className="ml-3 text-white/80 hover:text-white" onClick={() => onClose(t.id)} aria-label="Dismiss">
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

