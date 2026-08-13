import React from "react";
import { Job, JobMaterial, User } from '@repairshop/shared';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { formatCurrency } from '@repairshop/shared';
import { calculatePartsTotal, calculateGrandTotal } from '@repairshop/shared';
import { 
  User as UserIcon, Phone, Mail, MapPin, Laptop, 
  Clock, ShieldAlert, Edit, Save, X, ExternalLink, FileText,
  MessageCircle, Printer, CheckCircle
} from "lucide-react";

interface OverviewTabProps {
  job: Job;
  isEditing: boolean;
  editForm: Partial<Job>;
  setEditForm: (val: Partial<Job>) => void;
  technicians: User[];
  materials: JobMaterial[];
  billing: any;
  setIsEditing: (val: boolean) => void;
  handleSaveJob: () => Promise<void>;
  handlePrint: (type: 'receipt' | 'invoice') => void;
  handleSendWhatsApp: () => void;
}

export function OverviewTab({
  job,
  isEditing,
  editForm,
  setEditForm,
  technicians,
  materials,
  billing,
  setIsEditing,
  handleSaveJob,
  handlePrint,
  handleSendWhatsApp
}: OverviewTabProps) {
  const partsTotal = calculatePartsTotal(materials);
  const grandTotal = billing?.grand_total || calculateGrandTotal(
    partsTotal, 
    billing?.labour_charge || 0, 
    billing?.tax_percent || 0, 
    billing?.discount || 0
  );

  return (
    <div className="space-y-6">
      {/* Three Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Customer Information Card */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-admin-text-secondary">Customer Profile</h3>
            <div className="flex gap-2">
              <a href={`tel:${job.customer_contact}`} className="p-1.5 hover:bg-admin-bg-hover rounded text-admin-text-secondary hover:text-admin-text-primary transition-colors">
                <Phone size={16} />
              </a>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-admin-accent/10 flex items-center justify-center text-admin-accent font-bold text-lg">
                {job.customer_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-semibold text-admin-text-primary text-base">{job.customer_name}</h4>
                <p className="text-xs text-admin-text-muted">Customer since {new Date(job.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-sm border-t border-admin-border/50">
              <div className="flex justify-between items-center">
                <span className="text-admin-text-secondary">Phone</span>
                <span className="font-medium text-admin-text-primary">{job.customer_contact}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-admin-text-secondary">Email</span>
                <span className="font-medium text-admin-text-primary truncate max-w-[180px]">{job.customer_email || 'Not Provided'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Device & Job Details Card */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-admin-text-secondary">Device Details</h3>
            <Laptop size={16} className="text-admin-text-muted" />
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-admin-text-muted block uppercase tracking-wider mb-1">Device</span>
                <span className="font-semibold text-admin-text-primary text-sm bg-admin-bg-subtle px-2 py-1 rounded">{job.device_type}</span>
              </div>
              <div>
                <span className="text-xs text-admin-text-muted block uppercase tracking-wider mb-1">Type</span>
                <span className="font-semibold text-admin-text-primary text-sm">{job.job_type}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-admin-border/50 space-y-3">
              <div>
                <span className="text-xs text-admin-text-muted block uppercase tracking-wider mb-1">Reported Issue</span>
                <p className="text-sm font-medium text-admin-text-primary bg-admin-bg-subtle/50 p-3 rounded-lg border border-admin-border/20">{job.reported_issue}</p>
              </div>
              {job.remarks && (
                <div>
                  <span className="text-xs text-admin-text-muted block uppercase tracking-wider mb-1">Remarks</span>
                  <p className="text-xs text-admin-text-secondary italic">{job.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Assignment & Management Card */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-admin-text-secondary">Status & Assignment</h3>
            <ShieldAlert size={16} className="text-admin-text-muted" />
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-admin-text-muted block uppercase tracking-wider mb-1">Status</span>
                <StatusBadge status={job.status} />
              </div>
              <div>
                <span className="text-xs text-admin-text-muted block uppercase tracking-wider mb-1">Priority</span>
                <PriorityBadge priority={job.priority} />
              </div>
            </div>

            <div className="pt-4 border-t border-admin-border/50 space-y-3">
              <span className="text-xs text-admin-text-muted block uppercase tracking-wider">Assigned Tech</span>
              <div className="flex items-center gap-3 bg-admin-bg-subtle p-3 rounded-lg border border-admin-border/30">
                <div className="w-10 h-10 rounded-full bg-admin-accent/5 flex items-center justify-center text-admin-accent">
                  <UserIcon size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-admin-text-primary text-sm">{(job.technician as any)?.name || 'Unassigned'}</h4>
                  {(job.technician as any)?.phone && <p className="text-xs text-admin-text-secondary">{(job.technician as any).phone}</p>}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Onsite & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Work Notes */}
        <Card className="lg:col-span-2 hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-admin-text-secondary">Technician Work Notes</h3>
            <Clock size={16} className="text-admin-text-muted" />
          </div>
          <div className="p-6 min-h-[140px] flex flex-col justify-between">
            {job.work_notes ? (
              <p className="text-sm text-admin-text-primary whitespace-pre-wrap leading-relaxed">
                {job.work_notes}
              </p>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-admin-text-muted italic animate-pulse">No work notes logged by the technician yet.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-admin-border bg-admin-bg-subtle/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-admin-text-secondary">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-1 gap-2.5">
            <Button variant="outline" className="w-full justify-start text-sm py-2" onClick={() => handlePrint('receipt')}>
              <Printer size={16} className="mr-2 text-admin-text-secondary" /> Print Customer Receipt
            </Button>
            {billing ? (
              <>
                <Button variant="outline" className="w-full justify-start text-sm py-2" onClick={() => handlePrint('invoice')}>
                  <FileText size={16} className="mr-2 text-admin-text-secondary" /> Print Tax Invoice
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm py-2" onClick={handleSendWhatsApp}>
                  <MessageCircle size={16} className="mr-2 text-admin-completed-fg" /> WhatsApp Update
                </Button>
              </>
            ) : (
              <div className="bg-admin-bg-subtle text-xs p-3 text-admin-text-secondary rounded border border-admin-border/50 text-center">
                Configure and save invoice in Billing tab to enable WhatsApp actions.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Large Bottom Summary strip */}
      <Card className="bg-admin-bg-subtle/40 border border-admin-border/60">
        <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-6 divide-y md:divide-y-0 md:divide-x divide-admin-border/50">
          <div className="pt-4 md:pt-0">
            <span className="text-xs text-admin-text-secondary block font-medium uppercase tracking-wider mb-1">Parts Subtotal</span>
            <span className="text-lg font-bold text-admin-text-primary">{formatCurrency(partsTotal)}</span>
          </div>
          <div className="pt-4 md:pt-0 md:pl-6">
            <span className="text-xs text-admin-text-secondary block font-medium uppercase tracking-wider mb-1">Labour Charges</span>
            <span className="text-lg font-bold text-admin-text-primary">{formatCurrency(billing?.labour_charge || 0)}</span>
          </div>
          <div className="pt-4 md:pt-0 md:pl-6">
            <span className="text-xs text-admin-text-secondary block font-medium uppercase tracking-wider mb-1">Tax Amount</span>
            <span className="text-lg font-bold text-admin-text-primary">
              {billing?.tax_percent ? `${billing.tax_percent}%` : '0%'}
            </span>
          </div>
          <div className="pt-4 md:pt-0 md:pl-6">
            <span className="text-xs text-admin-text-secondary block font-medium uppercase tracking-wider mb-1">Discounts</span>
            <span className="text-lg font-bold text-admin-urgent-fg">{formatCurrency(billing?.discount || 0)}</span>
          </div>
          <div className="pt-4 md:pt-0 md:pl-6">
            <span className="text-xs text-admin-text-secondary block font-medium uppercase tracking-wider mb-1">Grand Total</span>
            <span className="text-2xl font-black text-admin-accent">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
