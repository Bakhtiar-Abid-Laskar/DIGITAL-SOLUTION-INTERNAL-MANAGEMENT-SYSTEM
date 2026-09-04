import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, FlatList,  } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '../../tokens';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
}

const DropdownRow = React.memo(function DropdownRow({ 
  item, 
  isSelected, 
  onSelectOption 
}: { 
  item: DropdownOption, 
  isSelected: boolean, 
  onSelectOption: (val: string) => void 
}) {
  const handlePress = useCallback(() => {
    onSelectOption(item.value);
  }, [item.value, onSelectOption]);

  return (
    <AppPressable style={styles.optionRow} onPress={handlePress}>
      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
        {item.label}
      </Text>
      {isSelected && <Check size={20} color={colors.primary} />}
    </AppPressable>
  );
});

export default function Dropdown({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select...',
  icon,
  error,
  disabled = false,
}: DropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(o => o.value === selectedValue);

  const handleSelectOption = useCallback((val: string) => {
    onSelect(val);
    setModalVisible(false);
  }, [onSelect]);

  const renderDropdownItem = useCallback(({ item }: { item: DropdownOption }) => {
    const isSelected = item.value === selectedValue;
    return (
      <DropdownRow 
        item={item} 
        isSelected={isSelected} 
        onSelectOption={handleSelectOption} 
      />
    );
  }, [selectedValue, handleSelectOption]);

  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      {label && (
        <Text style={[styles.label, disabled && styles.disabledText]}>
          {label}
          {label.includes('*') && <Text style={styles.asterisk}> *</Text>}
        </Text>
      )}
      <AppPressable 
        style={[
          styles.inputBox,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
        ]} 
        onPress={() => {
          if (!disabled) setModalVisible(true);
        }}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        <View style={styles.inputLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.valueText, !selectedOption && styles.placeholderText, disabled && styles.disabledText]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <ChevronDown size={20} color={disabled ? colors.textMuted : colors.textSecondary} />
      </AppPressable>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={modalVisible && !disabled} transparent={true} animationType="fade">
        <AppPressable style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={renderDropdownItem}
            />
          </View>
        </AppPressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  label: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  asterisk: {
    color: colors.error,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  inputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  valueText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  disabledText: {
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,27,24,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '60%',
    paddingBottom: spacing.xxl,
    ...shadow.card,
  },
  modalHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
