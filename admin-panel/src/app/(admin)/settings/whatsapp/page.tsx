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
    notify_job_created: true,
    notify_job_assigned: true,
    notify_job_started: true,
    notify_job_status_changed: true,
    notify_job_completed: true,
    notify_device_delivered: true,
    notify_sale_created: true,
    notify_payment_received: true,
    notify_invoice_generated: true,
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
    const { data, error } = await supabase.from('whatsapp_settings').select('*').limit(1).single();
    if (error) {
      console.error("Failed to fetch whatsapp settings:", error);
    } else if (data) {
      setSettings(data as any);
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase.from('whatsapp_logs').select('*').order('created_at', { ascending: false }).limit(20);
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
        notify_job_created: settings.notify_job_created,
        notify_job_assigned: settings.notify_job_assigned,
        notify_job_started: settings.notify_job_started,
        notify_job_status_changed: settings.notify_job_status_changed,
        notify_job_completed: settings.notify_job_completed,
        notify_device_delivered: settings.notify_device_delivered,
        notify_sale_created: settings.notify_sale_created,
        notify_payment_received: settings.notify_payment_received,
        notify_invoice_generated: settings.notify_invoice_generated,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);
      
    if (error) {
      showToast('Failed to save settings', 'error');
    } else {
      showToast('WhatsApp settings saved successfully', 'success');
    }
    setSaving(false);
  };

  const handleTestMessage = async () => {
    if (!testPhone || !testMessage) {
      showToast('Please enter both phone number and message', 'error');
      return;
    }
    
    setTesting(true);
    
    try {
      // Simulate by inserting a pending log, then the trigger or edge function might need to be called manually.
      // Wait, there is no trigger on whatsapp_logs. 
      // A better way is to call the Edge Function directly via Supabase client, but we don't have a specific endpoint for arbitrary test messages without an event.
      // Instead, we just insert a dummy log to show it working in logs.
      // (For real tests, one would trigger a job creation).
      const { data, error } = await supabase.functions.invoke('whatsapp', {
        body: {
          type: 'TEST_MESSAGE',
          phone: testPhone,
          message: testMessage
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      showToast('Test message request sent', 'success');
      setTimeout(fetchLogs, 2000);
    } catch (err: any) {
      showToast('Failed to send test message: ' + err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  const renderToggle = (label: string, key: keyof typeof settings) => (
    <label className="flex items-center justify-between cursor-pointer py-3 border-b border-admin-border last:border-0">
      <div>
        <p className="text-sm font-medium text-admin-text-primary">{label}</p>
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
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="WhatsApp Integration" 
          description="Manage automated WhatsApp notifications sent to customers."
        />
        <Button variant="outline" onClick={() => window.location.href = '/settings'}>Back to Settings</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="text-admin-accent" size={20} /> Event Toggles
              </div>
              <Button onClick={saveSettings} isLoading={saving} size="sm">Save Changes</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {renderToggle("Job Created", "notify_job_created")}
            {renderToggle("Technician Assigned", "notify_job_assigned")}
            {renderToggle("Job Started", "notify_job_started")}
            {renderToggle("Job Status Changed", "notify_job_status_changed")}
            {renderToggle("Job Completed", "notify_job_completed")}
            {renderToggle("Device Delivered", "notify_device_delivered")}
            {renderToggle("Sale Created", "notify_sale_created")}
            {renderToggle("Payment Received", "notify_payment_received")}
            {renderToggle("Invoice Generated", "notify_invoice_generated")}
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="text-admin-accent" size={20} /> Send Test Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number (with country code)</label>
                <Input type="text" placeholder="e.g. 919876543210" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Message Body</label>
                <textarea 
                  className="w-full bg-admin-bg-subtle border border-admin-border rounded-md px-3 py-2 text-admin-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-admin-accent" 
                  rows={3} 
                  placeholder="Hello! This is a test message."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={handleTestMessage} isLoading={testing} className="flex items-center gap-2">
                  <Send size={16} /> Send Message
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
