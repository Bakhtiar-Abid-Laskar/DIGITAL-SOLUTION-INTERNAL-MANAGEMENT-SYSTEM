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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#07132B] via-[#0A1A3A] to-[#164194] p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#1E56CC]/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-[#14337A]/35 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1E56CC]/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Main Login Card Container */}
      <div
        className={`w-full max-w-[460px] bg-white rounded-[32px] shadow-[0_25px_70px_rgba(7,19,43,0.45),0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden relative z-10 transition-transform duration-150 border border-white/20 ${
          isShaking ? "animate-[shake_0.4s_ease-in-out]" : ""
        }`}
      >
        {/* ─── HEADER PANEL (Gradient + High-Res Enlarged Logo + Circuit SVG) ─── */}
        <div className="relative bg-gradient-to-br from-[#0A1A3A] via-[#0E265C] to-[#1E56CC] pt-10 pb-12 px-6 sm:px-8 text-center overflow-hidden">
          {/* Circuit Board SVG Vector Overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 460 260" fill="none">
              <path
                d="M 20 40 L 90 40 L 140 90 L 210 90 M 270 50 L 330 50 L 380 100 L 440 100 M 40 180 L 100 180 L 150 130 L 230 130 M 290 190 L 350 190 L 400 140 L 440 140"
                stroke="#FFFFFF"
                strokeWidth="1.75"
              />
              <circle cx="210" cy="90" r="4" fill="#FFFFFF" />
              <circle cx="440" cy="100" r="4" fill="#FFFFFF" />
              <circle cx="40" cy="180" r="4" fill="#FFFFFF" />
              <circle cx="230" cy="130" r="4" fill="#FFFFFF" />
              <circle cx="290" cy="190" r="4" fill="#FFFFFF" />
              <line x1="140" y1="90" x2="140" y2="125" stroke="#FFFFFF" strokeWidth="1.25" />
              <line x1="380" y1="100" x2="380" y2="135" stroke="#FFFFFF" strokeWidth="1.25" />
            </svg>
          </div>

          {/* Logo Lockup with ENLARGED Prominent Logo */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Enlarged Logo Badge (2.5x larger, clear focal point) */}
            <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-[24px] bg-white/95 shadow-[0_12px_28px_rgba(0,0,0,0.25),0_2px_8px_rgba(255,255,255,0.4)_inset] flex items-center justify-center p-3 mb-4 transition-transform hover:scale-105 duration-200">
              <Image
                src="/logo.png"
                alt="Digital Solution Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            {/* Wordmark: DIGITAL SOLUTION */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl sm:text-[26px] font-black text-white tracking-[0.09em] drop-shadow-sm">
                DIGITAL
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-[#60A5FA] tracking-[0.09em] drop-shadow-sm">
                SOLUTION
              </span>
            </div>

            {/* Tagline */}
            <div className="flex items-center justify-center gap-2.5 mt-2 px-4 max-w-sm">
              <div className="w-6 h-[1.5px] bg-white/30 rounded-full" />
              <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.15em] text-white/85 uppercase">
                Smart Solution for a Digital Future
              </span>
              <div className="w-6 h-[1.5px] bg-white/30 rounded-full" />
            </div>
          </div>
        </div>

        {/* ─── CARD PANEL (White Body with Soft Seam & Depth) ─── */}
        <div className="bg-white px-7 sm:px-9 pt-7 pb-8 -mt-7 rounded-t-[32px] relative z-20 shadow-[0_-10px_25px_rgba(10,26,58,0.06)]">
          {/* Greeting Block */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#16233F] tracking-tight">
              {greetingHeadline}
            </h1>
            <p className="text-[13px] text-[#8A94A6] mt-1 font-normal">
              Login to continue to your account
            </p>
          </div>

          {/* 5 Service Category Chips Row */}
          <div className="grid grid-cols-5 gap-2 mb-7">
            {SERVICES.map((item) => {
              const ServiceIcon = item.Icon;
              return (
                <div
                  key={item.id}
                  className="group flex flex-col items-center text-center cursor-default transition-transform hover:-translate-y-0.5 duration-150"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#EAF1FF] flex items-center justify-center mb-1.5 text-[#1E56CC] group-hover:bg-[#dbe7ff] transition-colors shadow-xs">
                    <ServiceIcon size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[9px] font-semibold text-[#8A94A6] group-hover:text-[#16233F] transition-colors leading-[12px] whitespace-pre-line">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 mb-5 animate-fade-in font-medium shadow-xs">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── FORM INPUTS ─── */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Email Input */}
            <div>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-[#8A94A6] pointer-events-none">
                  <User size={19} />
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
                  className="w-full bg-[#F3F5F9] border border-[#E7EAF0] focus:border-[#1E56CC] focus:bg-white text-[#16233F] placeholder-[#8A94A6] text-sm rounded-full pl-12 pr-4 py-3.5 outline-none transition-all shadow-2xs focus:shadow-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-[#8A94A6] pointer-events-none">
                  <Lock size={19} />
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
                  className="w-full bg-[#F3F5F9] border border-[#E7EAF0] focus:border-[#1E56CC] focus:bg-white text-[#16233F] placeholder-[#8A94A6] text-sm rounded-full pl-12 pr-12 py-3.5 outline-none transition-all shadow-2xs focus:shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-[#8A94A6] hover:text-[#16233F] transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Options: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-[#8A94A6] hover:text-[#16233F] transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                    rememberMe
                      ? "bg-[#1E56CC] border-[#1E56CC] text-white shadow-xs"
                      : "bg-white border-[#8A94A6]/50"
                  }`}
                >
                  {rememberMe && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="font-medium text-[13px]">Remember me</span>
              </label>

              <a
                href="mailto:support@digitalsolution.com?subject=Password%20Reset%20Request"
                className="font-semibold text-[13px] text-[#1E56CC] hover:text-[#14337A] transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* ─── LOGIN BUTTON (Gradient Fill + Elevation) ─── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#14337A] via-[#1A4BB5] to-[#1E70E0] hover:from-[#102963] hover:via-[#16419E] hover:to-[#195ec2] active:scale-[0.99] text-white font-bold py-4 rounded-2xl tracking-[0.1em] text-sm shadow-[0_6px_20px_rgba(30,112,224,0.35)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  <span>LOGGING IN...</span>
                </>
              ) : (
                <span>LOGIN</span>
              )}
            </button>
          </form>

          {/* ─── FOOTER ─── */}
          <div className="mt-6 text-center text-xs text-[#8A94A6]">
            <span>Don't have an account? </span>
            <a
              href="mailto:admin@digitalsolution.com?subject=Account%20Inquiry"
              className="font-semibold text-[#1E56CC] hover:text-[#14337A] hover:underline transition-colors"
            >
              Contact Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
