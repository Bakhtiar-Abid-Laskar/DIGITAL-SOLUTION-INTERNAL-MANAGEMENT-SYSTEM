import { AppPressable } from '../../components/common/AppPressable';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, 
  FlatList, Modal, Image, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord } from '../../types/attendance';
import { getAttendanceDateIST, getDateIST, formatTime, formatDate, GeofenceSettings } from '@repairshop/shared';
import { getDistanceInMeters } from '../../utils/distance';
import { getAttendanceStoragePath } from '../../utils/storagePaths';
import { getSignedUrlCached } from '@repairshop/shared';
import { mapErrorToUserMessage } from '../../utils/errorMessages';

import { CheckCircle2, ChevronRight, ChevronLeft, ChevronDown, Camera, MapPin } from 'lucide-react-native';
import AppHeader from '../../components/common/AppHeader';
import SectionLabel from '../../components/common/SectionLabel';
import LoadingState from '../../components/common/LoadingState';
import Button from '../../components/common/Button';
import SelfieCapture from '../../components/shared/SelfieCapture';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';
import BottomSheet from '../../components/common/BottomSheet';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


const AttendanceHistoryRow = React.memo(function AttendanceHistoryRow({ 
  item, 
  onPress 
}: { 
  item: AttendanceRecord, 
  onPress: (item: AttendanceRecord) => void 
}) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <AppPressable style={styles.historyCard} onPress={handlePress}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
        {item.status === 'Present' ? (
          <View style={[styles.badge, { backgroundColor: colors.statusCompletedBg }]}>
            <Text style={[styles.badgeText, { color: colors.statusCompletedFg }]}>Present</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.backgroundAlt }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.status}</Text>
          </View>
        )}
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyTime}>
          {item.check_in_time ? formatTime(item.check_in_time) : '--'} 
          {' – '} 
          {item.check_out_time
            ? formatTime(item.check_out_time)
            : item.status === 'Present'
              ? 'No checkout'
              : '--'}
        </Text>
        <ChevronRight size={16} color={colors.border} />
      </View>
    </AppPressable>
  );
});

