import React from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import Button from '../common/Button';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  showOldPass: boolean;
  showNewPass: boolean;
  showConfirmPass: boolean;
  changingPassword: boolean;
  onChangeOld: (val: string) => void;
  onChangeNew: (val: string) => void;
  onChangeConfirm: (val: string) => void;
  onToggleOld: () => void;
  onToggleNew: () => void;
  onToggleConfirm: () => void;
  onSubmit: () => void;
}

function PassField({ label, value, show, onChange, onToggle }: { label: string; value: string; show: boolean; onChange: (val: string) => void; onToggle: () => void }) {
  return (
    <View style={styles.passFieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.passInputContainer}>
        <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.passInput}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder={label}
          placeholderTextColor={colors.textMuted}
        />
        <AppPressable onPress={onToggle} style={styles.eyeBtn}>
          {show ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
        </AppPressable>
      </View>
    </View>
  );
}

export function ProfilePasswordCard({
  oldPassword, newPassword, confirmPassword,
  showOldPass, showNewPass, showConfirmPass, changingPassword,
  onChangeOld, onChangeNew, onChangeConfirm,
  onToggleOld, onToggleNew, onToggleConfirm, onSubmit,
}: Props) {
  return (
    <View style={styles.card}>
      <PassField label="Old Password" value={oldPassword} show={showOldPass} onChange={onChangeOld} onToggle={onToggleOld} />
      <PassField label="New Password" value={newPassword} show={showNewPass} onChange={onChangeNew} onToggle={onToggleNew} />
      <PassField label="Confirm New Password" value={confirmPassword} show={showConfirmPass} onChange={onChangeConfirm} onToggle={onToggleConfirm} />
      <Button label="Update Password" onPress={onSubmit} loading={changingPassword} style={styles.submitBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.xl, padding: spacing.md,
  },
  passFieldGroup: { marginBottom: spacing.md },
  inputLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  passInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundAlt,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, height: 48,
  },
  inputIcon: { marginLeft: spacing.md, marginRight: spacing.sm },
  passInput: { flex: 1, ...typography.body, color: colors.textPrimary, height: '100%' },
  eyeBtn: { padding: spacing.md },
  submitBtn: { marginTop: spacing.sm },
});
