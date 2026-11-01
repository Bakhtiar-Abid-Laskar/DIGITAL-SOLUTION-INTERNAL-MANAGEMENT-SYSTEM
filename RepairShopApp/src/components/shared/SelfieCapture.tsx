import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import { Platform, View, Text, StyleSheet, Modal, ActivityIndicator, Image } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, MapPin, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { colors, radius, spacing, typography } from '../../tokens';
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

  if (Platform.OS === 'web') {
    let blob: Blob;
    try {
      const res = await fetch(webpUri);
      blob = await res.blob();
    } catch {
      if (webpUri.startsWith('data:')) {
        const parts = webpUri.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        throw new Error('Failed to process image data on web.');
      }
    }
    form.append('image', blob, 'photo.webp');
  } else {
    form.append('image', {
      uri: webpUri,
      name: 'photo.webp',
      type: 'image/webp',
    } as any);
  }

  const supabaseUrl = (supabase as any).supabaseUrl as string;
  const anonKey = (supabase as any).supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
  };
  if (anonKey) {
    headers['apikey'] = anonKey;
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers,
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
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'camera' | 'compressing' | 'gps' | 'uploading'>('idle');
  const cameraRef = useRef<CameraView>(null);
  const { showToast } = useToast();

  const startCamera = async () => {
    setCameraError(null);
    setCapturedUri(null);
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
    let targetUri = uri;
    try {
      // Convert to WebP on-device before uploading
      const webpResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }], // cap long edge at 1280px
        { compress: 0.78, format: ImageManipulator.SaveFormat.WEBP }
      );
      if (webpResult?.uri) {
        targetUri = webpResult.uri;
      }
    } catch (manipErr) {
      console.warn('[SelfieCapture] ImageManipulator fallback to raw image:', manipErr);
      targetUri = uri;
    }

    return await uploadToDrive(targetUri, uploadEndpoint, uploadPayload);
  };

  const processPhotoUri = async (photoUri: string) => {
    try {
      setLoadingState('gps');
      let location: Location.LocationObject | null = null;
      let lowAccuracy = false;

      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          throw new Error('LOCATION_DISABLED');
        }
        location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('GPS_TIMEOUT')), 10000))
        ]);
      } catch (err: any) {
        if (err.message === 'LOCATION_DISABLED') {
          throw new Error('Location services are disabled on this device. Please turn on GPS.');
        }

        lowAccuracy = true;
        try {
          location = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('BALANCED_TIMEOUT')), 6000))
          ]);
          showToast({ 
            title: 'Weak GPS Signal', 
            message: 'High accuracy timed out. Using approximate location for admin review.', 
            type: 'error' 
          });
        } catch {
          try {
            location = await Location.getLastKnownPositionAsync();
            if (location) {
              showToast({ 
                title: 'Weak GPS Signal', 
                message: 'Using cached location. Check-in marked for admin review.', 
                type: 'error' 
              });
            }
          } catch {
            location = null;
          }
        }
      }

      if (!location) {
        lowAccuracy = true;
        showToast({
          title: 'Indoor GPS Fallback',
          message: 'GPS unavailable indoors. Check-in permitted with "Weak GPS" flag for Admin Approval.',
          type: 'error'
        });
      }

      const finalLat = location?.coords?.latitude ?? 0;
      const finalLng = location?.coords?.longitude ?? 0;
      const isWeakSignal = lowAccuracy || !location || (location.coords?.accuracy ? location.coords.accuracy > 100 : false);

      let isAtLocation = true;
      if (validateLocation && location?.coords) {
        const validationResult = await validateLocation(location.coords.latitude, location.coords.longitude);
        if (!validationResult.proceed) {
          setIsCameraActive(false);
          setLoadingState('idle');
          return;
        }
        isAtLocation = validationResult.atLocation;
      } else if (!location) {
        isAtLocation = false;
      }

      setLoadingState('compressing');
      let readyUri = photoUri;
      try {
        readyUri = await compressImage(photoUri);
      } catch (compErr) {
        console.warn('[SelfieCapture] compressImage fallback:', compErr);
      }

      setLoadingState('uploading');
      const { fileId, link } = await uploadPhoto(readyUri);

      onCaptureComplete({
        uri: photoUri,
        driveFileId: fileId,
        driveLink: link,
        gpsLat: finalLat,
        gpsLng: finalLng,
        lowAccuracy: isWeakSignal,
        atLocation: isAtLocation && !isWeakSignal
      });

    } catch (e: any) {
      console.error(e);
      showToast({ title: 'Error', message: e.message, type: 'error' });
      setIsCameraActive(false);
    } finally {
      setLoadingState('idle');
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady) return;

    try {
      setLoadingState('camera');
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo || !photo.uri) throw new Error('Capture failed');
      setCapturedUri(photo.uri);
    } catch (e: any) {
      console.error(e);
      showToast({ title: 'Capture Error', message: e.message || 'Unable to capture photo.', type: 'error' });
    } finally {
      setLoadingState('idle');
    }
  };

  const handleConfirmCapture = async () => {
    if (!capturedUri) return;
    const uriToProcess = capturedUri;
    setCapturedUri(null);
    setIsCameraActive(false);
    await processPhotoUri(uriToProcess);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
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
          <SafeAreaView style={styles.cameraWrapper}>
            {cameraError ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={48} color={colors.accentRed} style={{ marginBottom: spacing.md }} />
                <Text style={styles.errorTitle}>Camera Unavailable</Text>
                <Text style={styles.errorText}>{cameraError}</Text>
                <Text style={styles.errorSubtext}>
                  Live camera stream is strictly required. File and gallery uploads are disabled.
                </Text>
                <View style={styles.errorButtonsRow}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => { setIsCameraActive(false); setCameraError(null); }}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    label="Retry Camera"
                    onPress={async () => {
                      setCameraError(null);
                      setIsCameraReady(false);
                      const hasCamera = await requireCamera();
                      if (!hasCamera) {
                        setCameraError('Camera access denied. Please enable camera permission in device/browser settings.');
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : capturedUri ? (
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewHeaderText}>Verify Photo</Text>
                  <Text style={styles.previewHeaderSub}>Confirm photo clarity before submitting.</Text>
                </View>
                <Image
                  source={{ uri: capturedUri }}
                  style={[styles.cameraView, { aspectRatio: 3/4 }]}
                  resizeMode="contain"
                />
                <View style={styles.cameraControls}>
                  <AppPressable 
                    style={[styles.camBtn, styles.camBtnOutline]} 
                    onPress={() => setCapturedUri(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Retake Photo"
                  >
                    <Text style={styles.camBtnTextCancel}>Retake</Text>
                  </AppPressable>
                  <AppPressable 
                    style={[styles.camBtn, { backgroundColor: colors.primary }]} 
                    onPress={handleConfirmCapture}
                    accessibilityRole="button"
                    accessibilityLabel="Submit Photo"
                  >
                    <Text style={styles.camBtnText}>Submit</Text>
                  </AppPressable>
                </View>
              </View>
            ) : (
              <View style={styles.liveCameraContainer}>
                <CameraView 
                  style={[styles.cameraView, { aspectRatio: 3/4 }]} 
                  facing={facing} 
                  ref={cameraRef}
                  onCameraReady={() => setIsCameraReady(true)}
                  onMountError={(err) => {
                    console.error('[SelfieCapture] Camera mount error:', err);
                    setCameraError('Camera stream could not be started. Please check permissions or close other camera apps.');
                  }}
                />
                <View style={styles.cameraControls}>
                  <AppPressable 
                    style={styles.camBtn} 
                    onPress={() => { setIsCameraActive(false); setCameraError(null); }}
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
            )}
          </SafeAreaView>
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
    backgroundColor: '#000000', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  liveCameraContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeader: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  previewHeaderText: {
    ...typography.h3,
    color: '#ffffff',
  },
  previewHeaderSub: {
    ...typography.caption,
    color: '#a0aec0',
  },
  cameraView: { 
    width: '90%', 
    maxWidth: 400, 
    borderRadius: radius.lg, 
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  cameraControls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    padding: spacing.lg, 
    width: '100%',
    gap: spacing.md,
  },
  camBtn: { 
    paddingVertical: spacing.md, 
    paddingHorizontal: spacing.xl, 
    borderRadius: radius.pill, 
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  camBtnText: { 
    ...typography.bodyBold, 
    color: '#ffffff' 
  },
  camBtnTextCancel: { 
    ...typography.bodyBold, 
    color: '#cbd5e1' 
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 380,
    backgroundColor: '#1e293b',
    borderRadius: radius.card,
    marginHorizontal: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    color: '#ffffff',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    ...typography.caption,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
