import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, ActivityIndicator } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { supabase } from '../../lib/supabase';
import { TechnicianSummary } from '../../types/user';
import { colors, typography, spacing, radius } from '../../tokens';

interface TechnicianPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (technicianId: string, technicianName: string) => void;
}

const TechRow = React.memo(function TechRow({ 
  item, 
  onSelect 
}: { 
  item: TechnicianSummary, 
  onSelect: (id: string, name: string) => void 
}) {
  const handlePress = useCallback(() => {
    onSelect(item.id, item.name);
  }, [item.id, item.name, onSelect]);

  return (
    <AppPressable style={styles.techRow} onPress={handlePress}>
      <Text style={styles.techName}>{item.name}</Text>
    </AppPressable>
  );
});

export default function TechnicianPicker({ visible, onClose, onSelect }: TechnicianPickerProps) {
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTechnicians = useCallback(async (cancelled = false) => {
    if (!cancelled) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email')
        .eq('role', 'technician')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (cancelled) return;
      if (!error && data) {
        setTechnicians(data as TechnicianSummary[]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (visible) {
      fetchTechnicians(cancelled);
    }
    return () => { cancelled = true; };
  }, [visible, fetchTechnicians]);

  const renderTechItem = useCallback(({ item }: { item: TechnicianSummary }) => (
    <TechRow item={item} onSelect={onSelect} />
  ), [onSelect]);

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Assign Technician</Text>
            <AppPressable onPress={onClose}><Text style={styles.closeBtn}>Close</Text></AppPressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ margin: 20 }} />
          ) : technicians.length === 0 ? (
            <Text style={styles.emptyText}>No active technicians available.</Text>
          ) : (
            <FlatList
              data={technicians}
              keyExtractor={(item) => item.id}
              renderItem={renderTechItem}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28, 28, 30, 0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  title: { color: colors.textPrimary, ...typography.h2 },
  closeBtn: { color: colors.error, ...typography.bodyBold },
  emptyText: { color: colors.error, textAlign: 'center', padding: spacing.xl },
  techRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  techName: { color: colors.textPrimary, ...typography.bodyBold },
});
