"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  Monitor,
  Camera,
  Network,
  Fingerprint,
  Package,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// 5 Brand Service Categories
const SERVICES = [
  {
    id: "computer",
    label: "Computer\nSales & Service",
    Icon: Monitor,
  },
  {
    id: "cctv",
    label: "CCTV\nSales & Service",
    Icon: Camera,
  },
  {
    id: "networking",
    label: "Networking\nService",
    Icon: Network,
  },
  {
    id: "biometric",
    label: "Biometric\nSales & Service",
    Icon: Fingerprint,
  },
  {
    id: "it_products",
    label: "IT Products\nSales & Service",
    Icon: Package,
  },
];

const STORAGE_KEY = "ds_admin_last_login";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Dynamic greeting state
  const [firstName, setFirstName] = useState<string | null>(null);

  // Load remembered user info on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.email && parsed.rememberMe) {
            setEmail(parsed.email);
            setRememberMe(true);
          }
          if (parsed.firstName) {
            setFirstName(parsed.firstName);
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const triggerErrorShake = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      triggerErrorShake("Please enter both username/email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Supabase Auth Sign In
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("invalid login credentials")) {
          triggerErrorShake("Invalid email or password. Please try again.");
        } else if (authError.message.toLowerCase().includes("email not confirmed")) {
          triggerErrorShake("Account email is not verified. Please contact admin.");
        } else if (authError.message.toLowerCase().includes("rate limit") || authError.message.toLowerCase().includes("too many")) {
          triggerErrorShake("Too many attempts. Please wait a moment and try again.");
        } else {
          triggerErrorShake(authError.message);
        }
        return;
      }

      if (!data.user) {
        triggerErrorShake("Login failed. Please try again.");
        return;
      }

      // 2. Fetch User Profile
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id, name, email, role, is_active")
        .eq("id", data.user.id)
        .single();

      if (userError || !userRow) {
        triggerErrorShake("We couldn't retrieve your account details. Please contact admin.");
        await supabase.auth.signOut();
        return;
      }

      if (!userRow.is_active) {
        triggerErrorShake("Your account is currently inactive. Please contact admin.");
        await supabase.auth.signOut();
        return;
      }

      // 3. Extract First Name & Update Database Login Timestamp
      const extractedFirstName = userRow.name ? userRow.name.trim().split(" ")[0] : "";
      
      // Update last_login_at in database
      try {
        await supabase.rpc("record_user_login");
      } catch {
        await supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
      }

      // 4. Save Remember Me info to localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        if (rememberMe) {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              email: trimmedEmail,
              firstName: extractedFirstName,
              rememberMe: true,
            })
          );
        } else {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              email: "",
              firstName: extractedFirstName,
              rememberMe: false,
            })
          );
        }
      }

      // 5. Navigate to Admin Dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("[Login] Unexpected error:", err);
      triggerErrorShake("A network or server error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const greetingHeadline = firstName ? `Welcome, ${firstName}!` : "Welcome Back!";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0A1A3A] via-[#0D224D] to-[#1E56CC] p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1E56CC]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#14337A]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card Container */}
      <div
        className={`w-full max-w-[420px] bg-white rounded-[28px] shadow-[0_20px_50px_rgba(10,26,58,0.35)] overflow-hidden relative z-10 transition-transform duration-150 ${
          isShaking ? "animate-[shake_0.4s_ease-in-out]" : ""
        }`}
      >
        {/* ─── HEADER PANEL (Gradient + Circuit SVG + Logo Lockup) ─── */}
        <div className="relative bg-gradient-to-br from-[#0A1A3A] to-[#1E56CC] pt-8 pb-10 px-6 text-center overflow-hidden">
          {/* Circuit Board SVG Vector Overlay */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 400 240" fill="none">
              <path
                d="M 10 30 L 70 30 L 110 70 L 170 70 M 240 40 L 290 40 L 330 80 L 390 80 M 30 160 L 80 160 L 120 120 L 190 120 M 260 170 L 310 170 L 350 130 L 390 130"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <circle cx="170" cy="70" r="3.5" fill="#FFFFFF" />
              <circle cx="390" cy="80" r="3.5" fill="#FFFFFF" />
              <circle cx="30" cy="160" r="3.5" fill="#FFFFFF" />
              <circle cx="190" cy="120" r="3.5" fill="#FFFFFF" />
              <circle cx="260" cy="170" r="3.5" fill="#FFFFFF" />
              <line x1="110" y1="70" x2="110" y2="100" stroke="#FFFFFF" strokeWidth="1" />
              <line x1="330" y1="80" x2="330" y2="110" stroke="#FFFFFF" strokeWidth="1" />
            </svg>
          </div>

          {/* Logo Lockup */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/95 shadow-md flex items-center justify-center p-2.5 mb-3">
              <Image
                src="/logo.png"
                alt="Digital Solution Logo"
                width={52}
                height={52}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            {/* Wordmark: DIGITAL SOLUTION */}
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xl font-extrabold text-white tracking-[0.08em]">DIGITAL</span>
              <span className="text-xl font-extrabold text-[#60A5FA] tracking-[0.08em]">SOLUTION</span>
            </div>

            {/* Tagline */}
            <div className="flex items-center justify-center gap-2 mt-1.5 px-4">
              <div className="w-4 h-[1px] bg-white/30" />
              <span className="text-[9px] font-semibold tracking-wider text-white/80 uppercase">
                Smart Solution for a Digital Future
              </span>
              <div className="w-4 h-[1px] bg-white/30" />
            </div>
          </div>
        </div>

        {/* ─── CARD PANEL (White Body) ─── */}
        <div className="bg-white px-6 sm:px-8 pt-6 pb-7 -mt-6 rounded-t-[28px] relative z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
          {/* Greeting Block */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-[#16233F] tracking-tight">{greetingHeadline}</h1>
            <p className="text-xs text-[#8A94A6] mt-0.5">Login to continue to your account</p>
          </div>

          {/* 5 Service Category Chips */}
          <div className="grid grid-cols-5 gap-1.5 mb-6">
            {SERVICES.map((item) => {
              const ServiceIcon = item.Icon;
              return (
                <div key={item.id} className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center mb-1 text-[#1E56CC] shadow-xs">
                    <ServiceIcon size={18} strokeWidth={2} />
                  </div>
                  <span className="text-[8px] font-medium text-[#8A94A6] leading-tight whitespace-pre-line">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 mb-4 animate-fade-in font-medium">
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── FORM INPUTS ─── */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Username / Email Input */}
            <div className="relative flex items-center">
              <div className="absolute left-4 text-[#8A94A6] pointer-events-none">
                <User size={18} />
              </div>
              <input
                type="email"
                placeholder="Username / Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoFocus
                className="w-full bg-[#F3F5F9] border border-[#E7EAF0] focus:border-[#1E56CC] focus:bg-white text-[#16233F] placeholder-[#8A94A6] text-sm rounded-full pl-11 pr-4 py-3 outline-none transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="relative flex items-center">
              <div className="absolute left-4 text-[#8A94A6] pointer-events-none">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                className="w-full bg-[#F3F5F9] border border-[#E7EAF0] focus:border-[#1E56CC] focus:bg-white text-[#16233F] placeholder-[#8A94A6] text-sm rounded-full pl-11 pr-11 py-3 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-[#8A94A6] hover:text-[#16233F] transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Options: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#8A94A6]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    rememberMe
                      ? "bg-[#1E56CC] border-[#1E56CC] text-white"
                      : "bg-white border-[#8A94A6]/50"
                  }`}
                >
                  {rememberMe && <Check size={11} strokeWidth={3} />}
                </div>
                <span>Remember me</span>
              </label>

              <a
                href="mailto:support@digitalsolution.com?subject=Password%20Reset%20Request"
                className="font-semibold text-[#1E56CC] hover:text-[#14337A] transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* ─── LOGIN BUTTON (Gradient Fill) ─── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#14337A] to-[#1E70E0] hover:from-[#102963] hover:to-[#195ec2] active:scale-[0.99] text-white font-bold py-3.5 rounded-xl tracking-wider text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>LOGGING IN...</span>
                </>
              ) : (
                <span>LOGIN</span>
              )}
            </button>
          </form>

          {/* ─── FOOTER ─── */}
          <div className="mt-5 text-center text-xs text-[#8A94A6]">
            <span>Don't have an account? </span>
            <a
              href="mailto:admin@digitalsolution.com?subject=Account%20Inquiry"
              className="font-semibold text-[#1E56CC] hover:underline"
            >
              Contact Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
