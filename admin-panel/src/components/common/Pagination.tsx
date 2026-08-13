import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ currentPage, totalPages, totalItems, pageSize = 20, onPageChange, disabled }: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-admin-border bg-admin-bg-base">
      <div className="text-sm text-admin-text-secondary">
        {totalItems ? (
          <>
            Showing <span className="font-medium text-admin-text-primary">{startItem}–{endItem}</span> of <span className="font-medium text-admin-text-primary">{totalItems}</span> items (Page <span className="font-medium text-admin-text-primary">{currentPage}</span> of <span className="font-medium text-admin-text-primary">{totalPages}</span>)
          </>
        ) : (
          <>
            Page <span className="font-medium text-admin-text-primary">{currentPage}</span> of <span className="font-medium text-admin-text-primary">{totalPages}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || disabled}
          leftIcon={<ChevronLeft size={16} />}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || disabled}
          rightIcon={<ChevronRight size={16} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
