import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import Button from '../common/Button';
import { Camera } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

interface PhotoPickerProps {
  visible: boolean;
  onCamera: () => void;
  onClose: () => void;
}

export function PhotoPickerModal({ visible, onCamera, onClose }: PhotoPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <AppPressable style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          <Text style={styles.title}>Update Profile Photo</Text>
          <Text style={styles.subtitle}>
            A live camera photo is required. Gallery uploads are disabled.
          </Text>
          <AppPressable style={styles.optionBtn} onPress={onCamera}>
            <Camera size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
            <Text style={styles.optionText}>Take Live Photo</Text>
          </AppPressable>
          <Button label="Cancel" variant="secondary" onPress={onClose} style={{ marginTop: spacing.sm }} />
        </View>
      </AppPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  card: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.xl,
  },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg, backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  optionText: { ...typography.bodyBold, color: colors.textPrimary },
});
