import React, { useState, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import {
  Supplier,
  getImageThumbnailUrl,
  formatCurrency,
} from '@repairshop/shared';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { AppPressable } from '../../components/common/AppPressable';
import { compressImage } from '../../utils/compressImage';
import { uploadFileToSupabaseStorage } from '../../utils/supabaseStorage';
import AppHeader from '../../components/common/AppHeader';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import {
  Building2,
  Calendar,
  Phone,
  Mail,
  FileText,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Camera,
  Package,
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  Plus,
  Minus,
  MapPin,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react-native';

interface CatalogProduct {
  product_id: string;
  inventory_id?: string;
  name: string;
  sku?: string | null;
  unit: string;
  hsn_sac?: string | null;
  tax_mode: string;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  purchase_rate: number;
  selling_rate: number;
  current_quantity: number;
  low_stock_threshold: number;
  minimum_stock_level: number;
  location?: string | null;
}

const UNIT_OPTIONS = ['Pcs', 'Set', 'Mtr', 'Box', 'Kg', 'Nos', 'Roll'];

export default function PurchaseIntakeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const bottomPadding = useBottomInsetPadding('nav');

  const [currentStep, setCurrentStep] = useState<'supplier_info' | 'product_details'>('supplier_info');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'gdrive'>('upload');

  // Supplier Search State
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Product Search State
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<CatalogProduct[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      // Step 1: Supplier & Purchase Information
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

      // Step 2: Product & Stock Details
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

  // ─── Supplier Search Function ───
  const handleSupplierSearch = (text: string) => {
    setSupplierQuery(text);
    setState({ supplier_name: text, supplier_id: null });

    if (supplierTimeoutRef.current) clearTimeout(supplierTimeoutRef.current);

    if (text.trim().length >= 2) {
      setSupplierSearchLoading(true);
      supplierTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error: rpcErr } = await supabase.rpc('search_suppliers', {
            p_query: text.trim(),
            p_limit: 5,
          });
          if (!rpcErr && data) {
            setSupplierResults(data as Supplier[]);
            setShowSupplierDropdown(true);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSupplierSearchLoading(false);
        }
      }, 300);
    } else {
      setSupplierResults([]);
      setShowSupplierDropdown(false);
      setSupplierSearchLoading(false);
    }
  };

  const handleSelectSupplier = (supp: Supplier) => {
    setSupplierQuery(supp.name);
    setShowSupplierDropdown(false);
    setState({
      supplier_id: supp.id,
      supplier_name: supp.name,
      supplier_phone: supp.phone || '',
      supplier_email: supp.email || '',
      supplier_gstin: supp.gstin || '',
      supplier_address: supp.address || '',
      error: '',
    });
  };

  const handleClearSupplier = () => {
    setSupplierQuery('');
    setShowSupplierDropdown(false);
    setState({
      supplier_id: null,
      supplier_name: '',
      supplier_phone: '',
      supplier_email: '',
      supplier_gstin: '',
      supplier_address: '',
    });
  };

  // ─── Product Catalog Search Function ───
  const handleProductSearch = (text: string) => {
    setProductQuery(text);
    setState({ product_name: text, product_id: null });

    if (productTimeoutRef.current) clearTimeout(productTimeoutRef.current);

    if (text.trim().length >= 2) {
      setProductSearchLoading(true);
      productTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error: rpcErr } = await supabase.rpc('search_products_catalog', {
            p_query: text.trim(),
            p_limit: 6,
          });
          if (!rpcErr && data) {
            setProductResults(data as CatalogProduct[]);
            setShowProductDropdown(true);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setProductSearchLoading(false);
        }
      }, 300);
    } else {
      setProductResults([]);
      setShowProductDropdown(false);
      setProductSearchLoading(false);
    }
  };

  const handleSelectProduct = (prod: CatalogProduct) => {
    setProductQuery(prod.name);
    setShowProductDropdown(false);
    setState({
      product_id: prod.product_id,
      product_name: prod.name,
      sku: prod.sku || '',
      unit: prod.unit || 'Pcs',
      hsn_sac: prod.hsn_sac || '',
      tax_mode: prod.tax_mode || 'exclusive',
      cgst_rate: String(prod.cgst_rate ?? 9),
      sgst_rate: String(prod.sgst_rate ?? 9),
      igst_rate: String(prod.igst_rate ?? 18),
      purchase_rate: String(prod.purchase_rate ?? 0),
      selling_rate: String(prod.selling_rate ?? 0),
      low_stock_threshold: String(prod.low_stock_threshold ?? 5),
      minimum_stock_level: String(prod.minimum_stock_level ?? 0),
      location: prod.location || '',
      error: '',
    });
  };

  const handleClearProduct = () => {
    setProductQuery('');
    setShowProductDropdown(false);
    setState({
      product_id: null,
      product_name: '',
      sku: '',
      purchase_rate: '0',
      selling_rate: '0',
    });
  };

  // ─── Image Upload Helpers ───
  const uploadCompressedImage = async (uri: string) => {
    try {
      setUploadingImage(true);
      setState({ error: '' });

      const compressedUri = await compressImage(uri);
      const fileName = `inv_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `invoices/${fileName}`;

      const publicUrl = await uploadFileToSupabaseStorage(
        'purchase-invoices',
        filePath,
        compressedUri,
        'image/jpeg'
      );

      setState({ invoice_image_url: publicUrl });
      showToast({ title: 'Success', message: 'Invoice image uploaded successfully', type: 'success' });
    } catch (err: any) {
      console.error('Invoice image upload failed:', err);
      setState({ error: err.message || 'Failed to upload invoice image' });
      showToast({ title: 'Upload Failed', message: err.message || 'Could not upload image.', type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({ title: 'Error', message: 'Camera roll permission is required to upload invoice photos.', type: 'error' });
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
      showToast({ title: 'Error', message: 'Camera permission is required to capture invoice photos.', type: 'error' });
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

  // ─── Step Transitions & Validation ───
  const handleProceedToStep2 = () => {
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
      const { error: rpcErr } = await supabase.rpc('log_inventory_purchase', {
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

      showToast({ title: 'Success', message: 'Purchase logged and stock updated!', type: 'success' });
      navigation.goBack();
    } catch (err: any) {
      console.error('Failed to log purchase on mobile:', err);
      setState({ error: err.message || 'Failed to log inventory purchase' });
      showToast({ title: 'Error', message: err.message || 'Failed to log purchase', type: 'error' });
    } finally {
      setState({ loading: false });
    }
  };

  // ─── Financial Calculations ───
  const parsedQty = parseFloat(quantity) || 0;
  const parsedCost = parseFloat(purchase_rate) || 0;
  const subtotal = parsedQty * parsedCost;
  const taxRate = (parseFloat(cgst_rate) || 0) + (parseFloat(sgst_rate) || 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Add Inventory Item" showBack={true} />

      {/* STEP PROGRESS BAR */}
      <View style={styles.stepperContainer}>
        <AppPressable
          style={[styles.stepTab, currentStep === 'supplier_info' && styles.stepTabActive]}
          onPress={() => setCurrentStep('supplier_info')}
        >
          <View style={[styles.stepNumberBadge, currentStep === 'supplier_info' && styles.stepNumberBadgeActive]}>
            <Text style={[styles.stepNumberText, currentStep === 'supplier_info' && styles.stepNumberTextActive]}>1</Text>
          </View>
          <Text style={[styles.stepTabText, currentStep === 'supplier_info' && styles.stepTabTextActive]}>
            Supplier & Invoice
          </Text>
        </AppPressable>

        <View style={styles.stepConnector} />

        <AppPressable
          style={[styles.stepTab, currentStep === 'product_details' && styles.stepTabActive]}
          onPress={handleProceedToStep2}
        >
          <View style={[styles.stepNumberBadge, currentStep === 'product_details' && styles.stepNumberBadgeActive]}>
            <Text style={[styles.stepNumberText, currentStep === 'product_details' && styles.stepNumberTextActive]}>2</Text>
          </View>
          <Text style={[styles.stepTabText, currentStep === 'product_details' && styles.stepTabTextActive]}>
            Stock & Details
          </Text>
        </AppPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color={colors.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: SUPPLIER, INVOICE & PRODUCT SELECTION
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 'supplier_info' ? (
          <View style={styles.stepBlock}>
            {/* SECTION 1: SUPPLIER DETAILS */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Building2 size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Supplier Information</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Supplier Name <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Building2 size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Search existing supplier or enter name..."
                    placeholderTextColor={colors.textMuted}
                    value={supplierQuery || supplier_name}
                    onChangeText={handleSupplierSearch}
                    autoCapitalize="words"
                  />
                  {supplier_id ? (
                    <View style={styles.tagBadge}>
                      <CheckCircle2 size={12} color={colors.success} />
                      <Text style={styles.tagBadgeText}>Saved</Text>
                      <AppPressable onPress={handleClearSupplier} style={{ marginLeft: 4 }}>
                        <X size={12} color={colors.textSecondary} />
                      </AppPressable>
                    </View>
                  ) : supplierSearchLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : null}
                </View>

                {/* Dropdown Suggestions List for Supplier */}
                {showSupplierDropdown && supplierResults.length > 0 && (
                  <View style={styles.dropdownContainer}>
                    <Text style={styles.dropdownHeaderTitle}>Select Existing Supplier ({supplierResults.length})</Text>
                    {supplierResults.map((s) => (
                      <AppPressable
                        key={s.id}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectSupplier(s)}
                      >
                        <Building2 size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownItemTitle}>{s.name}</Text>
                          {s.phone ? <Text style={styles.dropdownItemSub}>{s.phone} {s.gstin ? `• GST: ${s.gstin}` : ''}</Text> : null}
                        </View>
                      </AppPressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Contact number"
                      placeholderTextColor={colors.textMuted}
                      value={supplier_phone}
                      onChangeText={(t) => setState({ supplier_phone: t })}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>GSTIN (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <FileText size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 29ABCDE1234F"
                      placeholderTextColor={colors.textMuted}
                      value={supplier_gstin}
                      onChangeText={(t) => setState({ supplier_gstin: t.toUpperCase() })}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Supplier Address / Email</Text>
                <View style={styles.inputWrapper}>
                  <MapPin size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Address, city or email..."
                    placeholderTextColor={colors.textMuted}
                    value={supplier_address || supplier_email}
                    onChangeText={(t) => setState({ supplier_address: t })}
                  />
                </View>
              </View>
            </View>

            {/* SECTION 2: PURCHASE & INVOICE DETAILS */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <FileText size={18} color={colors.accentBlue} />
                <Text style={styles.cardTitle}>Invoice Reference & Date</Text>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Supplier Invoice #</Text>
                  <View style={styles.inputWrapper}>
                    <FileText size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. INV-9842"
                      placeholderTextColor={colors.textMuted}
                      value={supplier_invoice_id}
                      onChangeText={(t) => setState({ supplier_invoice_id: t })}
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Purchase Date</Text>
                  <View style={styles.inputWrapper}>
                    <Calendar size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textMuted}
                      value={purchase_date}
                      onChangeText={(t) => setState({ purchase_date: t })}
                    />
                  </View>
                </View>
              </View>

              {/* Invoice Photo Attachment */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Invoice Document Photo / Copy</Text>

                {invoice_image_url ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: invoice_image_url }} 
                      style={styles.imagePreview} 
                      contentFit="cover" 
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.imagePreviewOverlay}>
                      <Text style={styles.imageAttachedText}>Invoice Attached</Text>
                      <AppPressable style={styles.removeImageBtn} onPress={() => setState({ invoice_image_url: '' })}>
                        <X size={14} color="#fff" />
                        <Text style={styles.removeImageText}>Remove</Text>
                      </AppPressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadActionsRow}>
                    <AppPressable style={styles.uploadBtn} onPress={handleTakeImage} disabled={uploadingImage}>
                      <Camera size={18} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>Take Photo</Text>
                    </AppPressable>

                    <AppPressable style={styles.uploadBtn} onPress={handlePickImage} disabled={uploadingImage}>
                      <Upload size={18} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>Choose File</Text>
                    </AppPressable>
                  </View>
                )}

                {uploadingImage && (
                  <View style={styles.uploadingState}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.uploadingText}>Compressing & uploading invoice...</Text>
                  </View>
                )}
              </View>
            </View>

            {/* SECTION 3: PRODUCT ITEM SELECTION */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Package size={18} color={colors.accentGreen} />
                <Text style={styles.cardTitle}>Product Selection</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Product Name <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Package size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Type product name or search catalog..."
                    placeholderTextColor={colors.textMuted}
                    value={productQuery || product_name}
                    onChangeText={handleProductSearch}
                    autoCapitalize="words"
                  />
                  {product_id ? (
                    <View style={styles.tagBadge}>
                      <CheckCircle2 size={12} color={colors.success} />
                      <Text style={styles.tagBadgeText}>Catalog Item</Text>
                      <AppPressable onPress={handleClearProduct} style={{ marginLeft: 4 }}>
                        <X size={12} color={colors.textSecondary} />
                      </AppPressable>
                    </View>
                  ) : productSearchLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Search size={16} color={colors.textMuted} />
                  )}
                </View>

                {/* Dropdown Suggestions List for Product */}
                {showProductDropdown && productResults.length > 0 && (
                  <View style={styles.dropdownContainer}>
                    <Text style={styles.dropdownHeaderTitle}>Matching Catalog Products ({productResults.length})</Text>
                    {productResults.map((p) => (
                      <AppPressable
                        key={p.product_id}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectProduct(p)}
                      >
                        <Package size={18} color={colors.accentGreen} style={{ marginRight: spacing.sm }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownItemTitle} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.dropdownItemSub}>
                            Stock: {p.current_quantity} {p.unit} • Cost: ₹{p.purchase_rate} {p.sku ? `• SKU: ${p.sku}` : ''}
                          </Text>
                        </View>
                      </AppPressable>
                    ))}
                  </View>
                )}

                <Text style={styles.fieldHelpText}>
                  Select from existing catalog or type a new product name to add it to inventory.
                </Text>
              </View>
            </View>

            {/* CONTINUE BUTTON */}
            <AppPressable style={styles.primaryButton} onPress={handleProceedToStep2}>
              <Text style={styles.primaryButtonText}>Next: Stock & Details</Text>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: spacing.xs }} />
            </AppPressable>
          </View>
        ) : (
          /* ════════════════════════════════════════════════════════════════════
             STEP 2: STOCK, PRICING & INVENTORY DETAILS
          ════════════════════════════════════════════════════════════════════ */
          <View style={styles.stepBlock}>
            {/* SELECTED PRODUCT SUMMARY CARD */}
            <View style={styles.summaryBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Selected Product</Text>
                <Text style={styles.summaryTitle} numberOfLines={1}>{product_name}</Text>
                <Text style={styles.summarySub}>
                  Supplier: {supplier_name} {supplier_invoice_id ? `• Invoice: ${supplier_invoice_id}` : ''}
                </Text>
              </View>
              <AppPressable style={styles.editStepBtn} onPress={() => setCurrentStep('supplier_info')}>
                <Text style={styles.editStepBtnText}>Change</Text>
              </AppPressable>
            </View>

            {/* SECTION 1: PRODUCT SPECS & UNIT */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Tag size={18} color={colors.accentLightPurple} />
                <Text style={styles.cardTitle}>Product Specifications</Text>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>SKU / Barcode</Text>
                  <View style={styles.inputWrapper}>
                    <Tag size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. RAM-DDR4-8GB"
                      placeholderTextColor={colors.textMuted}
                      value={sku}
                      onChangeText={(t) => setState({ sku: t })}
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>HSN / SAC Code</Text>
                  <View style={styles.inputWrapper}>
                    <FileText size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 847330"
                      placeholderTextColor={colors.textMuted}
                      value={hsn_sac}
                      onChangeText={(t) => setState({ hsn_sac: t })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Unit of Measurement Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Unit of Measurement</Text>
                <View style={styles.pillOptionsRow}>
                  {UNIT_OPTIONS.map((u) => (
                    <AppPressable
                      key={u}
                      style={[styles.unitPill, unit === u && styles.unitPillActive]}
                      onPress={() => setState({ unit: u })}
                    >
                      <Text style={[styles.unitPillText, unit === u && styles.unitPillTextActive]}>{u}</Text>
                    </AppPressable>
                  ))}
                </View>
              </View>
            </View>

            {/* SECTION 2: QUANTITY & PRICING */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <DollarSign size={18} color={colors.accentGreen} />
                <Text style={styles.cardTitle}>Quantity & Pricing</Text>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Quantity Purchased <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.stepperInputWrapper}>
                    <AppPressable
                      style={styles.stepperBtn}
                      onPress={() => {
                        const q = Math.max(1, (parseFloat(quantity) || 1) - 1);
                        setState({ quantity: String(q) });
                      }}
                    >
                      <Minus size={16} color={colors.textPrimary} />
                    </AppPressable>
                    <TextInput
                      style={styles.stepperInput}
                      value={quantity}
                      onChangeText={(t) => setState({ quantity: t })}
                      keyboardType="decimal-pad"
                      textAlign="center"
                    />
                    <AppPressable
                      style={styles.stepperBtn}
                      onPress={() => {
                        const q = (parseFloat(quantity) || 0) + 1;
                        setState({ quantity: String(q) });
                      }}
                    >
                      <Plus size={16} color={colors.textPrimary} />
                    </AppPressable>
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Purchase Rate (₹) <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      value={purchase_rate}
                      onChangeText={(t) => setState({ purchase_rate: t })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Selling Rate (₹)</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      value={selling_rate}
                      onChangeText={(t) => setState({ selling_rate: t })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>GST Rate (%)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="18"
                      placeholderTextColor={colors.textMuted}
                      value={igst_rate}
                      onChangeText={(t) => {
                        const rate = parseFloat(t) || 0;
                        setState({
                          igst_rate: t,
                          cgst_rate: String(rate / 2),
                          sgst_rate: String(rate / 2),
                        });
                      }}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.currencyPrefix}>%</Text>
                  </View>
                </View>
              </View>

              {/* TOTALS SUMMARY CARD */}
              <View style={styles.totalsCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalRowLabel}>Subtotal ({quantity} {unit} @ ₹{purchase_rate || 0})</Text>
                  <Text style={styles.totalRowValue}>{formatCurrency(subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalRowLabel}>GST Tax ({taxRate}%)</Text>
                  <Text style={styles.totalRowValue}>{formatCurrency(taxAmount)}</Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalRow}>
                  <Text style={styles.grandTotalLabel}>Total Purchase Value</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
                </View>
              </View>
            </View>

            {/* SECTION 3: STOCK LIMITS & STORAGE LOCATION */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Layers size={18} color={colors.accentOrange} />
                <Text style={styles.cardTitle}>Inventory Limits & Storage</Text>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Low Stock Alert</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                      value={low_stock_threshold}
                      onChangeText={(t) => setState({ low_stock_threshold: t })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Storage Location</Text>
                  <View style={styles.inputWrapper}>
                    <MapPin size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Shelf / Bin A-12"
                      placeholderTextColor={colors.textMuted}
                      value={location}
                      onChangeText={(t) => setState({ location: t })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Internal Notes / Remarks</Text>
                <View style={[styles.inputWrapper, { height: 68, alignItems: 'flex-start', paddingVertical: spacing.xs }]}>
                  <TextInput
                    style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
                    placeholder="Add any additional remarks or supplier warranty info..."
                    placeholderTextColor={colors.textMuted}
                    value={notes}
                    onChangeText={(t) => setState({ notes: t })}
                    multiline
                  />
                </View>
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.buttonActionRow}>
              <AppPressable
                style={styles.secondaryButton}
                onPress={() => setCurrentStep('supplier_info')}
                disabled={loading}
              >
                <ArrowLeft size={18} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </AppPressable>

              <AppPressable
                style={[styles.primaryButton, { flex: 2 }, loading && { opacity: 0.7 }]}
                onPress={handleSubmitPurchase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#ffffff" style={{ marginRight: spacing.xs }} />
                    <Text style={styles.primaryButtonText}>Add to Inventory</Text>
                  </>
                )}
              </AppPressable>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepTab: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  stepTabActive: {
    opacity: 1,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  stepNumberBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumberText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepNumberTextActive: {
    color: '#ffffff',
  },
  stepTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepTabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusUrgentBg,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },
  stepBlock: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  requiredStar: {
    color: colors.error,
  },
  fieldHelpText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  currencyPrefix: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: 3,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    marginTop: 4,
    padding: spacing.xs,
    ...shadow.medium,
  },
  dropdownHeaderTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
    marginBottom: 4,
  },
  dropdownItemTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  dropdownItemSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  uploadActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  uploadBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  uploadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  uploadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  imagePreviewContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    height: 120,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  imageAttachedText: {
    ...typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentRed,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: 3,
  },
  removeImageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accentBlue + '10',
    borderWidth: 1,
    borderColor: colors.accentBlue + '30',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  summaryLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: 2,
  },
  summarySub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editStepBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  editStepBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  pillOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  unitPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  stepperInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 48,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 40,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperInput: {
    flex: 1,
    ...typography.bodyBold,
    color: colors.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },
  totalsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalRowLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  totalRowValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  grandTotalLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  grandTotalValue: {
    ...typography.h3,
    fontWeight: '800',
    color: colors.accentGreen,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadow.card,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: '#ffffff',
    fontSize: 15,
  },
  buttonActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});
