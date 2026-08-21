'use client';

import { useEffect } from 'react';
import { Button } from '@/components/common/Button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Admin Panel caught an error:', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
      <p className="text-gray-500 max-w-md">
        An unexpected error occurred in the admin panel. Our team has been notified.
      </p>
      {error.message && (
        <div className="bg-gray-100 p-4 rounded-md text-left text-sm font-mono text-gray-700 break-words w-full max-w-lg">
          {error.message}
        </div>
      )}
      <Button variant="primary" onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  );
}
