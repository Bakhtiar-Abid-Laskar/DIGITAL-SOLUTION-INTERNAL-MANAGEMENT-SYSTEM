import React from 'react';
import { Card } from './Card';
import { cn } from '../../lib/utils';
import { DataTableSkeleton } from './Skeleton';

export interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  skeletonCols?: number;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  tableClassName?: string;
}

export function DataTable({
  children,
  isLoading = false,
  skeletonRows = 5,
  skeletonCols = 5,
  isEmpty = false,
  emptyState,
  className,
  tableClassName,
  ...props
}: DataTableProps) {
  if (isLoading) {
    return <DataTableSkeleton rows={skeletonRows} cols={skeletonCols} className={className} />;
  }

  return (
    <Card 
      noAccentLine 
      className={cn("flex-1 flex flex-col overflow-hidden border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs", className)} 
      {...props}
    >
      {isEmpty && emptyState ? (
        <div className="flex-1 p-8 flex items-center justify-center">
          {emptyState}
        </div>
      ) : (
        <div className="overflow-x-auto flex-1 table-scroll-shadow">
          <table className={cn("w-full text-left text-sm whitespace-nowrap", tableClassName)}>
            {children}
          </table>
        </div>
      )}
    </Card>
  );
}

export function TableHead({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead 
      className={cn(
        "bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border sticky top-0 z-10 text-xs uppercase tracking-wider font-semibold", 
        className
      )} 
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-admin-border bg-admin-bg-surface", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ 
  children, 
  className, 
  isClickable = false,
  ...props 
}: React.HTMLAttributes<HTMLTableRowElement> & { isClickable?: boolean }) {
  return (
    <tr 
      className={cn(
        "transition-colors duration-150",
        isClickable ? "hover:bg-admin-bg-hover cursor-pointer" : "hover:bg-admin-bg-subtle/60",
        className
      )} 
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children, className, align = 'left', ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <th scope="col" className={cn("px-6 py-3.5 font-semibold", alignClass, className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, align = 'left', ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <td className={cn("px-6 py-4", alignClass, className)} {...props}>
      {children}
    </td>
  );
}
