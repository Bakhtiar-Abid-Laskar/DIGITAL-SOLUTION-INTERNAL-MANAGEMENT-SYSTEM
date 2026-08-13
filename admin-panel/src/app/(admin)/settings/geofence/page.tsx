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
  const [radius, setRadius] = useState(100);
  const [savingRadius, setSavingRadius] = useState(false);
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
      if (data) {
        setSetting(data as GeofenceSettings);
        setRadius((data as GeofenceSettings).radius ?? 100);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (lat: number, lng: number) => {
    try {
      const payload = { lat, lng, radius };
      
      if (setting?.id) {
        const { error } = await supabase
          .from('geofence_settings')
          .update(payload)
          .eq('id', setting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('geofence_settings')
          .insert(payload);
        if (error) throw error;
      }
      showToast('Geofence updated successfully!', 'success');
      fetchSetting();
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
    }
  };

  // Save ONLY the radius without changing lat/lng
  const handleSaveRadiusOnly = async () => {
    if (!setting?.id) return;
    setSavingRadius(true);
    try {
      const { error } = await supabase
        .from('geofence_settings')
        .update({ radius })
        .eq('id', setting.id);
      if (error) throw error;
      showToast(`Radius updated to ${radius}m successfully!`, 'success');
      fetchSetting();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSavingRadius(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Geofence Settings"
        description="Set the shop location for attendance check-ins. Staff must be within the radius to be marked 'at location'."
      />

      {/* ── Currently Saved Info Card ─────────────────────────────────────── */}
      {setting ? (
        <div className="flex flex-wrap gap-4 p-4 bg-admin-bg border border-admin-border rounded-xl text-sm">
          <div>
            <p className="text-xs text-admin-text-secondary uppercase tracking-wide font-medium mb-1">Saved Location</p>
            <p className="text-admin-text-primary font-mono font-semibold">
              {setting.lat.toFixed(6)}, {setting.lng.toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-xs text-admin-text-secondary uppercase tracking-wide font-medium mb-1">Saved Radius</p>
            <p className="text-admin-text-primary font-semibold">{setting.radius} m</p>
          </div>
          <div className="flex items-center">
            <a
              href={`https://www.google.com/maps?q=${setting.lat},${setting.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-admin-accent text-xs underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Verify on Google Maps ↗
            </a>
          </div>
        </div>
      ) : !loading ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400">
          ⚠️ No geofence has been saved yet. Set a location below and click Save.
        </div>
      ) : null}

      {/* ── Radius Control ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-admin-bg border border-admin-border rounded-xl">
        <div className="flex-1">
          <label className="text-xs font-medium text-admin-text-secondary uppercase tracking-wide block mb-1">
            Check-in Radius
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={2000}
              step={25}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-48 accent-admin-accent"
            />
            <span className="text-admin-text-primary font-semibold w-20">{radius} m</span>
          </div>
          <p className="text-xs text-admin-text-muted mt-1">
            50m = very strict · 150m = practical · 500m+ = lenient
          </p>
        </div>
        {setting?.id && (
          <button
            onClick={handleSaveRadiusOnly}
            disabled={savingRadius || radius === setting.radius}
            className="px-4 py-2 bg-admin-accent text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {savingRadius ? 'Saving…' : radius === setting?.radius ? 'Radius Saved ✓' : 'Save Radius Only'}
          </button>
        )}
      </div>
      
      <div className="bg-admin-bg-subtle/50 p-6 rounded-2xl border border-admin-border">
        {loading ? (
          <div className="h-[500px] w-full bg-admin-bg rounded-xl animate-pulse" />
        ) : (
          <GeofenceMap initialSetting={setting} onSave={handleSave} radius={radius} />
        )}
      </div>
    </div>
  );
}
