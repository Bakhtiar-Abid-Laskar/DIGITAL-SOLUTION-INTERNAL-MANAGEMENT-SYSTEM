"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/common/Input';
import { Customer } from '@repairshop/shared';
import { supabase } from '@/lib/supabase';
import { Search, User, Phone, CheckCircle, Plus, Briefcase, ShoppingBag, X } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

interface CustomerTypeaheadProps {
  name: string;
  selectedCustomerId?: string | null;
  onChangeName: (name: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer?: () => void;
  placeholder?: string;
  error?: string;
  className?: string;
  autoFocus?: boolean;
}

export function CustomerTypeahead({
  name,
  selectedCustomerId,
  onChangeName,
  onSelectCustomer,
  onClearCustomer,
  placeholder = "Search existing or type new customer name...",
  error,
  className = "",
  autoFocus = false,
}: CustomerTypeaheadProps) {
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('search_customers', {
        p_query: query.trim(),
        p_limit: 6,
      });

      if (rpcError) throw rpcError;
      setResults((data || []) as Customer[]);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Error searching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChangeName(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchResults(val);
      }, 250);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        e.preventDefault();
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          type="text"
          value={name}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (name.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`${error ? 'border-admin-urgent-fg' : ''} ${
            selectedCustomerId ? 'pr-20 font-semibold border-admin-success/50' : 'pr-8'
          } ${className}`}
        />

        {selectedCustomerId ? (
          <div className="absolute right-2 flex items-center gap-1">
            <span className="flex items-center gap-1 text-[11px] font-bold text-admin-success bg-admin-success/10 px-2 py-0.5 rounded-full border border-admin-success/20">
              <CheckCircle size={12} />
              Existing
            </span>
            {onClearCustomer && (
              <button
                type="button"
                onClick={onClearCustomer}
                className="p-1 text-admin-text-muted hover:text-admin-text-primary rounded"
                title="Clear linked customer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="absolute right-3">
            <div className="w-4 h-4 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Search size={16} className="absolute right-3 text-admin-text-muted pointer-events-none" />
        )}
      </div>

      {/* Floating Type-Ahead Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-3 py-2 bg-admin-bg-subtle/70 border-b border-admin-border flex items-center justify-between text-[11px] font-bold text-admin-text-muted uppercase tracking-wider">
            <span>Matching Directory Customers</span>
            <span>{results.length} found</span>
          </div>

          <div className="divide-y divide-admin-border/50">
            {results.map((cust, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const hasHistory = (cust.total_jobs || 0) > 0 || (cust.total_sales || 0) > 0;

              return (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => handleSelect(cust)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left p-3 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                    isHighlighted ? 'bg-admin-accent-dim text-admin-accent' : 'hover:bg-admin-bg-hover text-admin-text-primary'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">{cust.name}</span>
                      {cust.phone && (
                        <span className="text-xs font-mono text-admin-text-secondary">
                          {cust.phone}
                        </span>
                      )}
                    </div>

                    {(cust.email || cust.address || cust.gstin) && (
                      <p className="text-xs text-admin-text-muted truncate mt-0.5">
                        {[cust.email, cust.address, cust.gstin ? `GST: ${cust.gstin}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cust.total_jobs !== undefined && cust.total_jobs > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-admin-bg-subtle text-admin-text-secondary px-2 py-0.5 rounded-md border border-admin-border">
                        <Briefcase size={11} /> {cust.total_jobs}
                      </span>
                    )}
                    {cust.total_sales !== undefined && cust.total_sales > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-admin-bg-subtle text-admin-text-secondary px-2 py-0.5 rounded-md border border-admin-border">
                        <ShoppingBag size={11} /> {cust.total_sales}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2.5 bg-admin-bg-subtle/50 border-t border-admin-border text-center">
            <p className="text-xs text-admin-text-muted">
              Press <kbd className="px-1 py-0.5 bg-admin-bg-surface border border-admin-border rounded text-[10px] font-mono">Enter</kbd> to select or continue typing to register as a new customer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
