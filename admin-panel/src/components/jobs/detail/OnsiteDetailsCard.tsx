"use client";
import React, { useState } from 'react';
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { MapPin, Map, Clock, X, ZoomIn } from "lucide-react";

interface OnsiteDetailsCardProps {
  onsiteVisits: any[];
}

function formatTime(time: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(new Date(time));
}

/**
 * Extract Google Drive file ID from any Google Drive URL format:
 *   https://drive.google.com/file/d/FILE_ID/view...
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID
 *   or a bare FILE_ID string
 */
function extractDriveFileId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  // Already a raw ID (no slashes/dots in it)
  const byPath = urlOrId.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (byPath) return byPath[1];
  const byParam = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (byParam) return byParam[1];
  // Bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId)) return urlOrId;
  return null;
}

/** Build an embeddable thumbnail URL from a drive link or file ID */
function driveThumbUrl(driveLink: string | null, fileId: string | null, size = 400): string | null {
  const id = extractDriveFileId(driveLink) || extractDriveFileId(fileId);
  if (!id) return null;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

export function OnsiteDetailsCard({ onsiteVisits }: OnsiteDetailsCardProps) {
  const [lightbox, setLightbox] = useState<{ thumbUrl: string; label: string } | null>(null);

  if (!onsiteVisits || onsiteVisits.length === 0) {
    return (
      <Card>
        <div className="p-5 border-b border-admin-border">
          <h3 className="text-base font-semibold leading-none tracking-tight">Onsite Visit Details</h3>
        </div>
        <div className="p-5 pt-0 mt-4">
          <EmptyState
            icon={<MapPin size={28} />}
            heading="Onsite Tracking"
            subtext="Onsite check-ins and selfies will appear here once logged by the technician."
            asCard={false}
          />
        </div>
      </Card>
    );
  }

  const openLightbox = (thumbUrl: string, label: string) => setLightbox({ thumbUrl, label });
  const closeLightbox = () => setLightbox(null);

  const renderVisitBlock = (
    title: string,
    time: string | null,
    lat: number | null,
    lng: number | null,
    driveLink: string | null,
    fileId: string | null
  ) => {
    const thumbUrl = driveThumbUrl(driveLink, fileId, 400);
    const mapsLink = (lat && lng) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;
    const hasContent = time || lat || lng || thumbUrl;

    if (!hasContent) {
      return (
        <div className="border border-admin-border rounded-lg p-3 bg-admin-bg-subtle text-admin-text-muted text-sm italic">
          {title} not logged yet.
        </div>
      );
    }

    return (
      <div className="border border-admin-border rounded-lg p-3 bg-admin-bg-subtle space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-admin-text-muted">{title}</p>

        <div className="flex items-start gap-3">
          {/* Info */}
          <div className="flex-1 space-y-2 min-w-0">
            {time && (
              <div className="flex items-center gap-2 text-xs text-admin-text-secondary">
                <Clock size={13} className="shrink-0" />
                <span>{formatTime(time)}</span>
              </div>
            )}
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-admin-primary hover:underline"
              >
                <Map size={13} className="shrink-0" />
                <span>{lat?.toFixed(5)}, {lng?.toFixed(5)} — View on Maps</span>
              </a>
            )}
          </div>

          {/* Thumbnail */}
          {thumbUrl && (
            <button
              onClick={() => openLightbox(thumbUrl, title)}
              className="w-16 h-16 rounded-md border border-admin-border overflow-hidden shrink-0 bg-admin-surface group relative"
              title={`View ${title} photo`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl}
                alt={title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ZoomIn size={16} className="text-white" />
              </div>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="flex flex-col">
        <div className="p-5 border-b border-admin-border">
          <h3 className="text-base font-semibold leading-none tracking-tight">Onsite Visit Details</h3>
        </div>
        <div className="p-5 space-y-5">
          {onsiteVisits.map((visit, index) => (
            <div key={visit.id || index} className="space-y-3">
              {onsiteVisits.length > 1 && (
                <p className="text-sm font-semibold text-admin-text-primary">Visit {index + 1}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderVisitBlock(
                  "Arrival",
                  visit.arrival_time,
                  visit.arrival_gps_lat,
                  visit.arrival_gps_lng,
                  visit.arrival_photo_drive_link,
                  visit.arrival_selfie_drive_file_id
                )}
                {renderVisitBlock(
                  "Departure",
                  visit.departure_time,
                  visit.departure_gps_lat,
                  visit.departure_gps_lng,
                  visit.departure_photo_drive_link,
                  visit.departure_selfie_drive_file_id
                )}
              </div>

              {/* Device Photo */}
              {(visit.device_photo_drive_link || visit.device_photo_drive_file_id) && (() => {
                const deviceThumb = driveThumbUrl(visit.device_photo_drive_link, visit.device_photo_drive_file_id, 400);
                return deviceThumb ? (
                  <div className="border border-admin-border rounded-lg p-3 bg-admin-bg-subtle">
                    <p className="text-xs font-semibold uppercase tracking-wide text-admin-text-muted mb-3">Device Photo</p>
                    <button
                      onClick={() => openLightbox(deviceThumb, 'Device Photo')}
                      className="w-20 h-20 rounded-md border border-admin-border overflow-hidden bg-admin-surface group relative"
                      title="View device photo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={deviceThumb}
                        alt="Device Photo"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn size={16} className="text-white" />
                      </div>
                    </button>
                  </div>
                ) : null;
              })()}

              {index < onsiteVisits.length - 1 && <hr className="border-admin-border" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-2xl w-full bg-admin-surface rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-admin-border">
              <p className="font-semibold text-admin-text-primary">{lightbox.label} Photo</p>
              <button
                onClick={closeLightbox}
                className="p-1 rounded-md hover:bg-admin-bg-subtle transition-colors text-admin-text-muted hover:text-admin-text-primary"
              >
                <X size={18} />
              </button>
            </div>
            {/* Full-size image (use larger sz param) */}
            <div className="bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.thumbUrl.replace('sz=w400', 'sz=w1200')}
                alt={lightbox.label}
                className="max-w-full max-h-[75vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
