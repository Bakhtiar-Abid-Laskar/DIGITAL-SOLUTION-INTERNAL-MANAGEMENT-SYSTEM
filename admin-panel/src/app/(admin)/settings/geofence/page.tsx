'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { supabase } from '@/lib/supabase';
import { GeofenceSettings } from '@repairshop/shared';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/common/ToastProvider';

// Dynamically import the map so it only runs on the client to prevent SSR window reference errors
const GeofenceMap = dynamic(() => import('@/components/settings/GeofenceMap'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-admin-bg-subtle rounded-xl animate-pulse flex items-center justify-center text-admin-text-muted border border-admin-border">Loading Map...</div>
});

export default function GeofenceSettingsPage() {
  const [setting, setSetting] = useState<GeofenceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('geofence_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setSetting(data as GeofenceSettings);
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (lat: number, lng: number) => {
    try {
      const payload = { lat, lng, radius: 50 };
      
      if (setting?.id) {
        // Update existing
        const { error } = await supabase
          .from('geofence_settings')
          .update(payload)
          .eq('id', setting.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('geofence_settings')
          .insert(payload);
        if (error) throw error;
      }
      showToast('Geofence updated successfully!', 'success');
      fetchSetting(); // Refresh the row ID just in case
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Geofence Settings"
        description="Set the global location for attendance check-ins. A strict 50m radius will be enforced."
      />
      
      <div className="bg-admin-bg-subtle/50 p-6 rounded-2xl border border-admin-border">
        {loading ? (
          <div className="h-[500px] w-full bg-admin-bg rounded-xl animate-pulse" />
        ) : (
          <GeofenceMap initialSetting={setting} onSave={handleSave} />
        )}
      </div>
    </div>
  );
}
