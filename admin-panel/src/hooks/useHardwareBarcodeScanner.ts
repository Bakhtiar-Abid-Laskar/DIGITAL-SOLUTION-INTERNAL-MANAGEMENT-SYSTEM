"use client";

import { useEffect, useRef } from 'react';

interface UseHardwareBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  maxIntervalMs?: number;
  minChars?: number;
  preventDefaultOnEnter?: boolean;
}

/**
 * useHardwareBarcodeScanner
 * Universal hook for USB / Bluetooth HID barcode scanners.
 * 
 * Hardware scanners act as high-speed keyboard input (<35-50ms between key events)
 * terminated by an Enter keystroke.
 */
export function useHardwareBarcodeScanner({
  onScan,
  enabled = true,
  maxIntervalMs = 50,
  minChars = 3,
  preventDefaultOnEnter = true,
}: UseHardwareBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier combinations (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // When Enter is pressed
      if (e.key === 'Enter') {
        const bufferedText = bufferRef.current.trim();
        // If buffer has accumulated enough characters quickly, it was a barcode scanner
        if (bufferedText.length >= minChars) {
          if (preventDefaultOnEnter) {
            e.preventDefault();
            e.stopPropagation();
          }
          onScanRef.current(bufferedText);
          bufferRef.current = '';
          return;
        }
        bufferRef.current = '';
        return;
      }

      // Only track printable single characters
      if (e.key.length === 1) {
        // If interval since last key is too long, reset buffer (user is typing slowly by hand)
        if (interval > maxIntervalMs) {
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxIntervalMs, minChars, preventDefaultOnEnter]);
}
