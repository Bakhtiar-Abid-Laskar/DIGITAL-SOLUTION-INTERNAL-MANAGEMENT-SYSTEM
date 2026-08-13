import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import Button from '../common/Button';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, CheckCircle2, Trash2, Package } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../tokens';
import ModalShell from '../common/ModalShell';
import { useToast } from '../../context/ToastContext';
import { compressImage } from '../../utils/compressImage';
import { useNavigation } from '@react-navigation/native';
import { MaterialCameraView } from './MaterialCameraView';
import { Modal } from 'react-native';

interface AddMaterialModalProps {
  visible: boolean;
  jobId: string;
  onClose: () => void;
  onAdded: () => void;
}

type InventorySuggestion = {
  id: string;
  item_name: string;
  quantity: number;
  cost_price: number;
  unit: string;
  product_id?: string;
};

export default function AddMaterialModal({ visible, jobId, onClose, onAdded }: AddMaterialModalProps) {
  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      name: '',
      selectedInventoryId: null as string | null,
      selectedProductId: null as string | null,
      quantity: '1',
      unitCost: '',
      photoUri: null as string | null,
      suggestions: [] as InventorySuggestion[],
      suggestionsLoading: false,
      showSuggestions: false,
      selectedStock: null as number | null,
      isCameraActive: false,
      loading: false,
    }
  );

  const { name, selectedInventoryId, selectedProductId, quantity, unitCost, photoUri, suggestions, suggestionsLoading, showSuggestions, selectedStock, isCameraActive, loading } = state;

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRefState, setCameraRefState] = useState<any>(null);
  const { showToast } = useToast();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!name.trim() || name.trim().length < 2 || !showSuggestions) { setState({ suggestions: [] }); return; }
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      setState({ suggestionsLoading: true });
      void (async () => {
        try {
          const { data, error } = await supabase.from('inventory')
            .select('id, product_id, quantity_cached, selling_rate, products!inner(name, unit)')
            .ilike('products.name', `%${name.trim()}%`).limit(6);
          if (!isMounted) return;
          if (!error && data) {
            const mapped: InventorySuggestion[] = data.map((row: any) => ({
              id: row.id, product_id: row.product_id,
              item_name: row.products.name, quantity: row.quantity_cached,
              cost_price: row.selling_rate, unit: row.products.unit,
            }));
            mapped.sort((a, b) => a.item_name.localeCompare(b.item_name));
            setState({ suggestions: mapped });
          } else { setState({ suggestions: [] }); }
        } catch { if (isMounted) setState({ suggestions: [] }); }
        finally { if (isMounted) setState({ suggestionsLoading: false }); }
      })();
    }, 200);
    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, [name, showSuggestions]);

  const selectSuggestion = (item: InventorySuggestion) => {
    if (item.quantity <= 0) showToast({ title: 'Out of Stock Warning', message: `"${item.item_name}" currently has 0 stock.`, type: 'info' });
    setState({
      name: item.item_name, unitCost: String(item.cost_price || 0),
      selectedInventoryId: item.id, selectedProductId: item.product_id || null,
      selectedStock: item.quantity, showSuggestions: false, suggestions: []
    });
  };

  const reset = () => {
    setState({
      name: '', selectedInventoryId: null, selectedProductId: null, selectedStock: null,
      quantity: '1', unitCost: '', photoUri: null, isCameraActive: false,
      suggestions: [], showSuggestions: false
    });
  };

  const handleClose = () => { reset(); onClose(); };

  const takePhoto = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { showToast({ title: 'Permission Denied', message: 'Camera permission is required.', type: 'error' }); return; }
    }
    setState({ isCameraActive: true });
  };

  const capturePhoto = async (ref: any) => {
    if (ref) {
      try {
        const photo = await ref.takePictureAsync({ base64: false });
        if (photo) setState({ photoUri: photo.uri, isCameraActive: false });
        else setState({ isCameraActive: false });
      } catch (e: any) { showToast({ title: 'Camera Error', message: e.message, type: 'error' }); }
    }
  };

  const uploadPhoto = async (uri: string): Promise<string> => {
    const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
    const path = `${jobId}/materials/${Date.now()}.${ext}`;
    const compressedUri = await compressImage(uri);
    const formData = new FormData();
    formData.append('file', { uri: compressedUri, name: `material.${ext}`, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
    const { error } = await supabase.storage.from('onsite-visits').upload(path, formData, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!name.trim()) return showToast({ title: 'Error', message: 'Material name is required.', type: 'error' });
    const q = parseFloat(quantity), c = parseFloat(unitCost || '0');
    if (isNaN(q) || q <= 0) return showToast({ title: 'Error', message: 'Quantity must be > 0.', type: 'error' });
    if (isNaN(c) || c < 0) return showToast({ title: 'Error', message: 'Unit cost must be >= 0.', type: 'error' });
    if (selectedStock !== null && q > selectedStock) {
      return showToast({ title: 'Insufficient Stock', message: `Only ${selectedStock} unit(s) available for "${name.trim()}".`, type: 'error' });
    }
    setState({ loading: true });
    try {
      let photo_url = null;
      if (photoUri) photo_url = await uploadPhoto(photoUri);
      const { error } = await supabase.from('job_materials').insert({
        job_id: jobId, material_name: name.trim(), qty_taken: q, quantity: q,
        unit_cost: c, product_id: selectedProductId || null, photo_url, checkout_status: 'checked_out',
      });
      if (error) throw error;
      showToast({ title: 'Success', message: 'Material added.', type: 'success' });
      handleClose(); onAdded();
    } catch (e: any) {
      showToast({ title: 'Insufficient Stock', message: e.message || 'Stock deduction failed.', type: 'error' });
    } finally { setState({ loading: false }); }
  };

  if (isCameraActive) {
    return (
      <MaterialCameraView
        visible={visible}
        onCapture={capturePhoto}
        onCancel={() => setState({ isCameraActive: false })}
        onRef={setCameraRefState}
      />
    );
  }

  return (
    <ModalShell visible={visible} onClose={handleClose}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Add Material</Text>

        <View style={{ zIndex: 10 }}>
          <TextInput
            style={styles.input}
            placeholder="Material / Inventory Name *"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={(v) => {
              setState({
                name: v, selectedInventoryId: null, selectedProductId: null,
                selectedStock: null, showSuggestions: true
              });
            }}
            onFocus={() => setState({ showSuggestions: true })}
          />

          {showSuggestions && (suggestions.length > 0 || suggestionsLoading) ? (
            <View style={styles.suggestionsContainer}>
              {suggestionsLoading ? (
                <View style={styles.suggestionItem}>
                  <ActivityIndicator size="small" color={colors.navBackground} />
                  <Text style={styles.suggestionText}>Searching inventory...</Text>
                </View>
              ) : (
                suggestions.map((item: InventorySuggestion) => {
                  const isOutOfStock = item.quantity <= 0;
                  return (
                    <AppPressable key={item.id} style={[styles.suggestionItem, isOutOfStock && { opacity: 0.6 }]} onPress={() => selectSuggestion(item)}>
                      <Package size={16} color={isOutOfStock ? colors.error : colors.textMuted} style={{ marginRight: spacing.xs }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.suggestionName}>{item.item_name}</Text>
                          {isOutOfStock ? <Text style={{ color: colors.error, ...typography.caption, fontWeight: '700' }}>Out of Stock</Text> : null}
                        </View>
                        <Text style={styles.suggestionMeta}>Stock: {item.quantity} {item.unit || 'Pcs'} | Cost: ₹{item.cost_price || 0}</Text>
                      </View>
                    </AppPressable>
                  );
                })
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
            placeholder="Qty Taken (Incl. Buffer) *" placeholderTextColor={colors.textMuted}
            keyboardType="numeric" value={quantity} onChangeText={(val) => setState({ quantity: val })}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Unit Cost (₹) *" placeholderTextColor={colors.textMuted}
            keyboardType="numeric" value={unitCost} onChangeText={(val) => setState({ unitCost: val })}
          />
        </View>

        <View style={styles.photoSection}>
          {photoUri ? (
            <View style={styles.photoRow}>
              <View style={styles.photoAttached}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: spacing.xs }} />
                <Text style={{ color: colors.success, ...typography.caption, fontWeight: '600' }}>Photo attached</Text>
              </View>
              <AppPressable onPress={() => setState({ photoUri: null })} style={styles.removePhotoBtn}>
                <Trash2 size={16} color={colors.error} />
              </AppPressable>
            </View>
          ) : (
            <AppPressable style={styles.photoBtn} onPress={takePhoto}>
              <Camera size={18} color={colors.navBackground} style={{ marginRight: spacing.sm }} />
              <Text style={styles.photoBtnText}>Add Photo (Optional)</Text>
            </AppPressable>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.navBackground} />
            <Text style={{ marginTop: spacing.sm, ...typography.bodyBold, color: colors.textSecondary }}>Uploading material details...</Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <Button label="Cancel" onPress={handleClose} variant="secondary" style={{ flex: 1, marginRight: spacing.sm }} />
              <Button label="Save" onPress={submit} style={{ flex: 1 }} />
            </View>
            <AppPressable style={styles.allotmentBtn} onPress={() => { handleClose(); navigation.navigate('AllottedMaterials', { jobId }); }}>
              <Package size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={styles.allotmentBtnText}>Or Pick from Allotted Materials</Text>
            </AppPressable>
          </>
        )}
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  formContainer: { paddingVertical: spacing.sm },
  title: { color: colors.textPrimary, ...typography.h2, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.backgroundAlt, color: colors.textPrimary, ...typography.body,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  row: { flexDirection: 'row' },
  suggestionsContainer: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, marginTop: -spacing.sm, marginBottom: spacing.md,
    maxHeight: 220, overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  suggestionText: { marginLeft: spacing.sm, ...typography.body, color: colors.textSecondary },
  suggestionName: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  suggestionMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  photoSection: { marginBottom: spacing.lg },
  photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoAttached: { flexDirection: 'row', alignItems: 'center' },
  removePhotoBtn: { padding: spacing.xs },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.navBackground, borderRadius: radius.md, padding: spacing.md,
    justifyContent: 'center',
  },
  photoBtnText: { ...typography.bodyBold, color: colors.navBackground },
  allotmentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  allotmentBtnText: { ...typography.bodyBold, color: colors.primary },
});
