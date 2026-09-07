import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Zap, ZapOff, ScanLine } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

const { width } = Dimensions.get('window');

interface CameraBarcodeScannerModalMobileProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
  targetCount?: number;
  currentCount?: number;
}

export function CameraBarcodeScannerModalMobile({
  visible,
  onClose,
  onScan,
  title = 'Scan Barcode / Serial',
  continuous = false,
  targetCount,
  currentCount,
}: CameraBarcodeScannerModalMobileProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  if (!visible) return null;

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isScanning) return;
    const trimmed = data?.trim();
    if (!trimmed) return;

    setLastScanned(trimmed);
    onScan(trimmed);

    if (!continuous) {
      setIsScanning(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <ScanLine size={20} color={colors.primary} />
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              {typeof targetCount === 'number' && typeof currentCount === 'number' && (
                <Text style={styles.counterText}>
                  Scanned: {currentCount} of {targetCount}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => setTorch((prev) => !prev)}
            >
              {torch ? <ZapOff size={20} color="#FFFFFF" /> : <Zap size={20} color="#FFFFFF" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Viewfinder */}
        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Camera permission is required to scan barcodes.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Viewfinder Target */}
            <View style={styles.viewfinderOverlay}>
              <View style={styles.targetFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>

              {lastScanned && (
                <View style={styles.lastScannedBadge}>
                  <Text style={styles.lastScannedLabel}>LAST SCANNED</Text>
                  <Text style={styles.lastScannedCode}>{lastScanned}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerHint}>
            Align the barcode or QR code inside the frame to scan automatically.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#1E293B',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  counterText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: width * 0.75,
    height: width * 0.45,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: radius.md,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: radius.md,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: radius.md,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: radius.md,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: radius.md,
  },
  lastScannedBadge: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  lastScannedLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  lastScannedCode: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#38BDF8',
    marginTop: 2,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    padding: spacing.md,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerHint: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
    marginRight: spacing.md,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
