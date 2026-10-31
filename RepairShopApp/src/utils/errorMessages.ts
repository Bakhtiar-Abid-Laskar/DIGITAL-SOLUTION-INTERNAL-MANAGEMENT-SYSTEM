/**
 * Extracts and formats exact error messages from Supabase, network, or JS exceptions.
 * Ensures the actual diagnostic details (message, details, hint, code) are never swallowed
 * by generic placeholders like "Something went wrong".
 */
export function mapErrorToUserMessage(err: unknown): string {
  if (!err) return 'Unknown error occurred.';

  let message = '';
  let details = '';
  let hint = '';
  let code = '';

  if (typeof err === 'string') {
    message = err;
  } else if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === 'object') {
    const e = err as any;
    message = e.message || e.error_description || (typeof e.error === 'string' ? e.error : '') || '';
    details = typeof e.details === 'string' ? e.details : '';
    hint = typeof e.hint === 'string' ? e.hint : '';
    code = e.code ? `[Code: ${e.code}]` : '';

    if (!message && e.error && typeof e.error === 'object') {
      message = e.error.message || JSON.stringify(e.error);
    }

    if (!message) {
      try {
        message = JSON.stringify(err);
      } catch {
        message = String(err);
      }
    }
  } else {
    message = String(err);
  }

  // Always log raw error for developer debugging
  console.error('[DS Error Detail]', { message, details, hint, code, raw: err });

  // If message ended up as an unhelpful string, clean it up
  if (message === '[object Object]' || message === '{}') {
    try {
      message = JSON.stringify(err);
    } catch {
      message = 'Unknown error occurred.';
    }
  }

  // Build the complete exact error message
  const parts: string[] = [message];
  if (details && details !== message) {
    parts.push(details);
  }
  if (hint) {
    parts.push(`Hint: ${hint}`);
  }
  if (code) {
    parts.push(code);
  }

  return parts.join(' - ');
}

export { showAlert, type AlertButton } from '../context/ToastContext';
