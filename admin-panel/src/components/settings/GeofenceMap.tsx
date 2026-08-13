'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GeofenceSettings } from '@repairshop/shared';

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
  radius?: number;
}

/** Inner component: listens for flyTo commands via a ref-based approach */
function MapController({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const prevPos = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!position) return;
    const [lat, lng] = position;
    const [prevLat, prevLng] = prevPos.current ?? [null, null];
    if (lat !== prevLat || lng !== prevLng) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { animate: true, duration: 1 });
      prevPos.current = position;
    }
  }, [position, map]);

  return null;
}

/** Click handler: places pin on map click */
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onMapClick]);

  return null;
}

export default function GeofenceMap({ initialSetting, onSave, radius = 100 }: GeofenceMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialSetting ? [initialSetting.lat, initialSetting.lng] : null
  );
  const [saving, setSaving] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Lat/Lng text input state
  const [latInput, setLatInput] = useState(initialSetting ? String(initialSetting.lat) : '');
  const [lngInput, setLngInput] = useState(initialSetting ? String(initialSetting.lng) : '');
  const [inputError, setInputError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const defaultCenter: [number, number] = initialSetting
    ? [initialSetting.lat, initialSetting.lng]
    : [20.5937, 78.9629]; // India center

  // ── Sync lat/lng inputs when user clicks map ──────────────────────────────
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPosition([lat, lng]);
    setLatInput(lat.toFixed(6));
    setLngInput(lng.toFixed(6));
    setInputError('');
  }, []);

  // ── Apply lat/lng from text inputs ────────────────────────────────────────
  const applyLatLng = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) {
      setInputError('Please enter valid numbers for latitude and longitude.');
      return;
    }
    if (lat < -90 || lat > 90) {
      setInputError('Latitude must be between -90 and 90.');
      return;
    }
    if (lng < -180 || lng > 180) {
      setInputError('Longitude must be between -180 and 180.');
      return;
    }
    setInputError('');
    setPosition([lat, lng]);
  };

  // Trigger on Enter key in either input field
  const handleLatLngKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyLatLng();
  };

  // ── Nominatim search (OpenStreetMap, no API key) ──────────────────────────
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setShowResults(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) { setSearchResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        setSearchResults(data);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const handleSelectResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setLatInput(lat.toFixed(6));
    setLngInput(lng.toFixed(6));
    setInputError('');
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Use current device location ───────────────────────────────────────────
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeolocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setLatInput(lat.toFixed(6));
        setLngInput(lng.toFixed(6));
        setInputError('');
        setGeolocating(false);
      },
      (err) => {
        setGeoError(
          err.code === 1
            ? 'Location access denied. Please allow location permission in your browser.'
            : 'Unable to retrieve your location. Please try again.'
        );
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
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

      {/* ── Search Bar + Current Location ──────────────────────────────────── */}
      <div className="flex gap-2">
      <div ref={searchRef} className="relative flex-1">
        <div className="flex items-center gap-2 bg-admin-bg border border-admin-border rounded-xl px-4 py-2 focus-within:border-admin-accent transition-colors">
          <svg className="w-4 h-4 text-admin-text-muted shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search for a location…"
            className="flex-1 bg-transparent outline-none text-sm text-admin-text-primary placeholder:text-admin-text-muted"
          />
          {searching && (
            <svg className="w-4 h-4 text-admin-text-muted animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <ul className="absolute z-[9999] top-full mt-1 w-full bg-admin-bg border border-admin-border rounded-xl shadow-lg overflow-hidden">
            {searchResults.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm text-admin-text-primary hover:bg-admin-bg-subtle transition-colors border-b border-admin-border last:border-0"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Use Current Location button ─────────────────────────────────── */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={geolocating}
        title="Use my current location"
        className="flex items-center gap-2 px-4 py-2 bg-admin-bg border border-admin-border rounded-xl text-sm text-admin-text-primary hover:border-admin-accent hover:text-admin-accent transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {geolocating ? (
          <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            <circle cx="12" cy="12" r="9" strokeDasharray="2 4" />
          </svg>
        )}
        {geolocating ? 'Locating…' : 'Current Location'}
      </button>
      </div>

      {geoError && (
        <p className="text-xs text-red-400 -mt-2">{geoError}</p>
      )}

      {/* ── Lat / Lng Inputs ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-medium text-admin-text-secondary uppercase tracking-wide">Latitude</label>
          <input
            type="number"
            value={latInput}
            onChange={e => setLatInput(e.target.value)}
            onKeyDown={handleLatLngKeyDown}
            onBlur={applyLatLng}
            step="any"
            placeholder="e.g. 28.613939"
            className="bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text-primary outline-none focus:border-admin-accent transition-colors"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-medium text-admin-text-secondary uppercase tracking-wide">Longitude</label>
          <input
            type="number"
            value={lngInput}
            onChange={e => setLngInput(e.target.value)}
            onKeyDown={handleLatLngKeyDown}
            onBlur={applyLatLng}
            step="any"
            placeholder="e.g. 77.209023"
            className="bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text-primary outline-none focus:border-admin-accent transition-colors"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={applyLatLng}
            className="px-4 py-2 bg-admin-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Go to Location
          </button>
        </div>
      </div>

      {inputError && (
        <p className="text-xs text-red-400 -mt-2">{inputError}</p>
      )}

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div className="h-[500px] w-full rounded-xl overflow-hidden border border-admin-border relative z-0">
        <MapContainer center={defaultCenter} zoom={position ? 16 : 5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController position={position} />
          <ClickHandler onMapClick={handleMapClick} />
          {position && (
            <>
              <Marker position={position} />
              <Circle
                center={position}
                radius={radius}
                pathOptions={{ color: 'var(--admin-accent)', fillColor: 'var(--admin-accent)', fillOpacity: 0.2 }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-admin-bg p-4 rounded-xl border border-admin-border">
        <div>
          {position ? (
            <p className="text-sm text-admin-text-primary font-medium">
              📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </p>
          ) : (
            <p className="text-sm text-admin-text-muted">
              Search, enter coordinates, or click the map to set the shop location.
            </p>
          )}
          <p className="text-xs text-admin-text-secondary mt-1">Allowed radius: {radius} m.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!position || saving}
          className="px-6 py-2 bg-admin-accent text-white rounded-lg font-medium disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save Location'}
        </button>
      </div>
    </div>
  );
}
