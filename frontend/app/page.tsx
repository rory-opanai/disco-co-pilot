"use client";
export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");

  const start = async () => {
    const id = sessionId || `sess_${Date.now()}`;
    router.push(`/call?sessionId=${id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Discovery Co-Pilot</h1>
      <div className="space-y-2">
        <label className="block text-sm">Optional Session ID</label>
        <input className="border px-3 py-2 rounded w-full" value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="sess_123" />
      </div>
      <button onClick={start} className="bg-blue-600 text-white px-4 py-2 rounded">Start Call</button>
    </div>
  );
}
