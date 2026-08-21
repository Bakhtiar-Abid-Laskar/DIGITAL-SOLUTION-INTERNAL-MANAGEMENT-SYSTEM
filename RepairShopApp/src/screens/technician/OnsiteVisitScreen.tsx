import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Job } from '../../types/job';
import { OnsiteVisit } from '../../types/onsiteVisit';
import JobDetailShell from '../../components/jobs/JobDetailShell';
import { SkeletonList } from '../../components/common/SkeletonCard';
import ErrorState from '../../components/common/ErrorState';
import SectionLabel from '../../components/common/SectionLabel';
import Button from '../../components/common/Button';
import SelfieCapture from '../../components/shared/SelfieCapture';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useToast } from '../../context/ToastContext';
import { formatTime } from '@repairshop/shared';
import { CheckCircle2, MapPin, Camera } from 'lucide-react-native';

export default function OnsiteVisitScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, displayName } = useAuth();
  const jobId = route.params?.jobId;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [visit, setVisit] = useState<OnsiteVisit | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchJobAndVisit = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('technician_id', user.id)
        .single();

      if (jobError || !jobData) throw new Error('Job not found or not assigned to you.');
      setJob(jobData);

      const { data: visitData } = await supabase
        .from('onsite_visits')
        .select('*')
        .eq('job_id', jobId)
        .eq('technician_id', user.id)
        .order('arrival_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setVisit(visitData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobAndVisit();
    }, [jobId])
  );

  const handleCaptureComplete = async (mode: 'arrival' | 'device' | 'departure', data: { uri: string; driveFileId: string; driveLink: string; gpsLat: number; gpsLng: number }) => {
    if (!user) return;
    try {
      setSaving(true);
      const timestamp = new Date().toISOString();
      if (mode === 'arrival') {
        const payload = {
          job_id: jobId,
          technician_id: user.id,
          arrival_time: timestamp,
          arrival_selfie_drive_file_id: data.driveFileId,
          arrival_photo_drive_link: data.driveLink,
          arrival_gps_lat: data.gpsLat,
          arrival_gps_lng: data.gpsLng
        };
        if (visit?.id) {
          const { error } = await supabase.from('onsite_visits').update(payload).eq('id', visit.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('onsite_visits').insert(payload);
          if (error) throw error;
        }
        // Officially start the job — move it to 'In Progress'
        if (job && job.status === 'Received') {
          await supabase.from('jobs').update({ status: 'In Progress' }).eq('id', jobId);
        }
      } else if (mode === 'device') {
        const payload = {
          device_photo_drive_file_id: data.driveFileId,
          device_photo_drive_link: data.driveLink,
        };
        const { error } = await supabase.from('onsite_visits').update(payload).eq('id', visit!.id);
        if (error) throw error;
      } else {
        const payload = {
          departure_time: timestamp,
          departure_selfie_drive_file_id: data.driveFileId,
          departure_photo_drive_link: data.driveLink,
          departure_gps_lat: data.gpsLat,
          departure_gps_lng: data.gpsLng
        };
        const { error } = await supabase.from('onsite_visits').update(payload).eq('id', visit!.id);
        if (error) throw error;
      }
      await fetchJobAndVisit();
      showToast({ title: 'Success', message: 'Photo and GPS saved.', type: 'success' });
    } catch (e: any) {
      showToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleProceedToUpdate = () => {
    // Completion selfie (departure) is required before 'Mark Completed' is available
    navigation.replace('UpdateWork', {
      jobId,
      onsiteStarted: true,
      completionSelfieRequired: !departureDone,
    });
  };

  if (loading) return (
    <View style={styles.container}>
      <SkeletonList count={3} />
    </View>
  );
  if (error || !job) return (
    <View style={styles.container}>
      <ErrorState message={error || 'Failed to load'} onRetry={fetchJobAndVisit} />
    </View>
  );

  const arrivalDone = !!visit?.arrival_selfie_drive_file_id;
  const deviceDone = !!visit?.device_photo_drive_file_id;
  const departureDone = !!visit?.departure_selfie_drive_file_id;

  return (
    <JobDetailShell job={job}>
      
      {/* START VISIT SECTION */}
      <SectionLabel title="START VISIT" />
      <View style={[styles.card, arrivalDone && styles.cardActive]}>
        {!arrivalDone ? (
          <>
            <View style={styles.instructionRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.success }]}>
                <MapPin size={20} color={colors.textInverse} />
              </View>
              <Text style={styles.instructionText}>Take selfie at location</Text>
            </View>
            <View style={styles.actionWrap}>
              <SelfieCapture
                label=""
                uploadEndpoint="upload-job-photo"
                uploadPayload={{ staffName: displayName || user?.email || 'Unknown', jobCode: visit?.jobs?.job_code || jobId, timestamp: new Date().toISOString(), type: 'arrival' }}
                onCaptureComplete={(data) => handleCaptureComplete('arrival', data)}
                buttonLabel="Start Visit Selfie"
              />
            </View>
          </>
        ) : (
          <View style={styles.completedState}>
            <CheckCircle2 size={24} color={colors.success} />
            <View style={styles.completedTextCol}>
              <Text style={styles.completedTitle}>Arrival Verified</Text>
              <Text style={styles.completedSubtitle}>
                {formatTime(visit.arrival_time)} • GPS ({visit.arrival_gps_lat?.toFixed(4)}, {visit.arrival_gps_lng?.toFixed(4)})
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* DEVICE PHOTO SECTION */}
      <SectionLabel title="DEVICE PHOTO" />
      <View style={[styles.card, !arrivalDone && styles.cardDisabled]}>
        {!deviceDone ? (
          <>
            <View style={styles.instructionRow}>
              <View style={[styles.iconBoxOutline, { borderColor: arrivalDone ? colors.primary : colors.border }]}>
                <Camera size={20} color={arrivalDone ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[styles.instructionText, !arrivalDone && { color: colors.textMuted }]}>
                Take photo of the device (Optional)
              </Text>
            </View>
            {arrivalDone && (
              <View style={styles.actionWrap}>
                <SelfieCapture
                  label=""
                  facing="back"
                  uploadEndpoint="upload-job-photo"
                  uploadPayload={{ staffName: displayName || user?.email || 'Unknown', jobCode: visit?.jobs?.job_code || jobId, timestamp: new Date().toISOString(), type: 'device' }}
                  onCaptureComplete={(data) => handleCaptureComplete('device', data)}
                  buttonLabel="Take Device Photo"
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.completedState}>
            <CheckCircle2 size={24} color={colors.success} />
            <View style={styles.completedTextCol}>
              <Text style={styles.completedTitle}>Device Photo Saved</Text>
            </View>
          </View>
        )}
      </View>

      {/* COMPLETE VISIT SECTION */}
      <SectionLabel title="COMPLETE VISIT" />
      <View style={[styles.card, !arrivalDone && styles.cardDisabled]}>
        {!departureDone ? (
          <>
            <View style={styles.instructionRow}>
              <View style={[styles.iconBoxOutline, { borderColor: arrivalDone ? colors.primary : colors.border }]}>
                <MapPin size={20} color={arrivalDone ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[styles.instructionText, !arrivalDone && { color: colors.textMuted }]}>
                Take selfie after completing/leaving
              </Text>
            </View>
            {arrivalDone && (
              <View style={styles.actionWrap}>
                <SelfieCapture
                  label=""
                  uploadEndpoint="upload-job-photo"
                  uploadPayload={{ staffName: displayName || user?.email || 'Unknown', jobCode: visit?.jobs?.job_code || jobId, timestamp: new Date().toISOString(), type: 'departure' }}
                  onCaptureComplete={(data) => handleCaptureComplete('departure', data)}
                  buttonLabel="Take Completion Selfie"
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.completedState}>
            <CheckCircle2 size={24} color={colors.success} />
            <View style={styles.completedTextCol}>
              <Text style={styles.completedTitle}>Departure Verified</Text>
              <Text style={styles.completedSubtitle}>
                {formatTime(visit.departure_time)} • GPS ({visit.departure_gps_lat?.toFixed(4)}, {visit.departure_gps_lng?.toFixed(4)})
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* PROCEED BUTTON — only visible after arrival selfie */}
      {arrivalDone && (
        <View style={styles.footerWrap}>
          <Button
            label={departureDone ? 'Proceed to Complete Job' : 'Log Work Progress'}
            onPress={handleProceedToUpdate}
            variant="primary"
            style={departureDone ? styles.btnActive : styles.btnProgress}
          />
        </View>
      )}
      
    </JobDetailShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardActive: {
    borderColor: colors.success,
    backgroundColor: colors.statusCompletedBg,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconBoxOutline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  instructionText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  actionWrap: {
    marginTop: spacing.sm,
  },
  completedState: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedTextCol: {
    marginLeft: spacing.md,
  },
  completedTitle: {
    ...typography.bodyBold,
    color: colors.success,
  },
  completedSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footerWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  btnActive: {
    backgroundColor: colors.success,
  },
  btnProgress: {
    backgroundColor: colors.primary,
  },
});
