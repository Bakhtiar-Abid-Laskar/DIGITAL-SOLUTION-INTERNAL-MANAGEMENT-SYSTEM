"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { supabase } from "@/lib/supabase";
import { User } from "@repairshop/shared";
import { useToast } from "@/components/common/ToastProvider";

interface EditStaffModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStaffModal({ isOpen, user, onClose, onSuccess }: EditStaffModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<'admin' | 'receptionist' | 'technician'>("technician");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setRole((user.role as any) || "technician");
      setError(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Staff name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("admin_update_staff_details", {
        p_user_id: user.id,
        p_name: name.trim(),
        p_phone: phone.trim() || null,
        p_role: role,
      });

      if (rpcError) throw new Error(rpcError.message);

      showToast(data?.message || `${name.trim()} updated successfully.`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update staff member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
          <div>
            <h2 className="text-lg font-bold text-admin-text-primary">Edit Staff Member</h2>
            <p className="text-xs text-admin-text-muted mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-admin-text-muted hover:text-admin-text-primary p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-admin-urgent-bg border border-admin-urgent-fg/30 rounded-lg text-sm text-admin-urgent-fg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-admin-bg-subtle border border-admin-border rounded-lg text-sm text-admin-text-primary focus:outline-hidden focus:border-admin-accent transition-colors"
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-admin-bg-subtle border border-admin-border rounded-lg text-sm text-admin-text-primary focus:outline-hidden focus:border-admin-accent transition-colors"
              placeholder="e.g. 9876543210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-1.5">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-admin-bg-subtle border border-admin-border rounded-lg text-sm text-admin-text-primary focus:outline-hidden focus:border-admin-accent transition-colors"
            >
              <option value="technician">Technician</option>
              <option value="receptionist">Receptionist</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-admin-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
