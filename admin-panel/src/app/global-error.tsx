'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold' }}>Critical Error</h2>
          <p style={{ color: '#6b7280', maxWidth: '400px', textAlign: 'center', marginTop: '16px' }}>
            A critical error occurred in the application shell. We apologize for the inconvenience.
          </p>
          <button 
            onClick={() => reset()}
            style={{ marginTop: '24px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
