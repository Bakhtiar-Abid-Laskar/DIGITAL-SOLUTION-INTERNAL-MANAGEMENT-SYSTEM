'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Listen for auth state changes (e.g. PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setIsRecoveryReady(true);
        setSessionChecking(false);
      }
    });

    // Check if session is already established from the recovery link
    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError) {
          setError('Unable to verify reset link. Please request a new one.');
        } else if (session) {
          setIsRecoveryReady(true);
        } else {
          // Check if hash has error_description
          if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const desc = hashParams.get('error_description') || 'This password reset link is invalid or has expired.';
            setError(desc);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error verifying recovery session.');
      } finally {
        if (mounted) setSessionChecking(false);
      }
    };

    checkRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1E56CC]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#14337A]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#16233F] border border-[#24355A] rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#14337A] to-[#1E70E0] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#1E70E0]/20 border border-white/10">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Set New Password</h1>
          <p className="text-sm text-[#8A94A6] mt-2">
            Create a secure password for your Digital Solution account.
          </p>
        </div>

        {sessionChecking ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-[#1E70E0] animate-spin" />
            <p className="text-xs text-[#8A94A6]">Verifying password reset link...</p>
          </div>
        ) : success ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-[#10B981]/15 text-[#10B981] rounded-full flex items-center justify-center mx-auto border border-[#10B981]/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Password Updated!</h2>
              <p className="text-sm text-[#8A94A6]">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#14337A] via-[#1A4BB5] to-[#1E70E0] hover:from-[#102963] hover:to-[#195ec2] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[#1E70E0]/25"
            >
              Back to Login
            </Link>
          </div>
        ) : !isRecoveryReady && error ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-[#EF4444]/15 text-[#EF4444] rounded-full flex items-center justify-center mx-auto border border-[#EF4444]/30">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Link Expired or Invalid</h2>
              <p className="text-sm text-[#8A94A6]">{error}</p>
            </div>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#24355A] hover:bg-[#2e4270] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-2.5 text-xs text-[#FCA5A5]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#8A94A6] uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#0F172A] border border-[#24355A] focus:border-[#1E70E0] rounded-xl px-4 py-3 text-sm text-white placeholder-[#8A94A6]/50 outline-none transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A94A6] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8A94A6] uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full bg-[#0F172A] border border-[#24355A] focus:border-[#1E70E0] rounded-xl px-4 py-3 text-sm text-white placeholder-[#8A94A6]/50 outline-none transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A94A6] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#14337A] via-[#1A4BB5] to-[#1E70E0] hover:from-[#102963] hover:to-[#195ec2] active:scale-[0.99] text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-[#1E70E0]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-[#8A94A6] hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
