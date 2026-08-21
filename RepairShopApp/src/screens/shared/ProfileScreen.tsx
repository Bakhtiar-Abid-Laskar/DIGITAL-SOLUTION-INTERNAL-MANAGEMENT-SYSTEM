import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AppHeader from '../../components/common/AppHeader';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';
import { colors, spacing, typography } from '../../tokens';
import { useAuth } from '../../context/AuthContext';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { cleanPhoneNumber } from '@repairshop/shared';
import { compressImage } from '../../utils/compressImage';
import { ProfileInfoCard }     from '../../components/profile/ProfileInfoCard';
import { ProfilePasswordCard } from '../../components/profile/ProfilePasswordCard';
import { PhotoPickerModal }    from '../../components/profile/PhotoPickerModal';

export default function ProfileScreen() {
  const { session, user, displayName, role, signOut } = useAuth();
  const bottomPadding = useBottomInsetPadding('nav');
  const { showToast } = useToast();

  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      logoutVisible: false,
      photoModalVisible: false,
      phone: '',
      email: session?.user?.email || '',
      avatarSignedUrl: null as string | null,
      avatarLoading: false,
      editingPhone: false,
      phoneInput: '',
      savingPhone: false,
      editingEmail: false,
      emailInput: '',
      savingEmail: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      showOldPass: false,
      showNewPass: false,
      showConfirmPass: false,
      changingPassword: false,
    }
  );

  const { logoutVisible, photoModalVisible, phone, email, avatarSignedUrl, avatarLoading, editingPhone, phoneInput, savingPhone, editingEmail, emailInput, savingEmail, oldPassword, newPassword, confirmPassword, showOldPass, showNewPass, showConfirmPass, changingPassword } = state;

  const fetchUserProfile = useCallback(async (cancelled = false) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('users').select('phone, email, avatar_drive_file_id').eq('id', user.id).single();
      if (cancelled) return;
      if (!error && data) {
        setState({ phone: data.phone || '' });
        if (data.email) setState({ email: data.email });
        if (data.avatar_drive_file_id) setState({ avatarSignedUrl: `https://drive.google.com/uc?id=${data.avatar_drive_file_id}` });
      }
    } catch (err) { console.error('Error fetching user profile:', err); }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile(cancelled);
    return () => { cancelled = true; };
  }, [fetchUserProfile]);

  const handleSavePhone = async () => {
    if (!user) return;
    const cleaned = cleanPhoneNumber(phoneInput);
    if (!cleaned) { showToast({ title: 'Invalid Phone', message: 'Please enter a valid phone number.', type: 'error' }); return; }
    setState({ savingPhone: true });
    try {
      const { error } = await supabase.from('users').update({ phone: cleaned }).eq('id', user.id);
      if (error) throw error;
      setState({ phone: cleaned, editingPhone: false });
      showToast({ title: 'Phone Updated', message: 'Your phone number has been saved.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Update Failed', message: err.message || 'Could not update phone number.', type: 'error' });
    } finally { setState({ savingPhone: false }); }
  };

  const handleSaveEmail = async () => {
    if (!user || !session?.user?.email) return;
    const trimmed = emailInput.trim();
    if (!trimmed || !trimmed.includes('@')) { showToast({ title: 'Invalid Email', message: 'Please enter a valid email address.', type: 'error' }); return; }
    setState({ savingEmail: true });
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      await supabase.from('users').update({ email: trimmed }).eq('id', user.id);
      setState({ email: trimmed, editingEmail: false });
      showToast({ title: 'Confirmation Sent', message: 'Check your inbox and confirm your email change.', type: 'info' });
    } catch (err: any) {
      showToast({ title: 'Update Failed', message: err.message || 'Could not update email address.', type: 'error' });
    } finally { setState({ savingEmail: false }); }
  };

  const handleChangePassword = async () => {
    if (!session?.user?.email) return;
    if (!oldPassword || !newPassword || !confirmPassword) { showToast({ title: 'Missing Fields', message: 'Please fill in all password fields.', type: 'error' }); return; }
    if (newPassword !== confirmPassword) { showToast({ title: 'Password Mismatch', message: 'New password and confirm password do not match.', type: 'error' }); return; }
    if (newPassword.length < 8) { showToast({ title: 'Weak Password', message: 'New password must be at least 8 characters long.', type: 'error' }); return; }
    setState({ changingPassword: true });
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: session.user.email, password: oldPassword });
      if (authError) { showToast({ title: 'Verification Failed', message: 'Incorrect old password.', type: 'error' }); setState({ changingPassword: false }); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setState({ oldPassword: '', newPassword: '', confirmPassword: '' });
      showToast({ title: 'Success', message: 'Your password has been changed.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Password Change Failed', message: err.message || 'Could not change password.', type: 'error' });
    } finally { setState({ changingPassword: false }); }
  };

  const handleSelectImage = async (useCamera: boolean) => {
    setState({ photoModalVisible: false });
    if (!user) return;
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { showToast({ title: 'Permission Denied', message: 'Camera permission is required.', type: 'error' }); return; }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { showToast({ title: 'Permission Denied', message: 'Media library permission is required.', type: 'error' }); return; }
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      }
      if (result.canceled || !result.assets[0]?.uri) return;
      setState({ avatarLoading: true });
      const compressedUri = await compressImage(result.assets[0].uri);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('staffName', displayName || 'Unknown');
      formData.append('image', { uri: compressedUri, name: 'avatar.webp', type: 'image/webp' } as any);
      
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      
      if (!res.ok) throw new Error('Drive upload failed');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Drive upload failed');

      const { error: dbErr } = await supabase.from('users').update({ avatar_drive_file_id: data.fileId }).eq('id', user.id);
      if (dbErr) throw dbErr;
      
      setState({ avatarSignedUrl: `https://drive.google.com/uc?id=${data.fileId}` });
      showToast({ title: 'Success', message: 'Profile picture updated.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Upload Failed', message: err.message || 'Could not update profile picture.', type: 'error' });
    } finally {
      setState({ avatarLoading: false });
    };
  };

  const confirmLogout = async () => {
    setState({ logoutVisible: false });
    try { await signOut(); } catch (err) { console.error('Logout error', err); }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Profile" showBack={true} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + spacing.xl }]}>

        <ProfileInfoCard
          avatarSignedUrl={avatarSignedUrl}
          avatarLoading={avatarLoading}
          displayName={displayName || 'Staff Member'}
          role={role || ''}
          phone={phone}
          email={email}
          editingPhone={editingPhone}
          editingEmail={editingEmail}
          phoneInput={phoneInput}
          emailInput={emailInput}
          savingPhone={savingPhone}
          savingEmail={savingEmail}
          onPressAvatarEdit={() => setState({ photoModalVisible: true })}
          onChangePhone={(v) => setState({ phoneInput: v })}
          onChangeEmail={(v) => setState({ emailInput: v })}
          onStartEditPhone={() => { setState({ phoneInput: phone, editingPhone: true }); }}
          onStartEditEmail={() => { setState({ emailInput: email, editingEmail: true }); }}
          onCancelEditPhone={() => setState({ editingPhone: false })}
          onCancelEditEmail={() => setState({ editingEmail: false })}
          onSavePhone={handleSavePhone}
          onSaveEmail={handleSaveEmail}
        />

        <Text style={styles.sectionTitle}>Change Password</Text>
        <ProfilePasswordCard
          oldPassword={oldPassword} newPassword={newPassword} confirmPassword={confirmPassword}
          showOldPass={showOldPass} showNewPass={showNewPass} showConfirmPass={showConfirmPass}
          changingPassword={changingPassword}
          onChangeOld={(v) => setState({ oldPassword: v })} onChangeNew={(v) => setState({ newPassword: v })} onChangeConfirm={(v) => setState({ confirmPassword: v })}
          onToggleOld={() => setState({ showOldPass: !showOldPass })}
          onToggleNew={() => setState({ showNewPass: !showNewPass })}
          onToggleConfirm={() => setState({ showConfirmPass: !showConfirmPass })}
          onSubmit={handleChangePassword}
        />

        <Button label="Log Out" variant="destructive" onPress={() => setState({ logoutVisible: true })} style={styles.logoutBtn} />
      </ScrollView>

      <PhotoPickerModal
        visible={photoModalVisible}
        onCamera={() => handleSelectImage(true)}
        onGallery={() => handleSelectImage(false)}
        onClose={() => setState({ photoModalVisible: false })}
      />

      <BottomSheet visible={logoutVisible} onClose={() => setState({ logoutVisible: false })}>
        <Text style={{ ...typography.h2, marginBottom: spacing.sm }}>Log Out</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
          Are you sure you want to log out of RepairShop?
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="Cancel" variant="secondary" onPress={() => setState({ logoutVisible: false })} style={{ flex: 1 }} />
          <Button label="Log Out" onPress={confirmLogout} style={{ flex: 1, backgroundColor: colors.accentRed }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  logoutBtn: { marginTop: spacing.xs },
});
