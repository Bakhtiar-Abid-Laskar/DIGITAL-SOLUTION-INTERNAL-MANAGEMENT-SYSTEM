import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform,  } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, ShieldAlert } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import Button from '../../components/common/Button';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useToast } from '../../context/ToastContext';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import BottomSheet from '../../components/common/BottomSheet';

type Role = 'receptionist' | 'technician' | 'admin';

const ROLES: { value: Role; label: string }[] = [
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'technician', label: 'Technician' },
  { value: 'admin', label: 'Admin' },
];

export default function AdminCreateStaffScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const bottomPadding = useBottomInsetPadding('nav');

  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'technician' as Role,
      rolePicker: false,
      adminConfirmVisible: false,
      saving: false,
    }
  );

  const { name, email, password, phone, role, rolePicker, adminConfirmVisible, saving } = state;

  const validate = (): string | null => {
    if (!name.trim()) return 'Full name is required.';
    if (!email.trim() || !email.includes('@')) return 'A valid email is required.';
    if (!password.trim() || password.length < 8) return 'Password must be at least 8 characters.';
    if (!role) return 'Please select a role.';
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate();
    if (validationError) {
      showToast({ title: 'Validation Error', message: validationError, type: 'error' });
      return;
    }

    if (role === 'admin') {
      setState({ adminConfirmVisible: true });
    } else {
      executeCreate();
    }
  };

  const executeCreate = async () => {
    setState({ adminConfirmVisible: false, saving: true });
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No active session. Please log in again.');

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          phone: phone.trim() || null,
          role,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to create user.');
      }

      showToast({ title: 'Staff Created', message: `${name.trim()} has been added successfully.`, type: 'success' });
      navigation.goBack();
    } catch (err: any) {
      showToast({ title: 'Create Failed', message: err.message, type: 'error' });
    } finally {
      setState({ saving: false });
    }
  };

  const selectedRoleLabel = ROLES.find(r => r.value === role)?.label ?? 'Select Role';

  return (
    <View style={styles.container}>
      <AppHeader title="Add Staff Member" showBack={true} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
        >

          {/* Name */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(val) => setState({ name: val })}
            placeholder="e.g. Ahmed Khan"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          {/* Email */}
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(val) => setState({ email: val })}
            placeholder="e.g. ahmed@digitalsolution.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {/* Password */}
          <Text style={styles.label}>Password * (min. 8 characters)</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(val) => setState({ password: val })}
            placeholder="Set a strong password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={true}
            autoComplete="off"
          />

          {/* Phone */}
          <Text style={styles.label}>Phone Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(val) => setState({ phone: val })}
            placeholder="e.g. 03001234567"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />

          {/* Role picker */}
          <Text style={styles.label}>Role *</Text>
          <AppPressable
            style={styles.pickerRow}
            onPress={() => setState({ rolePicker: true })}
          >
            <Text style={[styles.pickerText, !role && { color: colors.textMuted }]}>
              {selectedRoleLabel}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </AppPressable>

          {/* Info note */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              The new staff member will receive a confirmation email and can log in immediately using the credentials set above. You can activate or deactivate their account from the Staff screen.
            </Text>
          </View>

          <Button
            label="Create Staff Member"
            onPress={handleSubmit}
            loading={saving}
            style={styles.createBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Role Picker BottomSheet */}
      <BottomSheet visible={rolePicker} onClose={() => setState({ rolePicker: false })}>
        <Text style={{ ...typography.h2, marginBottom: spacing.lg }}>Select Role</Text>
        {ROLES.map(r => (
          <AppPressable
            key={r.value}
            style={[
              styles.roleOption,
              role === r.value && styles.roleOptionSelected,
            ]}
            onPress={() => {
              setState({ role: r.value, rolePicker: false });
            }}
          >
            <Text style={[
              styles.roleOptionText,
              role === r.value && { color: colors.primary, fontWeight: '700' },
            ]}>
              {r.label}
            </Text>
          </AppPressable>
        ))}
      </BottomSheet>

      {/* Admin Confirmation BottomSheet */}
      <BottomSheet visible={adminConfirmVisible} onClose={() => setState({ adminConfirmVisible: false })}>
        <View style={styles.confirmContainer}>
          <View style={styles.confirmIconBox}>
            <ShieldAlert size={32} color={colors.accentRed} />
          </View>
          <Text style={styles.confirmTitle}>Confirm Administrator Account</Text>
          <Text style={styles.confirmDescription}>
            You are granting full system privileges to <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{name.trim()}</Text> ({email.trim().toLowerCase()}).
          </Text>
          <View style={styles.confirmWarningBox}>
            <Text style={styles.confirmWarningText}>
              Administrators have unrestricted access to all financial records, payroll, user management, and system configuration.
            </Text>
          </View>
          <View style={styles.confirmActions}>
            <AppPressable
              style={styles.cancelBtn}
              onPress={() => setState({ adminConfirmVisible: false })}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </AppPressable>
            <Button
              label="Confirm & Create"
              onPress={executeCreate}
              loading={saving}
              style={styles.confirmSubmitBtn}
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    ...shadow.card,
  },
  pickerRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
  },
  pickerText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  infoBox: {
    backgroundColor: colors.statusReceivedBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.caption,
    color: colors.accentBlue,
    lineHeight: 18,
  },
  createBtn: {
    marginTop: spacing.lg,
  },
  roleOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleOptionSelected: {
    backgroundColor: colors.statusInProgressBg,
    borderColor: colors.primary,
  },
  roleOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  confirmContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  confirmIconBox: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.accentRed + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  confirmDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  confirmWarningBox: {
    backgroundColor: colors.surface,
    borderColor: colors.accentRed + '40',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  confirmWarningText: {
    ...typography.caption,
    color: colors.accentRed,
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  confirmSubmitBtn: {
    flex: 1,
    backgroundColor: colors.accentRed,
  },
});
