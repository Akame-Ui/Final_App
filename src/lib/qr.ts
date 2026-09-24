export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

// Base URL for universal QR. Any camera scanning the QR will see a clickable https:// link.
// Override via EXPO_PUBLIC_APP_URL if you host the web build elsewhere (e.g. Vercel / Expo hosting).
// Falls back to qrtt.app which you can replace with your real domain.
const APP_BASE_URL = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://qrtt.app').replace(/\/$/, '');

export function buildQRPayload(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
}): string {
  // Build a universal https:// URL — scannable by iOS Camera, Android Lens, and any QR app.
  // Example: https://qrtt.app/attend?event=CALC-2026-001&title=Calculus&start=...&end=...&v=1
  // The app's scanner (parseQRPayload) also understands this URL plus legacy JSON.
  const params = new URLSearchParams();
  params.set('v', '1');
  params.set('event', event.eventId);
  if (event.title) params.set('title', event.title);
  if (event.start) params.set('start', event.start);
  if (event.end) params.set('end', event.end);
  return `${APP_BASE_URL}/attend?${params.toString()}`;
}

// Kept for debugging / deep-link fallback if you ever need raw JSON (not used for QR display).
export function buildQRPayloadJSON(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
}): string {
  const payload: QRPayload = { v: 1, event: event.eventId };
  if (event.title) payload.title = event.title;
  if (event.start) payload.start = event.start;
  if (event.end) payload.end = event.end;
  return JSON.stringify(payload);
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  const input = raw.trim();

  // 1) Try to parse as URL first — covers:
  //    - New universal format: https://qrtt.app/attend?event=CODE&v=1&title=...&start=...&end=...
  //    - Custom scheme deep link: qrttapp://attend?event=CODE...
  //    - Any https link that carries ?event= or ?code= query param
  const urlPayload = tryParseUrlPayload(input);
  if (urlPayload) return { ok: true, payload: urlPayload };

  // If it looks like a URL but didn't contain an event code, treat as not-an-attendance QR
  if (/^https?:\/\//i.test(input) || /^qrttapp:\/\//i.test(input)) {
    return { ok: false, message: 'Not an attendance QR code.' };
  }

  // 2) Legacy / fallback: raw JSON string {"v":1,"event":"CODE",...}
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, message: 'Invalid QR code.' };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('v' in parsed) ||
    !('event' in parsed) ||
    (parsed as any).v !== 1 ||
    typeof (parsed as any).event !== 'string' ||
    !(parsed as any).event
  ) {
    return { ok: false, message: 'Not an attendance QR code.' };
  }

  const payload = parsed as QRPayload;
  return { ok: true, payload };
}

function tryParseUrlPayload(raw: string): QRPayload | null {
  let url: URL;
  try {
    // Handle custom scheme qrttapp:// which URL can parse directly
    url = new URL(raw);
  } catch {
    return null;
  }

  // Only handle http(s) and qrttapp schemes
  if (!['http:', 'https:', 'qrttapp:'].includes(url.protocol)) return null;

  const params = url.searchParams;
  // Accept multiple param names for robustness
  const eventCode =
    params.get('event') ?? params.get('code') ?? params.get('eventId') ?? params.get('event_code');

  if (!eventCode) return null;

  // Validate version if present — must be 1; if missing, assume 1 for leniency
  const vParam = params.get('v');
  if (vParam !== null && vParam !== '1') return null;

  const payload: QRPayload = { v: 1, event: eventCode };
  const title = params.get('title');
  const start = params.get('start');
  const end = params.get('end');
  if (title) payload.title = title;
  if (start) payload.start = start;
  if (end) payload.end = end;
  return payload;
}
