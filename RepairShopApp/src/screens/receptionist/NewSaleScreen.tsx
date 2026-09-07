import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';


import AppHeader from '../../components/common/AppHeader';
import Button from '../../components/common/Button';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePdfGenerator } from '../../context/PdfProgressContext';
import { useAppConfig } from '../../context/AppConfigContext';
import {
  createWhatsAppUrl,
  formatCurrency,
  calculateBillingTotals,
  reverseCalcBillFromGrandTotal,
  LineItem,
} from '@repairshop/shared';
import { AppPressable } from '../../components/common/AppPressable';
import { ArrowLeft, ArrowRight, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react-native';

import { SaleCustomerForm } from '../../components/sales/SaleCustomerForm';
import { SaleItemsList } from '../../components/sales/SaleItemsList';
import { SaleSuccessCard } from '../../components/sales/SaleSuccessCard';
import ItemizedBillTable, { ItemizedLineItem } from '../../components/billing/ItemizedBillTable';
import ItemizedBillTotals from '../../components/billing/ItemizedBillTotals';

type SalePaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

type SaleItem = {
  clientId?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  product_id: string | null;
  serial_number?: string;
  selected_serial_ids?: string[];
  selected_serial_numbers?: string[];
  hsn_code?: string | null;
  tax_percent?: number;
};

type InventorySuggestion = {
  id: string;
  product_id: string;
  item_name: string;
  quantity: number;
  selling_rate: number;
  unit?: string | null;
  hsn_sac?: string | null;
};

type CreatedSale = {
  id: string;
  sale_code: string;
  created_at: string;
  total_amount: number;
  customer_name: string;
  customer_contact: string;
  customer_gstin?: string | null;
};

const emptyItem = (): SaleItem => ({
  clientId: Math.random().toString(36).substr(2, 9),
  product_id: null,
  item_name: '',
  quantity: 1,
  unit_price: 0,
  serial_number: '',
  hsn_code: null,
  tax_percent: 18,
});

export default function NewSaleScreen() {
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
  const { user } = useAuth();
  const { showToast } = useToast();
  const { generatePdf } = usePdfGenerator();
  const { config } = useAppConfig();

  // 2-Step itemized billing flow
  const [step, setStep] = useState<'intake' | 'itemized'>('intake');
  const [loading, setLoading] = useState(false);
  const [createdSale, setCreatedSale] = useState<CreatedSale | null>(null);

  const [form, setForm] = useState({
    customer_id: null as string | null,
    customer_name: '',
    customer_contact: '',
    customer_email: '',
    customer_gstin: '',
    customer_address: '',
    payment_method: 'Cash' as SalePaymentMethod,
    amount_paid: '',
    notes: '',
  });

  const [items, setItems] = useState<SaleItem[]>([emptyItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [inventorySuggestions, setInventorySuggestions] = useState<InventorySuggestion[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Map SaleItems to ItemizedLineItems for Step 2
  const itemizedLines: ItemizedLineItem[] = useMemo(() => {
    return items.map((it, idx) => ({
      id: it.clientId || String(idx),
      item_name: it.item_name || 'Item',
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      tax_percent: it.tax_percent !== undefined ? Number(it.tax_percent) : 18,
      hsn_code: it.hsn_code || null,
      serial_number: it.serial_number || null,
      selected_serial_ids: it.selected_serial_ids || [],
      selected_serial_numbers: it.selected_serial_numbers || [],
      product_id: it.product_id || null,
      is_labour: false,
    }));
  }, [items]);

  // Calculations via shared billing engine
  const billingTotals = useMemo(() => calculateBillingTotals({ items: itemizedLines }), [itemizedLines]);
  const subtotal = billingTotals.subtotal;
  const totalTax = billingTotals.taxAmount;
  const grandTotal = billingTotals.grandTotal;

  const balanceRemaining = useMemo(() => {
    const paid = parseFloat(form.amount_paid);
    if (isNaN(paid) || paid <= 0) return grandTotal;
    return Math.max(0, Math.round((grandTotal - paid) * 100) / 100);
  }, [grandTotal, form.amount_paid]);

  // Inventory autocomplete
  useEffect(() => {
    if (activeItemIndex === null) return;
    const searchTerm = items[activeItemIndex]?.item_name?.trim();
    if (!searchTerm || searchTerm.length < 2) return;

    let isCurrent = true;
    const timeoutId = setTimeout(() => {
      setInventoryLoading(true);
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('inventory')
            .select('id, product_id, quantity_cached, selling_rate, products!inner(name, unit, hsn_sac)')
            .ilike('products.name', `%${searchTerm}%`)
            .limit(8);
          if (!isCurrent) return;
          if (error) { setInventorySuggestions([]); return; }
          const mapped = (data || []).map((row: any) => ({
            id: row.id,
            product_id: row.product_id,
            item_name: row.products?.name || 'Unknown',
            quantity: row.quantity_cached,
            selling_rate: row.selling_rate,
            unit: row.products?.unit,
            hsn_sac: row.products?.hsn_sac,
          })).sort((a, b) => a.item_name.localeCompare(b.item_name));
          setInventorySuggestions(mapped as InventorySuggestion[]);
        } finally {
          if (isCurrent) setInventoryLoading(false);
        }
      })();
    }, 250);

    return () => { isCurrent = false; clearTimeout(timeoutId); };
  }, [activeItemIndex, items]);

  const updateItem = (index: number, updates: Partial<SaleItem>) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const handleUpdateItemizedLine = (id: string, updates: Partial<ItemizedLineItem>) => {
    setItems(prev => prev.map(it => {
      if ((it.clientId || '') === id) {
        return {
          ...it,
          ...(updates.unit_price !== undefined ? { unit_price: updates.unit_price } : {}),
          ...(updates.tax_percent !== undefined ? { tax_percent: updates.tax_percent } : {}),
          ...(updates.quantity !== undefined ? { quantity: updates.quantity } : {}),
          ...(updates.serial_number !== undefined ? { serial_number: updates.serial_number || '' } : {}),
          ...(updates.selected_serial_ids !== undefined ? { selected_serial_ids: updates.selected_serial_ids } : {}),
          ...(updates.selected_serial_numbers !== undefined ? { selected_serial_numbers: updates.selected_serial_numbers } : {}),
        };
      }
      return it;
    }));
  };

  const handleUpdateGrandTotal = (newGrandTotal: number) => {
    const lineItems: LineItem[] = itemizedLines.map(l => ({
      id: l.id,
      qty: Number(l.quantity) || 1,
      rate: Number(l.unit_price) || 0,
      taxPct: Number(l.tax_percent) || 18,
    }));

    const result = reverseCalcBillFromGrandTotal(lineItems, newGrandTotal, 'intra_state');

    setItems(prev =>
      prev.map(it => {
        const scaled = result.items.find(si => si.id === it.clientId);
        if (!scaled) return it;
        return {
          ...it,
          unit_price: scaled.rate,
        };
      })
    );
  };

  const selectInventoryItem = (index: number, suggestion: InventorySuggestion) => {
    updateItem(index, {
      product_id: suggestion.product_id,
      item_name: suggestion.item_name,
      unit_price: Number(suggestion.selling_rate || 0),
      hsn_code: suggestion.hsn_sac || null,
      tax_percent: 18,
    });
    setInventorySuggestions([]);
    setActiveItemIndex(null);
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const validateIntake = () => {
    const newErrors: Record<string, string> = {};
    if (!form.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
    if (!form.customer_contact.trim()) newErrors.customer_contact = 'Contact number is required';
    
    items.forEach((item, index) => {
      if (!item.item_name.trim()) newErrors[`item_name_${index}`] = 'Item name is required';
      if (Number(item.quantity) <= 0) newErrors[`quantity_${index}`] = 'Quantity must be > 0';
      if (Number(item.unit_price) < 0) newErrors[`unit_price_${index}`] = 'Price cannot be negative';
    });

    if (items.length === 0 || items.every(i => !i.item_name.trim())) {
      newErrors.items = 'Add at least one sale item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToItemized = () => {
    if (validateIntake()) {
      setStep('itemized');
      setForm(prev => ({
        ...prev,
        amount_paid: prev.amount_paid && prev.amount_paid.trim() !== '' ? prev.amount_paid : String(grandTotal),
      }));
    }
  };

  const resetForm = () => {
    setCreatedSale(null);
    setStep('intake');
    setForm({
      customer_id: null,
      customer_name: '',
      customer_contact: '',
      customer_email: '',
      customer_gstin: '',
      customer_address: '',
      payment_method: 'Cash',
      amount_paid: '',
      notes: '',
    });
    setItems([emptyItem()]);
    setErrors({});
    setActiveItemIndex(null);
    setInventorySuggestions([]);
  };

  const handleWhatsAppInvoice = async () => {
    if (!createdSale) return;
    const msg = `Hello ${form.customer_name.trim()}, your Digital Solution itemized invoice for Sale ${createdSale.sale_code} is ready.\n\nSubtotal: ${formatCurrency(subtotal)}\nTax: ${formatCurrency(totalTax)}\n*Grand Total: ${formatCurrency(createdSale.total_amount || grandTotal)}*\n\nThank you for choosing Digital Solution.`;
    const url = createWhatsAppUrl(form.customer_contact.trim(), msg);
    if (!url) { showToast({ title: 'Invalid number', message: 'Could not format number for WhatsApp.', type: 'error' }); return; }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) { showToast({ title: 'WhatsApp unavailable', message: 'WhatsApp is not installed.', type: 'error' }); return; }
      await Linking.openURL(url);
    } catch (err: any) {
      showToast({ title: 'WhatsApp failed', message: err.message || 'Could not open WhatsApp.', type: 'error' });
    }
  };

  const handlePrintInvoice = async () => {
    if (!createdSale) return;
    await generatePdf({
      request: { docType: 'final', invoiceId: createdSale.id },
      title: 'Generating Sale Invoice',
      mode: 'print',
    });
  };

  const handleSubmitSale = async () => {
    if (!user) { showToast({ title: 'Authentication required', message: 'Please sign in again.', type: 'error' }); return; }
    if (grandTotal <= 0) { showToast({ title: 'Invalid Total', message: 'Sale total must be greater than zero.', type: 'error' }); return; }

    setLoading(true);
    try {
      // Upsert Customer
      let customerId = form.customer_id || null;
      try {
        const { data: custData, error: custErr } = await supabase.rpc('find_or_create_customer', {
          p_customer_id: customerId,
          p_name: form.customer_name.trim(),
          p_phone: form.customer_contact.trim() || null,
          p_email: form.customer_email.trim() || null,
          p_gstin: form.customer_gstin.trim() || null,
          p_address: form.customer_address.trim() || null,
          p_created_via: 'sale',
          p_user_id: user.id,
        });
        if (!custErr && custData) {
          customerId = custData.id;
        }
      } catch (e) {
        console.warn('Customer upsert warning:', e);
      }

      // Build payload items matching updated create_invoice RPC
      const payloadItems = items
        .filter(item => item.item_name.trim())
        .map(item => ({
          product_id: item.product_id || null,
          item_name: item.item_name.trim(),
          quantity: Number(item.quantity) || 1,
          selling_rate: Number(item.unit_price) || 0,
          serial_number: item.serial_number || null,
          hsn_code: item.hsn_code || null,
          tax_percent: item.tax_percent !== undefined ? Number(item.tax_percent) : 18,
        }));

      const enteredAmountPaid = form.amount_paid && form.amount_paid.trim() !== ''
        ? Number(form.amount_paid)
        : grandTotal;
      const derivedStatus = enteredAmountPaid >= grandTotal && grandTotal > 0 ? 'paid' : 'draft';

      if (!customerId) throw new Error('Customer could not be resolved. Please check the name and contact.');

      const { data, error } = await supabase.rpc('create_invoice', {
        p_customer_name: form.customer_name.trim(),
        p_customer_id: customerId,
        p_customer_contact: form.customer_contact.trim() || null,
        p_customer_email: form.customer_email.trim() || null,
        p_customer_gstin: form.customer_gstin.trim() || null,
        p_customer_address: form.customer_address.trim() || null,
        p_tax_regime: 'intra_state',
        p_items: payloadItems,
        p_discount: 0,
        p_payment_method: form.payment_method,
        p_status: derivedStatus,
        p_notes: form.notes.trim() || null,
        p_job_id: null,
        p_amount_paid: enteredAmountPaid,
      });
      if (error) throw error;

      // Atomically claim selected serial numbers
      const serialClaims = items
        .map((it, idx) => ({
          line_index: idx,
          product_id: it.product_id || null,
          serial_ids: it.selected_serial_ids || [],
        }))
        .filter((c) => c.serial_ids.length > 0);

      if (serialClaims.length > 0 && data?.invoice_id) {
        try {
          await supabase.rpc('claim_invoice_serials', {
            p_invoice_id: data.invoice_id,
            p_claims: serialClaims,
          });
        } catch (claimErr: any) {
          console.warn('Mobile sale serial claim warning:', claimErr);
        }
      }

      setCreatedSale({
        id: data.invoice_id,
        sale_code: data.invoice_code,
        created_at: new Date().toISOString(),
        total_amount: grandTotal,
        customer_name: form.customer_name.trim(),
        customer_contact: form.customer_contact.trim(),
        customer_gstin: form.customer_gstin.trim() || null,
      });

      showToast({ title: 'Sale Recorded', message: data.invoice_code, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Sale Failed', message: err.message || 'Failed to create sale.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (createdSale) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sale Complete" />
        <SaleSuccessCard
          saleCode={createdSale.sale_code}
          totalAmount={createdSale.total_amount}
          onPrint={handlePrintInvoice}
          onWhatsApp={handleWhatsAppInvoice}
          onCreateAnother={resetForm}
          onDone={() => { resetForm(); navigation.navigate('ReceptionistTabs', { screen: 'Dashboard' }); }}
        />
      </View>
    );
  }

  const paymentMethods: { label: SalePaymentMethod; icon: any }[] = [
    { label: 'Cash', icon: Banknote },
    { label: 'UPI', icon: Smartphone },
    { label: 'Card', icon: CreditCard },
    { label: 'Bank Transfer', icon: Building2 },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title={step === 'intake' ? 'New Sale' : 'Itemized Sale Bill'} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + spacing.xl + 80 }]}>
        {step === 'intake' ? (
          /* ─── STEP 1: INTAKE & ADD ITEMS ─────────────────────────────────── */
          <>
            <SaleCustomerForm
              form={form}
              errors={errors}
              onChange={updates => setForm(prev => ({ ...prev, ...updates }))}
            />

            <SaleItemsList
              items={items}
              errors={errors}
              activeItemIndex={activeItemIndex}
              inventorySuggestions={inventorySuggestions}
              inventoryLoading={inventoryLoading}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
              onFocusItem={index => { setActiveItemIndex(index); setInventorySuggestions([]); }}
              onSelectSuggestion={selectInventoryItem}
            />

            <Button
              label="Generate Itemized Bill"
              onPress={handleProceedToItemized}
              variant="primary"
              style={styles.actionBtn}
            />
          </>
        ) : (
          /* ─── STEP 2: ITEMIZED BILL & PAYMENT ────────────────────────────── */
          <View style={styles.stepContainer}>
            <AppPressable style={styles.backBtn} onPress={() => setStep('intake')}>
              <ArrowLeft size={14} color={colors.primary} />
              <Text style={styles.backBtnText}>Back to Edit Items</Text>
            </AppPressable>

            {/* Shared Itemized Table with editable price and 18% default tax */}
            <ItemizedBillTable
              items={itemizedLines}
              editable={true}
              onUpdateItem={handleUpdateItemizedLine}
            />

            {/* Shared Bill Totals (Subtotal → Tax Amount → Total) */}
            <ItemizedBillTotals
              subtotal={subtotal}
              totalTax={totalTax}
              grandTotal={grandTotal}
              editable={true}
              onUpdateGrandTotal={handleUpdateGrandTotal}
            />

            {/* Payment Recording Card */}
            <View style={styles.paymentCard}>
              <Text style={styles.paymentCardTitle}>Record Payment</Text>

              {/* Amount Paid with Pay Full Shortcut */}
              <View style={styles.inputGroup}>
                <View style={styles.amountHeader}>
                  <Text style={styles.inputLabel}>Amount Received (₹)</Text>
                  <AppPressable onPress={() => setForm(prev => ({ ...prev, amount_paid: String(grandTotal) }))}>
                    <Text style={styles.payFullText}>Pay Full (₹{grandTotal.toFixed(2)})</Text>
                  </AppPressable>
                </View>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  placeholder={String(grandTotal)}
                  placeholderTextColor={colors.textMuted}
                  value={form.amount_paid}
                  onChangeText={val => setForm(prev => ({ ...prev, amount_paid: val }))}
                />
              </View>

              {/* Payment Method Chips */}
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.chipsRow}>
                {paymentMethods.map(m => {
                  const Icon = m.icon;
                  const selected = form.payment_method === m.label;
                  return (
                    <AppPressable
                      key={m.label}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setForm(prev => ({ ...prev, payment_method: m.label }))}
                    >
                      <Icon size={14} color={selected ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{m.label}</Text>
                    </AppPressable>
                  );
                })}
              </View>

              {/* Balance Due Preview */}
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Balance Due:</Text>
                <Text style={[styles.balanceValue, balanceRemaining > 0 && styles.balanceValueWarning]}>
                  {formatCurrency(balanceRemaining)}
                </Text>
              </View>
            </View>

            <Button
              label={loading ? 'Recording...' : 'Complete & Record Sale'}
              onPress={handleSubmitSale}
              loading={loading}
              variant="primary"
              style={styles.actionBtn}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  stepContainer: { width: '100%' },
  actionBtn: { width: '100%', height: 50, marginTop: spacing.md },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md,
    alignSelf: 'flex-start', paddingVertical: 4,
  },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  paymentCard: {
    backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#E2E8F0', ...shadow.card,
  },
  paymentCardTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  inputGroup: { marginBottom: spacing.sm },
  amountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  payFullText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  amountInput: {
    backgroundColor: '#F8FAFC', color: colors.textPrimary, fontSize: 16, fontWeight: '700',
    paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: '#CBD5E1',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipSelected: { backgroundColor: '#EFF6FF', borderColor: colors.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: '700' },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  balanceLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  balanceValue: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  balanceValueWarning: { color: '#DC2626' },
});
