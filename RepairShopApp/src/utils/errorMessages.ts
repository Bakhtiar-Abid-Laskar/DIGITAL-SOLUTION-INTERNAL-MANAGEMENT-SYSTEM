/**
 * Maps raw Supabase / network errors to user-friendly messages.
 * Always logs the original error to console.error for developer visibility.
 */
export function mapErrorToUserMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  // Log raw for developers
  console.error('[DS Error]', raw);

  // Network / connection
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('network')) {
    return 'No internet connection. Please check your network and try again.';
  }

  // Auth errors
  if (raw.includes('JWT') || raw.includes('token') || raw.includes('session')) {
    return 'Your session has expired. Please log in again.';
  }
  if (raw.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (raw.includes('Email not confirmed')) {
    return 'Please verify your email before logging in.';
  }

  // Unique constraint violations
  if (raw.includes('unique constraint') || raw.includes('duplicate key')) {
    if (raw.includes('attendance') || raw.includes('user_id, date')) {
      return 'Attendance for today has already been recorded.';
    }
    if (raw.includes('job_code')) {
      return 'A job with this code already exists. Please try again.';
    }
    if (raw.includes('billing') || raw.includes('job_id')) {
      return 'A bill for this job already exists.';
    }
    return 'This record already exists.';
  }

  // Foreign key violations
  if (raw.includes('foreign key') || raw.includes('violates foreign key constraint')) {
    return 'This record is linked to other data and cannot be removed.';
  }

  // Row not found
  if (raw.includes('No rows') || raw.includes('PGRST116') || raw.includes('not found')) {
    return 'The requested record was not found.';
  }

  // RLS / permission errors
  if (raw.includes('row-level security') || raw.includes('permission denied') || raw.includes('PGRST301')) {
    return 'You do not have permission to perform this action.';
  }

  // Storage errors
  if (raw.includes('Storage') || raw.includes('upload') || raw.includes('bucket')) {
    return 'Failed to upload the file. Please check your connection and try again.';
  }

  // Location errors
  if (raw.includes('Location') || raw.includes('GPS') || raw.includes('location')) {
    return 'Unable to get your location. Please enable location services and try again.';
  }

  // Camera errors
  if (raw.includes('Camera') || raw.includes('camera')) {
    return 'Camera access is required. Please enable camera permissions in Settings.';
  }

  // Print errors
  if (raw.includes('print') || raw.includes('Print')) {
    return 'Printing failed. Please ensure a printer is available and try again.';
  }

  // Timeout
  if (raw.includes('timeout') || raw.includes('Timeout')) {
    return 'The request timed out. Please try again.';
  }

  // Generic fallback — intentionally vague for security
  return 'Something went wrong. Please try again.';
}
