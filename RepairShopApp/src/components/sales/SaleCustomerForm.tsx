import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '../../tokens';

type FormState = {
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  customer_gstin: string;
};

interface Props {
  form: FormState;
  errors: Record<string, string>;
  onChange: (updates: Partial<FormState>) => void;
}

export function SaleCustomerForm({ form, errors, onChange }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Customer Details</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Customer Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          placeholderTextColor={colors.textMuted}
          value={form.customer_name}
          onChangeText={value => onChange({ customer_name: value })}
        />
        {errors.customer_name ? <Text style={styles.errorText}>{errors.customer_name}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Contact Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 9876543210"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={form.customer_contact}
          onChangeText={value => onChange({ customer_contact: value })}
        />
        {errors.customer_contact ? <Text style={styles.errorText}>{errors.customer_contact}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. john@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.customer_email}
          onChangeText={value => onChange({ customer_email: value })}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>GSTIN (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 22AAAAA0000A1Z5"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={15}
          value={form.customer_gstin}
          onChangeText={value => onChange({ customer_gstin: value })}
        />
        {errors.customer_gstin ? (
          <Text style={[styles.errorText, { color: colors.warning }]}>{errors.customer_gstin}</Text>
        ) : null}
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
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
});
