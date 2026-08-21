"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/common/Input';
import { Supplier } from '@repairshop/shared';
import { supabase } from '@/lib/supabase';
import { Search, Building2, Phone, CheckCircle, Plus, X } from 'lucide-react';

interface SupplierTypeaheadProps {
  name: string;
  selectedSupplierId?: string | null;
  onChangeName: (name: string) => void;
  onSelectSupplier: (supplier: Supplier) => void;
  onClearSupplier?: () => void;
  placeholder?: string;
  error?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SupplierTypeahead({
  name,
  selectedSupplierId,
  onChangeName,
  onSelectSupplier,
  onClearSupplier,
  placeholder = "Search existing supplier or enter new name...",
  error,
  className = "",
  autoFocus = false,
}: SupplierTypeaheadProps) {
  const [results, setResults] = useState<Supplier[]>([]);
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
      const { data, error: rpcError } = await supabase.rpc('search_suppliers', {
        p_query: query.trim(),
        p_limit: 6,
      });

      if (rpcError) throw rpcError;
      setResults((data || []) as Supplier[]);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Error searching suppliers:', err);
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

  const handleSelect = (supplier: Supplier) => {
    onSelectSupplier(supplier);
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
            selectedSupplierId ? 'pr-20 font-semibold border-admin-success/50' : 'pr-8'
          } ${className}`}
        />

        {selectedSupplierId ? (
          <div className="absolute right-2 flex items-center gap-1">
            <span className="flex items-center gap-1 text-[11px] font-bold text-admin-success bg-admin-success/10 px-2 py-0.5 rounded-full border border-admin-success/20">
              <CheckCircle size={12} className="text-admin-success" />
              Linked
            </span>
            {onClearCustomerOrSupplier && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSupplier?.();
                }}
                className="p-1 text-admin-text-muted hover:text-admin-text-primary rounded-full hover:bg-admin-bg-hover transition-colors"
                title="Unlink supplier"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="absolute right-3 flex items-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-admin-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="absolute right-3 text-admin-text-muted pointer-events-none">
            <Search size={15} />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-admin-urgent-fg mt-1">{error}</p>}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-admin-bg-surface border border-admin-border rounded-xl shadow-2xl overflow-hidden animate-fade-in max-h-72 overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-1 space-y-0.5">
              <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase text-admin-text-muted border-b border-admin-border/50">
                Matching Suppliers ({results.length})
              </div>
              {results.map((supplier, idx) => {
                const isSelected = supplier.id === selectedSupplierId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-admin-success/15 border border-admin-success/30'
                        : isHighlighted
                        ? 'bg-admin-brand/10 text-admin-text-primary'
                        : 'hover:bg-admin-bg-hover text-admin-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-admin-brand/10 flex items-center justify-center shrink-0 text-admin-brand">
                        <Building2 size={16} />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-sm text-admin-text-primary truncate flex items-center gap-1.5">
                          {supplier.name}
                          {supplier.gstin && (
                            <span className="text-[10px] bg-admin-bg-elevated px-1.5 py-0.2 rounded border border-admin-border text-admin-text-muted">
                              GST: {supplier.gstin}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-admin-text-muted mt-0.5">
                          {supplier.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {supplier.phone}
                            </span>
                          ) : (
                            <span>No phone</span>
                          )}
                          {supplier.address && (
                            <span className="truncate max-w-[140px] opacity-75">
                              • {supplier.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-xs font-semibold text-admin-success shrink-0 flex items-center gap-1">
                        <CheckCircle size={14} /> Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-admin-text-muted">
              <p>No existing suppliers matching "{name}".</p>
              <p className="text-xs text-admin-brand mt-1 flex items-center justify-center gap-1 font-medium">
                <Plus size={13} /> Will create new supplier on submit
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
const onClearCustomerOrSupplier = true;
