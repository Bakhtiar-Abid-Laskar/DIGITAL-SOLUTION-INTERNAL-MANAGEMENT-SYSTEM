import React from 'react';
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { Textarea } from "@/components/common/Textarea";
import { User as UserIcon, MapPin, Mail, Phone, FileText } from "lucide-react";
import { CreateJobFormState } from '@/app/(admin)/jobs/new/reducer';
import { CustomerTypeahead } from '@/components/customers/CustomerTypeahead';
import { Customer } from '@repairshop/shared';

interface CustomerInfoCardProps {
  form: CreateJobFormState;
  errors: Record<string, string>;
  onChange: (field: keyof CreateJobFormState, value: any) => void;
  onAutoFillCustomer?: (customer: Customer) => void;
  onClearCustomer?: () => void;
}

export function CustomerInfoCard({
  form,
  errors,
  onChange,
  onAutoFillCustomer,
  onClearCustomer,
}: CustomerInfoCardProps) {
  const handleCustomerSelected = (cust: Customer) => {
    if (onAutoFillCustomer) {
      onAutoFillCustomer(cust);
    } else {
      onChange('customer_id', cust.id);
      onChange('customer_name', cust.name);
      if (cust.phone) onChange('customer_contact', cust.phone);
      if (cust.email) onChange('customer_email', cust.email);
      if (cust.gstin) onChange('customer_gstin', cust.gstin);
      if (cust.address) onChange('customer_address', cust.address);
    }
  };

  return (
    <Card className="border border-admin-border">
      <div className="p-4 border-b border-admin-border flex items-center gap-2 bg-admin-bg-subtle/50 rounded-t-2xl">
        <UserIcon size={18} className="text-admin-accent" />
        <h3 className="text-base font-semibold text-admin-text-primary">Customer Information</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">
            Customer Name *
          </label>
          <CustomerTypeahead
            name={form.customer_name}
            selectedCustomerId={form.customer_id}
            onChangeName={(val) => {
              onChange('customer_name', val);
              if (form.customer_id) onChange('customer_id', null);
            }}
            onSelectCustomer={handleCustomerSelected}
            onClearCustomer={onClearCustomer ? onClearCustomer : () => onChange('customer_id', null)}
            error={errors.customer_name}
            placeholder="Search existing customer or enter name..."
          />
          {errors.customer_name && <p className="text-xs text-admin-urgent-fg mt-1">{errors.customer_name}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Contact Number *
            </label>
            <Input 
              value={form.customer_contact}
              onChange={(e) => onChange('customer_contact', e.target.value)}
              placeholder="e.g. 9876543210"
              type="tel"
              className={errors.customer_contact ? 'border-admin-urgent-fg' : ''}
            />
            {errors.customer_contact && <p className="text-xs text-admin-urgent-fg mt-1">{errors.customer_contact}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Email Address (Optional)
            </label>
            <Input 
              value={form.customer_email}
              onChange={(e) => onChange('customer_email', e.target.value)}
              placeholder="e.g. john@example.com"
              type="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">
            GSTIN (Optional)
          </label>
          <Input 
            value={form.customer_gstin}
            onChange={(e) => onChange('customer_gstin', e.target.value.toUpperCase())}
            placeholder="e.g. 18AABCU9603R1ZM"
            maxLength={15}
          />
          {errors.customer_gstin && <p className="text-xs text-amber-500 mt-1">{errors.customer_gstin}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">
            Billing & Delivery Address (Optional)
          </label>
          <Textarea 
            rows={2}
            value={form.customer_address || ''}
            onChange={(e) => onChange('customer_address', e.target.value)}
            placeholder="Enter customer physical address..."
            className="text-sm"
          />
        </div>
      </div>
    </Card>
  );
}
