"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const onStart = () => {
    const id = `sess_${crypto.randomUUID()}`;
    router.push(`/call?sessionId=${id}`);
  };
  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <button className="flex items-center gap-2" onClick={() => router.push("/")}> 
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white text-[11px] font-semibold">DC</span>
          <span className="font-medium tracking-tight">Disco Co‑Pilot</span>
        </button>
        <div className="flex items-center gap-2">
          {pathname?.startsWith("/call") ? (
            <button className="btn btn-secondary" onClick={() => router.push("/")}>Home</button>
          ) : (
            <button className="btn btn-primary" onClick={onStart}>Start Call</button>
          )}
        </div>
      </div>
    </div>
  );
}
