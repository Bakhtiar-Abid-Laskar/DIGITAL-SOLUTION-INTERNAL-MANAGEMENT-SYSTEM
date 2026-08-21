import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Customer } from '@repairshop/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { AppPressable } from '../common/AppPressable';
import { Search, User, Phone, CheckCircle2, X, Briefcase, ShoppingBag } from 'lucide-react-native';

interface CustomerTypeaheadMobileProps {
  name: string;
  selectedCustomerId?: string | null;
  onChangeName: (name: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer?: () => void;
  placeholder?: string;
  error?: string;
}

export function CustomerTypeaheadMobile({
  name,
  selectedCustomerId,
  onChangeName,
  onSelectCustomer,
  onClearCustomer,
  placeholder = "Search existing customer or enter name...",
  error,
}: CustomerTypeaheadMobileProps) {
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('search_customers', {
        p_query: query.trim(),
        p_limit: 5,
      });

      if (rpcError) throw rpcError;
      setResults((data || []) as Customer[]);
      setIsOpen(true);
    } catch (err) {
      console.error('Error searching customers on mobile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (val: string) => {
    onChangeName(val);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (val.trim().length >= 2) {
      timeoutRef.current = setTimeout(() => {
        fetchResults(val);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsOpen(false);
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <User size={18} color={colors.textMuted} style={styles.leadingIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (name.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          autoCapitalize="words"
        />

        {selectedCustomerId ? (
          <View style={styles.existingBadge}>
            <CheckCircle2 size={12} color={colors.success} />
            <Text style={styles.existingText}>Existing</Text>
            {onClearCustomer && (
              <AppPressable onPress={onClearCustomer} style={styles.clearBtn}>
                <X size={12} color={colors.textSecondary} />
              </AppPressable>
            )}
          </View>
        ) : loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.trailingIcon} />
        ) : (
          <Search size={16} color={colors.textMuted} style={styles.trailingIcon} />
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Floating Suggestions List */}
      {isOpen && results.length > 0 && (
        <View style={styles.dropdownCard}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>Matching Customers</Text>
            <AppPressable onPress={() => setIsOpen(false)}>
              <X size={14} color={colors.textMuted} />
            </AppPressable>
          </View>

          {results.map((cust) => (
            <AppPressable
              key={cust.id}
              style={styles.resultItem}
              onPress={() => handleSelect(cust)}
            >
              <View style={styles.resultMain}>
                <Text style={styles.resultName} numberOfLines={1}>{cust.name}</Text>
                <View style={styles.resultDetailsRow}>
                  {cust.phone ? (
                    <Text style={styles.resultPhone}>Ph: {cust.phone}</Text>
                  ) : null}
                  {cust.address ? (
                    <Text style={styles.resultAddress} numberOfLines={1}> · {cust.address}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.badgesRow}>
                {Number(cust.total_jobs || 0) > 0 && (
                  <View style={styles.activityBadge}>
                    <Briefcase size={10} color={colors.textSecondary} />
                    <Text style={styles.badgeText}>{cust.total_jobs}</Text>
                  </View>
                )}
                {Number(cust.total_sales || 0) > 0 && (
                  <View style={styles.activityBadge}>
                    <ShoppingBag size={10} color={colors.textSecondary} />
                    <Text style={styles.badgeText}>{cust.total_sales}</Text>
                  </View>
                )}
              </View>
            </AppPressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  leadingIcon: {
    marginRight: spacing.sm,
  },
  trailingIcon: {
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    ...typography.body,
    color: colors.textPrimary,
  },
  existingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  existingText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    fontSize: 11,
  },
  clearBtn: {
    marginLeft: 2,
    padding: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  dropdownCard: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownHeaderText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  resultName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  resultPhone: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  resultAddress: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
