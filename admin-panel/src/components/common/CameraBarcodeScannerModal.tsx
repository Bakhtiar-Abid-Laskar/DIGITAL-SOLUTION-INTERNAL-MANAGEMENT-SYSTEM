"use client";

import { useEffect, useRef, useState } from 'react';
import { X, Camera, SwitchCamera, AlertCircle, CheckCircle2, ScanLine } from 'lucide-react';
import { Button } from './Button';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
  targetCount?: number;
  currentCount?: number;
}

export function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode / Serial',
  continuous = false,
  targetCount,
  currentCount,
}: CameraBarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);
  const isScanningRef = useRef(false);
  const lastScannedTimeRef = useRef(0);

  // Initialize camera and BarcodeDetector
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isMounted = true;

    async function initCamera() {
      setCameraError(null);
      setLastScanned(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        startBarcodeDetection();
      } catch (err: any) {
        if (isMounted) {
          console.error('Camera access error:', err);
          setHasCamera(false);
          setCameraError(err.message || 'Unable to access camera');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Barcode Detection Loop
  const startBarcodeDetection = async () => {
    // Check if BarcodeDetector is supported in browser
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (!BarcodeDetectorClass) {
      // Browser does not natively support BarcodeDetector
      setCameraError('Native BarcodeDetector is not supported in this browser. Please use a hardware scanner or type manually.');
      return;
    }

    try {
      const formats = await BarcodeDetectorClass.getSupportedFormats();
      setSupportedFormats(formats);

      const detector = new BarcodeDetectorClass({
        formats: formats.length > 0 ? formats : ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a'],
      });

      isScanningRef.current = true;

      const scanLoop = async () => {
        if (!isScanningRef.current || !videoRef.current) return;

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue?.trim();
              const now = Date.now();

              // Debounce repeat scans of same code within 1.5 seconds
              if (rawValue && (rawValue !== lastScanned || now - lastScannedTimeRef.current > 1500)) {
                lastScannedTimeRef.current = now;
                setLastScanned(rawValue);
                onScan(rawValue);

                // Play audio beep indicator
                try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  osc.type = 'sine';
                  osc.frequency.value = 880; // A5 pitch
                  gain.gain.value = 0.15;
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  osc.start();
                  osc.stop(audioCtx.currentTime + 0.1);
                } catch {
                  // AudioContext may be restricted by autoplay
                }

                if (!continuous) {
                  stopCamera();
                  onClose();
                  return;
                }
              }
            }
          } catch {
            // Ignore frame detection misses
          }
        }

        if (isScanningRef.current) {
          requestAnimationFrame(scanLoop);
        }
      };

      requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.warn('BarcodeDetector error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-admin-bg-surface border border-admin-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-admin-border bg-admin-bg-elevated/40">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-admin-brand" />
            <div>
              <h3 className="text-sm font-bold text-admin-text-primary">{title}</h3>
              {typeof targetCount === 'number' && typeof currentCount === 'number' && (
                <p className="text-xs text-admin-text-muted">
                  Scanned: <span className="font-semibold text-admin-brand">{currentCount}</span> of{' '}
                  <span className="font-semibold text-admin-text-primary">{targetCount}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleCamera}
              className="p-1.5 text-admin-text-muted hover:text-admin-text-primary rounded-lg hover:bg-admin-bg-hover transition-colors"
              title="Flip camera"
            >
              <SwitchCamera size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 text-admin-text-muted hover:text-admin-text-primary rounded-lg hover:bg-admin-bg-hover transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewfinder / Video Canvas */}
        <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-admin-urgent-fg max-w-xs space-y-2">
              <AlertCircle size={36} className="mx-auto text-admin-urgent-fg opacity-80" />
              <p className="text-xs font-semibold">{cameraError}</p>
              <p className="text-[11px] text-admin-text-muted">
                You can still enter serial numbers manually or connect a USB/Bluetooth barcode scanner.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Box Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-4/5 h-1/2 border-2 border-dashed border-admin-brand/70 rounded-xl relative overflow-hidden shadow-2xl">
                  {/* Laser Scan line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-admin-brand shadow-[0_0_8px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              </div>

              {lastScanned && (
                <div className="absolute bottom-3 left-4 right-4 bg-admin-bg-surface/95 border border-admin-brand px-3 py-1.5 rounded-lg text-center backdrop-blur shadow-lg">
                  <span className="text-[11px] text-admin-text-muted uppercase tracking-wider block">Last Detected</span>
                  <span className="text-xs font-mono font-bold text-admin-brand truncate block">{lastScanned}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-admin-bg-surface border-t border-admin-border flex items-center justify-between">
          <span className="text-xs text-admin-text-muted">
            {continuous ? 'Continuous scan enabled' : 'Auto-closes on scan'}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Done Scanning
          </Button>
        </div>
      </div>
    </div>
  );
}
