import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';
import { parseQRPayload } from '@/lib/qr';
import { saveScanHistory } from '@/lib/scanHistory';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.title}>Camera permission needed</Text>
        <Text style={styles.subtitle}>Allow camera access to scan an event QR code and record attendance.</Text>
        <AppButton theme="primary" title="Grant permission" icon="camera" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setLastData(data);
    const uid = user?.id ?? 'anonymous';
    const trimmed = data.trim();

    // If it's NOT an attendance QR but still valid content (generic/others QR),
    // treat as successful "Scan detected" and save directly to history
    const parsed = parseQRPayload(trimmed);
    const isGenericQR = !parsed.ok && trimmed.length > 0;

    if (isGenericQR) {
      const genericResult = { success: true, message: 'Scan detected — saved to history' };
      setMessage(genericResult.message);
      setSuccess(true);
      await saveScanHistory(uid, data, genericResult);
      return;
    }

    try {
      const result = await registerAttendance(data, uid);
      setMessage(result.message);
      setSuccess(result.success);
      // Save EVERY scan to history (attendance or generic QR) — so history.tsx shows all scans
      await saveScanHistory(uid, data, result);
    } catch {
      const fallback = { success: false, message: 'Could not connect to attendance service. Try again.' };
      setMessage(fallback.message);
      setSuccess(false);
      await saveScanHistory(uid, data, fallback);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>{scanned ? 'Scan detected' : 'Scan any QR code'}</Text>
        <Text style={styles.helperText}>
          {scanned ? (success ? 'Saved to Scan Detected history.' : 'Try again or check code.') : 'Attendance QR or any other QR — all saves to history.'}
        </Text>
        {scanned && message && <Text style={[styles.scanResult, success ? styles.success : styles.error]}>{message}</Text>}
        {scanned && lastData && <Text style={styles.scanData} numberOfLines={3}>{lastData}</Text>}
        {scanned && <AppButton theme="primary" title="Scan again" icon="refresh" onPress={handleScanAgain} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  permissionContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'flex-start', padding: 24 },
  camera: StyleSheet.absoluteFill,
  overlay: { position: 'absolute', left: 20, right: 20, bottom: 40, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 16, alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  overlayText: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  helperText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  scanResult: { fontSize: 14, textAlign: 'center', fontWeight: '600' },
  success: { color: COLORS.success },
  error: { color: COLORS.danger },
  scanData: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 280 },
});
