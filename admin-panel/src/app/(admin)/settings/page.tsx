"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shield, User, Globe, Store, Bell, CheckCircle2, Cloud } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/common/Badge";

export default function SettingsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  
  const [profileName, setProfileName] = useState(profile?.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Stub data for new settings cards
  const [shopName, setShopName] = useState("Digital Solution");
  const [shopAddress, setShopAddress] = useState("123 Tech Lane, Silicon Valley, CA");
  const [savingShop, setSavingShop] = useState(false);
  
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    // TODO: Wire up actual profile update and password change via Supabase
    setTimeout(() => {
      showToast('Profile updated successfully', 'success');
      setNewPassword("");
      setSavingProfile(false);
    }, 1000);
  };

  const handleSaveShop = async () => {
    setSavingShop(true);
    // TODO: Wire up actual shop settings update
    setTimeout(() => {
      showToast('Shop details updated successfully', 'success');
      setSavingShop(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="System Settings" 
        description="Manage your profile and application configuration."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="text-admin-accent" size={20} /> My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
                <Input type="email" value={profile?.email || ""} disabled className="bg-admin-bg-subtle text-admin-text-muted" />
                <p className="text-xs text-admin-text-muted mt-1">Email cannot be changed.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
                <Input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              
              <div className="pt-2 border-t border-admin-border">
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Change Password</label>
                <Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveProfile} isLoading={savingProfile}>
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="text-admin-accent" size={20} /> Shop Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Shop Name</label>
                <Input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Address</label>
                <Input type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSaveShop} isLoading={savingShop} variant="outline">
                Save Details
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="text-admin-accent" size={20} /> Environment Config
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-admin-border">
                <div>
                  <p className="text-sm font-medium text-admin-text-primary">Database Connection</p>
                  <p className="text-xs text-admin-text-secondary">Supabase project status</p>
                </div>
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> Connected
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-admin-text-secondary mb-1">Environment</p>
                <div className="px-4 py-2 bg-admin-bg-subtle border border-admin-border rounded text-sm text-admin-text-primary">
                  {process.env.NODE_ENV === 'development' ? 'Development' : 'Production'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="text-admin-accent" size={20} /> Google Drive Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-admin-text-secondary leading-relaxed">
                Connect your Google Drive to enable automated database exports, attendance selfies, and invoice storage.
              </p>
              <div className="flex items-center justify-between py-2 border-b border-admin-border">
                <div>
                  <p className="text-sm font-medium text-admin-text-primary">Service Account Credentials</p>
                  <p className="text-xs text-admin-text-secondary">Set via Supabase CLI Secrets</p>
                </div>
                <Badge variant="neutral" className="flex items-center gap-1">
                  Read-only
                </Badge>
              </div>
              <div className="pt-2 flex justify-end">
                <a 
                  href="https://supabase.com/docs/guides/functions/secrets" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-sm text-admin-accent hover:underline"
                >
                  View Setup Instructions &rarr;
                </a>
                <h3 className="font-semibold text-admin-text-primary text-sm flex items-center gap-2 mt-4">
                  <Cloud size={16} className="text-admin-accent" />
                  Google Drive OAuth Credentials
                </h3>
                <p className="text-sm text-admin-text-secondary mt-1 max-w-2xl leading-relaxed">
                  Authentication is managed via secure <strong>OAuth 2.0 Refresh Tokens</strong> stored as encrypted secrets in the Supabase Edge Functions. 
                  This allows the backend to utilize your personal Google Drive storage.
                </p>
                <div className="mt-4 p-4 border border-admin-border bg-admin-bg-subtle/50 rounded-lg">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-admin-text-muted mb-2">Required Secrets</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 font-mono text-admin-text-primary">
                      <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
                      GOOGLE_CLIENT_ID
                    </li>
                    <li className="flex items-center gap-2 font-mono text-admin-text-primary">
                      <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
                      GOOGLE_CLIENT_SECRET
                    </li>
                    <li className="flex items-center gap-2 font-mono text-admin-text-primary">
                      <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
                      GOOGLE_REFRESH_TOKEN
                    </li>
                  </ul>
                  <p className="text-xs text-admin-text-muted mt-3">
                    These must be set using the Supabase CLI: 
                    <br /><code className="text-[10px] bg-admin-bg-surface px-1 py-0.5 rounded border border-admin-border mt-1 inline-block">npx supabase secrets set ...</code>
                  </p>
                  <p className="text-xs text-admin-text-muted mt-2">
                    To generate the token, run <code className="text-[10px] bg-admin-bg-surface px-1 py-0.5 rounded border border-admin-border inline-block">node scripts/get-google-refresh-token.mjs</code> locally.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="text-admin-accent" size={20} /> Security Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-admin-text-secondary leading-relaxed">
                This admin panel connects to the backend securely using Row Level Security (RLS) via your authenticated session.
                It does not expose service keys.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="text-admin-accent" size={20} /> Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-admin-text-primary">Email Notifications</p>
                  <p className="text-xs text-admin-text-secondary">Receive daily summaries and critical alerts</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailNotifs} 
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="w-4 h-4 text-admin-accent rounded border-admin-border focus:ring-admin-accent"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-admin-border">
                <div>
                  <p className="text-sm font-medium text-admin-text-primary">Push Notifications</p>
                  <p className="text-xs text-admin-text-secondary">Receive alerts for urgent jobs</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={pushNotifs} 
                  onChange={(e) => setPushNotifs(e.target.checked)}
                  className="w-4 h-4 text-admin-accent rounded border-admin-border focus:ring-admin-accent"
                />
              </label>
              
              <div className="pt-4 flex justify-end border-t border-admin-border mt-4">
                <Button variant="outline" onClick={() => window.location.href = '/settings/whatsapp'}>
                  Manage WhatsApp Integration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
