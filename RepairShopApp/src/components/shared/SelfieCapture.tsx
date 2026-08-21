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
  onCaptureComplete: (data: { uri: string; driveFileId: string; driveLink: string; gpsLat: number; gpsLng: number; lowAccuracy?: boolean; atLocation?: boolean }) => void;
  uploadEndpoint: string;
  uploadPayload: Record<string, string>;
  isDone?: boolean;
  doneMessage?: string;
  buttonLabel?: string;
  validateLocation?: (lat: number, lng: number) => Promise<{ proceed: boolean, atLocation: boolean }>;
  facing?: 'front' | 'back';
}

const uploadToDrive = async (
  webpUri: string,
  endpoint: string,
  payload: Record<string, string>
): Promise<{ fileId: string; link: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const form = new FormData();
  for (const key of Object.keys(payload)) {
    form.append(key, payload[key]);
  }
  form.append('image', {
    uri: webpUri,
    name: 'photo.webp',
    type: 'image/webp',
  } as any);

  const supabaseUrl = (supabase as any).supabaseUrl as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive upload failed: ${res.status} ${errText}`);
  }
  
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Drive upload failed');
  }
  
  return { fileId: data.fileId, link: data.link };
};

export default function SelfieCapture({
  label,
  onCaptureComplete,
  uploadEndpoint,
  uploadPayload,
  isDone = false,
  doneMessage = 'Photo Captured',
  buttonLabel = 'Take Selfie',
  validateLocation,
  facing = 'front',
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

  const uploadPhoto = async (uri: string): Promise<{ fileId: string; link: string }> => {
    // Convert to WebP on-device before uploading
    const webpResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }], // cap long edge at 1280px
      { compress: 0.78, format: ImageManipulator.SaveFormat.WEBP }
    );

    return await uploadToDrive(webpResult.uri, uploadEndpoint, uploadPayload);
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
      const { fileId, link } = await uploadPhoto(compressedUri);

      onCaptureComplete({
        uri: photo.uri,
        driveFileId: fileId,
        driveLink: link,
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
              facing={facing} 
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
