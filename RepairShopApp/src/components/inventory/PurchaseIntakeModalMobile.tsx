import React, { useState, useReducer } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Supplier, getImageThumbnailUrl, isGoogleDriveUrl } from '@repairshop/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { AppPressable } from '../common/AppPressable';
import { compressImage } from '../../utils/compressImage';
import { SupplierTypeaheadMobile } from '../suppliers/SupplierTypeaheadMobile';
import { ProductTypeaheadMobile, MobileProductCatalogItem } from './ProductTypeaheadMobile';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  Package,
  Calendar,
  Phone,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Camera,
} from 'lucide-react-native';

interface PurchaseIntakeModalMobileProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseIntakeModalMobile({
  visible,
  onClose,
  onSuccess,
}: PurchaseIntakeModalMobileProps) {
  const [currentStep, setCurrentStep] = useState<'supplier_info' | 'product_details'>('supplier_info');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'gdrive' | 'upload'>('gdrive');

  const [state, setState] = useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      // Step A: Supplier & Purchase Information
      supplier_id: null as string | null,
      supplier_name: '',
      supplier_phone: '',
      supplier_email: '',
      supplier_gstin: '',
      supplier_address: '',
      purchase_date: new Date().toISOString().split('T')[0],
      supplier_invoice_id: '',
      invoice_image_url: '',

      // Product Selection
      product_id: null as string | null,
      product_name: '',

      // Step B: Product & Stock Details
      sku: '',
      unit: 'Pcs',
      hsn_sac: '',
      tax_mode: 'exclusive',
      cgst_rate: '9',
      sgst_rate: '9',
      igst_rate: '18',
      quantity: '1',
      purchase_rate: '0',
      selling_rate: '0',
      low_stock_threshold: '5',
      minimum_stock_level: '0',
      location: '',
      notes: '',

      loading: false,
      error: '',
    }
  );

  const {
    supplier_id,
    supplier_name,
    supplier_phone,
    supplier_email,
    supplier_gstin,
    supplier_address,
    purchase_date,
    supplier_invoice_id,
    invoice_image_url,
    product_id,
    product_name,
    sku,
    unit,
    hsn_sac,
    tax_mode,
    cgst_rate,
    sgst_rate,
    igst_rate,
    quantity,
    purchase_rate,
    selling_rate,
    low_stock_threshold,
    minimum_stock_level,
    location,
    notes,
    loading,
    error,
  } = state;

  const handleSelectSupplier = (supplier: Supplier) => {
    setState({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_phone: supplier.phone || '',
      supplier_email: supplier.email || '',
      supplier_gstin: supplier.gstin || '',
      supplier_address: supplier.address || '',
      error: '',
    });
  };

  const handleSelectProduct = (product: MobileProductCatalogItem) => {
    setState({
      product_id: product.product_id,
      product_name: product.name,
      sku: product.sku || '',
      unit: product.unit || 'Pcs',
      hsn_sac: product.hsn_sac || '',
      tax_mode: product.tax_mode || 'exclusive',
      cgst_rate: String(product.cgst_rate ?? 9),
      sgst_rate: String(product.sgst_rate ?? 9),
      igst_rate: String(product.igst_rate ?? 18),
      purchase_rate: String(product.purchase_rate ?? 0),
      selling_rate: String(product.selling_rate ?? 0),
      low_stock_threshold: String(product.low_stock_threshold ?? 5),
      minimum_stock_level: String(product.minimum_stock_level ?? 0),
      location: product.location || '',
      error: '',
    });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required to upload invoice photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadCompressedImage(result.assets[0].uri);
    }
  };

  const handleTakeImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to capture invoice photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadCompressedImage(result.assets[0].uri);
    }
  };

  const uploadCompressedImage = async (rawUri: string) => {
    setUploadingImage(true);
    setState({ error: '' });
    try {
      const compressedUri = await compressImage(rawUri);
      const response = await fetch(compressedUri);
      const blob = await response.blob();

      const fileName = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
      const filePath = `invoices/${fileName}`;

      const { data, error: uploadErr } = await supabase.storage
        .from('purchase-invoices')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from('purchase-invoices')
        .getPublicUrl(filePath);

      setState({ invoice_image_url: publicData.publicUrl });
    } catch (err: any) {
      console.error('Invoice image upload failed:', err);
      setState({ error: err.message || 'Failed to upload invoice image' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProceedToStepB = () => {
    if (!supplier_name.trim()) {
      setState({ error: 'Please enter or select a supplier name' });
      return;
    }
    if (!product_name.trim()) {
      setState({ error: 'Please enter or select a product name' });
      return;
    }
    setState({ error: '' });
    setCurrentStep('product_details');
  };

  const handleSubmitPurchase = async () => {
    const parsedQty = parseFloat(quantity) || 0;
    const parsedCost = parseFloat(purchase_rate) || 0;
    const parsedSelling = parseFloat(selling_rate) || 0;

    if (parsedQty <= 0) {
      setState({ error: 'Purchase quantity must be greater than 0' });
      return;
    }
    if (parsedCost < 0 || parsedSelling < 0) {
      setState({ error: 'Rates cannot be negative' });
      return;
    }

    setState({ loading: true, error: '' });

    try {
      const { data, error: rpcErr } = await supabase.rpc('log_inventory_purchase', {
        p_supplier_id: supplier_id || null,
        p_supplier_name: supplier_name.trim(),
        p_supplier_phone: supplier_phone.trim() || null,
        p_supplier_email: supplier_email.trim() || null,
        p_supplier_gstin: supplier_gstin.trim() || null,
        p_supplier_address: supplier_address.trim() || null,
        p_purchase_date: purchase_date || new Date().toISOString().split('T')[0],
        p_supplier_invoice_id: supplier_invoice_id.trim() || null,
        p_invoice_image_url: invoice_image_url.trim() || null,
        p_product_id: product_id || null,
        p_product_name: product_name.trim(),
        p_sku: sku.trim() || null,
        p_unit: unit || 'Pcs',
        p_hsn_sac: hsn_sac.trim() || null,
        p_cgst_rate: parseFloat(cgst_rate) || 9,
        p_sgst_rate: parseFloat(sgst_rate) || 9,
        p_igst_rate: parseFloat(igst_rate) || 18,
        p_tax_mode: tax_mode || 'exclusive',
        p_quantity: parsedQty,
        p_purchase_rate: parsedCost,
        p_selling_rate: parsedSelling,
        p_low_stock_threshold: parseInt(low_stock_threshold) || 5,
        p_minimum_stock_level: parseInt(minimum_stock_level) || 0,
        p_location: location.trim() || null,
        p_notes: notes.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      onSuccess();
    } catch (err: any) {
      console.error('Failed to log purchase on mobile:', err);
      setState({ error: err.message || 'Failed to log inventory purchase' });
    } finally {
      setState({ loading: false });
    }
  };

  const parsedQty = parseFloat(quantity) || 0;
  const parsedCost = parseFloat(purchase_rate) || 0;
  const subtotal = parsedQty * parsedCost;
  const taxRate = (parseFloat(cgst_rate) || 0) + (parseFloat(sgst_rate) || 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const previewThumbnail = getImageThumbnailUrl(invoice_image_url, 300);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Log Inventory Purchase</Text>
              <Text style={styles.subtitle}>
                {currentStep === 'supplier_info'
                  ? 'Step 1 of 2: Supplier & Invoice Intake'
                  : 'Step 2 of 2: Product Specs & Rates'}
              </Text>
            </View>
            <AppPressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </AppPressable>
          </View>

          {/* Stepper Indicator */}
          <View style={styles.stepperBar}>
            <AppPressable
              onPress={() => setCurrentStep('supplier_info')}
              style={[
                styles.stepTab,
                currentStep === 'supplier_info' && styles.stepTabActive,
              ]}
            >
              <Text
                style={[
                  styles.stepTabText,
                  currentStep === 'supplier_info' && styles.stepTabTextActive,
                ]}
              >
                1. Supplier & Invoice
              </Text>
            </AppPressable>

            <AppPressable
              onPress={handleProceedToStepB}
              style={[
                styles.stepTab,
                currentStep === 'product_details' && styles.stepTabActive,
              ]}
            >
              <Text
                style={[
                  styles.stepTabText,
                  currentStep === 'product_details' && styles.stepTabTextActive,
                ]}
              >
                2. Stock & Details
              </Text>
            </AppPressable>
          </View>

          {/* Scrollable Form Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* ──────── STEP A: SUPPLIER & INVOICE DETAILS ──────── */}
            {currentStep === 'supplier_info' ? (
              <View style={styles.stepContainer}>
                {/* Supplier Search or Create */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Supplier Name <Text style={styles.required}>*</Text>
                  </Text>
                  <SupplierTypeaheadMobile
                    name={supplier_name}
                    selectedSupplierId={supplier_id}
                    onChangeName={(val) => setState({ supplier_name: val, supplier_id: null })}
                    onSelectSupplier={handleSelectSupplier}
                    onClearSupplier={() => setState({ supplier_id: null })}
                  />
                </View>

                {/* Purchase Date & Phone */}
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.xs }]}>
                    <Text style={styles.label}>
                      Date (YYYY-MM-DD) <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputContainer}>
                      <Calendar size={16} color={colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={purchase_date}
                        onChangeText={(val) => setState({ purchase_date: val })}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Supplier Phone</Text>
                    <View style={styles.inputContainer}>
                      <Phone size={16} color={colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={supplier_phone}
                        onChangeText={(val) => setState({ supplier_phone: val })}
                        placeholder="e.g. 9876543210"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* GSTIN & Invoice ID */}
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.xs }]}>
                    <Text style={styles.label}>GSTIN (Optional)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={supplier_gstin}
                        onChangeText={(val) => setState({ supplier_gstin: val })}
                        placeholder="GST Number"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Invoice Number / ID</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={supplier_invoice_id}
                        onChangeText={(val) => setState({ supplier_invoice_id: val })}
                        placeholder="e.g. INV-1002"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </View>

                {/* Invoice Document (Google Drive link / Upload) */}
                <View style={styles.cardBox}>
                  <View style={styles.cardBoxHeader}>
                    <Text style={styles.cardBoxTitle}>Invoice Document (Optional)</Text>
                    <View style={styles.toggleRow}>
                      <AppPressable
                        onPress={() => setImageInputMode('gdrive')}
                        style={[
                          styles.toggleBtn,
                          imageInputMode === 'gdrive' && styles.toggleBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            imageInputMode === 'gdrive' && styles.toggleBtnTextActive,
                          ]}
                        >
                          Google Drive
                        </Text>
                      </AppPressable>

                      <AppPressable
                        onPress={() => setImageInputMode('upload')}
                        style={[
                          styles.toggleBtn,
                          imageInputMode === 'upload' && styles.toggleBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            imageInputMode === 'upload' && styles.toggleBtnTextActive,
                          ]}
                        >
                          Photo Upload
                        </Text>
                      </AppPressable>
                    </View>
                  </View>

                  {imageInputMode === 'gdrive' ? (
                    <View style={styles.inputContainer}>
                      <LinkIcon size={16} color={colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={invoice_image_url}
                        onChangeText={(val) => setState({ invoice_image_url: val })}
                        placeholder="Paste Google Drive file sharing link..."
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                      />
                    </View>
                  ) : (
                    <View style={styles.row}>
                      <AppPressable
                        style={[styles.uploadActionBtn, { marginRight: spacing.xs }]}
                        onPress={handleTakeImage}
                        disabled={uploadingImage}
                      >
                        <Camera size={16} color={colors.primary} />
                        <Text style={styles.uploadActionText}>Camera</Text>
                      </AppPressable>

                      <AppPressable
                        style={styles.uploadActionBtn}
                        onPress={handlePickImage}
                        disabled={uploadingImage}
                      >
                        <Upload size={16} color={colors.primary} />
                        <Text style={styles.uploadActionText}>Gallery</Text>
                      </AppPressable>
                    </View>
                  )}

                  {uploadingImage && (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.loadingText}>Compressing & uploading invoice...</Text>
                    </View>
                  )}

                  {/* Thumbnail Preview */}
                  {invoice_image_url && previewThumbnail ? (
                    <View style={styles.previewCard}>
                      <Image
                        source={{ uri: previewThumbnail }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.previewInfo}>
                        <Text style={styles.previewTitle} numberOfLines={1}>
                          {isGoogleDriveUrl(invoice_image_url) ? 'Google Drive Document' : 'Uploaded Invoice'}
                        </Text>
                        <Text style={styles.previewSubtitle}>Preview ready</Text>
                      </View>
                      <AppPressable
                        onPress={() => setState({ invoice_image_url: '' })}
                        style={styles.removeImageBtn}
                      >
                        <X size={16} color={colors.error} />
                      </AppPressable>
                    </View>
                  ) : null}
                </View>

                {/* Product Search or Create */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Product Name <Text style={styles.required}>*</Text>
                  </Text>
                  <ProductTypeaheadMobile
                    name={product_name}
                    selectedProductId={product_id}
                    onChangeName={(val) => setState({ product_name: val, product_id: null })}
                    onSelectProduct={handleSelectProduct}
                    onClearProduct={() => setState({ product_id: null })}
                  />
                  <Text style={styles.helperText}>
                    Select an existing catalog product or type a new item name.
                  </Text>
                </View>
              </View>
            ) : (
              /* ──────── STEP B: PRODUCT DETAILS & STOCK INTAKE ──────── */
              <View style={styles.stepContainer}>
                {/* Product Badge Header */}
                <View style={styles.productBanner}>
                  <View style={styles.productBannerIcon}>
                    <Package size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productBannerType}>
                      {product_id ? 'Existing Product in Catalog' : 'New Product Intake'}
                    </Text>
                    <Text style={styles.productBannerName}>{product_name}</Text>
                  </View>
                </View>

                {/* Quantity & Unit */}
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.xs }]}>
                    <Text style={styles.label}>
                      Quantity <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.inputBox}
                      value={quantity}
                      onChangeText={(val) => setState({ quantity: val })}
                      placeholder="1"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Unit</Text>
                    <TextInput
                      style={styles.inputBox}
                      value={unit}
                      onChangeText={(val) => setState({ unit: val })}
                      placeholder="Pcs, Box, Kg..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Purchase Rate & Selling Rate */}
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.xs }]}>
                    <Text style={styles.label}>
                      Purchase Cost (₹) <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.inputBox}
                      value={purchase_rate}
                      onChangeText={(val) => setState({ purchase_rate: val })}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Selling Rate (₹)</Text>
                    <TextInput
                      style={styles.inputBox}
                      value={selling_rate}
                      onChangeText={(val) => setState({ selling_rate: val })}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* SKU & Location */}
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.xs }]}>
                    <Text style={styles.label}>SKU / Barcode</Text>
                    <TextInput
                      style={styles.inputBox}
                      value={sku}
                      onChangeText={(val) => setState({ sku: val })}
                      placeholder="e.g. SKU-100"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Storage Shelf / Location</Text>
                    <TextInput
                      style={styles.inputBox}
                      value={location}
                      onChangeText={(val) => setState({ location: val })}
                      placeholder="e.g. Shelf A-2"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Calculation Summary Card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal ({quantity || '0'} × ₹{purchase_rate || '0'}):</Text>
                    <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>GST ({taxRate}%):</Text>
                    <Text style={styles.summaryValue}>₹{taxAmount.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                    <Text style={styles.summaryTotalLabel}>Grand Total:</Text>
                    <Text style={styles.summaryTotalValue}>₹{grandTotal.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {currentStep === 'supplier_info' ? (
              <>
                <AppPressable onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </AppPressable>

                <AppPressable onPress={handleProceedToStepB} style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>Continue to Stock Details</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </AppPressable>
              </>
            ) : (
              <>
                <AppPressable
                  onPress={() => setCurrentStep('supplier_info')}
                  style={styles.backBtn}
                >
                  <ArrowLeft size={16} color={colors.textSecondary} />
                  <Text style={styles.backBtnText}>Back</Text>
                </AppPressable>

                <AppPressable
                  onPress={handleSubmitPurchase}
                  style={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#ffffff" />
                      <Text style={styles.submitBtnText}>Log Purchase</Text>
                    </>
                  )}
                </AppPressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '92%',
    minHeight: '60%',
    ...shadow.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  stepperBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  stepTabActive: {
    borderBottomColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  stepTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
  },
  stepContainer: {
    gap: spacing.sm,
  },
  fieldGroup: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  required: {
    color: colors.error,
  },
  helperText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  inputBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
    paddingVertical: 0,
  },
  cardBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  cardBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    gap: 6,
  },
  uploadActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  loadingText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewSubtitle: {
    fontSize: 10,
    color: colors.success,
    marginTop: 2,
  },
  removeImageBtn: {
    padding: spacing.xs,
  },
  productBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  productBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBannerType: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  productBannerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.xs,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.2)',
    paddingTop: 4,
    marginTop: 2,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorBannerText: {
    fontSize: 11,
    color: colors.error,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
