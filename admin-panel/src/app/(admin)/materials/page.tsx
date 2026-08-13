"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Package, 
  Search, 
  Download, 
  RefreshCw, 
  Wrench, 
  User, 
  Filter,
  DollarSign,
  Boxes,
  Layers
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Badge } from "@/components/common/Badge";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from "@/utils/formatDate";
import { exportMaterialsToCSV, MaterialExportRow } from "@/utils/materialsCsv";

interface JobMaterialRow {
  id: string;
  material_name: string;
  quantity: number;
  qty_taken?: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  technician_id?: string;
  job_id?: string;
  jobs?: {
    job_code: string;
    customer_name: string;
  } | null;
  technicians?: {
    name: string;
  } | null;
}

interface AllotmentRow {
  id: string;
  technician_id: string;
  qty: number;
  status: string;
  created_at: string;
  products?: {
    name: string;
  };
  users?: {
    name: string;
  };
}

const handleNotify = async (technicianId: string, type: 'acquired' | 'return') => {
  const title = type === 'acquired' ? 'Material Allotted' : 'Return Materials Required';
  const body = type === 'acquired' 
    ? 'You have been allotted new materials. Check your Allotted Materials.' 
    : 'Please return your leftover allotted materials to stock.';
    
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: { technician_id: technicianId, title, body }
    });
    if (error) throw error;
    alert("Notification sent!");
  } catch (err: any) {
    alert("Error sending notification: " + err.message);
  }
};

export default function MaterialsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<JobMaterialRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTech, setSelectedTech] = useState<string>("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Job Materials
      const { data: matsData, error: matsError } = await supabase
        .from("job_materials")
        .select(`
          id,
          material_name,
          quantity,
          unit_cost,
          total_cost,
          created_at,
          technician_id,
          job_id,
          jobs (
            job_code,
            customer_name
          ),
          technicians:users!job_materials_technician_id_fkey (
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (matsError) throw matsError;

      const formattedMats: JobMaterialRow[] = (matsData || []).map((row: any) => ({
        ...row,
        quantity: Number(row.quantity || 0),
        unit_cost: Number(row.unit_cost || 0),
        total_cost: row.total_cost ? Number(row.total_cost) : Number(row.quantity || 0) * Number(row.unit_cost || 0),
        technicians: row.technicians ? { name: row.technicians.name } : null,
      }));
      setMaterials(formattedMats);
    } catch (err: any) {
      console.error("Error fetching data:", err.message);
      setError(err.message || "Failed to load materials data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  const uniqueTechnicians = useMemo(() => {
    const techSet = new Set<string>();
    materials.forEach((m) => {
      if (m.technicians?.name) techSet.add(m.technicians.name);
    });
    return Array.from(techSet).sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        !searchQuery.trim() ||
        m.material_name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (m.jobs?.job_code && m.jobs.job_code.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (m.jobs?.customer_name && m.jobs.customer_name.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (m.technicians?.name && m.technicians.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchTech =
        selectedTech === "ALL" || (m.technicians?.name && m.technicians.name === selectedTech);

      return matchSearch && matchTech;
    });
  }, [materials, searchQuery, selectedTech]);

  const summary = useMemo(() => {
    const totalUnits = filteredMaterials.reduce((sum, m) => sum + m.quantity, 0);
    const totalCost = filteredMaterials.reduce((sum, m) => sum + (m.total_cost || m.quantity * m.unit_cost), 0);
    return { totalUnits, totalCost, recordCount: filteredMaterials.length };
  }, [filteredMaterials]);

  const exportData: MaterialExportRow[] = useMemo(() => {
    return filteredMaterials.map((m) => ({
      id: m.id,
      material_name: m.material_name,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      total_cost: m.total_cost,
      created_at: m.created_at,
      technician_name: m.technicians?.name || "Unassigned",
      job_code: m.jobs?.job_code || "",
      customer_name: m.jobs?.customer_name || "",
    }));
  }, [filteredMaterials]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Allotted Materials"
        description="Track all parts and materials allocated to repair jobs and field technicians."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              leftIcon={<RefreshCw size={16} />}
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              leftIcon={<Download size={16} />}
              onClick={() => exportMaterialsToCSV(exportData)}
              disabled={filteredMaterials.length === 0}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card noAccentLine className="p-5 flex items-center justify-between bg-admin-bg-surface shadow-card border border-admin-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted">Total Allocations</p>
            <p className="text-2xl font-bold text-admin-text-primary mt-1">{summary.recordCount} entries</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Boxes size={22} />
          </div>
        </Card>

        <Card noAccentLine className="p-5 flex items-center justify-between bg-admin-bg-surface shadow-card border border-admin-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted">Total Quantity Allotted</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.totalUnits} units</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Package size={22} />
          </div>
        </Card>

        <Card noAccentLine className="p-5 flex items-center justify-between bg-admin-bg-surface shadow-card border border-admin-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted">Total Allocation Value</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(summary.totalCost)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <DollarSign size={22} />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface border border-admin-border">
        <div className="flex-1 min-w-[240px]">
          <label htmlFor="field-t1k8eg" className="block text-sm font-medium text-admin-text-secondary mb-1">Search Materials & Jobs</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
            <Input id="field-t1k8eg"
              type="text"
              placeholder="Search by material name, technician, or job code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {uniqueTechnicians.length > 0 && (
          <div className="w-full sm:w-64">
            <label htmlFor="field-pxilc3" className="block text-sm font-medium text-admin-text-secondary mb-1">Filter by Technician</label>
            <Select id="field-pxilc3"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
            >
              <option value="ALL">All Technicians ({uniqueTechnicians.length})</option>
              {uniqueTechnicians.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {/* Materials Table */}
      <Card className="flex-1 flex flex-col overflow-hidden border border-admin-border">
        {loading ? (
          <div className="flex-1 p-8">
            <LoadingState message="Loading data..." />
          </div>
        ) : error ? (
          <div className="flex-1 p-8">
            <ErrorState message={error} onRetry={fetchData} />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="flex-1 p-8">
            <EmptyState
              icon={<Package size={40} className="text-admin-text-muted" />}
              heading="No job materials found"
              subtext={searchQuery ? "No material entries match your search query." : "No materials have been logged for jobs yet."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Material Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Technician</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Job Reference</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">Qty Taken / Used</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Unit Cost</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Total Cost</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Log Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {filteredMaterials.map((row) => (
                  <tr key={row.id} className="hover:bg-admin-bg-hover transition-colors">
                    <td className="px-6 py-4 font-semibold text-admin-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <Package size={16} />
                        </div>
                        <span>{row.material_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-admin-text-primary font-medium">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                          {(row.technicians?.name || 'T')[0].toUpperCase()}
                        </div>
                        <span>{row.technicians?.name || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {row.jobs ? (
                        <button
                          onClick={() => router.push(`/jobs`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-admin-accent-dim text-admin-accent hover:bg-admin-accent/20 font-semibold text-xs transition-colors"
                        >
                          <Wrench size={13} />
                          <span>{row.jobs.job_code}</span>
                          <span className="text-admin-text-muted font-normal">({row.jobs.customer_name})</span>
                        </button>
                      ) : (
                        <span className="text-admin-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200">
                        {row.qty_taken || row.quantity} / {row.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-admin-text-secondary font-medium">
                      {formatCurrency(row.unit_cost)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-admin-text-primary">
                      {formatCurrency(row.total_cost)}
                    </td>
                    <td className="px-6 py-4 text-xs text-admin-text-muted font-medium">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
