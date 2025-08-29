"use client";

type EventListener = (evt: any) => void;

export class RealtimeClient {
  pc: RTCPeerConnection | null = null;
  dc: RTCDataChannel | null = null;
  listeners = new Set<EventListener>();

  on(fn: EventListener) { this.listeners.add(fn); }
  off(fn: EventListener) { this.listeners.delete(fn); }
  emit(evt: any) { this.listeners.forEach(fn => fn(evt)); }

  createResponse() {
    try { this.dc?.send(JSON.stringify({ type: "response.create" })); } catch {}
  }

  async start() {
    const eph = await fetch("/api/realtime/ephemeral").then(r => r.json());
    if (!eph?.client_secret) throw new Error("Failed to obtain ephemeral key");
    const token = eph.client_secret as string;
    const model = (eph.model as string) || (process.env.NEXT_PUBLIC_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17");

    const pc = new RTCPeerConnection();
    this.pc = pc;
    // Emit WebRTC state changes for debugging
    pc.oniceconnectionstatechange = () => {
      this.emit({ type: "webrtc.ice_connection_state", state: pc.iceConnectionState });
    };
    pc.onsignalingstatechange = () => {
      this.emit({ type: "webrtc.signaling_state", state: pc.signalingState });
    };
    pc.onconnectionstatechange = () => {
      this.emit({ type: "webrtc.connection_state", state: pc.connectionState });
    };
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        this.emit(evt);
      } catch { /* ignore */ }
    };
    dc.onopen = () => {
      // Configure the session for live transcription with server-side VAD
      const sessionUpdate = {
        type: "session.update",
        session: {
          modalities: ["text"],
          turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500, create_response: false, interrupt_response: true },
          instructions: "You are a live transcriber. Transcribe the user's speech verbatim with no additional commentary. Do not speak back.",
          input_audio_transcription: { model: (process.env.NEXT_PUBLIC_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe") }
        }
      };
      try { dc.send(JSON.stringify(sessionUpdate)); } catch {}
      // No response.create needed since we don't want assistant messages
    };

    // Mic capture
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
    try {
      const r = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
          Accept: "application/sdp",
          "OpenAI-Beta": "realtime=v1"
        },
        body: offer.sdp
      });
      if (!r.ok) {
        const body = await r.text();
        this.emit({ type: "realtime.sdp_error", status: r.status, body });
        throw new Error(`Realtime SDP exchange failed: ${r.status}`);
      }
      const ansSdp = await r.text();
      await pc.setRemoteDescription({ type: "answer", sdp: ansSdp });
    } catch (e: any) {
      this.emit({ type: "realtime.error", message: e?.message || String(e) });
      throw e;
    }
  }

  async stop() {
    try { this.dc?.close(); } catch {}
    try { this.pc?.getSenders().forEach(s => s.track?.stop()); } catch {}
    try { this.pc?.close(); } catch {}
  }
}
