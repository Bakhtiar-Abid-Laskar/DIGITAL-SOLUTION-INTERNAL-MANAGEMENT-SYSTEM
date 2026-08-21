'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { User } from '@repairshop/shared';
import { SalaryBreakdown } from '@/types/salary';
import StaffRateForm from '@/components/salary/StaffRateForm';
import SalaryCalculatorForm from '@/components/salary/SalaryCalculatorForm';
import SalaryBreakdownCard from '@/components/salary/SalaryBreakdownCard';
import AdvanceSalaryForm from '@/components/salary/AdvanceSalaryForm';
import HolidayCalendarForm from '@/components/salary/HolidayCalendarForm';
import BonusForm from '@/components/salary/BonusForm';
import LeaveManagement from '@/components/salary/LeaveManagement';
import PayrollRunPanel from '@/components/salary/PayrollRunPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton, CardSkeleton } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Lock, Calculator, Settings, Wallet, Calendar, Gift, ClipboardList, PlayCircle } from 'lucide-react';
import { Tabs } from '@/components/common/Tabs';

export default function SalaryPage() {
  const { role, profile, isLoading } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null);
  const [activeTab, setActiveTab] = useState<'payroll' | 'calculate' | 'rates' | 'advance' | 'holidays' | 'bonus' | 'leaves'>('payroll');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase.from('users').select('*').order('name');
    setStaff(data || []);
  }, []);

  useEffect(() => {
    if (role === 'admin') fetchStaff();
  }, [role, fetchStaff]);

  // Realtime: refresh staff list when users are added/updated
  useEffect(() => {
    if (role !== 'admin') return;

    const channel = supabase
      .channel('salary-users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => { fetchStaff(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, fetchStaff]);

  // --- Role Guard ---
  if (isLoading) return (
    <div className="h-full space-y-6">
      <div className="h-10 w-48 skeleton-pulse rounded-lg mb-8" />
      <CardSkeleton count={3} />
      <TableSkeleton />
    </div>
  );

  if (role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState 
          icon={<Lock className="w-12 h-12 text-admin-danger" />}
          heading="Access Denied"
          subtext="Salary management is restricted to administrators only."
        />
      </div>
    );
  }

  const tabs = [
    { id: 'payroll',   label: 'Payroll Run',      icon: <PlayCircle size={16} /> },
    { id: 'calculate', label: 'Calculate Salary', icon: <Calculator size={16} /> },
    { id: 'rates',     label: 'Staff Rates',      icon: <Settings size={16} /> },
    { id: 'advance',   label: 'Advance Salary',   icon: <Wallet size={16} /> },
    { id: 'bonus',     label: 'Bonus',            icon: <Gift size={16} /> },
    { id: 'leaves',    label: 'Leave Management', icon: <ClipboardList size={16} /> },
    { id: 'holidays',  label: 'Holiday Calendar', icon: <Calendar size={16} /> },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Salary Management" 
        description="Calculate payroll, manage staff rates, track advance salaries, and configure company holidays."
      />

      {/* Tabs */}
      <Tabs 
        items={tabs} 
        activeId={activeTab} 
        onChange={(id) => { 
          setActiveTab(id as any); 
          setBreakdown(null); 
        }} 
      />

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'payroll' && (
          <PayrollRunPanel staff={staff} />
        )}

        {activeTab === 'calculate' && (
          <div className="space-y-6">
            <SalaryCalculatorForm staff={staff} onResult={setBreakdown} />
            {breakdown && <SalaryBreakdownCard breakdown={breakdown} />}
          </div>
        )}

        {activeTab === 'rates' && (
          <StaffRateForm staff={staff} />
        )}

        {activeTab === 'advance' && profile && (
          <AdvanceSalaryForm
            staff={staff}
            currentAdminId={profile.id}
            currentAdminName={profile.name}
            onSuccess={() => setRefreshKey(k => k + 1)}
          />
        )}

        {activeTab === 'bonus' && profile && (
          <BonusForm
            staff={staff}
            onSuccess={() => setRefreshKey(k => k + 1)}
          />
        )}

        {activeTab === 'leaves' && profile && (
          <LeaveManagement
            staff={staff}
            currentAdminId={profile.id}
          />
        )}

        {activeTab === 'holidays' && (
          <HolidayCalendarForm />
        )}
      </div>
    </div>
  );
}
