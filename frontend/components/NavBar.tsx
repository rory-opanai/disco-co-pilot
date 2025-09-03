"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const start = () => {
    const id = `sess_${crypto.randomUUID()}`;
    router.push(`/call?sessionId=${id}`);
  };
  return (
    <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-800 text-white flex items-center justify-center font-bold">D</div>
          <button className="text-sm font-semibold" onClick={() => router.push('/')}>Discovery Co-Pilot</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary" onClick={start}>Start Call</button>
        </div>
      </div>
    </div>
  );
}

