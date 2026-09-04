"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useToast } from "@/components/common/ToastProvider";
import { supabase } from "@/lib/supabase";
import { MessageCircle, Settings, Send, History } from "lucide-react";
import { Badge } from "@/components/common/Badge";

export default function WhatsAppSettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    id: "",
    google_review_url: "https://forms.gle/DigiSolutionReview",
    notify_job_created: true,
    notify_job_status_changed: true,
    notify_job_completed: true,
    notify_device_delivered: true,
    notify_review_link: true,
    notify_sale_created: true,
    notify_invoice_pdf: true,
    notify_payment_pending: true,
  });

  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('whatsapp_settings').select('*').limit(1).maybeSingle();
    if (error) {
      console.error("Failed to fetch whatsapp settings:", error);
    } else if (data) {
      setSettings(prev => ({
        ...prev,
        ...data,
        google_review_url: data.google_review_url || prev.google_review_url,
      }));
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase.from('whatsapp_logs').select('*').order('created_at', { ascending: false }).limit(25);
    if (!error && data) {
      setLogs(data);
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('whatsapp_settings')
      .update({
        google_review_url: settings.google_review_url.trim(),
        notify_job_created: settings.notify_job_created,
        notify_job_status_changed: settings.notify_job_status_changed,
        notify_job_completed: settings.notify_job_completed,
        notify_device_delivered: settings.notify_device_delivered,
        notify_review_link: settings.notify_review_link,
        notify_sale_created: settings.notify_sale_created,
        notify_invoice_pdf: settings.notify_invoice_pdf,
        notify_payment_pending: settings.notify_payment_pending,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);
      
    if (error) {
      showToast('Failed to save settings: ' + error.message, 'error');
    } else {
      showToast('WhatsApp settings & Google Review link saved successfully', 'success');
    }
    setSaving(false);
  };

  const handleTestMessage = async () => {
    if (!testPhone) {
      showToast('Please enter a phone number', 'error');
      return;
    }
    
    setTesting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('notify-on-finance-event', {
        body: {
          action: 'SEND_PENDING_REMINDER',
          phone: testPhone,
          customerName: 'Test Customer',
          reference: 'WhatsApp Integration Test',
          balanceDue: 100,
          totalAmount: 100,
          dueDate: new Date().toLocaleDateString(),
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      showToast('Test WhatsApp message dispatched successfully!', 'success');
      setTimeout(fetchLogs, 2000);
    } catch (err: any) {
      showToast('Test message failed: ' + err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        <PageHeader 
          title="WhatsApp Integration" 
          description="Manage automated WhatsApp notifications sent to customers."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-admin-bg-surface border border-admin-border rounded-xl skeleton-pulse" />
          <div className="h-96 bg-admin-bg-surface border border-admin-border rounded-xl skeleton-pulse" />
        </div>
      </div>
    );
  }

  const renderToggle = (label: string, description: string, key: keyof typeof settings) => (
    <label className="flex items-center justify-between cursor-pointer py-3 border-b border-admin-border last:border-0">
      <div className="pr-4">
        <p className="text-sm font-medium text-admin-text-primary">{label}</p>
        <p className="text-xs text-admin-text-secondary mt-0.5">{description}</p>
      </div>
      <input 
        type="checkbox" 
        checked={!!settings[key]} 
        onChange={() => toggleSetting(key)}
        className="w-4 h-4 text-admin-accent rounded border-admin-border focus:ring-admin-accent"
      />
    </label>
  );

  return (
    <div className="space-y-6 h-full flex flex-col pb-12">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="WhatsApp Customer Notifications" 
          description="Automated notifications sent exclusively to customers across the repair lifecycle."
        />
        <Button variant="outline" onClick={() => window.location.href = '/settings'}>Back to Settings</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6 flex flex-col">
          {/* Google Form Review Link Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="text-admin-accent" size={20} /> Google Review Link
                </div>
                <Button onClick={saveSettings} isLoading={saving} size="sm">Save Settings</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-admin-text-secondary leading-relaxed">
                This link is automatically sent to the customer after their device is marked <strong>Delivered</strong> or upon a <strong>Counter Sale</strong>.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-1">
                  Google Form / Review URL
                </label>
                <div className="flex gap-2">
                  <Input 
                    type="url" 
                    placeholder="https://forms.gle/..."
                    value={settings.google_review_url}
                    onChange={(e) => setSettings(prev => ({ ...prev, google_review_url: e.target.value }))}
                  />
                  {settings.google_review_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(settings.google_review_url, '_blank')}
                      title="Test review link in new tab"
                    >
                      Test Link
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Lifecycle Event Toggles */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="text-admin-accent" size={20} /> Customer Notification Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {renderToggle("Job Intake Confirmation", "Sent immediately when a new repair is registered (contains job code, device, and issue).", "notify_job_created")}
              {renderToggle("Job Status Updates", "Sent when technician begins diagnostics or orders replacement parts.", "notify_job_status_changed")}
              {renderToggle("Ready for Pickup Alert", "Sent when repair is completed with total bill amount and shop pickup hours.", "notify_job_completed")}
              {renderToggle("Google Form Review Request", "Sent when customer collects device or upon completed counter sale.", "notify_review_link")}
              {renderToggle("New Counter Sale Receipt", "Sent immediately upon completing a direct POS counter sale.", "notify_sale_created")}
              {renderToggle("Invoice PDF Delivery", "Sends invoice PDF document link when bill is marked paid.", "notify_invoice_pdf")}
              {renderToggle("Pending Payment Reminders", "Enables outstanding balance reminders with amount due.", "notify_payment_pending")}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="text-admin-accent" size={20} /> Test WhatsApp Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Phone Number (10 digits or with 91)</label>
                <Input type="text" placeholder="e.g. 9876543210" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={handleTestMessage} isLoading={testing} className="flex items-center gap-2">
                  <Send size={16} /> Send Test WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="text-admin-accent" size={20} /> Recent Logs
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs}>Refresh</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[400px]">
              {logs.length === 0 ? (
                <div className="text-sm text-admin-text-muted text-center py-8">No WhatsApp logs found.</div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-admin-bg-subtle border border-admin-border rounded-md text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-admin-text-primary">{log.phone}</span>
                        <Badge variant={log.status === 'sent' ? 'success' : log.status === 'failed' ? 'danger' : 'warning'}>
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-admin-text-secondary line-clamp-2">{log.message}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-admin-text-muted">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        <span>{log.template_name || 'custom'}</span>
                      </div>
                      {log.status === 'failed' && log.error_message && (
                        <div className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
