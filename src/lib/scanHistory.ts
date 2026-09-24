import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseQRPayload } from '@/lib/qr';

export type ScanHistoryEntry = {
  id: string;
  rawData: string;
  scannedAt: string; // ISO string
  isAttendanceQR: boolean;
  eventCode?: string;
  eventTitle?: string;
  resultMessage: string;
  success: boolean;
};

function storageKey(userId: string) {
  return `scan_history:${userId}`;
}

function detectAttendanceInfo(rawData: string): { isAttendanceQR: boolean; eventCode?: string; eventTitle?: string } {
  const parsed = parseQRPayload(rawData);
  if (parsed.ok) {
    return {
      isAttendanceQR: true,
      eventCode: parsed.payload.event,
      eventTitle: parsed.payload.title ?? parsed.payload.event,
    };
  }
  return { isAttendanceQR: false };
}

export async function saveScanHistory(
  userId: string,
  rawData: string,
  result: { success: boolean; message: string },
): Promise<ScanHistoryEntry> {
  const info = detectAttendanceInfo(rawData);
  const entry: ScanHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rawData,
    scannedAt: new Date().toISOString(),
    isAttendanceQR: info.isAttendanceQR,
    eventCode: info.eventCode,
    eventTitle: info.eventTitle,
    resultMessage: result.message,
    success: result.success,
  };

  const key = storageKey(userId);
  try {
    const existingRaw = await AsyncStorage.getItem(key);
    const existing: ScanHistoryEntry[] = existingRaw ? (JSON.parse(existingRaw) as ScanHistoryEntry[]) : [];
    const next = [entry, ...existing].slice(0, 500); // cap to 500 entries
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore storage errors – history is best-effort
  }
  return entry;
}

export async function getScanHistory(userId: string): Promise<ScanHistoryEntry[]> {
  const key = storageKey(userId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearScanHistory(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}
