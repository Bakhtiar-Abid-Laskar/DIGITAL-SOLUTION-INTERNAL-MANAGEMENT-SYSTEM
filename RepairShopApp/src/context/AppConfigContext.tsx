import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface UIConfigItem {
  id: string;
  color_hex: string;
  sort_order: number;
}

export interface AppConfigData {
  jobStatuses: UIConfigItem[];
  priorities: UIConfigItem[];
  serviceLocations: UIConfigItem[];
  paymentStatuses: UIConfigItem[];
  saleStatuses: UIConfigItem[];
  paymentMethods: UIConfigItem[];
  roles: UIConfigItem[];
}

interface AppConfigContextType {
  config: AppConfigData;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  
  // Helper methods
  getJobStatusColor: (statusId: string) => string;
  getPriorityColor: (priorityId: string) => string;
  getServiceLocationColor: (locationId: string) => string;
}

const defaultData: AppConfigData = {
  jobStatuses: [],
  priorities: [],
  serviceLocations: [],
  paymentStatuses: [],
  saleStatuses: [],
  paymentMethods: [],
  roles: []
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfigData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const [
        resStatuses,
        resPriorities,
        resLocations,
        resPaymentStatuses,
        resSaleStatuses,
        resPaymentMethods,
        resRoles
      ] = await Promise.all([
        supabase.from('ui_job_statuses').select('*').order('sort_order', { ascending: true }),
        supabase.from('ui_priorities').select('*').order('sort_order', { ascending: true }),
        supabase.from('ui_service_locations').select('*').order('sort_order', { ascending: true }),
        supabase.from('ui_payment_statuses').select('*').order('sort_order', { ascending: true }),
        supabase.from('ui_sale_statuses').select('*').order('sort_order', { ascending: true }),
        supabase.from('ui_payment_methods').select('*').order('sort_order', { ascending: true }),
        supabase.from('ui_roles').select('*').order('sort_order', { ascending: true })
      ]);

      setConfig({
        jobStatuses: resStatuses.data || [],
        priorities: resPriorities.data || [],
        serviceLocations: resLocations.data || [],
        paymentStatuses: resPaymentStatuses.data || [],
        saleStatuses: resSaleStatuses.data || [],
        paymentMethods: resPaymentMethods.data || [],
        roles: resRoles.data || []
      });
      setError(null);
    } catch (err: any) {
      console.error('Failed to load UI configuration:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, []);

  const getJobStatusColor = React.useCallback((statusId: string) => {
    return config.jobStatuses.find(s => s.id === statusId)?.color_hex || '#9CA3AF'; // Fallback gray
  }, [config.jobStatuses]);

  const getPriorityColor = React.useCallback((priorityId: string) => {
    return config.priorities.find(p => p.id === priorityId)?.color_hex || '#9CA3AF';
  }, [config.priorities]);

  const getServiceLocationColor = React.useCallback((locationId: string) => {
    return config.serviceLocations.find(l => l.id === locationId)?.color_hex || '#9CA3AF';
  }, [config.serviceLocations]);

  const contextValue = React.useMemo(() => ({
    config,
    loading,
    error,
    refreshConfig,
    getJobStatusColor,
    getPriorityColor,
    getServiceLocationColor
  }), [config, loading, error, refreshConfig, getJobStatusColor, getPriorityColor, getServiceLocationColor]);

  return (
    <AppConfigContext.Provider value={contextValue}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  }
  return context;
}
