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
import { User, Phone, Mail, Laptop, Tag, FileText, MapPin } from 'lucide-react-native';

import { NewJobFormValues } from '../../types/job';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import SectionLabel from '../../components/common/SectionLabel';
import Button from '../../components/common/Button';
import SegmentedControl from '../../components/shared/SegmentedControl';
import Dropdown from '../../components/shared/Dropdown';
import CreatableDropdown from '../../components/shared/CreatableDropdown';
import ScreenScrollView from '../../components/common/ScreenScrollView';
import { CustomerTypeaheadMobile } from '../../components/customers/CustomerTypeaheadMobile';
import { useAppConfig } from '../../context/AppConfigContext';
import { useToast } from '../../context/ToastContext';
import { colors, radius, spacing, typography } from '../../tokens';
import { validateAndNormalizeIndianPhone, formatPhoneInput } from '@repairshop/shared';

type JobTypeCatalogItem = {
  id: string;
  title: string;
  customer_charge_amount: number;
  technician_incentive: number;
};

export default function CustomerIntakeScreen() {
  const navigation = useNavigation<any>();
  const { config } = useAppConfig();
  const { showToast } = useToast();
  const scrollViewRef = React.useRef<any>(null);

  const [catalogItems, setCatalogItems] = useState<JobTypeCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [deviceTypes, setDeviceTypes] = useState<{label: string, value: string}[]>([]);

  const [form, setForm] = useState<NewJobFormValues>({
    customer_id: null,
    customer_name: '',
    customer_contact: '',
    customer_email: '',
    customer_gstin: '',
    customer_address: '',
    device_type_id: 'laptop',  // default to the standard 'laptop' ui_device_types.id
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

  const fetchCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_types')
        .select('id, title, customer_charge_amount, technician_incentive')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (error) {
        console.error('Error fetching job types catalog:', error.message);
      } else if (data) {
        setCatalogItems(data as JobTypeCatalogItem[]);
      }

      // Load device types from lookup table; store id as value (FK reference)
      const { data: dtData, error: dtError } = await supabase
        .from('ui_device_types')
        .select('id, label')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (dtError) {
        console.error('Error fetching device types:', dtError.message);
      } else if (dtData) {
        setDeviceTypes(dtData.map((d: any) => ({ label: d.label || d.id, value: d.id })));
      }
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const updateForm = (key: keyof NewJobFormValues, value: any) => {
    let finalVal = value;
    if (key === 'customer_contact') {
      finalVal = formatPhoneInput(value);
    }
    setForm(prev => ({ ...prev, [key]: finalVal }));
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
    const missingFields: string[] = [];

    if (!form.customer_name.trim()) {
      errors.customer_name = 'Customer name is required';
      missingFields.push('Customer Name');
    }
    
    const phoneCheck = validateAndNormalizeIndianPhone(form.customer_contact);
    if (!phoneCheck.isValid) {
      const msg = phoneCheck.error || 'Valid 10-digit Indian phone number required';
      errors.customer_contact = msg;
      missingFields.push(msg);
    }

    if (!form.reported_issue.trim()) {
      errors.reported_issue = 'Reported issue is required';
      missingFields.push('Reported Issue');
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    if (form.customer_gstin?.trim() && !gstinRegex.test(form.customer_gstin.trim())) {
      errors.customer_gstin = 'Warning: GSTIN format is non-standard (should be 15 chars e.g. 22AAAAA0000A1Z5)';
    }

    setFieldErrors(errors);

    const isValid = Boolean(form.customer_name.trim() && phoneCheck.isValid && form.reported_issue.trim());

    if (!isValid) {
      scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
      showToast({
        title: 'Required Information Needed',
        message: `Please fill in: ${missingFields.join(' • ')}`,
        type: 'error',
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    const phoneCheck = validateAndNormalizeIndianPhone(form.customer_contact);
    navigation.navigate('JobAssignment', { 
      formState: {
        ...form,
        customer_name: form.customer_name.trim(),
        customer_contact: phoneCheck.isValid ? phoneCheck.e164 : form.customer_contact.trim(),
        customer_email: form.customer_email.trim(),
        customer_gstin: form.customer_gstin?.trim(),
        customer_address: form.customer_address?.trim(),
        reported_issue: form.reported_issue.trim(),
        remarks: form.remarks.trim(),
        priority: form.priority || 'Normal',
        job_type: form.job_type || 'Inhouse',
      } 
    });
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
        <ScreenScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeaderBg}>
            <SectionLabel title="CUSTOMER DETAILS" />
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Customer Name *</Text>
            <CustomerTypeaheadMobile
              name={form.customer_name}
              selectedCustomerId={form.customer_id}
              onChangeName={(val) => {
                updateForm('customer_name', val);
                if (form.customer_id) updateForm('customer_id', null);
              }}
              onSelectCustomer={(cust) => {
                setForm((prev) => ({
                  ...prev,
                  customer_id: cust.id,
                  customer_name: cust.name,
                  customer_contact: cust.phone ? formatPhoneInput(cust.phone) : prev.customer_contact,
                  customer_email: cust.email || prev.customer_email,
                  customer_gstin: cust.gstin || prev.customer_gstin,
                  customer_address: cust.address || prev.customer_address,
                }));
                if (fieldErrors.customer_name) setFieldErrors((prev) => ({ ...prev, customer_name: undefined }));
                if (fieldErrors.customer_contact) setFieldErrors((prev) => ({ ...prev, customer_contact: undefined }));
              }}
              onClearCustomer={() => updateForm('customer_id', null)}
              error={fieldErrors.customer_name}
            />

            {renderField('customer_contact', 'Contact Number *',   <Phone    size={18} color={colors.textMuted} style={styles.inputIcon} />, { keyboardType: 'phone-pad', placeholder: '+91 98765 43210' })}
            {renderField('customer_email',   'Email (optional)',   <Mail     size={18} color={colors.textMuted} style={styles.inputIcon} />, { keyboardType: 'email-address', autoCapitalize: 'none' })}
            {renderField('customer_gstin',   'GSTIN (optional)',   <FileText size={18} color={colors.textMuted} style={styles.inputIcon} />, { autoCapitalize: 'characters', maxLength: 15, placeholder: 'e.g. 22AAAAA0000A1Z5' })}
            {renderField('customer_address', 'Billing & Delivery Address (optional)', <MapPin size={18} color={colors.textMuted} style={styles.inputIcon} />, { multiline: true, placeholder: 'Enter physical address...' })}
          </View>

          <View style={styles.sectionHeaderBg}>
            <SectionLabel title="SERVICE / JOB CATALOG (OPTIONAL)" />
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Job Service Type (Optional - Tech can assign upon diagnosis)</Text>
            <Dropdown
              options={dropdownOptions}
              selectedValue={form.job_type_ref_id || ''}
              onSelect={(val) => handleSelectJobTypeCatalog(val)}
              placeholder={catalogLoading ? "Loading catalog..." : "Select Service Type (or leave for technician)"}
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
                { label: 'PC', value: 'pc' },
                { label: 'Laptop', value: 'laptop' },
                { label: 'Printer', value: 'printer' },
                { label: 'Camera', value: 'camera' },
                { label: 'Mobile', value: 'mobile' }
              ]}
              selectedValue={form.device_type_id}
              onSelect={(val) => updateForm('device_type_id', val)}
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
              options={(config.serviceLocations && config.serviceLocations.length > 0) ? config.serviceLocations.map(l => ({
                label: l.id,
                value: l.id,
                activeBgColor: colors.primary
              })) : [
                { label: 'Inhouse', value: 'Inhouse', activeBgColor: colors.primary },
                { label: 'Onsite', value: 'Onsite', activeBgColor: colors.primary },
              ]}
              selectedValue={form.job_type}
              onValueChange={(val) => updateForm('job_type', val)}
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <SegmentedControl
              options={(config.priorities && config.priorities.length > 0) ? config.priorities.map(p => ({
                label: p.id,
                value: p.id,
                activeBgColor: p.id === 'Urgent' ? colors.statusUrgentFg : p.id === 'High' ? colors.statusInProgressFg : colors.primary
              })) : [
                { label: 'Normal', value: 'Normal', activeBgColor: colors.primary },
                { label: 'High', value: 'High', activeBgColor: colors.statusInProgressFg },
                { label: 'Urgent', value: 'Urgent', activeBgColor: colors.statusUrgentFg },
              ]}
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
