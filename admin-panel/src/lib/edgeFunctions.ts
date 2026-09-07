/**
 * Utility functions for interacting with Supabase Edge Functions.
 */

/**
 * Safely parses and extracts detailed error messages from Supabase FunctionsHttpError.
 * When an Edge Function returns non-2xx, supabase-js sets a generic error.message
 * ("Edge Function returned a non-2xx status code"), while the actual server payload
 * is held inside error.context (a Fetch Response object).
 */
export async function parseEdgeFunctionError(
  error: any,
  fallbackMessage = 'Edge Function returned an error'
): Promise<string> {
  if (!error) return fallbackMessage;

  // Check if error is a FunctionsHttpError with a context Response
  if (error.context && typeof error.context.clone === 'function') {
    try {
      const cloned: Response = error.context.clone();
      const body = await cloned.json();
      if (body?.error && typeof body.error === 'string') {
        return body.error;
      }
      if (body?.message && typeof body.message === 'string') {
        return body.message;
      }
    } catch {
      try {
        const text = await error.context.text();
        if (text && typeof text === 'string' && text.trim()) {
          return text.trim();
        }
      } catch {
        // stream already consumed or unreadable
      }
    }
  }

  // Fallback to error.message if present and meaningful
  if (error.message && typeof error.message === 'string') {
    if (error.message.includes('Failed to send a request') || error.message.includes('FunctionsFetchError')) {
      return 'Could not connect to the Edge Function service. Please check your internet connection or verify the function is deployed.';
    }
    return error.message;
  }

  return fallbackMessage;
}
