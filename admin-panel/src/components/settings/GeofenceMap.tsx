'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GeofenceSettings } from '@repairshop/shared';
import { supabase } from '@/lib/supabase';

// Fix for default marker icons in Leaflet with webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeofenceMapProps {
  initialSetting: GeofenceSettings | null;
  onSave: (lat: number, lng: number) => Promise<void>;
}

function LocationPicker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <>
      <Marker position={position} />
      <Circle center={position} radius={50} pathOptions={{ color: 'var(--admin-accent)', fillColor: 'var(--admin-accent)', fillOpacity: 0.2 }} />
    </>
  );
}

export default function GeofenceMap({ initialSetting, onSave }: GeofenceMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialSetting ? [initialSetting.lat, initialSetting.lng] : null
  );
  const [saving, setSaving] = useState(false);

  // Default to New York if no initial setting, but the user must click to place the pin
  const center: [number, number] = initialSetting 
    ? [initialSetting.lat, initialSetting.lng] 
    : [40.7128, -74.0060];

  const handleSave = async () => {
    if (!position) return;
    setSaving(true);
    try {
      await onSave(position[0], position[1]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="h-[500px] w-full rounded-xl overflow-hidden border border-admin-border relative z-0">
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>

      <div className="flex justify-between items-center bg-admin-bg p-4 rounded-xl border border-admin-border">
        <div>
          {position ? (
            <p className="text-sm text-admin-text-primary font-medium">
              Selected: {position[0].toFixed(5)}, {position[1].toFixed(5)}
            </p>
          ) : (
            <p className="text-sm text-admin-text-muted">Click on the map to set the shop location.</p>
          )}
          <p className="text-xs text-admin-text-secondary mt-1">Radius is strictly enforced at 50 meters.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!position || saving}
          className="px-6 py-2 bg-admin-accent text-white rounded-lg font-medium disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving...' : 'Save Location'}
        </button>
      </div>
    </div>
  );
}
