"use client";
export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import React from "react";

export default function HomePage() {
  const router = useRouter();

  const start = async () => {
    const id = `sess_${Date.now()}`;
    router.push(`/call?sessionId=${id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Discovery Co-Pilot</h1>
      <p className="text-slate-600">Click below to begin a new discovery call. We’ll generate a session ID automatically.</p>
      <button onClick={start} className="bg-blue-600 text-white px-4 py-2 rounded">Start Call</button>
    </div>
  );
}
