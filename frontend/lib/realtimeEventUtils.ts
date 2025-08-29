export type RealtimeEvent = { type?: string; [k: string]: any };

// Returns the delta text if the event represents a text delta; otherwise null
export function getTextDelta(evt: RealtimeEvent): string | null {
  if (!evt || typeof evt !== 'object') return null;
  if (evt.type === 'response.text.delta' || evt.type === 'response.output_text.delta') {
    const d = evt.delta;
    return typeof d === 'string' ? d : null;
  }
  return null;
}

// Returns true if the event marks the end of a response turn
export function isResponseDone(evt: RealtimeEvent): boolean {
  if (!evt || typeof evt !== 'object') return false;
  return evt.type === 'response.done' || evt.type === 'response.completed';
}

