import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import AppHeader from '../../components/common/AppHeader';
import Button from '../../components/common/Button';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { createWhatsAppUrl, calculateGrandTotal } from '@repairshop/shared';
import { printInvoice } from '../../lib/invoiceService';

import { SaleCustomerForm } from '../../components/sales/SaleCustomerForm';
import { SaleItemsList } from '../../components/sales/SaleItemsList';
import { SalePaymentForm } from '../../components/sales/SalePaymentForm';
import { SaleSuccessCard } from '../../components/sales/SaleSuccessCard';

type SaleStatus = 'Draft' | 'Paid' | 'Cancelled';
type SalePaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

type SaleItem = {
  clientId?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  product_id: string | null;
  serial_number?: string;
};

type InventorySuggestion = {
  id: string;
  product_id: string;
  item_name: string;
  quantity: number;
  selling_rate: number;
  unit?: string | null;
};

type CreatedSale = {
  id: string;
  sale_code: string;
  created_at: string;
  total_amount: number;
  customer_name: string;
  customer_contact: string;
  customer_gstin?: string | null;
  tax_percent?: number | null;
  discount?: number | null;
  sale_items?: { item_name: string; quantity: number; unit_price: number }[] | null;
};

const emptyItem = (): SaleItem => ({
  clientId: Math.random().toString(36).substr(2, 9),
  product_id: null, item_name: '', quantity: 1, unit_price: 0, serial_number: '',
});

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function NewSaleScreen() {
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
  const { user } = useAuth();
  const { showToast } = useToast();
  const { config } = useAppConfig();

  const [state, setState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      loading: false,
      createdSale: null as CreatedSale | null,
      form: {
        customer_id: null as string | null,
        customer_name: '',
        customer_contact: '',
        customer_email: '',
        customer_gstin: '',
        customer_address: '',
        status: 'Paid' as SaleStatus,
        payment_method: 'Cash' as SalePaymentMethod,
        discount: '0',
        tax_percent: '0',
        notes: '',
      },
      items: [emptyItem()] as SaleItem[],
      errors: {} as Record<string, string>,
      activeItemIndex: null as number | null,
      inventorySuggestions: [] as InventorySuggestion[],
      inventoryLoading: false,
      previewTotals: { subtotal: 0, totalTax: 0, grandTotal: 0 },
    }
  );

  const { loading, createdSale, form, items, errors, activeItemIndex, inventorySuggestions, inventoryLoading, previewTotals } = state;

  const discountValue = Number(form.discount || 0);
  const taxPercent = Number(form.tax_percent || 0);

  // Live total preview via RPC (matches website exactly)
  useEffect(() => {
    let isCurrent = true;
    const runPreview = async () => {
      const payloadItems = items
        .filter((i: any) => i.item_name.trim() && i.quantity && i.unit_price)
        .map((i: any) => ({
          product_id: i.product_id || null,
          item_name: i.item_name.trim(),
          quantity: Number(i.quantity) || 1,
          selling_rate: Number(i.unit_price) || 0,
          cgst_rate: i.product_id ? null : taxPercent / 2,
          sgst_rate: i.product_id ? null : taxPercent / 2,
          igst_rate: i.product_id ? null : 0,
          tax_mode: i.product_id ? null : 'exclusive',
        }));

      if (payloadItems.length === 0) {
        if (isCurrent) setState({ previewTotals: { subtotal: 0, totalTax: 0, grandTotal: 0 } });
        return;
      }

      const { data, error } = await supabase.rpc('preview_invoice', {
        p_items: payloadItems,
        p_tax_regime: 'intra_state',
        p_discount: discountValue
      });

      if (!error && data && isCurrent) {
        setState({ previewTotals: { 
          subtotal: data.subtotal || 0, 
          totalTax: data.total_tax || 0, 
          grandTotal: data.grand_total || 0 
        }});
      } else if (error) {
        // Fallback if RPC fails or offline
        const sub = payloadItems.reduce((sum: number, i: any) => sum + (i.quantity * i.selling_rate), 0);
        if (isCurrent) setState({ previewTotals: { subtotal: sub, totalTax: 0, grandTotal: Math.max(0, sub - discountValue) } });
      }
    };
    
    // Slight debounce for performance
    const timeout = setTimeout(runPreview, 300);
    return () => { isCurrent = false; clearTimeout(timeout); };
  }, [items, discountValue, taxPercent]);

  // Inventory autocomplete
  useEffect(() => {
    if (activeItemIndex === null) return;
    const searchTerm = items[activeItemIndex]?.item_name.trim();
    if (!searchTerm || searchTerm.length < 2) return;

    let isCurrent = true;
    const timeoutId = setTimeout(() => {
      setState({ inventoryLoading: true });
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('inventory')
            .select('id, product_id, quantity_cached, selling_rate, products!inner(name, unit)')
            .ilike('products.name', `%${searchTerm}%`)
            .limit(8);
          if (!isCurrent) return;
          if (error) { setState({ inventorySuggestions: [] }); return; }
          const mapped = (data || []).map((row: any) => ({
            id: row.id, product_id: row.product_id,
            item_name: row.products?.name || 'Unknown',
            quantity: row.quantity_cached, selling_rate: row.selling_rate,
            unit: row.products?.unit,
          })).sort((a, b) => a.item_name.localeCompare(b.item_name));
          setState({ inventorySuggestions: mapped as InventorySuggestion[] });
        } finally {
          if (isCurrent) setState({ inventoryLoading: false });
        }
      })();
    }, 250);

    return () => { isCurrent = false; clearTimeout(timeoutId); };
  }, [activeItemIndex, items]);

  const updateItem = (index: number, updates: Partial<SaleItem>) =>
    setState({ items: items.map((item: any, i: number) => (i === index ? { ...item, ...updates } : item)) });

  const selectInventoryItem = (index: number, suggestion: InventorySuggestion) => {
    updateItem(index, { product_id: suggestion.product_id, item_name: suggestion.item_name, unit_price: Number(suggestion.selling_rate || 0) });
    setState({ inventorySuggestions: [], activeItemIndex: null });
  };

  const addItem = () => setState({ items: [...items, emptyItem()] });
  const removeItem = (index: number) => setState({ items: items.length === 1 ? items : items.filter((_: any, i: number) => i !== index) });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
    if (!form.customer_contact.trim()) newErrors.customer_contact = 'Contact number is required';
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    if (form.customer_gstin.trim() && !gstinRegex.test(form.customer_gstin.trim())) {
      newErrors.customer_gstin = 'Warning: GSTIN format is non-standard';
    }
    items.forEach((item: any, index: number) => {
      if (!item.item_name.trim()) newErrors[`item_name_${index}`] = 'Item name is required';
      if (Number(item.quantity) <= 0) newErrors[`quantity_${index}`] = 'Quantity must be greater than 0';
      if (Number(item.unit_price) < 0) newErrors[`unit_price_${index}`] = 'Price cannot be negative';
    });
    if (items.length === 0 || items.every((item: any) => !item.item_name.trim())) newErrors.items = 'Add at least one sale item';
    if (discountValue < 0) newErrors.discount = 'Discount cannot be negative';
    if (taxPercent < 0) newErrors.tax_percent = 'Tax cannot be negative';
    setState({ errors: newErrors });
    return Boolean(form.customer_name.trim() && form.customer_contact.trim() && items.some((item: any) => item.item_name.trim()));
  };

  const resetForm = () => {
    setState({
      createdSale: null,
      form: { customer_name: '', customer_contact: '', customer_email: '', customer_gstin: '', status: 'Paid', payment_method: 'Cash', discount: '0', tax_percent: '0', notes: '' },
      items: [emptyItem()], errors: {}, activeItemIndex: null, inventorySuggestions: [], previewTotals: { subtotal: 0, totalTax: 0, grandTotal: 0 }
    });
  };

  const handleWhatsAppInvoice = async () => {
    const msg = `Hello ${form.customer_name.trim()}, your RepairShop invoice for Sale ${createdSale?.sale_code || ''} is ready.\n\nSub Total: ${currency.format(previewTotals.subtotal)}\nDiscount: ${currency.format(discountValue)}\nTax: ${currency.format(previewTotals.totalTax)}\n*Grand Total: ${currency.format(createdSale?.total_amount ?? previewTotals.grandTotal)}*\n\nThank you for choosing RepairShop.`;
    const url = createWhatsAppUrl(form.customer_contact.trim(), msg);
    if (!url) { showToast({ title: 'Invalid number', message: 'Could not format number for WhatsApp.', type: 'error' }); return; }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) { showToast({ title: 'WhatsApp unavailable', message: 'WhatsApp is not installed.', type: 'error' }); return; }
      await Linking.openURL(url);
    } catch (err: unknown) {
      showToast({ title: 'WhatsApp failed', message: err instanceof Error ? err.message : 'Could not open WhatsApp.', type: 'error' });
    }
  };

  const handlePrintInvoice = async () => {
    if (!createdSale) return;
    try {
      // docType:'final' reads from invoices table — mirrors website openInvoicePrint({ docType:'final', invoiceId })
      await printInvoice({ docType: 'final', invoiceId: createdSale.id });
    } catch (e: any) { showToast({ title: 'Print Failed', message: e.message, type: 'error' }); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) { showToast({ title: 'Authentication required', message: 'Please sign in again.', type: 'error' }); return; }

    setState({ loading: true });
    try {
      // Central Customer Directory: Upsert or link customer
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

      // Build item payload matching create_invoice p_items JSONB shape (same as website)
      const payloadItems = items
        .filter((item: any) => item.item_name.trim())
        .map((item: any) => ({
          product_id:   item.product_id || null,
          item_name:    item.item_name.trim(),
          quantity:     Number(item.quantity) || 1,
          selling_rate: Number(item.unit_price) || 0,  // RPC reads 'selling_rate', not 'unit_price'
          serial_number: item.serial_number || null,
          // For inventory-linked items, RPC reads tax rates from products table automatically.
          // For custom service items (no product_id), apply half the user-entered taxPercent to CGST and SGST
          cgst_rate:    item.product_id ? null : taxPercent / 2,
          sgst_rate:    item.product_id ? null : taxPercent / 2,
          igst_rate:    item.product_id ? null : 0,
          tax_mode:     item.product_id ? null : 'exclusive',
        }));

      const { data, error } = await supabase.rpc('create_invoice', {
        p_customer_name:    form.customer_name.trim(),
        p_customer_contact: form.customer_contact.trim() || null,
        p_customer_email:   form.customer_email.trim() || null,
        p_customer_gstin:   form.customer_gstin.trim() || null,
        p_tax_regime:       'intra_state',
        p_items:            payloadItems,
        p_discount:         discountValue,
        p_payment_method:   form.payment_method,
        p_status:           form.status.toLowerCase(),  // 'paid' | 'draft'
        p_notes:            form.notes.trim() || null,
        p_job_id:           null,  // counter sale — no linked job
      });
      if (error) throw error;

      if (data?.invoice_id && customerId) {
        await supabase
          .from('invoices')
          .update({
            customer_id: customerId,
            customer_address: form.customer_address.trim() || null,
          })
          .eq('id', data.invoice_id);
      }

      setState({
        createdSale: {
          id:               data.invoice_id,
          sale_code:        data.invoice_code,   // invoice_code e.g. INV-2026-0001
          created_at:       new Date().toISOString(),
          total_amount:     previewTotals.grandTotal,          // locally computed; RPC doesn't return grand_total
          customer_name:    form.customer_name.trim(),
          customer_contact: form.customer_contact.trim(),
          customer_gstin:   form.customer_gstin.trim() || null,
          tax_percent:      taxPercent,
          discount:         discountValue,
          sale_items:       null,
        }
      });
      showToast({ title: 'Invoice created', message: data.invoice_code, type: 'success' });
    } catch (err: any) {
      let msg = err instanceof Error ? err.message : err?.message || err?.details;
      if (!msg) { try { msg = JSON.stringify(err); } catch { msg = 'Failed to create invoice'; } }
      showToast({ title: 'Invoice failed', message: msg, type: 'error' });
    } finally {
      setState({ loading: false });
    }
  };

  if (createdSale) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sale Created" />
        <SaleSuccessCard
          saleCode={createdSale.sale_code}
          totalAmount={Number(createdSale.total_amount || previewTotals.grandTotal)}
          onPrint={handlePrintInvoice}
          onWhatsApp={handleWhatsAppInvoice}
          onCreateAnother={resetForm}
          onDone={() => { setState({ createdSale: null }); navigation.navigate('ReceptionistTabs', { screen: 'Dashboard' }); }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="New Sale" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + spacing.xl }]}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Inventory matches will fill the sale price automatically.</Text>
        </View>

        <SaleCustomerForm
          form={form}
          errors={errors}
          onChange={updates => setState({ form: { ...form, ...updates } })}
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
          onFocusItem={(index) => { setState({ activeItemIndex: index, inventorySuggestions: [] }); }}
          onSelectSuggestion={selectInventoryItem}
        />

        <SalePaymentForm
          form={form}
          errors={errors}
          saleStatuses={config.saleStatuses}
          paymentMethods={config.paymentMethods}
          subtotal={previewTotals.subtotal}
          discountValue={discountValue}
          taxPercent={taxPercent}
          totalTax={previewTotals.totalTax}
          totalAmount={previewTotals.grandTotal}
          onChange={updates => setState({ form: { ...form, ...updates } })}
        />

        <Button
          label={loading ? 'Creating...' : 'Create Sale'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingTop: spacing.lg },
  banner: {
    backgroundColor: colors.accentGreen + '22', padding: spacing.md,
    marginHorizontal: spacing.lg, borderRadius: radius.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.accentGreen,
  },
  bannerText: { ...typography.caption, color: colors.accentGreen },
  submitBtn: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
});
