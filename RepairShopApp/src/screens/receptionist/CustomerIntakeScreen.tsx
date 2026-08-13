import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { User, Phone, Mail, Laptop, Tag, FileText } from 'lucide-react-native';

import { NewJobFormValues } from '../../types/job';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import SectionLabel from '../../components/common/SectionLabel';
import Button from '../../components/common/Button';
import SegmentedControl from '../../components/shared/SegmentedControl';
import Dropdown from '../../components/shared/Dropdown';
import CreatableDropdown from '../../components/shared/CreatableDropdown';
import ScreenScrollView from '../../components/common/ScreenScrollView';
import { useAppConfig } from '../../context/AppConfigContext';
import { colors, radius, spacing, typography } from '../../tokens';

type JobTypeCatalogItem = {
  id: string;
  title: string;
  customer_charge_amount: number;
  technician_incentive: number;
};

export default function CustomerIntakeScreen() {
  const navigation = useNavigation<any>();
  const { config } = useAppConfig();

  const [catalogItems, setCatalogItems] = useState<JobTypeCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [deviceTypes, setDeviceTypes] = useState<{label: string, value: string}[]>([]);

  const [form, setForm] = useState<NewJobFormValues>({
    customer_name: '',
    customer_contact: '',
    customer_email: '',
    customer_gstin: '',
    device_type: 'Laptop',
    reported_issue: '',
    remarks: '',
    job_type: 'Inhouse',
    job_type_ref_id: '',
    job_type_title: '',
    customer_charge_amount: 0,
    snap_technician_incentive: 0,
    priority: 'Normal',
    technician_id: '',
  });

  const [focusField, setFocusField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewJobFormValues, string>>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const { data, error } = await supabase
          .from('job_types')
          .select('id, title, customer_charge_amount, technician_incentive')
          .eq('is_active', true)
          .order('title', { ascending: true });

        if (error) {
          console.error('Error fetching job types catalog:', error.message);
        } else if (isMounted && data) {
          setCatalogItems(data as JobTypeCatalogItem[]);
        }

        const { data: dtData, error: dtError } = await supabase.rpc('get_unique_device_types');
        if (dtError) {
          console.error('Error fetching device types:', dtError.message);
        } else if (isMounted && dtData) {
          setDeviceTypes(dtData.map((d: any) => ({ label: d.device_type, value: d.device_type })));
        }
      } finally {
        if (isMounted) setCatalogLoading(false);
      }
    };

    fetchCatalog();
    return () => { isMounted = false; };
  }, []);

  const updateForm = (key: keyof NewJobFormValues, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSelectJobTypeCatalog = (catalogId: string) => {
    const selected = catalogItems.find(item => item.id === catalogId);
    if (selected) {
      setForm(prev => ({
        ...prev,
        job_type_ref_id: selected.id,
        job_type_title: selected.title,
        customer_charge_amount: Number(selected.customer_charge_amount || 0),
        snap_technician_incentive: Number(selected.technician_incentive || 0),
      }));
    } else {
      setForm(prev => ({
        ...prev,
        job_type_ref_id: '',
        job_type_title: '',
        customer_charge_amount: 0,
        snap_technician_incentive: 0,
      }));
    }
  };

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!form.customer_name.trim())    errors.customer_name    = 'Customer name is required';
    if (!form.customer_contact.trim()) errors.customer_contact = 'Contact number is required';
    if (!form.reported_issue.trim())   errors.reported_issue   = 'Reported issue is required';

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    if (form.customer_gstin?.trim() && !gstinRegex.test(form.customer_gstin.trim())) {
      errors.customer_gstin = 'Warning: GSTIN format is non-standard (should be 15 chars e.g. 22AAAAA0000A1Z5)';
    }

    setFieldErrors(errors);
    // Only required fields block submission
    return Boolean(form.customer_name.trim() && form.customer_contact.trim() && form.reported_issue.trim());
  };

  const handleNext = () => {
    if (!validate()) return;
    navigation.navigate('JobAssignment', { formState: form });
  };

  const renderField = (
    key: keyof NewJobFormValues,
    label: string,
    icon: React.ReactNode,
    options: any = {},
  ) => {
    const isFocused = focusField === key;
    const error = fieldErrors[key];
    const isWarning = key === 'customer_gstin' && error?.startsWith('Warning');
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[
          styles.inputContainer,
          isFocused  && styles.inputFocused,
          error && !isWarning && styles.inputError,
          options.multiline && styles.inputMultiline,
        ]}>
          {icon}
          <TextInput
            style={[styles.input, options.multiline && { minHeight: 72, textAlignVertical: 'top' }]}
            placeholderTextColor={colors.textMuted}
            value={form[key] ? String(form[key]) : ''}
            onChangeText={(v) => updateForm(key, v)}
            onFocus={() => setFocusField(key)}
            onBlur={() => setFocusField(null)}
            {...options}
          />
        </View>
        {error && <Text style={[styles.errorText, isWarning && { color: colors.warning }]}>{error}</Text>}
      </View>
    );
  };

  const dropdownOptions = [
    { label: 'None / Generic Repair', value: '' },
    ...catalogItems.map(item => ({
      label: `${item.title} (₹${item.customer_charge_amount})`,
      value: item.id,
    }))
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="New Job" showBack={false} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScreenScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeaderBg}>
            <SectionLabel title="CUSTOMER DETAILS" />
          </View>
          <View style={styles.card}>
            {renderField('customer_name',    'Customer Name *',    <User     size={18} color={colors.textMuted} style={styles.inputIcon} />)}
            {renderField('customer_contact', 'Contact Number *',   <Phone    size={18} color={colors.textMuted} style={styles.inputIcon} />, { keyboardType: 'phone-pad' })}
            {renderField('customer_email',   'Email (optional)',   <Mail     size={18} color={colors.textMuted} style={styles.inputIcon} />, { keyboardType: 'email-address', autoCapitalize: 'none' })}
            {renderField('customer_gstin',   'GSTIN (optional)',   <FileText size={18} color={colors.textMuted} style={styles.inputIcon} />, { autoCapitalize: 'characters', maxLength: 15, placeholder: 'e.g. 22AAAAA0000A1Z5' })}
          </View>

          <View style={styles.sectionHeaderBg}>
            <SectionLabel title="SERVICE / JOB CATALOG" />
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Job Service Type</Text>
            <Dropdown
              options={dropdownOptions}
              selectedValue={form.job_type_ref_id || ''}
              onSelect={(val) => handleSelectJobTypeCatalog(val)}
              placeholder={catalogLoading ? "Loading catalog..." : "Select Service/Job Type"}
              icon={<Tag size={18} color={colors.textMuted} />}
            />
            {form.job_type_title ? (
              <View style={styles.catalogInfoBadge}>
                <Text style={styles.catalogInfoText}>
                  Starting Base Charge: ₹{form.customer_charge_amount} | Tech Incentive: ₹{form.snap_technician_incentive}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionHeaderBg}>
            <SectionLabel title="DEVICE & ISSUE" />
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Device Type</Text>
            <CreatableDropdown
              options={deviceTypes.length > 0 ? deviceTypes : [
                { label: 'PC', value: 'PC' },
                { label: 'Laptop', value: 'Laptop' },
                { label: 'Printer', value: 'Printer' },
                { label: 'Camera', value: 'Camera' },
                { label: 'Mobile', value: 'Mobile' }
              ]}
              selectedValue={form.device_type}
              onSelect={(val) => updateForm('device_type', val)}
              placeholder="Search or add a device type..."
              icon={<Laptop size={18} color={colors.textMuted} />}
            />

            {renderField('reported_issue', 'Reported Issue *', null, { multiline: true })}
            {renderField('remarks',        'Remarks (optional)', null, { multiline: true })}
          </View>

          <View style={styles.sectionHeaderBg}>
            <SectionLabel title="DELIVERY & PRIORITY" />
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Service Location</Text>
            <SegmentedControl
              options={config.serviceLocations.map(l => ({
                label: l.id,
                value: l.id,
                activeBgColor: colors.primary
              }))}
              selectedValue={form.job_type}
              onValueChange={(val) => updateForm('job_type', val)}
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <SegmentedControl
              options={config.priorities.map(p => ({
                label: p.id,
                value: p.id,
                activeBgColor: p.color_hex || colors.statusInProgressFg
              }))}
              selectedValue={form.priority}
              onValueChange={(val) => updateForm('priority', val)}
            />
          </View>

          <Button
            label="Next"
            onPress={handleNext}
            style={styles.submitBtn}
          />
        </ScreenScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingTop: spacing.xs,
  },
  sectionHeaderBg: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  fieldGroup: { marginBottom: spacing.xs },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputMultiline: {
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  inputIcon: { marginRight: spacing.sm, flexShrink: 0 },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 48,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
  catalogInfoBadge: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.accentGreen + '15',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentGreen + '40',
  },
  catalogInfoText: {
    ...typography.caption,
    color: colors.accentGreen,
    fontWeight: '600',
  },
  submitBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.primary,
  },
});
