"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Wrench, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let friendlyError = error.message;
        if (friendlyError.toLowerCase().includes("timeout") || friendlyError.toLowerCase().includes("fetch")) {
          friendlyError = "Connection issue, please try again.";
        } else if (friendlyError.toLowerCase().includes("rate limit") || friendlyError.toLowerCase().includes("too many requests")) {
          friendlyError = "Too many attempts, please wait a moment.";
        }
        setError(friendlyError);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      let friendlyError = 'Login failed. Please check your credentials and try again.';
      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          friendlyError = 'Invalid email or password.';
        } else {
          friendlyError = err.message;
        }
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-admin-bg-base overflow-hidden">
      {/* Subtle full-bleed background treatment */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-admin-accent-dim via-transparent to-transparent opacity-80" />
      <div className="absolute top-0 w-full h-2 bg-admin-accent" />

      <div className="w-full max-w-md bg-admin-bg-surface p-8 sm:p-10 rounded-[24px] border border-admin-border relative z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-admin-sidebar-bg p-2 flex items-center justify-center mb-4 overflow-hidden">
            <Image src="/logo.webp" alt="Digital Solution Logo" width={64} height={64} className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-center text-admin-text-primary tracking-tight">Digital Solution</h1>
          <p className="text-center text-admin-text-secondary mt-1">Admin Panel Login</p>
        </div>
        
        {error && (
          <div className="bg-admin-danger-dim border border-admin-danger/20 text-admin-danger px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
            <span className="font-semibold text-lg leading-none">!</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="field-vsbdz9" className="block text-admin-text-primary font-medium mb-1.5 text-sm">Email</label>
            <Input id="field-vsbdz9" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="bg-admin-bg-subtle border-transparent focus-visible:bg-white"
            />
          </div>
          <div>
            <label htmlFor="field-ydh8zh" className="block text-admin-text-primary font-medium mb-1.5 text-sm">Password</label>
            <div className="relative">
              <Input id="field-ydh8zh" 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-admin-bg-subtle border-transparent focus-visible:bg-white pr-10"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            isLoading={loading}
            className="w-full mt-2"
          >
            Log In
          </Button>

          <div className="text-right pt-2">
            <Link href="/login/recover" className="text-sm font-medium text-admin-accent hover:text-admin-accent-dark transition-colors">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
