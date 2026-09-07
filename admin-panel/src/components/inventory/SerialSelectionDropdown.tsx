"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AvailableSerial, formatDate } from '@repairshop/shared';
import { Search, Tag, X, Check, ScanLine, AlertCircle, ChevronDown } from 'lucide-react';
import { CameraBarcodeScannerModal } from '../common/CameraBarcodeScannerModal';

interface SerialSelectionDropdownProps {
  productId: string | null;
  productName?: string;
  maxQuantity: number;
  selectedSerialIds: string[];
  selectedSerialNumbers?: string[];
  legacyFreeText?: string;
  onChange: (serialIds: string[], serialNumbers: string[], freeText?: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SerialSelectionDropdown({
  productId,
  productName = 'Product',
  maxQuantity = 1,
  selectedSerialIds = [],
  selectedSerialNumbers = [],
  legacyFreeText = '',
  onChange,
  disabled = false,
  className = '',
}: SerialSelectionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSerials, setAvailableSerials] = useState<AvailableSerial[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualText, setManualText] = useState(legacyFreeText);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch available serials from database
  const fetchAvailableSerials = useCallback(async (query: string) => {
    if (!productId) {
      setAvailableSerials([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_available_serials', {
        p_product_id: productId,
        p_query: query.trim() || null,
        p_limit: 25,
      });

      if (error) throw error;
      setAvailableSerials((data || []) as AvailableSerial[]);
    } catch (err) {
      console.warn('Error fetching available serials:', err);
      setAvailableSerials([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Refetch when dropdown opens or search query changes
  useEffect(() => {
    if (isOpen && productId) {
      fetchAvailableSerials(searchQuery);
    }
  }, [isOpen, productId, searchQuery, fetchAvailableSerials]);

  // Handle selecting a serial from list
  const handleSelectSerial = (serial: AvailableSerial) => {
    if (selectedSerialIds.includes(serial.id)) {
      // Toggle off
      const nextIds = selectedSerialIds.filter((id) => id !== serial.id);
      const nextNumbers = selectedSerialNumbers.filter((num) => num !== serial.serial_number);
      onChange(nextIds, nextNumbers, manualText);
      return;
    }

    if (selectedSerialIds.length >= maxQuantity) {
      // If single quantity, replace existing selection
      if (maxQuantity === 1) {
        onChange([serial.id], [serial.serial_number], manualText);
        setIsOpen(false);
        return;
      }
      return;
    }

    const nextIds = [...selectedSerialIds, serial.id];
    const nextNumbers = [...selectedSerialNumbers, serial.serial_number];
    onChange(nextIds, nextNumbers, manualText);

    if (nextIds.length >= maxQuantity) {
      setIsOpen(false);
    }
  };

  // Handle barcode scanned from camera or hardware
  const handleBarcodeScanned = (scannedCode: string) => {
    const codeClean = scannedCode.trim().toLowerCase();
    const match = availableSerials.find(
      (s) => s.serial_number.toLowerCase() === codeClean
    );

    if (match) {
      handleSelectSerial(match);
    } else {
      // If not in pre-loaded list, attempt direct fetch
      supabase
        .rpc('search_available_serials', {
          p_product_id: productId,
          p_query: scannedCode.trim(),
          p_limit: 5,
        })
        .then(({ data }) => {
          const directMatch = (data as AvailableSerial[] | null)?.find(
            (s) => s.serial_number.toLowerCase() === codeClean
          );
          if (directMatch) {
            handleSelectSerial(directMatch);
          } else {
            // Not found as tracked unit, set as free-text S/N
            setManualText(scannedCode.trim());
            onChange(selectedSerialIds, selectedSerialNumbers, scannedCode.trim());
          }
        });
    }
  };

  // Remove a selected serial chip
  const handleRemoveSerial = (serialId: string) => {
    const idx = selectedSerialIds.indexOf(serialId);
    if (idx === -1) return;
    const nextIds = selectedSerialIds.filter((_, i) => i !== idx);
    const nextNumbers = selectedSerialNumbers.filter((_, i) => i !== idx);
    onChange(nextIds, nextNumbers, manualText);
  };

  const isComplete = selectedSerialIds.length >= maxQuantity;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger & Chips Container */}
      <div 
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
        }}
        className={`min-h-10 px-2.5 py-1.5 rounded-xl border bg-admin-bg-surface flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-admin-border'
            : isOpen
            ? 'border-admin-brand ring-1 ring-admin-brand/30 shadow-xs'
            : isComplete
            ? 'border-admin-success/40 hover:border-admin-success'
            : 'border-admin-border hover:border-admin-border/80'
        }`}
      >
        {/* Chips of selected serials */}
        {selectedSerialNumbers.map((sNum, idx) => (
          <span
            key={`${sNum}-${idx}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-admin-brand/10 border border-admin-brand/20 text-admin-brand text-xs font-mono font-medium shadow-2xs"
          >
            <Tag size={10} />
            <span>{sNum}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveSerial(selectedSerialIds[idx])}
                className="p-0.5 hover:text-admin-urgent-fg rounded transition-colors ml-0.5"
                title="Remove serial"
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}

        {/* If free text manual serial entered */}
        {manualText && selectedSerialNumbers.length === 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-admin-bg-elevated border border-admin-border text-admin-text-secondary text-xs font-mono">
            <span>{manualText}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setManualText('');
                  onChange(selectedSerialIds, selectedSerialNumbers, '');
                }}
                className="p-0.5 hover:text-admin-urgent-fg rounded transition-colors"
              >
                <X size={11} />
              </button>
            )}
          </span>
        )}

        {/* Placeholder if none selected */}
        {selectedSerialNumbers.length === 0 && !manualText && (
          <span className="text-xs text-admin-text-muted select-none flex items-center gap-1">
            <Tag size={12} className="opacity-60" />
            {productId ? 'Select or scan serial...' : 'S/N (optional)'}
          </span>
        )}

        {/* Counter Badge */}
        {productId && maxQuantity > 1 && (
          <span className="ml-auto text-[10px] font-semibold text-admin-text-muted bg-admin-bg-elevated px-1.5 py-0.5 rounded">
            {selectedSerialIds.length}/{maxQuantity}
          </span>
        )}

        {/* Chevron */}
        <ChevronDown size={14} className="ml-auto text-admin-text-muted shrink-0" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl overflow-hidden animate-scale-in max-w-sm sm:max-w-md w-full">
          {/* Search & Camera Bar */}
          <div className="p-2 border-b border-admin-border bg-admin-bg-elevated/40 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search serial or scan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-admin-bg-surface border border-admin-border rounded-lg pl-7 pr-3 py-1.5 text-xs text-admin-text-primary focus:outline-none focus:border-admin-brand font-mono"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-admin-text-muted" />
            </div>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="p-1.5 bg-admin-brand/10 hover:bg-admin-brand/20 text-admin-brand rounded-lg transition-colors"
              title="Scan with Camera"
            >
              <ScanLine size={15} />
            </button>
          </div>

          {/* List of Available Serials */}
          <div className="max-h-52 overflow-y-auto divide-y divide-admin-border/40 p-1">
            {loading ? (
              <div className="py-6 text-center text-xs text-admin-text-muted">
                Searching available serials...
              </div>
            ) : availableSerials.length > 0 ? (
              availableSerials.map((s) => {
                const isSelected = selectedSerialIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSerial(s)}
                    className={`px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-admin-brand/15 text-admin-brand font-semibold'
                        : 'hover:bg-admin-bg-hover text-admin-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold flex items-center gap-1.5">
                        <Tag size={12} />
                        <span>{s.serial_number}</span>
                      </div>
                      <div className="text-[10px] text-admin-text-muted mt-0.5">
                        {s.supplier_name && <span>From {s.supplier_name}</span>}
                        {s.purchase_date && <span> • {formatDate(s.purchase_date)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-admin-brand text-white flex items-center justify-center">
                          <Check size={12} />
                        </div>
                      ) : (
                        <span className="text-[10px] text-admin-text-muted">Click to select</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 px-3 text-center space-y-2">
                <p className="text-xs text-admin-text-muted">
                  {productId
                    ? 'No tracked serials available in stock for this product.'
                    : 'Link a catalog product to search tracked serials.'}
                </p>

                {/* Free-text entry option */}
                <div className="pt-2 border-t border-admin-border/40 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter manual serial number..."
                    value={manualText}
                    onChange={(e) => {
                      setManualText(e.target.value);
                      onChange(selectedSerialIds, selectedSerialNumbers, e.target.value);
                    }}
                    className="w-full bg-admin-bg-surface border border-admin-border rounded-lg px-2 py-1 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-2 py-1 bg-admin-bg-elevated hover:bg-admin-bg-hover text-xs font-semibold rounded-lg border border-admin-border text-admin-text-primary shrink-0"
                  >
                    Set
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title={`Scan Serial for ${productName}`}
        continuous={maxQuantity > 1}
        targetCount={maxQuantity}
        currentCount={selectedSerialIds.length}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
