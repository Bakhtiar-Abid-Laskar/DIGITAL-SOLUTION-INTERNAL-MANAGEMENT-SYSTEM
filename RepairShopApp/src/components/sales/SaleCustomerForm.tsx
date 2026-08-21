import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '../../tokens';
import { CustomerTypeaheadMobile } from '../customers/CustomerTypeaheadMobile';
import { Customer } from '@repairshop/shared';

export type SaleCustomerFormState = {
  customer_id?: string | null;
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  customer_gstin: string;
  customer_address: string;
};

interface Props {
  form: SaleCustomerFormState;
  errors: Record<string, string>;
  onChange: (updates: Partial<SaleCustomerFormState>) => void;
}

export function SaleCustomerForm({ form, errors, onChange }: Props) {
  const handleCustomerSelected = (cust: Customer) => {
    onChange({
      customer_id: cust.id,
      customer_name: cust.name,
      customer_contact: cust.phone || form.customer_contact,
      customer_email: cust.email || form.customer_email,
      customer_gstin: cust.gstin || form.customer_gstin,
      customer_address: cust.address || form.customer_address,
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Customer Details</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Customer Name *</Text>
        <CustomerTypeaheadMobile
          name={form.customer_name}
          selectedCustomerId={form.customer_id}
          onChangeName={(val) => onChange({ customer_name: val, customer_id: null })}
          onSelectCustomer={handleCustomerSelected}
          onClearCustomer={() => onChange({ customer_id: null })}
          error={errors.customer_name}
          placeholder="Search existing customer or enter name..."
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Contact Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 9876543210"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={form.customer_contact}
          onChangeText={(value) => onChange({ customer_contact: value })}
        />
        {errors.customer_contact ? <Text style={styles.errorText}>{errors.customer_contact}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. john@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.customer_email}
          onChangeText={(value) => onChange({ customer_email: value })}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>GSTIN (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 18AABCU9603R1ZM"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={15}
          value={form.customer_gstin}
          onChangeText={(value) => onChange({ customer_gstin: value })}
        />
        {errors.customer_gstin ? (
          <Text style={[styles.errorText, { color: colors.warning }]}>{errors.customer_gstin}</Text>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Billing & Delivery Address (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter physical address..."
          placeholderTextColor={colors.textMuted}
          multiline={true}
          numberOfLines={2}
          value={form.customer_address}
          onChangeText={(value) => onChange({ customer_address: value })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
});
