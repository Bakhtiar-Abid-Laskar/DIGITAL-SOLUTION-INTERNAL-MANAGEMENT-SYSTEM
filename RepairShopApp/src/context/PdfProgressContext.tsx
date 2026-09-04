import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { PdfProgressModal } from '../components/common/PdfProgressModal';
import {
  MobileInvoiceRequest,
  printInvoice,
  shareInvoice,
  PdfProgressStage,
} from '../lib/invoiceService';

export interface GeneratePdfOptions {
  request: MobileInvoiceRequest;
  title?: string;
  filename?: string;
  mode?: 'print' | 'share';
}

interface PdfProgressContextValue {
  generatePdf: (options: GeneratePdfOptions) => Promise<{ driveLink: string | null } | null>;
}

const PdfProgressContext = createContext<PdfProgressContextValue | undefined>(undefined);

export function PdfProgressProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Generating Document');
  const [stageMessage, setStageMessage] = useState('Initializing...');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = useCallback(async (options: GeneratePdfOptions) => {
    const {
      request,
      title: customTitle = 'Generating Document',
      filename,
      mode = 'print',
    } = options;

    setTitle(customTitle);
    setPercent(10);
    setStageMessage('Preparing document...');
    setError(null);
    setVisible(true);

    try {
      const onProgress = (_stage: PdfProgressStage, pct: number, msg: string) => {
        setPercent(pct);
        setStageMessage(msg);
      };

      let result: { driveLink: string | null };
      if (mode === 'share') {
        result = await shareInvoice(request, filename, onProgress);
      } else {
        result = await printInvoice(request, onProgress);
      }

      setPercent(100);
      setStageMessage('Complete!');

      setTimeout(() => {
        setVisible(false);
      }, 400);

      return result;
    } catch (err: any) {
      setError(err?.message || 'Failed to generate PDF document');
      return null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setError(null);
  }, []);

  const value = useMemo(() => ({ generatePdf }), [generatePdf]);

  return (
    <PdfProgressContext.Provider value={value}>
      {children}
      <PdfProgressModal
        visible={visible}
        title={title}
        stageMessage={stageMessage}
        percent={percent}
        error={error}
        onDismiss={handleDismiss}
      />
    </PdfProgressContext.Provider>
  );
}

export function usePdfGenerator() {
  const context = useContext(PdfProgressContext);
  if (!context) {
    throw new Error('usePdfGenerator must be used within a PdfProgressProvider');
  }
  return context;
}

