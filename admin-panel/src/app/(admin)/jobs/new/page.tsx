"use client";

import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/ToastProvider";
import { User, JobTypeCatalogItem } from '@repairshop/shared';
import { ArrowLeft } from "lucide-react";

import { createJobReducer, initialState, CreateJobFormState } from './reducer';
import { CustomerInfoCard } from '@/components/jobs/new/CustomerInfoCard';
import { ServiceCatalogCard } from '@/components/jobs/new/ServiceCatalogCard';
import { DeviceIssueCard } from '@/components/jobs/new/DeviceIssueCard';
import { AssignmentCard } from '@/components/jobs/new/AssignmentCard';
import { JobSuccessCard } from '@/components/jobs/new/JobSuccessCard';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { CreditCard } from 'lucide-react';

export default function CreateJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [state, dispatch] = useReducer(createJobReducer, initialState);

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'SET_CATALOG_LOADING', loading: true });
      try {
        const [techsRes, catalogRes, deviceTypesRes] = await Promise.all([
          supabase
            .from('users')
            .select('*')
            .eq('role', 'technician')
            .eq('is_active', true)
            .order('name', { ascending: true }),
          supabase
            .from('job_types')
            .select('*')
            .eq('is_active', true)
            .order('title', { ascending: true }),
          supabase.from('ui_device_types').select('id, label').eq('is_active', true)
        ]);

        if (techsRes.data && catalogRes.data) {
          dispatch({ 
            type: 'FETCH_SUCCESS', 
            technicians: techsRes.data as User[], 
            catalogItems: catalogRes.data as JobTypeCatalogItem[],
            deviceTypes: (deviceTypesRes.data || []).map((d: any) => d.id)
          });
        }
      } catch (err) {
        console.error('Error loading job creation prerequisites:', err);
      } finally {
        dispatch({ type: 'SET_CATALOG_LOADING', loading: false });
      }
    };
    fetchData();
  }, []);

  // Realtime: refresh technician list when users are added/updated
  useEffect(() => {
    const channel = supabase
      .channel('new-job-users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        async () => {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'technician')
            .eq('is_active', true)
            .order('name', { ascending: true });
          if (data) {
            dispatch({ type: 'FETCH_SUCCESS', technicians: data as User[], catalogItems: state.catalogItems, deviceTypes: state.deviceTypes });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.catalogItems, state.deviceTypes]);

  const handleSelectServiceCatalog = (catalogId: string) => {
    const selected = state.catalogItems.find(item => item.id === catalogId);
    if (selected) {
      dispatch({
        type: 'SET_CATALOG_ITEM',
        payload: {
          job_type_ref_id: selected.id,
          job_type_title: selected.title,
          customer_charge_amount: Number(selected.customer_charge_amount || 0),
          snap_technician_incentive: Number(selected.technician_incentive || 0),
        }
      });
    } else {
      dispatch({
        type: 'SET_CATALOG_ITEM',
        payload: {
          job_type_ref_id: '',
          job_type_title: '',
          customer_charge_amount: 0,
          snap_technician_incentive: 0,
        }
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!state.form.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
    if (!state.form.customer_contact.trim()) newErrors.customer_contact = 'Contact number is required';
    if (!state.form.reported_issue.trim()) newErrors.reported_issue = 'Reported issue description is required';

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    if (state.form.customer_gstin.trim() && !gstinRegex.test(state.form.customer_gstin.trim())) {
      newErrors.customer_gstin = 'Warning: GSTIN format is non-standard (e.g. 22AAAAA0000A1Z5)';
    }

    dispatch({ type: 'SET_ERRORS', errors: newErrors });
    return Boolean(state.form.customer_name.trim() && state.form.customer_contact.trim() && state.form.reported_issue.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const { data: jobCode, error: rpcError } = await supabase.rpc('generate_job_code');
      if (rpcError || !jobCode) throw new Error(rpcError?.message || 'Failed to generate job code');

      const firstTechId = state.form.technician_ids?.[0] || null;

      const deviceTypeValue = state.form.device_type.trim();
      let deviceTypeId: string | null = null;
      if (deviceTypeValue) {
        // Resolve or create device type via server-side RPC (works for both Admin and Receptionist)
        const { data: dtId, error: dtError } = await supabase.rpc('find_or_create_device_type', {
          p_name: deviceTypeValue,
        });
        if (!dtError && dtId) {
          deviceTypeId = dtId;
        } else {
          deviceTypeId = deviceTypeValue;
        }
      }

      // Central Customer Directory: Upsert or link customer
      let customerId = state.form.customer_id || null;
      try {
        const { data: custData, error: custErr } = await supabase.rpc('find_or_create_customer', {
          p_customer_id: customerId,
          p_name: state.form.customer_name.trim(),
          p_phone: state.form.customer_contact.trim() || null,
          p_email: state.form.customer_email.trim() || null,
          p_gstin: state.form.customer_gstin.trim() || null,
          p_address: state.form.customer_address.trim() || null,
          p_created_via: 'job',
          p_user_id: user.id,
        });
        if (!custErr && custData) {
          customerId = custData.id;
        }
      } catch (e) {
        console.warn('Customer upsert warning:', e);
      }

      const { data: job, error: insertError } = await supabase.from('jobs').insert({
        job_code: jobCode,
        customer_id: customerId,
        customer_name: state.form.customer_name.trim(),
        customer_contact: state.form.customer_contact.trim(),
        customer_email: state.form.customer_email.trim() || null,
        customer_gstin: state.form.customer_gstin.trim() || null,
        customer_address: state.form.customer_address.trim() || null,
        device_type_id: deviceTypeId,
        reported_issue: state.form.reported_issue.trim(),
        remarks: state.form.remarks.trim() || null,
        job_type: state.form.job_type,
        priority: state.form.priority,
        status: 'Received',
        technician_id: firstTechId,
        receptionist_id: user.id,
        job_type_ref_id: state.form.job_type_ref_id || null,
        snap_technician_incentive: state.form.snap_technician_incentive || 0,
        advance_amount: state.form.advance_amount ? Number(state.form.advance_amount) : 0
      }).select('*, technician:users!jobs_technician_id_fkey(name)').single();

      if (insertError) throw new Error(insertError.message);
      
      if (state.form.technician_ids && state.form.technician_ids.length > 1) {
        const additionalTechs = state.form.technician_ids.slice(1).map(id => ({
          job_id: job.id,
          technician_id: id
        }));
        const { error: additionalError } = await supabase.from('job_technicians').insert(additionalTechs);
        if (additionalError) throw new Error(additionalError.message);
      }
      
      dispatch({ type: 'SET_CREATED_JOB', job: job as any });
      showToast('Job created successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to create job', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const handleChange = (field: keyof CreateJobFormState, value: any) => {
    dispatch({ type: 'SET_FORM_FIELD', field, value });
  };

  if (state.createdJob) {
    return (
      <JobSuccessCard 
        createdJob={state.createdJob} 
        form={state.form} 
        onCreateAnother={() => dispatch({ type: 'RESET_FORM' })} 
      />
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto h-full flex flex-col pb-12">
      <PageHeader 
        title="Create New Repair Job" 
        description="Register customer device intake, select service catalog, and assign to a technician."
        actions={
          <Button variant="ghost" onClick={() => router.back()} leftIcon={<ArrowLeft size={16} />}>
            Back to Jobs
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomerInfoCard 
            form={state.form} 
            errors={state.errors} 
            onChange={handleChange}
            onAutoFillCustomer={(cust) => {
              dispatch({
                type: 'SET_CUSTOMER_INFO',
                payload: {
                  customer_id: cust.id,
                  customer_name: cust.name,
                  customer_contact: cust.phone || '',
                  customer_email: cust.email || '',
                  customer_gstin: cust.gstin || '',
                  customer_address: cust.address || '',
                }
              });
            }}
            onClearCustomer={() => {
              dispatch({
                type: 'SET_CUSTOMER_INFO',
                payload: { customer_id: null }
              });
            }}
          />
          
          <ServiceCatalogCard 
            form={state.form} 
            catalogItems={state.catalogItems} 
            catalogLoading={state.catalogLoading} 
            onSelectServiceCatalog={handleSelectServiceCatalog} 
          />
          
          <DeviceIssueCard 
            form={state.form} 
            errors={state.errors} 
            deviceTypes={state.deviceTypes}
            onChange={handleChange} 
          />
          
          <AssignmentCard 
            form={state.form} 
            technicians={state.technicians} 
            loading={state.loading} 
            onChange={handleChange} 
          />

          <Card className="border border-admin-border col-span-1 md:col-span-2">
            <div className="p-4 border-b border-admin-border flex items-center gap-2 bg-admin-bg-subtle/50 rounded-t-2xl">
              <CreditCard size={18} className="text-admin-accent" />
              <h3 className="text-base font-semibold text-admin-text-primary">Payment & Advance</h3>
            </div>
            <div className="p-4">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Advance Amount Paid (₹)</label>
                <Input 
                  type="number" min="0" step="0.01" 
                  placeholder="0.00"
                  value={state.form.advance_amount}
                  onChange={(e) => handleChange('advance_amount', e.target.value)}
                />
                <p className="text-xs text-admin-text-muted mt-1">Record any partial payment or advance taken during intake.</p>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