export default function AttendanceScreen() {

  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLimit, setHistoryLimit] = useState(15);
  const [dateOffset, setDateOffset] = useState(0); // offset in days for date strip
  const [geofenceSetting, setGeofenceSetting] = useState<GeofenceSettings | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{status: 'Leave' | 'Halfday'} | null>(null);

  const todayStr = getAttendanceDateIST();
  const todayDateObj = new Date(todayStr + 'T00:00:00.000Z');

  const fetchAttendance = async () => {
    if (!user) return;
    try {
      const { data: todayData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      setTodayRecord(todayData as AttendanceRecord | null);

      const { data: historyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(historyLimit);

      setHistory(historyData as AttendanceRecord[] || []);

      const { data: geofenceData } = await supabase.from('geofence_settings').select('*').limit(1).maybeSingle();
      setGeofenceSetting(geofenceData as GeofenceSettings | null);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user, historyLimit]);

  useRealtimeSubscription('attendance', fetchAttendance, user ? `user_id=eq.${user.id}` : undefined);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const validateLocation = useCallback((lat: number, lng: number): Promise<{ proceed: boolean, atLocation: boolean }> => {
    return new Promise((resolve) => {
      if (!geofenceSetting) {
        resolve({ proceed: true, atLocation: true });
        return;
      }
      const distance = getDistanceInMeters(lat, lng, geofenceSetting.lat, geofenceSetting.lng);
      if (distance > geofenceSetting.radius) {
        Alert.alert(
          "You are not at the location",
          `Current distance: ${Math.round(distance)} meters. Do you still want to check in/out? This will mark your attendance as pending review.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve({ proceed: false, atLocation: false }) },
            { text: "Confirm", onPress: () => resolve({ proceed: true, atLocation: false }) }
          ]
        );
      } else {
        resolve({ proceed: true, atLocation: true });
      }
    });
  }, [geofenceSetting]);

  const handleCaptureComplete = async (mode: 'checkin' | 'checkout', data: { uri: string; path: string; gpsLat: number; gpsLng: number; lowAccuracy?: boolean; atLocation?: boolean }) => {
    if (!user) return;
    try {
      setProcessing(true);
      const isAtLocation = data.atLocation ?? true;
      const reviewStatus = isAtLocation ? 'approved' : 'pending';

      if (mode === 'checkin') {
        const { error } = await supabase.from('attendance').upsert({
          user_id: user.id,
          date: todayStr,
          check_in_time: new Date().toISOString(),
          check_in_selfie_url: data.path,
          gps_lat: data.gpsLat,
          gps_lng: data.gpsLng,
          status: 'Present',
          low_accuracy: data.lowAccuracy || false,
          at_location: isAtLocation,
          review_status: reviewStatus
        }, { onConflict: 'user_id, date' });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('attendance')
          .update({
            check_out_time: new Date().toISOString(),
            check_out_selfie_url: data.path,
            check_out_gps_lat: data.gpsLat,
            check_out_gps_lng: data.gpsLng,
            low_accuracy: data.lowAccuracy || false,
            at_location: isAtLocation,
            review_status: reviewStatus
          })
          .eq('user_id', user.id)
          .eq('date', todayStr);
        if (error) throw new Error(error.message);
      }
      await fetchAttendance();
      showToast({ title: 'Success', message: `Successfully ${mode === 'checkin' ? 'checked in' : 'checked out'}.`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', message: mapErrorToUserMessage(err), type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const markStatusWithoutSelfie = (status: 'Leave' | 'Halfday') => {
    if (!user) return;
    setConfirmAction({ status });
    setConfirmModalVisible(true);
  };

  const getSignedUrl = async (path: string | null) => {
    return getSignedUrlCached(supabase, 'attendance-selfies', path, 60 * 60);
  };

  const openImage = async (path: string | null, title: string) => {
    const url = await getSignedUrl(path);
    if (url) {
      setSelectedImage({ url, title });
      setModalVisible(true);
    }
  };

  const renderDateStrip = () => {
    const dates = [];
    const baseDate = new Date(todayDateObj);
    baseDate.setDate(baseDate.getDate() - 3 + dateOffset); // 3 days before today + offset

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const isToday = `${yyyy}-${mm}-${dd}` === todayStr;
      const dateNum = d.getDate();
      const dayStr = DAYS[d.getDay()];

      dates.push(
        <View key={i} style={[styles.dateCell, isToday && styles.dateCellActive]}>
          <Text style={[styles.dateDayStr, isToday && styles.dateTextActive]}>{dayStr}</Text>
          <Text style={[styles.dateNumStr, isToday && styles.dateTextActive]}>{dateNum}</Text>
          <View style={[styles.dateStatusDot, isToday && { backgroundColor: colors.textInverse }]} />
        </View>
      );
    }

    const centerDate = new Date(todayDateObj);
    centerDate.setDate(centerDate.getDate() + dateOffset);
    const monthYear = centerDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <View style={styles.calendarBlock}>
        <View style={styles.monthHeaderRow}>
          <AppPressable style={styles.monthSelector}>
            <Text style={styles.monthSelectorText}>{monthYear}</Text>
          </AppPressable>
          <View style={styles.navButtonsRow}>
            <AppPressable style={styles.navBtn} onPress={() => setDateOffset(prev => prev - 7)}>
              <ChevronLeft size={18} color={colors.textPrimary} />
            </AppPressable>
            {dateOffset !== 0 && (
              <AppPressable style={styles.todayResetBtn} onPress={() => setDateOffset(0)}>
                <Text style={styles.todayResetText}>Today</Text>
              </AppPressable>
            )}
            <AppPressable style={styles.navBtn} onPress={() => setDateOffset(prev => prev + 7)}>
              <ChevronRight size={18} color={colors.textPrimary} />
            </AppPressable>
          </View>
        </View>
        <View style={styles.dateStrip}>{dates}</View>
      </View>
    );
  };

  const renderTodayStatus = () => {
    const isCheckedIn = todayRecord?.status === 'Present';
    const hasCheckout = !!todayRecord?.check_out_time;
    
    let bannerBg = colors.surface;
    let borderColor = colors.border;
    
    if (isCheckedIn && hasCheckout) {
      borderColor = colors.success;
    } else if (isCheckedIn) {
      borderColor = colors.primary;
    }

    const statusLabel = todayRecord?.status
      ? (todayRecord.status === 'Present' && !hasCheckout ? 'Checked In — No checkout recorded' : todayRecord.status)
      : 'Not Checked In';
      
    return (
      <View style={[styles.todayStatusBanner, { backgroundColor: bannerBg, borderColor }]}>
        <Text style={styles.todayStatusText}>Today, {formatDate(todayStr)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.statusLabelText}>Status: </Text>
          <Text style={styles.statusValueText}>{statusLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppHeader title="Attendance" showBack={true} />

      {loading || processing ? (
        <LoadingState message={processing ? 'Processing check-in...' : 'Loading attendance history...'} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index})}
          ListHeaderComponent={
            <View>
              {renderDateStrip()}
              {renderTodayStatus()}

              <View style={styles.todayCard}>
                {todayRecord && todayRecord.status === 'Present' ? (
                  <>
                    <AppPressable
                      style={styles.largePreview}
                      onPress={() => openImage(todayRecord.check_in_selfie_url || (todayRecord as any).selfie_url, 'Check-in Selfie')}
                    >
                      <View style={styles.largePreviewPlaceholder}>
                        <Camera size={32} color={colors.textMuted} />
                        <Text style={styles.previewText}>View Selfie</Text>
                      </View>
                    </AppPressable>

                    <View style={styles.timeLocRow}>
                      <View style={styles.timeLocCol}>
                        <Text style={styles.timeLocLabel}>Time</Text>
                        <View style={styles.timeLocValue}>
                          <CheckCircle2 size={14} color={colors.success} style={{ marginRight: 4 }} />
                          <Text style={styles.timeLocValueText}>{formatTime(todayRecord.check_in_time)}</Text>
                        </View>
                      </View>
                      <View style={styles.timeLocCol}>
                        <Text style={styles.timeLocLabel}>Location</Text>
                        <View style={styles.timeLocValue}>
                          <MapPin size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={styles.timeLocValueText}>{todayRecord.gps_lat?.toFixed(5)}, {todayRecord.gps_lng?.toFixed(5)}</Text>
                        </View>
                      </View>
                    </View>

                    {!todayRecord.check_out_time && (
                      <View style={styles.buttonStack}>
                        <SelfieCapture
                          label=""
                          storageBucket="attendance-selfies"
                          storagePath={getAttendanceStoragePath(user?.id || '', todayStr, 'checkout')}
                          onCaptureComplete={(data) => handleCaptureComplete('checkout', data)}
                          buttonLabel="Take Checkout Selfie"
                        />
                      </View>
                    )}
                  </>
                ) : todayRecord ? (
                  <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                    <Text style={{ ...typography.h3, color: colors.textSecondary }}>Marked as {todayRecord.status}</Text>
                  </View>
                ) : (
                  <View style={styles.buttonStack}>
                    <SelfieCapture
                      label=""
                      storageBucket="attendance-selfies"
                      storagePath={getAttendanceStoragePath(user?.id || '', todayStr, 'checkin')}
                      onCaptureComplete={(data) => handleCaptureComplete('checkin', data)}
                      buttonLabel="Take Selfie for Attendance"
                    />
                    <View style={styles.secondaryActionsRow}>
                      <Button
                        label="Mark Leave"
                        onPress={() => markStatusWithoutSelfie('Leave')}
                        variant="secondary"
                        style={{ flex: 1, height: 48 }}
                      />
                      <Button
                        label="Mark Half Day"
                        onPress={() => markStatusWithoutSelfie('Halfday')}
                        variant="secondary"
                        style={{ flex: 1, height: 48 }}
                      />
                    </View>
                  </View>
                )}
              </View>

              <SectionLabel 
                title="ATTENDANCE HISTORY" 
                rightElement={
                  <AppPressable onPress={() => setHistoryLimit(100)}>
                    <Text style={styles.viewAllText}>{historyLimit > 15 ? 'Showing 100' : 'View All ->'}</Text>
                  </AppPressable>
                }
              />
            </View>
          }
          renderItem={({ item }) => (
            <AppPressable 
              style={styles.historyCard}
              onPress={() => {
                if (item.check_in_selfie_url || (item as any).selfie_url) {
                  openImage(item.check_in_selfie_url || (item as any).selfie_url, `Selfie on ${formatDate(item.date)}`);
                }
              }}
            >
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                {item.status === 'Present' ? (
                  <View style={[styles.badge, { backgroundColor: colors.statusCompletedBg }]}>
                    <Text style={[styles.badgeText, { color: colors.statusCompletedFg }]}>Present</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: colors.backgroundAlt }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.status}</Text>
                  </View>
                )}
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyTime}>
                  {item.check_in_time ? formatTime(item.check_in_time) : '--'} 
                  {' – '} 
                  {item.check_out_time
                    ? formatTime(item.check_out_time)
                    : item.status === 'Present'
                      ? 'No checkout'
                      : '--'}
                </Text>
                <ChevronRight size={16} color={colors.border} />
              </View>
            </AppPressable>
          )}
        />
      )}

      {/* Image Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <SafeAreaView style={{flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center'}}>
            <Text style={styles.modalTitleText}>{selectedImage?.title}</Text>
            {selectedImage && <Image source={{ uri: selectedImage.url }} style={styles.fullImage} resizeMode="contain" />}
            <AppPressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </AppPressable>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Confirmation BottomSheet */}
      <BottomSheet visible={confirmModalVisible} onClose={() => setConfirmModalVisible(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.sm }}>Mark {confirmAction?.status}</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
          Are you sure you want to mark today as {confirmAction?.status}?
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => setConfirmModalVisible(false)}
            style={{ flex: 1 }}
          />
          <Button
            label="Confirm"
            onPress={async () => {
              if (!confirmAction || !user) return;
              setConfirmModalVisible(false);
              setProcessing(true);
              const { error } = await supabase.from('attendance').upsert({
                user_id: user.id,
                date: todayStr,
                status: confirmAction.status}, { onConflict: 'user_id, date' });

              if (error) showToast({ title: 'Error', message: error.message, type: 'error' });
              else await fetchAttendance();
              
              setProcessing(false);
            }}
            style={{ flex: 1, backgroundColor: colors.primary }}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingTop: spacing.md },
  
  calendarBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg},
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md},
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center'},
  monthSelectorText: {
    ...typography.h3,
    color: colors.textPrimary},
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs},
  navBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt},
  todayResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + '20'},
  todayResetText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700'},
  dateStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between'},
  dateCell: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 8,
    borderRadius: radius.md},
  dateCellActive: {
    backgroundColor: colors.primary},
  dateDayStr: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4},
  dateNumStr: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 4},
  dateTextActive: {
    color: colors.textInverse},
  dateStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border},

  todayStatusBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4},
  todayStatusText: {
    ...typography.bodyBold,
    color: colors.textPrimary},
  statusLabelText: {
    ...typography.caption,
    color: colors.textSecondary},
  statusValueText: {
    ...typography.bodyBold,
    color: colors.textPrimary},

  todayCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl},
  largePreview: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden'},
  largePreviewPlaceholder: {
    alignItems: 'center'},
  previewText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs},
  timeLocRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg},
  timeLocCol: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center'},
  timeLocLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4},
  timeLocValue: {
    flexDirection: 'row',
    alignItems: 'center'},
  timeLocValueText: {
    ...typography.bodyBold,
    color: colors.textPrimary},

  buttonStack: {},
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm},

  viewAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600'},
  
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border},
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyDate: { ...typography.bodyBold, color: colors.textPrimary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.micro, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyTime: { ...typography.caption, color: colors.textSecondary },
  
  modalContainer: { flex: 1, backgroundColor: 'rgba(30,27,24,0.92)' },
  modalTitleText: { ...typography.h2, color: colors.textInverse, marginBottom: spacing.xl },
  fullImage: { width: '100%', height: '70%', borderRadius: radius.md },
  closeBtn: { backgroundColor: colors.error, paddingVertical: 12, paddingHorizontal: 32, borderRadius: radius.md, marginTop: 30 },
  closeBtnText: { ...typography.bodyBold, color: colors.textInverse }});
