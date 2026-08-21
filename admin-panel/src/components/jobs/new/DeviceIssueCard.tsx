import React, { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { Textarea } from "@/components/common/Textarea";
import { Laptop, ChevronDown, PlusCircle, Check } from "lucide-react";
import { CreateJobFormState } from '@/app/(admin)/jobs/new/reducer';

interface DeviceIssueCardProps {
  form: CreateJobFormState;
  errors: Record<string, string>;
  deviceTypes: string[];
  onChange: (field: keyof CreateJobFormState, value: any) => void;
}

const DEFAULT_COMMON_DEVICE_TYPES = [
  'Laptop',
  'Mobile Phone',
  'Tablet',
  'Desktop PC',
  'Smartwatch',
  'Printer',
  'Television',
  'Audio / Speaker',
  'Camera',
  'Gaming Console'
];

export function DeviceIssueCard({ form, errors, deviceTypes, onChange }: DeviceIssueCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Combine fetched device types with common defaults, removing duplicates
  const allKnownDeviceTypes = Array.from(
    new Set([...(deviceTypes || []), ...DEFAULT_COMMON_DEVICE_TYPES])
  ).filter(Boolean);

  const currentQuery = (form.device_type || '').trim().toLowerCase();
  
  const filteredTypes = allKnownDeviceTypes.filter(dt => 
    !currentQuery || dt.toLowerCase().includes(currentQuery)
  );

  const hasExactMatch = allKnownDeviceTypes.some(
    dt => dt.toLowerCase() === currentQuery
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card className="border border-admin-border md:col-span-2">
      <div className="p-4 border-b border-admin-border flex items-center gap-2 bg-admin-bg-subtle/50 rounded-t-2xl">
        <Laptop size={18} className="text-admin-accent" />
        <h3 className="text-base font-semibold text-admin-text-primary">Device & Problem Description</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Device Category *</label>
          <div className="relative">
            <Input 
              value={form.device_type}
              onChange={(e) => {
                onChange('device_type', e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Select or type new category (e.g. Laptop, Drone...)"
              className="pr-8"
              error={!!errors.device_type}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2.5 top-3 text-admin-text-muted hover:text-admin-text-primary"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-admin-bg-surface border border-admin-border rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-admin-border animate-fade-in">
              <div className="px-3 py-1.5 text-xs font-semibold text-admin-text-muted bg-admin-bg-subtle flex justify-between items-center">
                <span>Select or Create Device Category</span>
                <span className="text-[10px]">{filteredTypes.length} options</span>
              </div>

              <div className="py-1">
                {filteredTypes.length > 0 ? (
                  filteredTypes.map(dt => {
                    const isSelected = form.device_type?.toLowerCase() === dt.toLowerCase();
                    return (
                      <button
                        key={dt}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-admin-bg-subtle flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text-primary'
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onChange('device_type', dt);
                          setIsOpen(false);
                        }}
                      >
                        <span>{dt}</span>
                        {isSelected && <Check size={14} className="text-admin-accent" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-admin-text-muted">
                    No matching category found in catalog.
                  </div>
                )}
              </div>

              {form.device_type?.trim() && !hasExactMatch && (
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left hover:bg-admin-accent/10 text-admin-accent text-sm font-medium flex items-center gap-2 bg-admin-bg-subtle/50 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsOpen(false);
                  }}
                >
                  <PlusCircle size={15} />
                  <span>Create new category &quot;<strong>{form.device_type.trim()}</strong>&quot;</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Reported Issue *</label>
          <Textarea 
            value={form.reported_issue}
            onChange={(e) => onChange('reported_issue', e.target.value)}
            className={errors.reported_issue ? 'border-admin-urgent-fg' : ''}
            rows={3}
            placeholder="Describe the problem reported by the customer..."
          />
          {errors.reported_issue && <p className="text-xs text-admin-urgent-fg mt-1">{errors.reported_issue}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Remarks & Physical Condition</label>
          <Textarea 
            value={form.remarks}
            onChange={(e) => onChange('remarks', e.target.value)}
            rows={2}
            placeholder="Scratches, missing screws, included charger, serial numbers..."
          />
        </div>
      </div>
    </Card>
  );
}
