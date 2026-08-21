"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Download, 
  Briefcase, 
  ShoppingBag, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Edit3, 
  Eye, 
  X, 
  Check, 
  Clock, 
  History, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer, CustomerAuditLog, Job, formatCurrency } from '@repairshop/shared';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { SearchFilterBar } from '@/components/common/SearchFilterBar';
import { DataTable, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/common/DataTable';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { useToast } from '@/components/common/ToastProvider';
import { formatDate } from '@/utils/formatDate';

interface CustomerDetailState {
  customer: Customer;
  jobs: any[];
  sales: any[];
  auditLogs: CustomerAuditLog[];
  loadingDetails: boolean;
}

export default function CustomersPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Customer Modal / Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailState | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'sales' | 'audit'>('overview');

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('search_customers', {
        p_query: searchQuery.trim(),
        p_limit: 100,
      });

      if (rpcError) throw rpcError;
      setCustomers((data || []) as Customer[]);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to load customers directory.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const loadCustomerDetails = async (cust: Customer) => {
    setSelectedCustomer({
      customer: cust,
      jobs: [],
      sales: [],
      auditLogs: [],
      loadingDetails: true,
    });
    setEditForm({ ...cust });
    setIsEditing(false);
    setActiveTab('overview');

    try {
      const [jobsRes, salesRes, auditRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, job_code, status, priority, device_type_id, reported_issue, created_at')
          .eq('customer_id', cust.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sales')
          .select('id, sale_code, invoice_number, grand_total, status, payment_mode, created_at')
          .eq('customer_id', cust.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('customer_audit_log')
          .select('*')
          .eq('customer_id', cust.id)
          .order('created_at', { ascending: false }),
      ]);

      setSelectedCustomer({
        customer: cust,
        jobs: jobsRes.data || [],
        sales: salesRes.data || [],
        auditLogs: (auditRes.data || []) as CustomerAuditLog[],
        loadingDetails: false,
      });
    } catch (err) {
      console.error('Error loading customer history:', err);
      setSelectedCustomer((prev) => (prev ? { ...prev, loadingDetails: false } : null));
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedCustomer || !editForm.name?.trim()) {
      showToast('Customer name is required.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const { data, error } = await supabase.rpc('update_customer_profile', {
        p_customer_id: selectedCustomer.customer.id,
        p_name: editForm.name.trim(),
        p_phone: editForm.phone?.trim() || null,
        p_email: editForm.email?.trim() || null,
        p_gstin: editForm.gstin?.trim() || null,
        p_address: editForm.address?.trim() || null,
      });

      if (error) throw error;

      showToast('Customer profile updated successfully!', 'success');
      const updatedCust = data as Customer;
      setSelectedCustomer((prev) => (prev ? { ...prev, customer: updatedCust } : null));
      setIsEditing(false);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update customer profile.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const summary = useMemo(() => {
    const totalCusts = customers.length;
    const totalJobs = customers.reduce((sum, c) => sum + Number(c.total_jobs || 0), 0);
    const totalSales = customers.reduce((sum, c) => sum + Number(c.total_sales || 0), 0);
    return { totalCusts, totalJobs, totalSales };
  }, [customers]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Customers Directory"
        description="Central registry of customer contact information, GST numbers, addresses, and service histories."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={fetchCustomers}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Customers"
          value={summary.totalCusts}
          detail="Registered clients in directory"
          icon={<Users size={18} />}
          tone="info"
        />
        <StatCard
          title="Linked Repair Jobs"
          value={summary.totalJobs}
          detail="Associated service jobs"
          icon={<Briefcase size={18} />}
          tone="warning"
        />
        <StatCard
          title="Linked Counter Sales"
          value={summary.totalSales}
          detail="Completed product retail transactions"
          icon={<ShoppingBag size={18} />}
          tone="success"
        />
      </div>

      {/* Search Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search customers by name, phone, email, GSTIN, or address..."
      />

      {/* Main Customers DataTable */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-admin-bg-surface border border-admin-border skeleton-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCustomers} />
      ) : customers.length === 0 ? (
        <EmptyState
          heading="No customers found"
          subtext={
            searchQuery
              ? "No records matched your search query. Try searching with a different name or phone number."
              : "New customers will automatically populate here whenever a Job or Sale is created."
          }
        />
      ) : (
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Customer Name</TableHeaderCell>
              <TableHeaderCell>Phone / Contact</TableHeaderCell>
              <TableHeaderCell>Email Address</TableHeaderCell>
              <TableHeaderCell>GSTIN</TableHeaderCell>
              <TableHeaderCell>Address</TableHeaderCell>
              <TableHeaderCell align="center">Activity</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {customers.map((cust) => (
              <TableRow key={cust.id} className="hover:bg-admin-bg-hover transition-colors">
                <TableCell className="font-semibold text-admin-text-primary">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-admin-accent/10 border border-admin-accent/20 text-admin-accent flex items-center justify-center font-bold text-xs shrink-0">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{cust.name}</span>
                  </div>
                </TableCell>

                <TableCell className="font-mono text-admin-text-secondary text-sm">
                  {cust.phone || <span className="text-admin-text-muted text-xs">—</span>}
                </TableCell>

                <TableCell className="text-admin-text-secondary text-sm">
                  {cust.email ? (
                    <span className="truncate block max-w-[180px]">{cust.email}</span>
                  ) : (
                    <span className="text-admin-text-muted text-xs">—</span>
                  )}
                </TableCell>

                <TableCell className="font-mono text-xs font-semibold text-admin-text-primary">
                  {cust.gstin || <span className="text-admin-text-muted font-normal">—</span>}
                </TableCell>

                <TableCell className="text-admin-text-secondary text-xs max-w-xs truncate">
                  {cust.address || <span className="text-admin-text-muted">—</span>}
                </TableCell>

                <TableCell align="center">
                  <div className="flex items-center justify-center gap-1.5">
                    {Number(cust.total_jobs || 0) > 0 && (
                      <Badge variant="accent" className="text-xs">
                        {cust.total_jobs} Jobs
                      </Badge>
                    )}
                    {Number(cust.total_sales || 0) > 0 && (
                      <Badge variant="success" className="text-xs">
                        {cust.total_sales} Sales
                      </Badge>
                    )}
                    {Number(cust.total_jobs || 0) === 0 && Number(cust.total_sales || 0) === 0 && (
                      <span className="text-xs text-admin-text-muted font-normal">New</span>
                    )}
                  </div>
                </TableCell>

                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadCustomerDetails(cust)}
                      className="h-8 px-2.5 text-xs text-admin-accent hover:bg-admin-accent-dim"
                      leftIcon={<Eye size={13} />}
                    >
                      View & History
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      {/* Customer Details & History Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          size="xl"
          title={
            <div className="flex items-center justify-between w-full pr-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent font-bold text-base">
                  {selectedCustomer.customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-admin-text-primary leading-tight">
                    {selectedCustomer.customer.name}
                  </h3>
                  <p className="text-xs text-admin-text-muted">
                    Customer ID: {selectedCustomer.customer.id.slice(0, 8)} · Created {formatDate(selectedCustomer.customer.created_at)}
                  </p>
                </div>
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Edit3 size={14} />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          }
          footer={
            isEditing ? (
              <div className="flex items-center justify-end gap-2 w-full">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={savingEdit}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveProfile}
                  isLoading={savingEdit}
                  leftIcon={<Check size={14} />}
                >
                  Save Profile Changes
                </Button>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-admin-border pb-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-text-muted hover:text-admin-text-primary'
                }`}
              >
                Overview & Profile
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'jobs'
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-text-muted hover:text-admin-text-primary'
                }`}
              >
                Linked Jobs ({selectedCustomer.jobs.length})
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'sales'
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-text-muted hover:text-admin-text-primary'
                }`}
              >
                Counter Sales ({selectedCustomer.sales.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'audit'
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-text-muted hover:text-admin-text-primary'
                }`}
              >
                Audit Log ({selectedCustomer.auditLogs.length})
              </button>
            </div>

            {/* TAB CONTENT: Overview / Edit Profile */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                        Customer Name *
                      </label>
                      <Input
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Customer name..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                        Contact Number
                      </label>
                      <Input
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        type="tel"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                        Email Address
                      </label>
                      <Input
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="e.g. client@example.com"
                        type="email"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                        GSTIN
                      </label>
                      <Input
                        value={editForm.gstin || ''}
                        onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                        placeholder="e.g. 18AABCU9603R1ZM"
                        maxLength={15}
                      />
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                        Billing & Delivery Address
                      </label>
                      <Textarea
                        rows={3}
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Enter full physical address..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-admin-bg-subtle/60 rounded-xl border border-admin-border space-y-1">
                      <span className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider block">
                        Contact Phone
                      </span>
                      <p className="text-sm font-bold text-admin-text-primary font-mono flex items-center gap-2">
                        <Phone size={14} className="text-admin-accent" />
                        {selectedCustomer.customer.phone || '—'}
                      </p>
                    </div>

                    <div className="p-4 bg-admin-bg-subtle/60 rounded-xl border border-admin-border space-y-1">
                      <span className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider block">
                        Email Address
                      </span>
                      <p className="text-sm font-semibold text-admin-text-primary flex items-center gap-2 truncate">
                        <Mail size={14} className="text-admin-accent" />
                        {selectedCustomer.customer.email || '—'}
                      </p>
                    </div>

                    <div className="p-4 bg-admin-bg-subtle/60 rounded-xl border border-admin-border space-y-1">
                      <span className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider block">
                        GSTIN
                      </span>
                      <p className="text-sm font-bold text-admin-text-primary font-mono flex items-center gap-2">
                        <FileText size={14} className="text-admin-accent" />
                        {selectedCustomer.customer.gstin || '—'}
                      </p>
                    </div>

                    <div className="p-4 bg-admin-bg-subtle/60 rounded-xl border border-admin-border space-y-1">
                      <span className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider block">
                        Source
                      </span>
                      <p className="text-sm font-semibold text-admin-text-primary capitalize">
                        {selectedCustomer.customer.created_via || 'manual'}
                      </p>
                    </div>

                    <div className="p-4 bg-admin-bg-subtle/60 rounded-xl border border-admin-border space-y-1 col-span-2">
                      <span className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider block">
                        Billing & Delivery Address
                      </span>
                      <p className="text-sm text-admin-text-primary flex items-start gap-2">
                        <MapPin size={15} className="text-admin-accent shrink-0 mt-0.5" />
                        <span>{selectedCustomer.customer.address || 'No address provided.'}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Linked Jobs */}
            {activeTab === 'jobs' && (
              <div className="space-y-3">
                {selectedCustomer.jobs.length === 0 ? (
                  <p className="text-sm text-admin-text-muted text-center py-8">
                    No repair jobs recorded for this customer yet.
                  </p>
                ) : (
                  <div className="border border-admin-border rounded-xl overflow-hidden divide-y divide-admin-border">
                    {selectedCustomer.jobs.map((job) => (
                      <div key={job.id} className="p-3.5 bg-admin-bg-surface flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-admin-text-primary">{job.job_code}</span>
                            <Badge variant={job.status === 'Completed' ? 'success' : 'default'} className="text-xs">
                              {job.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-admin-text-secondary mt-0.5">
                            {job.reported_issue || 'No issue description'} · {formatDate(job.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/jobs/${job.id}`)}
                          className="text-xs text-admin-accent"
                          rightIcon={<ArrowRight size={13} />}
                        >
                          View Job
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Linked Counter Sales */}
            {activeTab === 'sales' && (
              <div className="space-y-3">
                {selectedCustomer.sales.length === 0 ? (
                  <p className="text-sm text-admin-text-muted text-center py-8">
                    No counter sales recorded for this customer yet.
                  </p>
                ) : (
                  <div className="border border-admin-border rounded-xl overflow-hidden divide-y divide-admin-border">
                    {selectedCustomer.sales.map((sale) => (
                      <div key={sale.id} className="p-3.5 bg-admin-bg-surface flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-admin-text-primary">
                              {sale.invoice_number || sale.sale_code}
                            </span>
                            <Badge variant={sale.status === 'Paid' ? 'success' : 'warning'} className="text-xs">
                              {sale.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-admin-text-secondary mt-0.5">
                            Total: {formatCurrency(sale.grand_total)} · {formatDate(sale.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/sales/${sale.id}`)}
                          className="text-xs text-admin-accent"
                          rightIcon={<ArrowRight size={13} />}
                        >
                          View Sale
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Audit Log */}
            {activeTab === 'audit' && (
              <div className="space-y-3">
                {selectedCustomer.auditLogs.length === 0 ? (
                  <p className="text-sm text-admin-text-muted text-center py-8">
                    No audit records logged for this customer.
                  </p>
                ) : (
                  <div className="border border-admin-border rounded-xl overflow-hidden divide-y divide-admin-border">
                    {selectedCustomer.auditLogs.map((log) => (
                      <div key={log.id} className="p-3.5 bg-admin-bg-surface flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={log.action === 'CREATE' ? 'success' : 'accent'} className="text-xs">
                              {log.action}
                            </Badge>
                            <span className="text-xs text-admin-text-muted font-medium">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          {log.old_data && log.new_data && (
                            <p className="text-xs text-admin-text-secondary mt-1">
                              Updated fields: {Object.keys(log.new_data).filter((k) => (log.old_data as any)?.[k] !== (log.new_data as any)?.[k]).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
