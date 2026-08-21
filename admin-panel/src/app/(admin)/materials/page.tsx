"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Package, 
  Download, 
  RefreshCw, 
  Wrench, 
  DollarSign,
  Boxes,
  Bell,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { DataTable, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/common/DataTable";
import { Button } from "@/components/common/Button";
import { Select } from "@/components/common/Select";
import { Badge } from "@/components/common/Badge";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { useToast } from "@/components/common/ToastProvider";
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from "@/utils/formatDate";
import { exportMaterialsToCSV, MaterialExportRow } from "@/utils/materialsCsv";

interface AllottedMaterialRow {
  id: string;
  material_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: 'allotted' | 'returned' | 'used';
  allotted_at: string;
  returned_at?: string | null;
  technician_id?: string | null;
  technician_name: string;
  job_id?: string | null;
  job_code?: string | null;
  customer_name?: string | null;
  inventory_id?: string | null;
  notes?: string | null;
  source: 'material_allotments' | 'job_materials';
}

export default function MaterialsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allotments, setAllotments] = useState<AllottedMaterialRow[]>([]);
  const [activeTab, setActiveTab] = useState<'allotted' | 'returned' | 'all'>('allotted');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTech, setSelectedTech] = useState<string>("ALL");
  const [returningId, setReturningId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch from material_allotments (the dedicated holding table)
      const { data: allotData, error: allotError } = await supabase
        .from("material_allotments")
        .select(`
          id,
          job_id,
          inventory_id,
          product_id,
          technician_id,
          allotted_by,
          quantity,
          status,
          allotted_at,
          returned_at,
          returned_by,
          notes,
          technician:users!material_allotments_technician_id_fkey ( id, name ),
          allotted_by_user:users!material_allotments_allotted_by_fkey ( id, name ),
          inventory ( id, item_name, unit, cost_price, selling_rate ),
          product:products ( id, name, unit ),
          job:jobs ( id, job_code, customer_name, technician:users!jobs_technician_id_fkey(name) )
        `)
        .order("allotted_at", { ascending: false });

      if (allotError) throw allotError;

      // 2. Fetch unconfirmed job_materials (legacy / in-use material line items)
      const { data: jobMatsData, error: jobMatsError } = await supabase
        .from("job_materials")
        .select(`
          id,
          job_id,
          inventory_id,
          product_id,
          technician_id,
          material_name,
          quantity,
          added_qty,
          used_qty,
          remaining_qty,
          unit_cost,
          total_cost,
          status,
          checkout_status,
          created_at,
          returned_at,
          technicians:users!job_materials_technician_id_fkey ( id, name ),
          jobs ( id, job_code, customer_name, technician:users!jobs_technician_id_fkey(name) )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (jobMatsError) throw jobMatsError;

      // Format material_allotments rows
      const formattedAllotments: AllottedMaterialRow[] = (allotData || []).map((row: any) => {
        const itemName = row.inventory?.item_name || row.product?.name || 'Material';
        const unitCost = Number(row.inventory?.cost_price || row.inventory?.selling_rate || 0);
        const qty = Number(row.quantity || 0);
        const techName = row.technician?.name || row.job?.technician?.name || row.allotted_by_user?.name || "Unassigned";

        return {
          id: row.id,
          material_name: itemName,
          quantity: qty,
          unit_cost: unitCost,
          total_cost: qty * unitCost,
          status: row.status as any,
          allotted_at: row.allotted_at || new Date().toISOString(),
          returned_at: row.returned_at,
          technician_id: row.technician_id || row.job?.technician_id,
          technician_name: techName,
          job_id: row.job_id,
          job_code: row.job?.job_code || null,
          customer_name: row.job?.customer_name || null,
          inventory_id: row.inventory_id,
          notes: row.notes,
          source: 'material_allotments',
        };
      });

      // Format legacy / historical job_materials rows
      const formattedJobMats: AllottedMaterialRow[] = (jobMatsData || []).map((row: any) => {
        const qty = Number(row.quantity || 0);
        const unitCost = Number(row.unit_cost || 0);
        const techName = row.technicians?.name || row.jobs?.technician?.name || "Unassigned";

        return {
          id: row.id,
          material_name: row.material_name,
          quantity: qty,
          unit_cost: unitCost,
          total_cost: row.total_cost ? Number(row.total_cost) : qty * unitCost,
          status: (row.status === 'returned' ? 'returned' : 'allotted') as any,
          allotted_at: row.created_at || new Date().toISOString(),
          returned_at: row.returned_at,
          technician_id: row.technician_id,
          technician_name: techName,
          job_id: row.job_id,
          job_code: row.jobs?.job_code || null,
          customer_name: row.jobs?.customer_name || null,
          inventory_id: row.inventory_id,
          notes: null,
          source: 'job_materials',
        };
      });

      // Prefer dedicated material_allotments; if empty, use job_materials
      const combined = formattedAllotments.length > 0 ? formattedAllotments : formattedJobMats;
      setAllotments(combined);
    } catch (err: any) {
      console.error("Error fetching materials:", err.message);
      setError(err.message || "Failed to load materials data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes on material_allotments and job_materials
    const channel = supabase
      .channel('admin_materials_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'material_allotments' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_materials' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleNotify = async (row: AllottedMaterialRow) => {
    if (!row.technician_id) {
      showToast("No technician assigned to notify.", "error");
      return;
    }
    setNotifyingId(row.id);
    try {
      if (row.source === 'material_allotments') {
        const { error } = await supabase.rpc('notify_technician_allocated_material', {
          p_allotment_id: row.id
        });
        if (error) throw error;
      } else {
        // Fallback for direct notifications table insert
        const { error } = await supabase.from('notifications').insert({
          recipient_user_id: row.technician_id,
          job_id: row.job_id || null,
          message: `Please return leftover ${row.quantity} unit(s) of ${row.material_name} to stock.`,
          channel: 'push',
          status: 'pending',
          sent_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      showToast(`Notification sent to ${row.technician_name}.`, "success");
    } catch (err: any) {
      showToast("Error sending notification: " + err.message, "error");
    } finally {
      setNotifyingId(null);
    }
  };

  const handleReturn = async (row: AllottedMaterialRow) => {
    if (!confirm(`Return ${row.quantity} unit(s) of "${row.material_name}" to central inventory?`)) return;
    setReturningId(row.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (row.source === 'material_allotments') {
        const { error } = await supabase.rpc('return_allocated_material', {
          p_allotment_id: row.id,
          p_user_id: userId || null
        });
        if (error) throw error;
      } else {
        // Fallback for legacy job_materials return
        const { error } = await supabase.from('job_materials').update({
          status: 'returned',
          returned_at: new Date().toISOString()
        }).eq('id', row.id);
        if (error) throw error;
      }

      showToast(`Successfully returned ${row.quantity} unit(s) of ${row.material_name} to stock!`, "success");
      fetchData();
    } catch (e: any) {
      showToast("Failed to return material: " + e.message, "error");
    } finally {
      setReturningId(null);
    }
  };

  const uniqueTechnicians = useMemo(() => {
    const techSet = new Set<string>();
    allotments.forEach((m) => {
      if (m.technician_name && m.technician_name !== "Unassigned") {
        techSet.add(m.technician_name);
      }
    });
    return Array.from(techSet).sort();
  }, [allotments]);

  const filteredMaterials = useMemo(() => {
    return allotments.filter((m) => {
      // Tab filter
      if (activeTab === 'allotted' && m.status !== 'allotted') return false;
      if (activeTab === 'returned' && m.status !== 'returned') return false;

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.material_name.toLowerCase().includes(q) ||
        (m.job_code && m.job_code.toLowerCase().includes(q)) ||
        (m.customer_name && m.customer_name.toLowerCase().includes(q)) ||
        m.technician_name.toLowerCase().includes(q);

      // Tech filter
      const matchTech =
        selectedTech === "ALL" || m.technician_name === selectedTech;

      return matchSearch && matchTech;
    });
  }, [allotments, activeTab, searchQuery, selectedTech]);

  const summary = useMemo(() => {
    const activeHoldings = allotments.filter((m) => m.status === 'allotted');
    const totalUnitsHeld = activeHoldings.reduce((sum, m) => sum + m.quantity, 0);
    const totalCostHeld = activeHoldings.reduce((sum, m) => sum + m.total_cost, 0);
    const returnedCount = allotments.filter((m) => m.status === 'returned').length;

    return {
      activeCount: activeHoldings.length,
      totalUnitsHeld,
      totalCostHeld,
      returnedCount,
    };
  }, [allotments]);

  const exportData: MaterialExportRow[] = useMemo(() => {
    return filteredMaterials.map((m) => ({
      id: m.id,
      material_name: m.material_name,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      total_cost: m.total_cost,
      created_at: m.allotted_at,
      technician_name: m.technician_name,
      job_code: m.job_code || "",
      customer_name: m.customer_name || "",
    }));
  }, [filteredMaterials]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Allocated Materials"
        description="Track and reconcile materials held by field technicians and allocated to repair jobs."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={() => exportMaterialsToCSV(exportData)}
              disabled={filteredMaterials.length === 0}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Allocations"
          value={summary.activeCount}
          detail={`${summary.returnedCount} returned items in ledger`}
          icon={<Boxes size={18} />}
          tone="info"
        />
        <StatCard
          title="Units Held by Technicians"
          value={summary.totalUnitsHeld}
          detail="Pending return to central stock"
          icon={<Package size={18} />}
          tone="warning"
        />
        <StatCard
          title="Total Value in Field"
          value={formatCurrency(summary.totalCostHeld)}
          detail="Combined valuation of parts held"
          icon={<DollarSign size={18} />}
          tone="success"
        />
      </div>

      {/* Filter Tabs + Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-admin-border pb-1">
          <button
            onClick={() => setActiveTab('allotted')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'allotted'
                ? 'border-admin-accent text-admin-accent'
                : 'border-transparent text-admin-text-muted hover:text-admin-text-primary'
            }`}
          >
            Active Holdings ({allotments.filter(m => m.status === 'allotted').length})
          </button>
          <button
            onClick={() => setActiveTab('returned')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'returned'
                ? 'border-admin-accent text-admin-accent'
                : 'border-transparent text-admin-text-muted hover:text-admin-text-primary'
            }`}
          >
            Returned to Stock ({allotments.filter(m => m.status === 'returned').length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'border-admin-accent text-admin-accent'
                : 'border-transparent text-admin-text-muted hover:text-admin-text-primary'
            }`}
          >
            All Ledger Records ({allotments.length})
          </button>
        </div>

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by material, job code, customer, or technician..."
        >
          <div className="w-48">
            <Select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="h-10 text-sm"
              aria-label="Filter by Technician"
            >
              <option value="ALL">All Technicians</option>
              {uniqueTechnicians.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        </SearchFilterBar>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-admin-bg-surface border border-admin-border skeleton-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          heading="No allocated materials found"
          subtext={
            activeTab === 'allotted'
              ? "All technicians have zero outstanding parts holding."
              : "No records matched your search or filters."
          }
        />
      ) : (
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Material / Part</TableHeaderCell>
              <TableHeaderCell>Technician</TableHeaderCell>
              <TableHeaderCell>Source Job</TableHeaderCell>
              <TableHeaderCell align="center">Quantity</TableHeaderCell>
              <TableHeaderCell align="right">Unit Cost</TableHeaderCell>
              <TableHeaderCell align="right">Total Value</TableHeaderCell>
              <TableHeaderCell>Status / Date</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filteredMaterials.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-semibold text-admin-text-primary">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-admin-bg-subtle border border-admin-border text-admin-text-secondary flex items-center justify-center shrink-0">
                      <Package size={16} />
                    </div>
                    <div>
                      <span className="leading-tight block">{row.material_name}</span>
                      {row.notes && (
                        <span className="text-xs text-admin-text-muted font-normal block mt-0.5">{row.notes}</span>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2 text-admin-text-primary font-medium">
                    <div className="w-6 h-6 rounded-full bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent text-xs font-bold shrink-0">
                      {row.technician_name[0].toUpperCase()}
                    </div>
                    <span className={row.technician_name === "Unassigned" ? "text-admin-text-muted italic" : "text-admin-text-primary"}>
                      {row.technician_name}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  {row.job_code ? (
                    <button
                      onClick={() => row.job_id && router.push(`/jobs/${row.job_id}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-admin-accent-dim text-admin-accent hover:bg-admin-accent/20 font-semibold text-xs transition-colors cursor-pointer"
                      title="View Job"
                    >
                      <Wrench size={13} />
                      <span>{row.job_code}</span>
                      {row.customer_name && (
                        <span className="text-admin-text-muted font-normal">({row.customer_name})</span>
                      )}
                    </button>
                  ) : (
                    <span className="text-admin-text-muted text-xs">—</span>
                  )}
                </TableCell>

                <TableCell align="center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border ${
                    row.status === 'allotted'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {row.quantity} unit(s)
                  </span>
                </TableCell>

                <TableCell align="right" className="text-admin-text-secondary font-medium">
                  {formatCurrency(row.unit_cost)}
                </TableCell>

                <TableCell align="right" className="font-bold text-admin-text-primary">
                  {formatCurrency(row.total_cost)}
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <div>
                      {row.status === 'returned' ? (
                        <Badge variant="success">Returned</Badge>
                      ) : (
                        <Badge variant="warning">Holding</Badge>
                      )}
                    </div>
                    <div className="text-xs text-admin-text-muted font-medium">
                      {formatDate(row.allotted_at)}
                    </div>
                  </div>
                </TableCell>

                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    {row.status === 'allotted' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-admin-text-secondary hover:text-admin-text-primary"
                          isLoading={notifyingId === row.id}
                          onClick={() => handleNotify(row)}
                          title="Remind technician to return part"
                          leftIcon={<Bell size={13} />}
                        >
                          Notify
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-admin-success border-admin-success/30 hover:bg-admin-success/10"
                          isLoading={returningId === row.id}
                          onClick={() => handleReturn(row)}
                          title="Return part to central inventory"
                          leftIcon={<RotateCcw size={13} />}
                        >
                          Mark Returned
                        </Button>
                      </>
                    )}

                    {row.status === 'returned' && (
                      <span className="text-xs text-admin-text-muted italic flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-500" /> Returned
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
