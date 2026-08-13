import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator,  } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, MapPin, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import Button from '../common/Button';
import { compressImage } from '../../utils/compressImage';
import { useToast } from '../../context/ToastContext';

export interface SelfieCaptureProps {
  label: string;
  onCaptureComplete: (data: { uri: string; path: string; gpsLat: number; gpsLng: number; lowAccuracy?: boolean; atLocation?: boolean }) => void;
  storageBucket: string;
  storagePath: string; // e.g., 'user_id/date/checkin.jpg'
  isDone?: boolean;
  doneMessage?: string;
  buttonLabel?: string;
  validateLocation?: (lat: number, lng: number) => Promise<{ proceed: boolean, atLocation: boolean }>;
  // Drive upload props (optional — omit to skip Drive upload)
  driveUpload?: {
    staffId: string;
    staffName: string;
    attendanceId: string; // must be set after the attendance row is created
    type: 'checkin' | 'checkout';
  };
}

/**
 * Sends the WebP selfie to the upload-attendance-selfie Edge Function.
 * Called fire-and-forget — errors are logged but do NOT surface to the user.
 */
const uploadSelfieToDrive = async (
  webpUri: string,
  opts: NonNullable<SelfieCaptureProps['driveUpload']>
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const localRes = await fetch(webpUri);
  if (!localRes.ok) throw new Error('Failed to fetch local image blob');
  const blob = await localRes.blob();
  const form = new FormData();
  form.append('staffId', opts.staffId);
  form.append('staffName', opts.staffName);
  form.append('attendanceId', opts.attendanceId);
  form.append('timestamp', new Date().toISOString());
  form.append('type', opts.type);
  form.append('image', blob, 'selfie.webp');

  const supabaseUrl = (supabase as any).supabaseUrl as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/upload-attendance-selfie`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
  if (!res.ok) {
    console.error('Edge function upload failed:', res.status, res.statusText);
  }
};

export default function SelfieCapture({
  label,
  onCaptureComplete,
  storageBucket,
  storagePath,
  isDone = false,
  doneMessage = 'Photo Captured',
  buttonLabel = 'Take Selfie',
  driveUpload,
  validateLocation,
}: SelfieCaptureProps) {
  const { requirePermission: requireCamera } = useCameraPermission();
  const { requirePermission: requireLocation } = useLocationPermission();
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [loadingState, setLoadingState] = useState<'idle' | 'camera' | 'compressing' | 'gps' | 'uploading'>('idle');
  const cameraRef = useRef<CameraView>(null);
  const { showToast } = useToast();

  const startCamera = async () => {
    const hasCamera = await requireCamera();
    if (!hasCamera) {
      showToast({
        title: 'Permission Denied',
        message: 'Camera access is required. Please enable it in Settings.',
        type: 'error'
      });
      return;
    }
    const hasLocation = await requireLocation();
    if (!hasLocation) {
      showToast({
        title: 'Location Required',
        message: 'We need your GPS coordinates to verify attendance. Please enable location permissions in Settings.',
        type: 'error'
      });
      return;
    }
    setIsCameraReady(false);
    setIsCameraActive(true);
  };

  const uploadPhoto = async (uri: string, path: string): Promise<void> => {
    // Convert to WebP on-device before uploading (Phase 7: Drive integration)
    const webpResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }], // cap long edge at 1280px
      { compress: 0.78, format: ImageManipulator.SaveFormat.WEBP }
    );

    const formData = new FormData();
    formData.append('file', {
      uri: webpResult.uri,
      name: 'photo.webp',
      type: 'image/webp',
    } as any);

    const { error } = await supabase.storage.from(storageBucket).upload(path, formData, { upsert: true });
    if (error) throw error;

    // Fire-and-forget Drive upload (non-blocking — user workflow is never held up)
    if (driveUpload?.attendanceId) {
      uploadSelfieToDrive(webpResult.uri, driveUpload).catch(err =>
        console.warn('[SelfieCapture] Background Drive upload failed:', err.message)
      );
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady) return;

    try {
      setLoadingState('camera');
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) throw new Error('Capture failed');
      
      setIsCameraActive(false);

      // Fetch location with fallback
      setLoadingState('gps');
      let location;
      let lowAccuracy = false;
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          throw new Error('LOCATION_DISABLED');
        }
        location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('GPS_TIMEOUT')), 8000))
        ]);
      } catch (err: any) {
        if (err.message === 'LOCATION_DISABLED') {
          throw new Error('Location services are disabled on this device. Please turn on GPS.');
        }
        lowAccuracy = true;
        showToast({ title: 'Low GPS Signal', message: 'High accuracy failed, falling back to approximate location.', type: 'error' });
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      // Validate GPS before uploading
      let isAtLocation = true;
      if (validateLocation && location?.coords) {
        const validationResult = await validateLocation(location.coords.latitude, location.coords.longitude);
        if (!validationResult.proceed) {
          setIsCameraActive(false);
          setLoadingState('idle');
          return;
        }
        isAtLocation = validationResult.atLocation;
      }

      // Compress photo
      setLoadingState('compressing');
      const compressedUri = await compressImage(photo.uri);

      // Upload
      setLoadingState('uploading');
      await uploadPhoto(compressedUri, storagePath);

      onCaptureComplete({
        uri: photo.uri,
        path: storagePath,
        gpsLat: location.coords.latitude,
        gpsLng: location.coords.longitude,
        lowAccuracy: location.coords.accuracy ? location.coords.accuracy > 50 : false,
        atLocation: isAtLocation
      });

    } catch (e: any) {
      console.error(e);
      showToast({ title: 'Error', message: e.message, type: 'error' });
      setIsCameraActive(false);
    } finally {
      setLoadingState('idle');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {loadingState !== 'idle' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>
            {loadingState === 'gps' ? 'Fetching High-Accuracy GPS...' : 
             loadingState === 'compressing' ? 'Compressing Image...' :
             loadingState === 'uploading' ? 'Uploading Photo...' : 'Processing...'}
          </Text>
        </View>
      ) : isDone ? (
        <View style={styles.doneContainer}>
          <CheckCircle2 size={20} color={colors.success} style={{ marginRight: spacing.sm }} />
          <Text style={styles.doneText}>{doneMessage}</Text>
        </View>
      ) : (
        <Button label={buttonLabel} onPress={startCamera} />
      )}

      {/* Camera Modal */}
      {isCameraActive && (
        <Modal visible={true} transparent={false} animationType="slide">
          <View style={styles.cameraWrapper}>
            <CameraView 
              style={[styles.cameraView, { aspectRatio: 3/4 }]} 
              facing="front" 
              ref={cameraRef}
              onCameraReady={() => setIsCameraReady(true)}
            />
            <View style={styles.cameraControls}>
              <AppPressable 
                style={styles.camBtn} 
                onPress={() => setIsCameraActive(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel Camera"
              >
                <Text style={styles.camBtnTextCancel}>Cancel</Text>
              </AppPressable>
              <AppPressable 
                style={[styles.camBtn, { backgroundColor: colors.primary }]} 
                onPress={handleCapture} 
                disabled={!isCameraReady}
                accessibilityRole="button"
                accessibilityLabel="Capture Photo"
              >
                <Text style={styles.camBtnText}>Capture</Text>
              </AppPressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
  },
  loadingText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  doneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.statusCompletedBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  doneText: {
    ...typography.bodyBold,
    color: colors.success,
  },
  cameraWrapper: { 
    flex: 1, 
    backgroundColor: colors.navBackground, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cameraView: { 
    width: '100%', 
    overflow: 'hidden' 
  },
  cameraControls: { 
    position: 'absolute', 
    bottom: 40, 
    left: spacing.xl, 
    right: spacing.xl, 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  camBtn: { 
    backgroundColor: colors.surface, 
    padding: spacing.md, 
    borderRadius: radius.lg, 
    minWidth: 100, 
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBtnText: { color: colors.textInverse, ...typography.bodyBold },
  camBtnTextCancel: { color: colors.textPrimary, ...typography.bodyBold },
});
