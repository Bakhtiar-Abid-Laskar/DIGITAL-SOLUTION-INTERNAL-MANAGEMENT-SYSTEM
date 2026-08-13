import { useState, useEffect, useRef, useReducer } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { supabase } from "@/lib/supabase";
import { useAppConfig } from "@/context/AppConfigContext";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
  const [state, setState] = useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      loading: false,
      error: null as string | null,
      formData: {
        name: "",
        email: "",
        phone: "",
        role: "technician",
        password: "",
      }
    }
  );

  const { loading, error, formData } = state;
  const { config } = useAppConfig();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Initial focus
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0]?.focus(); // Focus first input
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ loading: true, error: null });

    try {
      const { data, error: functionError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          role: formData.role
        }
      });

      if (functionError) {
        let msg = functionError.message || "Failed to create staff member";
        if (msg.includes("Failed to send a request") || msg.includes("FunctionsFetchError")) {
          msg = "Edge Function 'admin-create-user' is not deployed to your Supabase project yet. Deploy it using: npx supabase functions deploy admin-create-user --project-ref jywydhtiorslayghcycf";
        }
        throw new Error(msg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setState({ error: err.message || "An unexpected error occurred" });
    } finally {
      setState({ loading: false });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <dialog 
        ref={modalRef as any}
        open
        aria-labelledby="add-staff-title"
        className="bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl max-w-md w-full animate-scale-in flex flex-col max-h-[90vh] m-auto relative top-1/2 -translate-y-1/2 backdrop:bg-admin-bg-dark/80 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between p-6 border-b border-admin-border shrink-0">
          <h2 id="add-staff-title" className="text-xl font-semibold text-admin-text-primary">Add New Staff</h2>
          <button onClick={onClose} className="text-admin-text-secondary hover:text-admin-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-admin-urgent-bg text-admin-urgent-fg p-3 rounded-md text-sm border border-admin-urgent-fg/20">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="field-wnhk8f" className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
              <input id="field-wnhk8f"
                type="text"
                required
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
                value={formData.name}
                onChange={e => setState({ formData: { ...formData, name: e.target.value } })}
              />
            </div>

            <div>
              <label htmlFor="field-z1atem" className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
              <input id="field-z1atem"
                type="email"
                required
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
                value={formData.email}
                onChange={e => setState({ formData: { ...formData, email: e.target.value } })}
              />
            </div>

            <div>
              <label htmlFor="field-tms2ab" className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number</label>
              <input id="field-tms2ab"
                type="tel"
                required
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
                value={formData.phone}
                onChange={e => setState({ formData: { ...formData, phone: e.target.value } })}
              />
            </div>

            <div>
              <label htmlFor="field-cdatle" className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
              <select id="field-cdatle"
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
                value={formData.role}
                onChange={e => setState({ formData: { ...formData, role: e.target.value } })}
              >
                {config.roles.map(r => (
                  <option key={r.id} value={r.id}>{r.id.charAt(0).toUpperCase() + r.id.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="field-ixzjsh" className="block text-sm font-medium text-admin-text-secondary mb-1">Temporary Password</label>
              <input id="field-ixzjsh"
                type="password"
                required
                minLength={6}
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
                value={formData.password}
                onChange={e => setState({ formData: { ...formData, password: e.target.value } })}
              />
              <p className="text-xs text-admin-text-muted mt-1">Must be at least 6 characters.</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Staff"}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
