import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { qrService } from '../../../services/qrService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export default function ScanQRScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; status?: string } | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Only activate camera when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
        setScanned(false);
        setResult(null);
      };
    }, [])
  );

  if (!permission) {
    return <LoadingSpinner fullScreen />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan attendance QR codes.
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} style={styles.permissionButton} />
        </View>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || processing || !user?.id) return;

    setScanned(true);
    setProcessing(true);

    try {
      const response = await qrService.markAttendanceFromQR(data, user.id);

      setResult({
        success: response.success,
        message: response.message,
        status: response.status,
      });

      if (!response.success) {
        // If it's a "Session not found" or similar error, maybe we shouldn't lock the scanner forever?
        // But for now, let's show the error result and let them retry.
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An unexpected error occurred',
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {isActive && !result ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.unfocusedContainer}></View>
              <View style={styles.middleContainer}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.focusedContainer}>
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                </View>
                <View style={styles.unfocusedContainer}></View>
              </View>
              <View style={styles.unfocusedContainer}></View>
            </View>
          </CameraView>

          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>Position the QR code within the frame</Text>
            {processing && <LoadingSpinner size="small" message="Marking attendance..." />}
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {result && (
            <View style={styles.resultCard}>
              <View style={[
                styles.iconContainer,
                result.success ? styles.successIcon : styles.errorIcon
              ]}>
                <Ionicons
                  name={result.success ? "checkmark-circle" : "alert-circle"}
                  size={64}
                  color={result.success ? Colors.success : Colors.error}
                />
              </View>

              <Text style={styles.resultTitle}>
                {result.success ? 'Attendance Marked!' : 'Failed'}
              </Text>

              <Text style={styles.resultMessage}>{result.message}</Text>

              {result.status && (
                <View style={[
                  styles.statusBadge,
                  result.status === 'late' ? styles.statusLate : styles.statusPresent
                ]}>
                  <Text style={styles.statusText}>Marked as {result.status.toUpperCase()}</Text>
                </View>
              )}

              <Button
                title="Scan Another"
                onPress={resetScanner}
                style={styles.retryButton}
                variant="outline"
              />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    minWidth: 200,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleContainer: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  focusedContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.xl,
    position: 'relative',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  instructionText: {
    color: Colors.white,
    fontSize: Typography.fontSize.md,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  resultCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  successIcon: {},
  errorIcon: {},
  resultTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  resultMessage: {
    fontSize: Typography.fontSize.md,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  statusPresent: {
    backgroundColor: Colors.success + '15',
  },
  statusLate: {
    backgroundColor: Colors.late + '15',
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  retryButton: {
    minWidth: 200,
  },
});
