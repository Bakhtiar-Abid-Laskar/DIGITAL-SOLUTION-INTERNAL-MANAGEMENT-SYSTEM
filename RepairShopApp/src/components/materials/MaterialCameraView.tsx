import React from 'react';
import { View, Text, StyleSheet, Modal, Platform } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../tokens';

interface Props {
  visible: boolean;
  onCapture: (ref: any) => void;
  onCancel: () => void;
  onRef: (ref: any) => void;
}

export function MaterialCameraView({ visible, onCapture, onCancel, onRef }: Props) {
  let cameraRef: any = null;

  const handleWebFileFallback = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        onCapture({ takePictureAsync: async () => ({ uri: result.assets[0].uri }) });
      }
    } catch {
      onCancel();
    }
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={styles.wrapper}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          ref={ref => { cameraRef = ref; onRef(ref); }}
          onMountError={(err) => {
            console.error('[MaterialCameraView] Camera mount error:', err);
            if (Platform.OS === 'web') {
              handleWebFileFallback();
            } else {
              onCancel();
            }
          }}
        />
        <View style={styles.controls}>
          <AppPressable style={styles.btn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </AppPressable>
          <AppPressable style={[styles.btn, styles.captureBtn]} onPress={() => onCapture(cameraRef)}>
            <Text style={styles.captureText}>Capture</Text>
          </AppPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#000' },
  controls: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: spacing.xl, backgroundColor: '#000',
  },
  btn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: 8, backgroundColor: colors.surface,
  },
  captureBtn: { backgroundColor: colors.primary },
  cancelText: { ...typography.bodyBold, color: colors.textPrimary },
  captureText: { ...typography.bodyBold, color: '#fff' },
});
