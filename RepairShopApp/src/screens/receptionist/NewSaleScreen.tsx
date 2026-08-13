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
import { createWhatsAppUrl } from '@repairshop/shared';
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
};

type InventorySuggestion = {
  id: string;
  product_id: string;
  item_name: string;
  quantity: number;
  cost_price: number;
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
  product_id: null, item_name: '', quantity: 1, unit_price: 0,
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
        customer_name: '',
        customer_contact: '',
        customer_email: '',
        customer_gstin: '',
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
    }
  );

  const { loading, createdSale, form, items, errors, activeItemIndex, inventorySuggestions, inventoryLoading } = state;

  const subtotal = useMemo(
    () => items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0),
    [items],
  );
  const discountValue = Number(form.discount || 0);
  const taxPercent    = Number(form.tax_percent || 0);
  const totalAmount   = Math.max(subtotal - discountValue, 0) * (1 + taxPercent / 100);

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
            .select('id, product_id, quantity_cached, purchase_rate, products!inner(name, unit)')
            .ilike('products.name', `%${searchTerm}%`)
            .limit(8);
          if (!isCurrent) return;
          if (error) { setState({ inventorySuggestions: [] }); return; }
          const mapped = (data || []).map((row: any) => ({
            id: row.id, product_id: row.product_id,
            item_name: row.products?.name || 'Unknown',
            quantity: row.quantity_cached, cost_price: row.purchase_rate,
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
    updateItem(index, { product_id: suggestion.product_id, item_name: suggestion.item_name, unit_price: Number(suggestion.cost_price || 0) });
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
      items: [emptyItem()], errors: {}, activeItemIndex: null, inventorySuggestions: []
    });
  };

  const handleWhatsAppInvoice = async () => {
    const msg = `Hello ${form.customer_name.trim()}, your RepairShop invoice for Sale ${createdSale?.sale_code || ''} is ready.\n\nSub Total: ${currency.format(subtotal)}\nDiscount: ${currency.format(discountValue)}\nTax: ${taxPercent}%\n*Grand Total: ${currency.format(createdSale?.total_amount ?? totalAmount)}*\n\nThank you for choosing RepairShop.`;
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
      const saleItems = (createdSale.sale_items || items)
        .filter((i: any) => String(i.item_name || '').trim())
        .map((i: any) => ({ description: String(i.item_name), hsn: '', price: Number(i.unit_price), unit: Number(i.quantity) }));
      await printInvoice({
        docType: 'sale', invoiceNo: createdSale.sale_code,
        date: createdSale.created_at || new Date().toISOString(),
        customer: { name: createdSale.customer_name, gst: createdSale.customer_gstin || undefined, phone: createdSale.customer_contact, address: 'Silchar, Assam' },
        items: saleItems.length > 0 ? saleItems : [{ description: 'Sale Items', hsn: '', price: Number(createdSale.total_amount || 0), unit: 1 }],
        taxRatePct: Number(createdSale.tax_percent || 18),
        discount: Number(createdSale.discount || 0),
      });
    } catch (e: any) { showToast({ title: 'Print Failed', message: e.message, type: 'error' }); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) { showToast({ title: 'Authentication required', message: 'Please sign in again.', type: 'error' }); return; }

    setState({ loading: true });
    try {
      let saleCode = '';
      try {
        const { data, error: rpcError } = await supabase.rpc('generate_sale_code');
        if (!rpcError && data) saleCode = data;
      } catch { /* fallback below */ }
      if (!saleCode) saleCode = `SALE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const salePayload: any = {
        sale_code: saleCode, invoice_number: saleCode,
        customer_name: form.customer_name.trim(), customer_contact: form.customer_contact.trim(),
        customer_email: form.customer_email.trim() || null, customer_gstin: form.customer_gstin.trim() || null,
        status: form.status, payment_method: form.payment_method, payment_mode: form.payment_method?.toLowerCase() || 'cash',
        discount: discountValue, tax_percent: taxPercent, total_amount: totalAmount, grand_total: totalAmount,
        notes: form.notes.trim() || null, created_by: user.id,
        paid_at: form.status === 'Paid' ? new Date().toISOString() : null,
      };

      let sale: any = null, saleError: any = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const res = await supabase.from('sales').insert(salePayload).select('*').single();
        if (!res.error) { sale = res.data; saleError = null; break; }
        saleError = res.error;
        const missingColMatch = res.error.message?.match(/Could not find the '([^']+)' column/i);
        if (missingColMatch?.[1]) { delete salePayload[missingColMatch[1]]; } else { break; }
      }
      if (saleError) throw saleError;

      const saleItems = items.map((item: any) => {
        if (!item.product_id) throw new Error(`Product must be selected from dropdown for ${item.item_name || 'an item'}`);
        return { sale_id: sale.id, product_id: item.product_id, item_name: item.item_name.trim(), quantity: Number(item.quantity), unit_price: Number(item.unit_price) };
      });
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      setState({
        createdSale: {
          id: sale.id, sale_code: sale.sale_code || sale.invoice_number || saleCode,
          created_at: sale.created_at || new Date().toISOString(),
          total_amount: Number(sale.total_amount || sale.grand_total || totalAmount),
          customer_name: form.customer_name.trim(), customer_contact: form.customer_contact.trim(),
          customer_gstin: form.customer_gstin.trim() || null,
          tax_percent: taxPercent, discount: discountValue, sale_items: saleItems,
        }
      });
      showToast({ title: 'Sale created', message: sale.sale_code || saleCode, type: 'success' });
    } catch (err: any) {
      let msg = err instanceof Error ? err.message : err?.message || err?.details;
      if (!msg) { try { msg = JSON.stringify(err); } catch { msg = 'Failed to create sale'; } }
      showToast({ title: 'Sale failed', message: msg, type: 'error' });
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
          totalAmount={Number(createdSale.total_amount || totalAmount)}
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
          subtotal={subtotal}
          discountValue={discountValue}
          taxPercent={taxPercent}
          totalAmount={totalAmount}
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
