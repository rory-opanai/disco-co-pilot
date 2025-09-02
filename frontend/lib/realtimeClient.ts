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
    // Defer ephemeral fetch until just before SDP POST to avoid token expiry
    const getEphemeral = async () => {
      const res = await fetch("/api/realtime/ephemeral");
      if (!res.ok) throw new Error(`Ephemeral fetch failed: ${res.status}`);
      const json = await res.json();
      const tok = json?.client_secret as string | undefined;
      const mdl = (json?.model as string) || (process.env.NEXT_PUBLIC_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17");
      if (!tok) throw new Error("Failed to obtain ephemeral key");
      return { token: tok, model: mdl };
    };

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
          modalities: ["text", "audio"],
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

    // Wait for ICE gathering to complete to improve SDP success rate
    const waitForIceGatheringComplete = () => new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") return resolve();
      const check = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", check);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete().catch(() => {});

    const attemptSdpPost = async (token: string, model: string) => {
      const baseUrl = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
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
      return r;
    };

    const attemptViaProxy = async (model: string) => {
      const r = await fetch(`/api/realtime/sdp?model=${encodeURIComponent(model)}`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp", Accept: "application/sdp" },
        body: offer.sdp
      });
      return r;
    };

    try {
      // First try with a fresh ephemeral token
      let { token, model } = await getEphemeral();
      let r = await attemptSdpPost(token, model);
      if (r.status === 401) {
        // One-time retry with a new token in case of expiry/race
        const body = await r.text();
        this.emit({ type: "realtime.sdp_error", status: r.status, body, retry: true });
        ({ token, model } = await getEphemeral());
        r = await attemptSdpPost(token, model);
      }
      if (!r.ok) {
        const firstBody = await r.text().catch(() => "");
        this.emit({ type: "realtime.sdp_error", stage: "ephemeral", status: r.status, body: firstBody });
        // Fallback: try posting via server proxy with API key
        const proxy = await attemptViaProxy(model);
        if (!proxy.ok) {
          const secondBody = await proxy.text().catch(() => "");
          this.emit({ type: "realtime.sdp_error", stage: "proxy", status: proxy.status, body: secondBody });
          throw new Error(`Realtime SDP exchange failed (ephemeral ${r.status}, proxy ${proxy.status})`);
        }
        const ansSdp = await proxy.text();
        await pc.setRemoteDescription({ type: "answer", sdp: ansSdp });
        return;
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
