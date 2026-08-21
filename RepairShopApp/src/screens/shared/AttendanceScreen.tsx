import { AppPressable } from '../../components/common/AppPressable';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, 
  FlatList, Modal, Image, RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord } from '../../types/attendance';
import { 
  getAttendanceDateIST, 
  getDateIST, 
  formatTime, 
  formatDate, 
  GeofenceSettings,
  getImageThumbnailUrl,
  getFullImageUrl 
} from '@repairshop/shared';
import { getDistanceInMeters } from '../../utils/distance';
import { mapErrorToUserMessage } from '../../utils/errorMessages';

import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Camera, 
  MapPin, 
  Clock, 
  Maximize2, 
  X, 
  LogOut, 
  LogIn 
} from 'lucide-react-native';
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

// ─── Selfie Card Component ──────────────────────────────────────────────────
interface SelfieCardProps {
  fileId: string | null | undefined;
  title: string;
  time?: string | null;
  lat?: number | null;
  lng?: number | null;
  onPress: () => void;
  type: 'checkin' | 'checkout';
  isFullWidth?: boolean;
}

const SelfieCard = React.memo(function SelfieCard({
  fileId,
  title,
  time,
  lat,
  lng,
  onPress,
  type,
  isFullWidth = false,
}: SelfieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageUrl = useMemo(() => fileId ? getImageThumbnailUrl(fileId, 600) : null, [fileId]);
  const isCheckin = type === 'checkin';
  const typeColor = isCheckin ? colors.success : colors.primary;

  return (
    <AppPressable 
      style={[styles.selfieCard, isFullWidth && styles.selfieCardFull]} 
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${title}`}
    >
      <View style={styles.selfieCardHeader}>
        <View style={styles.selfieHeaderTitleRow}>
          {isCheckin ? (
            <LogIn size={14} color={typeColor} style={{ marginRight: 5 }} />
          ) : (
            <LogOut size={14} color={typeColor} style={{ marginRight: 5 }} />
          )}
          <Text style={[styles.selfieCardTitle, { color: typeColor }]}>{title}</Text>
        </View>
        {time ? (
          <View style={styles.selfieTimeBadge}>
            <Clock size={11} color={colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.selfieTimeBadgeText}>{formatTime(time)}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.selfieImageContainer, isFullWidth ? styles.selfieImageFull : styles.selfieImageCompact]}>
        {imageUrl && !imageError ? (
          <>
            <Image
              source={{ uri: imageUrl }}
              style={styles.selfieImage}
              resizeMode="cover"
              onLoadEnd={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && (
              <View style={styles.selfieLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
            <View style={styles.selfieZoomChip}>
              <Maximize2 size={12} color={colors.textInverse} style={{ marginRight: 4 }} />
              <Text style={styles.selfieZoomText}>View Full</Text>
            </View>
          </>
        ) : (
          <View style={styles.selfiePlaceholder}>
            <Camera size={28} color={colors.textMuted} />
            <Text style={styles.selfiePlaceholderText}>
              {fileId ? 'Tap to view selfie' : 'No selfie recorded'}
            </Text>
          </View>
        )}
      </View>

      {(lat != null || lng != null) && (
        <View style={styles.selfieFooterRow}>
          <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.selfieGpsText} numberOfLines={1}>
            {lat != null ? Number(lat).toFixed(5) : '--'}, {lng != null ? Number(lng).toFixed(5) : '--'}
          </Text>
        </View>
      )}
    </AppPressable>
  );
});

// ─── Attendance History Row ─────────────────────────────────────────────────
const AttendanceHistoryRow = React.memo(function AttendanceHistoryRow({ 
  item, 
  onPress 
}: { 
  item: AttendanceRecord, 
  onPress: (item: AttendanceRecord) => void 
}) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const hasSelfie = !!(item.check_in_drive_file_id || item.check_out_drive_file_id);

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
        {hasSelfie && (
          <Camera size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        )}
        <ChevronRight size={16} color={colors.border} />
      </View>
    </AppPressable>
  );
});

// ─── Main Attendance Screen ─────────────────────────────────────────────────
export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
  const { user, displayName } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLimit, setHistoryLimit] = useState(15);
  const [dateOffset, setDateOffset] = useState(0);
  const [geofenceSetting, setGeofenceSetting] = useState<GeofenceSettings | null>(null);
  const [leaveConflict, setLeaveConflict] = useState(false);
  
  // Image viewer modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ 
    url: string; 
    title: string; 
    subtitle?: string; 
    gps?: string;
  } | null>(null);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  
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
      if (geofenceData) {
        const centerLat = Number(geofenceData.center_lat ?? (geofenceData as any).lat ?? 0);
        const centerLng = Number(geofenceData.center_lng ?? (geofenceData as any).lng ?? 0);
        const radiusMeters = Number(geofenceData.radius_meters ?? (geofenceData as any).radius ?? 100);

        setGeofenceSetting({
          ...geofenceData,
          center_lat: centerLat,
          center_lng: centerLng,
          radius_meters: radiusMeters,
          lat: centerLat,
          lng: centerLng,
          radius: radiusMeters,
        } as GeofenceSettings);
      } else {
        setGeofenceSetting(null);
      }

      // Check for approved leave on today
      const { data: conflictData } = await supabase
        .rpc('check_leave_conflict', { p_user_id: user.id, p_date: todayStr });
      setLeaveConflict(!!conflictData);
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
      const shopLat = geofenceSetting.center_lat ?? geofenceSetting.lat;
      const shopLng = geofenceSetting.center_lng ?? geofenceSetting.lng;
      const shopRadius = geofenceSetting.radius_meters ?? geofenceSetting.radius ?? 100;
      if (shopLat == null || shopLng == null) {
        resolve({ proceed: true, atLocation: true });
        return;
      }
      const distance = getDistanceInMeters(lat, lng, shopLat, shopLng);
      if (distance > shopRadius) {
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

  const handleCaptureComplete = async (
    mode: 'checkin' | 'checkout', 
    data: { uri: string; driveFileId: string; driveLink: string; gpsLat: number; gpsLng: number; lowAccuracy?: boolean; atLocation?: boolean }
  ) => {
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
          check_in_drive_file_id: data.driveFileId,
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
            check_out_drive_file_id: data.driveFileId,
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
      const msg: string = err?.message || '';
      if (msg.includes('LEAVE_CONFLICT')) {
        showToast({
          title: 'Leave Day',
          message: 'You have an approved leave today. Attendance cannot be marked on a leave day. Ask your admin to cancel the leave first.',
          type: 'error',
        });
      } else {
        showToast({ title: 'Error', message: mapErrorToUserMessage(err), type: 'error' });
      }
    } finally {
      setProcessing(false);
    }
  };

  const markStatusWithoutSelfie = (status: 'Leave' | 'Halfday') => {
    if (!user) return;
    setConfirmAction({ status });
    setConfirmModalVisible(true);
  };

  const openSelfieViewer = (fileId: string | null | undefined, title: string, subtitle?: string, gps?: string) => {
    if (fileId) {
      const fullUrl = getFullImageUrl(fileId);
      if (fullUrl) {
        setModalImageLoaded(false);
        setSelectedImage({ url: fullUrl, title, subtitle, gps });
        setModalVisible(true);
      }
    }
  };

  // ─── Date Strip ───────────────────────────────────────────────────────────
  const renderDateStrip = () => {
    const dates = [];
    const baseDate = new Date(todayDateObj);
    baseDate.setDate(baseDate.getDate() - 3 + dateOffset);

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
          <View style={styles.monthSelector}>
            <Text style={styles.monthSelectorText}>{monthYear}</Text>
          </View>
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

  // ─── Status Banner ────────────────────────────────────────────────────────
  const renderTodayStatus = () => {
    const isPresent = todayRecord?.status === 'Present';
    const hasCheckout = !!todayRecord?.check_out_time;
    const isLeave = todayRecord?.status === 'Leave';
    const isHalfday = todayRecord?.status === 'Halfday';
    
    let badgeColor = colors.textMuted;
    let badgeBg = colors.backgroundAlt;
    let badgeText = 'NOT CHECKED IN';
    let subText = 'Please take a selfie to mark your check-in.';

    if (isPresent) {
      if (hasCheckout) {
        badgeColor = colors.success;
        badgeBg = colors.statusCompletedBg ?? (colors.success + '20');
        badgeText = 'COMPLETED';
        subText = `Checked in at ${formatTime(todayRecord.check_in_time)} • Checked out at ${formatTime(todayRecord.check_out_time)}`;
      } else {
        badgeColor = colors.primary;
        badgeBg = colors.primary + '18';
        badgeText = 'CHECKED IN';
        subText = `Checked in at ${formatTime(todayRecord.check_in_time)} • Checkout pending`;
      }
    } else if (isLeave) {
      badgeColor = colors.error;
      badgeBg = colors.error + '18';
      badgeText = 'ON LEAVE';
      subText = 'Marked on leave for today.';
    } else if (isHalfday) {
      badgeColor = colors.warning ?? '#f59e0b';
      badgeBg = (colors.warning ?? '#f59e0b') + '18';
      badgeText = 'HALF DAY';
      subText = 'Marked half day for today.';
    }

    return (
      <View style={[styles.todayStatusCard, { borderLeftColor: badgeColor }]}>
        <View style={styles.todayStatusHeader}>
          <View style={styles.todayDateWrap}>
            <Text style={styles.todayStatusDate}>Today, {formatDate(todayStr)}</Text>
            <Text style={styles.todayStatusSub} numberOfLines={2}>{subText}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: badgeBg, borderColor: badgeColor + '40' }]}>
            <Text style={[styles.statusPillText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ─── Today Action / Selfie Section ────────────────────────────────────────
  const renderTodayAction = () => {
    const isPresent = todayRecord?.status === 'Present';
    const hasCheckin = isPresent && !!todayRecord?.check_in_time;
    const hasCheckout = isPresent && !!todayRecord?.check_out_time;

    // Resolve GPS coords cleanly (avoiding undefined)
    const checkinLat = todayRecord?.gps_lat ?? (todayRecord as any)?.check_in_gps_lat;
    const checkinLng = todayRecord?.gps_lng;
    const checkoutLat = todayRecord?.check_out_gps_lat;
    const checkoutLng = todayRecord?.check_out_gps_lng;

    if (isPresent) {
      return (
        <View style={styles.todayCard}>
          {hasCheckin && hasCheckout ? (
            // Both checkin and checkout completed: show side-by-side cards
            <View>
              <Text style={styles.sectionSubHeader}>TODAY'S SELFIES</Text>
              <View style={styles.selfiePairRow}>
                <SelfieCard
                  fileId={todayRecord.check_in_drive_file_id}
                  title="Check-in"
                  time={todayRecord.check_in_time}
                  lat={checkinLat}
                  lng={checkinLng}
                  type="checkin"
                  onPress={() => openSelfieViewer(
                    todayRecord.check_in_drive_file_id, 
                    'Check-in Selfie',
                    `Today at ${formatTime(todayRecord.check_in_time)}`,
                    checkinLat != null ? `${Number(checkinLat).toFixed(5)}, ${Number(checkinLng).toFixed(5)}` : undefined
                  )}
                />
                <SelfieCard
                  fileId={todayRecord.check_out_drive_file_id}
                  title="Check-out"
                  time={todayRecord.check_out_time}
                  lat={checkoutLat}
                  lng={checkoutLng}
                  type="checkout"
                  onPress={() => openSelfieViewer(
                    todayRecord.check_out_drive_file_id, 
                    'Check-out Selfie',
                    `Today at ${formatTime(todayRecord.check_out_time)}`,
                    checkoutLat != null ? `${Number(checkoutLat).toFixed(5)}, ${Number(checkoutLng).toFixed(5)}` : undefined
                  )}
                />
              </View>
            </View>
          ) : (
            // Checked in but not checked out: show Check-in card + Checkout Button
            <View>
              <Text style={styles.sectionSubHeader}>CHECK-IN RECORDED</Text>
              <SelfieCard
                fileId={todayRecord.check_in_drive_file_id}
                title="Check-in Selfie"
                time={todayRecord.check_in_time}
                lat={checkinLat}
                lng={checkinLng}
                type="checkin"
                isFullWidth={true}
                onPress={() => openSelfieViewer(
                  todayRecord.check_in_drive_file_id, 
                  'Check-in Selfie',
                  `Today at ${formatTime(todayRecord.check_in_time)}`,
                  checkinLat != null ? `${Number(checkinLat).toFixed(5)}, ${Number(checkinLng).toFixed(5)}` : undefined
                )}
              />

              <View style={styles.checkoutActionContainer}>
                <Text style={styles.checkoutActionTitle}>Ready to end your shift?</Text>
                <SelfieCapture
                  label=""
                  uploadEndpoint="upload-attendance-selfie"
                  uploadPayload={{ staffName: displayName || user?.email || 'Unknown', timestamp: todayStr, type: 'checkout' }}
                  onCaptureComplete={(data) => handleCaptureComplete('checkout', data)}
                  buttonLabel="Take Checkout Selfie"
                  validateLocation={validateLocation}
                />
              </View>
            </View>
          )}
        </View>
      );
    }

    if (todayRecord) {
      return (
        <View style={styles.todayCard}>
          <View style={styles.markedStatusBox}>
            <Text style={styles.markedStatusText}>Marked as {todayRecord.status}</Text>
          </View>
        </View>
      );
    }

    if (leaveConflict) {
      return (
        <View style={styles.todayCard}>
          <View style={styles.leaveBlockBanner}>
            <Text style={styles.leaveBlockTitle}>Approved Leave Today</Text>
            <Text style={styles.leaveBlockBody}>
              You have an approved leave for today. Attendance cannot be marked on a leave day.
              {' '}Contact your admin to cancel the leave if this is incorrect.
            </Text>
          </View>
        </View>
      );
    }

    // Default: Not checked in yet
    return (
      <View style={styles.todayCard}>
        <View style={styles.buttonStack}>
          <SelfieCapture
            label=""
            uploadEndpoint="upload-attendance-selfie"
            uploadPayload={{ staffName: displayName || user?.email || 'Unknown', timestamp: todayStr, type: 'checkin' }}
            onCaptureComplete={(data) => handleCaptureComplete('checkin', data)}
            buttonLabel="Take Selfie for Attendance"
            validateLocation={validateLocation}
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
      </View>
    );
  };

  const handleHistoryRowPress = useCallback((item: AttendanceRecord) => {
    const fileId = item.check_in_drive_file_id || item.check_out_drive_file_id;
    if (fileId) {
      const lat = item.gps_lat ?? (item as any)?.check_in_gps_lat;
      const lng = item.gps_lng;
      openSelfieViewer(
        fileId,
        `Selfie on ${formatDate(item.date)}`,
        item.check_in_time ? `Checked in at ${formatTime(item.check_in_time)}` : undefined,
        lat != null ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : undefined
      );
    } else {
      showToast({ title: 'No Selfie', message: 'No selfie was attached to this record.', type: 'info' });
    }
  }, [showToast]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppHeader title="Attendance" showBack={true} />

      {loading || processing ? (
        <LoadingState message={processing ? 'Processing attendance...' : 'Loading attendance history...'} />
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
          ListHeaderComponent={
            <View>
              {renderDateStrip()}
              {renderTodayStatus()}
              {renderTodayAction()}

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
            <AttendanceHistoryRow item={item} onPress={handleHistoryRowPress} />
          )}
        />
      )}

      {/* Full Selfie Preview Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedImage?.title || 'Attendance Selfie'}</Text>
                {selectedImage?.subtitle ? (
                  <Text style={styles.modalSubtitle}>{selectedImage.subtitle}</Text>
                ) : null}
              </View>
              <AppPressable 
                style={styles.modalCloseIconBtn} 
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={22} color={colors.textInverse} />
              </AppPressable>
            </View>

            {/* Image Preview Container */}
            <View style={styles.modalImageContainer}>
              {selectedImage?.url ? (
                <>
                  <Image 
                    source={{ uri: selectedImage.url }} 
                    style={styles.fullImage} 
                    resizeMode="contain"
                    onLoadEnd={() => setModalImageLoaded(true)}
                  />
                  {!modalImageLoaded && (
                    <View style={styles.modalLoadingBox}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.modalLoadingText}>Loading high-res selfie...</Text>
                    </View>
                  )}
                </>
              ) : null}
            </View>

            {/* GPS & Close Controls */}
            {selectedImage?.gps ? (
              <View style={styles.modalGpsRow}>
                <MapPin size={14} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.modalGpsText}>GPS: {selectedImage.gps}</Text>
              </View>
            ) : null}

            <AppPressable style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Close Preview</Text>
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
                status: confirmAction.status
              }, { onConflict: 'user_id, date' });

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

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingTop: spacing.md },
  
  calendarBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthSelectorText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
  },
  todayResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + '20',
  },
  todayResetText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  dateStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCell: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  dateCellActive: {
    backgroundColor: colors.primary,
  },
  dateDayStr: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateNumStr: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dateTextActive: {
    color: colors.textInverse,
  },
  dateStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },

  // Today Status Card (Polished & Responsive)
  todayStatusCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadow.card,
  },
  todayStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  todayDateWrap: {
    flex: 1,
  },
  todayStatusDate: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  todayStatusSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    ...typography.micro,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  todayCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionSubHeader: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: 2,
  },

  // Selfie Card Styles
  selfiePairRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  selfieCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadow.card,
  },
  selfieCardFull: {
    flex: undefined,
    width: '100%',
  },
  selfieCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  selfieHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selfieCardTitle: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 13,
  },
  selfieTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  selfieTimeBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selfieImageContainer: {
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selfieImageCompact: {
    height: 140,
  },
  selfieImageFull: {
    height: 200,
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  selfieLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieZoomChip: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selfieZoomText: {
    ...typography.micro,
    color: colors.textInverse,
    fontWeight: '600',
  },
  selfiePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  selfiePlaceholderText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  selfieFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  selfieGpsText: {
    ...typography.micro,
    color: colors.textSecondary,
    flex: 1,
  },

  checkoutActionContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  checkoutActionTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  markedStatusBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markedStatusText: {
    ...typography.h3,
    color: colors.textSecondary,
  },

  buttonStack: {
    gap: spacing.sm,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  viewAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  
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
    borderColor: colors.border,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyDate: { ...typography.bodyBold, color: colors.textPrimary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.micro, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  historyTime: { ...typography.caption, color: colors.textSecondary },
  
  // Modal Preview Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 17, 23, 0.95)',
  },
  modalSafeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textInverse,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textInverse + 'CC',
    marginTop: 2,
  },
  modalCloseIconBtn: {
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modalImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  modalLoadingBox: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    ...typography.caption,
    color: colors.textInverse,
    marginTop: spacing.sm,
  },
  modalGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalGpsText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  modalCloseBtn: { 
    backgroundColor: colors.primary, 
    paddingVertical: 14, 
    borderRadius: radius.md, 
    alignItems: 'center',
  },
  modalCloseBtnText: { 
    ...typography.bodyBold, 
    color: colors.textInverse, 
  },

  // Leave-conflict hard-block banner
  leaveBlockBanner: {
    backgroundColor: colors.warningAmberBg ?? '#fef9c3',
    borderWidth: 1,
    borderColor: colors.warningAmber ?? '#ca8a04',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  leaveBlockTitle: {
    ...typography.h3,
    color: colors.warningAmber ?? '#92400e',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  leaveBlockBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

