"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/common/Input';
import { supabase } from '@/lib/supabase';
import { Search, Package, CheckCircle, Plus, X, Tag } from 'lucide-react';

export interface ProductCatalogItem {
  product_id: string;
  inventory_id?: string;
  name: string;
  sku?: string | null;
  unit: string;
  hsn_sac?: string | null;
  tax_mode: string;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  purchase_rate: number;
  selling_rate: number;
  current_quantity: number;
  low_stock_threshold: number;
  minimum_stock_level: number;
  location?: string | null;
}

interface ProductTypeaheadProps {
  name: string;
  selectedProductId?: string | null;
  onChangeName: (name: string) => void;
  onSelectProduct: (product: ProductCatalogItem) => void;
  onClearProduct?: () => void;
  placeholder?: string;
  error?: string;
  className?: string;
  autoFocus?: boolean;
}

export function ProductTypeahead({
  name,
  selectedProductId,
  onChangeName,
  onSelectProduct,
  onClearProduct,
  placeholder = "Search existing product or enter new item name...",
  error,
  className = "",
  autoFocus = false,
}: ProductTypeaheadProps) {
  const [results, setResults] = useState<ProductCatalogItem[]>([]);
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
      const { data, error: rpcError } = await supabase.rpc('search_products_catalog', {
        p_query: query.trim(),
        p_limit: 6,
      });

      if (rpcError) throw rpcError;
      setResults((data || []) as ProductCatalogItem[]);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Error searching product catalog:', err);
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

  const handleSelect = (product: ProductCatalogItem) => {
    onSelectProduct(product);
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
            selectedProductId ? 'pr-20 font-semibold border-admin-success/50' : 'pr-8'
          } ${className}`}
        />

        {selectedProductId ? (
          <div className="absolute right-2 flex items-center gap-1">
            <span className="flex items-center gap-1 text-[11px] font-bold text-admin-success bg-admin-success/10 px-2 py-0.5 rounded-full border border-admin-success/20">
              <CheckCircle size={12} className="text-admin-success" />
              Existing
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearProduct?.();
              }}
              className="p-1 text-admin-text-muted hover:text-admin-text-primary rounded-full hover:bg-admin-bg-hover transition-colors"
              title="Unlink product"
            >
              <X size={13} />
            </button>
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
                Matching Products in Catalog ({results.length})
              </div>
              {results.map((product, idx) => {
                const isSelected = product.product_id === selectedProductId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => handleSelect(product)}
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
                        <Package size={16} />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-sm text-admin-text-primary truncate flex items-center gap-1.5">
                          {product.name}
                          {product.sku && (
                            <span className="text-[10px] bg-admin-bg-elevated px-1.5 py-0.2 rounded border border-admin-border text-admin-text-muted">
                              SKU: {product.sku}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-admin-text-muted mt-0.5">
                          <span>Stock: <strong className="text-admin-text-primary">{product.current_quantity} {product.unit}</strong></span>
                          <span>• Cost: ₹{product.purchase_rate}</span>
                          <span>• Selling: ₹{product.selling_rate}</span>
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
              <p>No existing products matching "{name}".</p>
              <p className="text-xs text-admin-brand mt-1 flex items-center justify-center gap-1 font-medium">
                <Plus size={13} /> Will create new product & stock entry on submit
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
