import React from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Image } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { Pencil, Phone, Mail, Shield, Check, X } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  avatarSignedUrl: string | null;
  avatarLoading: boolean;
  displayName: string;
  role: string;
  phone: string;
  email: string;
  editingPhone: boolean;
  editingEmail: boolean;
  phoneInput: string;
  emailInput: string;
  savingPhone: boolean;
  savingEmail: boolean;
  onPressAvatarEdit: () => void;
  onChangePhone: (val: string) => void;
  onChangeEmail: (val: string) => void;
  onStartEditPhone: () => void;
  onStartEditEmail: () => void;
  onCancelEditPhone: () => void;
  onCancelEditEmail: () => void;
  onSavePhone: () => void;
  onSaveEmail: () => void;
}

export function ProfileInfoCard({
  avatarSignedUrl, avatarLoading, displayName, role,
  phone, email, editingPhone, editingEmail, phoneInput, emailInput,
  savingPhone, savingEmail,
  onPressAvatarEdit, onChangePhone, onChangeEmail,
  onStartEditPhone, onStartEditEmail,
  onCancelEditPhone, onCancelEditEmail,
  onSavePhone, onSaveEmail,
}: Props) {
  return (
    <>
      {/* Avatar + Name */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            {avatarLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : avatarSignedUrl ? (
              <Image source={{ uri: avatarSignedUrl }} style={styles.avatarImage} />
            ) : (
              <Image source={require('../../../assets/logo.webp')} style={[styles.avatarImage, { padding: 8 }]} resizeMode="contain" />
            )}
          </View>
          <AppPressable style={styles.avatarPencilBadge} onPress={onPressAvatarEdit} activeOpacity={0.8}>
            <Pencil size={14} color={colors.textInverse} />
          </AppPressable>
        </View>
        <Text style={styles.nameText}>{displayName || 'Staff Member'}</Text>
        <Text style={styles.roleText}>{role?.toUpperCase() || 'STAFF'}</Text>
      </View>

      {/* Account Details */}
      <View style={styles.detailsCard}>
        {/* Phone */}
        <View style={styles.detailRow}>
          <View style={styles.iconBox}><Phone size={20} color={colors.textSecondary} /></View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            {editingPhone ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.inlineInput} value={phoneInput} onChangeText={onChangePhone}
                  keyboardType="phone-pad" placeholder="Enter phone number"
                  placeholderTextColor={colors.textMuted} autoFocus
                />
                <AppPressable style={styles.iconBtnSave} onPress={onSavePhone} disabled={savingPhone}>
                  {savingPhone ? <ActivityIndicator size="small" color={colors.accentGreen} /> : <Check size={18} color={colors.accentGreen} />}
                </AppPressable>
                <AppPressable style={styles.iconBtnCancel} onPress={onCancelEditPhone}>
                  <X size={18} color={colors.accentRed} />
                </AppPressable>
              </View>
            ) : (
              <Text style={styles.detailValue}>{phone || 'Not provided'}</Text>
            )}
          </View>
          {!editingPhone && (
            <AppPressable style={styles.editPencilBtn} onPress={onStartEditPhone}>
              <Pencil size={16} color={colors.textSecondary} />
            </AppPressable>
          )}
        </View>

        <View style={styles.divider} />

        {/* Email */}
        <View style={styles.detailRow}>
          <View style={styles.iconBox}><Mail size={20} color={colors.textSecondary} /></View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Email Address</Text>
            {editingEmail ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.inlineInput} value={emailInput} onChangeText={onChangeEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  placeholder="Enter new email" placeholderTextColor={colors.textMuted} autoFocus
                />
                <AppPressable style={styles.iconBtnSave} onPress={onSaveEmail} disabled={savingEmail}>
                  {savingEmail ? <ActivityIndicator size="small" color={colors.accentGreen} /> : <Check size={18} color={colors.accentGreen} />}
                </AppPressable>
                <AppPressable style={styles.iconBtnCancel} onPress={onCancelEditEmail}>
                  <X size={18} color={colors.accentRed} />
                </AppPressable>
              </View>
            ) : (
              <Text style={styles.detailValue}>{email || 'N/A'}</Text>
            )}
          </View>
          {!editingEmail && (
            <AppPressable style={styles.editPencilBtn} onPress={onStartEditEmail}>
              <Pencil size={16} color={colors.textSecondary} />
            </AppPressable>
          )}
        </View>

        <View style={styles.divider} />

        {/* Role (read-only) */}
        <View style={styles.detailRow}>
          <View style={styles.iconBox}><Shield size={20} color={colors.textSecondary} /></View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Role Permissions</Text>
            <Text style={styles.detailValue}>{role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Access` : 'Standard Access'}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  avatarWrapper: { position: 'relative', marginBottom: spacing.md },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: colors.border,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPencilBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  nameText: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  roleText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.xl, padding: spacing.md,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  iconBox: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.backgroundAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  detailTextContainer: { flex: 1 },
  detailLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  detailValue: { ...typography.bodyBold, color: colors.textPrimary },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  inlineInput: {
    flex: 1, height: 40, backgroundColor: colors.backgroundAlt, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm,
    ...typography.body, color: colors.textPrimary,
  },
  iconBtnSave:   { padding: spacing.xs, marginLeft: spacing.xs },
  iconBtnCancel: { padding: spacing.xs, marginLeft: spacing.xs },
  editPencilBtn: { padding: spacing.sm },
});
