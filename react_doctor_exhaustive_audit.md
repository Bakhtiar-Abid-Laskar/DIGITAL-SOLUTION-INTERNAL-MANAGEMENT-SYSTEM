# React Doctor Audit — admin-panel + RepairShopApp — 2026-08-10

## Executive Summary
Scanned all workspaces. Found 474 total occurrences.

## Coverage Notes
Phase 1 scan successfully covered `admin-panel`, `RepairShopApp`, and `supabase` simultaneously by detecting the workspace roots. The tool properly applied React Native specific rules to the mobile app.

## admin-panel — Findings
### Confirmed Failures — Error severity
### Confirmed Failures — Warning severity
#### react-doctor/js-combine-iterations

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:149`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setPreviewLoading(true);
      try {
        const payloadItems: InvoiceLineParams[] = items
          .filter(i => i.item_name || i.product_id)
          .map(i => ({
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:228`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    setLoading(true);
    try {
      const payloadItems: InvoiceLineParams[] = items
        .filter(i => i.item_name || i.product_id)
        .map(i => ({
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:398`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  if (!createdSale) return;
                  try {
                    const saleItems = (createdSale.sale_items || items)
                      .filter((i: any) => String(i.item_name || '').trim())
                      .map((i: any) => ({ description: String(i.item_name), hsn: '', price: Number(i.unit_price), unit: Number(i.quantity) }));
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:372`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          
          <View style={{ maxHeight: 300 }}>
            {materials
              .filter(m => m.checkout_status === 'checked_out')
              .map(item => (
```

#### react-doctor/async-await-in-loop

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            throw new Error(`Invalid usage quantity for ${mat.material_name}. Must be between 0 and ${mat.qty_taken || mat.quantity}.`);
          }
          const { error } = await supabase.from('job_materials').update({
            quantity: usedQty,
            checkout_status: 'confirmed',
```

#### react-doctor/no-fetch-response-used-without-status-check

**File:** `RepairShopApp/src/components/shared/SelfieCapture.tsx:112`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (!session) return;

    const blob = await (await fetch(webpUri)).blob();
    const form = new FormData();
    form.append('staffId', opts.staffId);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:175`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      const token = session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
```

#### react-doctor/no-loading-flag-reset-outside-finally

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setPayments(data || []);
    }
    setLoading(false);
  }, [month, typeFilter, refreshKey, showToast]);

```

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast('Failed to fetch inventory.', 'error');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:102`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setError(err.message || 'Failed to load job details');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setError(err.message || 'Failed to fetch jobs.');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:129`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setTechData(Object.values(counts));
    }
    setTechLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:156`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
    }
    setRevenueLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (cancelled) return;
    if (data) setExportJobs(data);
    setExportLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:208`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (data) setCustomerJobs(data as any);
    if (count !== null) setCustomerTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    setCustomerLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:108`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setError(err instanceof Error ? err.message : "Failed to fetch invoices.");
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:86`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast('WhatsApp settings saved successfully', 'success');
    }
    setSaving(false);
  };

```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast('Failed to fetch staff data.', 'error');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/login/page.tsx:38`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      }
      setError(friendlyError);
      setLoading(false);
    } else {
      router.push("/");
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      created_at: new Date(date).toISOString(),
    });
    setSaving(false);

    if (err) return setError(err.message);
```

**File:** `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:39`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onSuccess();
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    });

    setSaving(false);

    if (err) return setError(err.message);
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    });

    setSaving(false);
    if (err) return setError(err.message);

```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:30`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (err) console.error('Error fetching holidays:', err);
    else setHolidays(data || []);
    setLoading(false);
  }, []);

```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:53`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });

    setSaving(false);
    if (err) {
      setError(err.message || 'Failed to add holiday');
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:57`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setTotal(count || 0);
    }
    setLoading(false);
  }, [activeTab, page]);

```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setAddError(err.message);
    }
    setAddSaving(false);
  };

```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:64`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setOtRate(data?.ot_rate_per_hour?.toString() || '0');

      setLoading(false);
    };

```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:106`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    const { error: err } = await supabase.from('staff_rates').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);

    if (err) return setError(err.message);
```

**File:** `admin-panel/src/context/AuthContext.tsx:50`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          setSessionUser(null);
          setProfile(null);
          setIsLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:35`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setTechnicians(data as TechnicianSummary[]);
    }
    setLoading(false);
  };

```

**File:** `admin-panel/src/context/AuthContext.tsx:93`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:57`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast({ title: 'Login Failed', message: error.message, type: 'error' });
    }
    setLoading(false);
  };

```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:418`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              else await fetchAttendance();
              
              setProcessing(false);
            }}
            style={{ flex: 1, backgroundColor: colors.primary }}
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:299`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    setRecord(recordData as SalaryRecord | null);
    setLoading(false);
  }, [user, monthStr]);

```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:317`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    setHistory((data || []) as SalaryRecord[]);
    setHistoryTotal(count || 0);
    setHistLoading(false);
  }, [user, monthStr, historyPage]);

```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:331`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      .limit(10);
    setMyLeaves(data || []);
    setLeaveLoading(false);
  }, [user]);

```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:395`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      reason:     leaveReason.trim() || null,
    });
    setLeaveSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
```

#### react-doctor/exhaustive-deps

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:67`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    }
    setLoading(false);
  }, [month, typeFilter, refreshKey, showToast]);

  useEffect(() => {
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:124`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Actions
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:159`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, [statusFilter, techFilter, priorityFilter, currentPage, debouncedSearchQuery, dateFrom, dateTo]);

  const handleExportCSV = () => {
```

**File:** `admin-panel/src/app/(admin)/page.tsx:156`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    }
    return () => { cancelled = true; };
  }, [activeTab, techMonth]);

  useEffect(() => {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:97`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(exportsChannel);
    };
  }, [activeTab, customerSearch]);

  const fetchTechPerformance = async (cancelled = false) => {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:217`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    }
    return () => { cancelled = true; };
  }, [customerPage]);

  const onSearchSubmit = () => {
```

**File:** `admin-panel/src/app/(admin)/staff/leaves/page.tsx:42`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    fetchLeaves();
  }, []);

  const [confirmModal, setConfirmModal] = useState<{
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    run();
    return () => { cancelled = true; };
  }, [roleFilter, statusFilter, currentPage, debouncedSearchQuery]);

  const [confirmModal, setConfirmModal] = useState<{
```

**File:** `admin-panel/src/components/layout/Topbar.tsx:100`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Close popovers on outside click
```

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:64`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
    }
  }, [visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
```

**File:** `RepairShopApp/src/components/common/ModalShell.tsx:32`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
    }
  }, [visible]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
```

**File:** `RepairShopApp/src/components/common/SkeletonCard.tsx:24`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
```

**File:** `admin-panel/src/components/common/Toast.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <button 
        onClick={() => onDismiss(id)}
        className="text-current opacity-70 hover:opacity-100 transition-opacity p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        aria-label="Dismiss"
      >
```

**File:** `RepairShopApp/src/components/jobs/PriorityBadge.tsx:45`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      scale.value = 1;
    }
  }, [isUrgent]);

  const animatedStyle = useAnimatedStyle(() => ({
```

**File:** `RepairShopApp/src/hooks/usePushNotifications.ts:175`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      }
    };
  }, [userId, isExpoGo]);

  return { expoPushToken, notification };
```

**File:** `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx:69`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchJobDetails();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx:121`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      fetchTabCounts();
      fetchJobs(0, true);
    }, [activeTab, searchQuery])
  );

```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:127`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setLoading(true);
      fetchPayments();
    }, [month])
  );

```

**File:** `RepairShopApp/src/screens/admin/OverviewScreen.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      fetchData();
      fetchNotifications();
    }, [user])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:100`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchBillingData();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx:105`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
      fetchNotifications();
    }, [])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx:72`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchJobDetails();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:130`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      fetchJobs(0, true, cancelled);
      return () => { cancelled = true; };
    }, [route.params?.filter, activeTab, searchQuery])
  );

```

**File:** `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:107`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchAllotments();
    }, [user?.id, mode])
  );

```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:82`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    if (user) fetchAttendance();
  }, [user, historyLimit]);

  useRealtimeSubscription('attendance', fetchAttendance, user ? `user_id=eq.${user.id}` : undefined);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:149`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    fetchInventory(0, true, cancelled);
    return () => { cancelled = true; };
  }, [activeTab, debouncedSearch]);

  const onRefresh = () => {
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:174`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    return () => { supabase.removeChannel(channel); };
  }, []);

  const openAddModal = () => {
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:87`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        supabase.removeChannel(channel);
      };
    }, [user?.id])
  );

```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:109`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  // Phone Save
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:300`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    setRecord(recordData as SalaryRecord | null);
    setLoading(false);
  }, [user, monthStr]);

  // ── Fetch salary history ───────────────────────────────────────────────────
```

**File:** `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx:89`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchAllotments();
    }, [user])
  );

```

**File:** `RepairShopApp/src/screens/technician/MyJobsScreen.tsx:58`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      }
      fetchJobs();
    }, [route.params?.filter])
  );

```

**File:** `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx:67`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchJobAndVisit();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:123`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useFocusEffect(
```

**File:** `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:131`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
      fetchNotifications();
    }, [user])
  );

```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:105`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      return () => { supabase.removeChannel(channel); };
    }, [jobId])
  );

```

#### react-doctor/no-create-object-url-without-revoke

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:106`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenditure-${month}.csv`);
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:250`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
```

**File:** `admin-panel/src/lib/invoiceClient.ts:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    // Fallback: blob URL if popup is blocked
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    return { driveLink };
```

**File:** `admin-panel/src/utils/csv.ts:36`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
```

**File:** `admin-panel/src/utils/materialsCsv.ts:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

```

**File:** `admin-panel/src/utils/salesCsv.ts:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
```

#### react-doctor/label-has-associated-control

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:148`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Month</label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Type</label>
              <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as PaymentType | 'all')}>
                {EXPENDITURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
```

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:158`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search Description</label>
              <Input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:547`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  <div className="p-6 pt-0 space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
                      <Select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}>
                        {config.jobStatuses.map(s => (
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:555`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Priority</label>
                      <Select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value as any})}>
                        {config.priorities.map(p => (
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:563`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Job Type</label>
                      <Select value={editForm.job_type} onChange={e => setEditForm({...editForm, job_type: e.target.value as any})}>
                        {config.serviceLocations.map(l => (
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:571`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Technician</label>
                      <Select value={editForm.technician_id || ''} onChange={e => setEditForm({...editForm, technician_id: e.target.value})}>
                        <option value="">-- Unassigned --</option>
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:641`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

                  <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payment Status</label>
                    <Select 
                      value={billingForm.is_paid ? 'Paid in Full' : 'Unpaid'} 
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:264`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Name *</label>
                <div className="relative">
                  <Input 
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:277`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Contact Number *</label>
                <Input 
                  value={form.customer_contact}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:289`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address (Optional)</label>
                <Input 
                  value={form.customer_email}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:299`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">GSTIN (Optional)</label>
                <Input 
                  value={form.customer_gstin}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:319`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Service Type Catalog</label>
                <Select 
                  value={form.job_type_ref_id}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:365`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Device Category *</label>
                <Select 
                  value={form.device_type}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:377`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Reported Issue *</label>
                <Textarea 
                  value={form.reported_issue}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:389`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Remarks & Physical Condition</label>
                <Textarea 
                  value={form.remarks}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:408`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Service Location</label>
                <Select 
                  value={form.job_type}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:419`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Priority Level</label>
                <Select 
                  value={form.priority}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:431`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Assign Technician</label>
                <Select 
                  value={form.technician_id}
```

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:331`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface border border-admin-border">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search Materials & Jobs</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
```

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:346`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        {uniqueTechnicians.length > 0 && (
          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">Filter by Technician</label>
            <Select
              value={selectedTech}
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:335`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Name *</label>
              <Input value={form.customer_name} onChange={(e) => setForm({...form, customer_name: e.target.value})} error={!!errors.customer_name} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:339`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Contact Number *</label>
              <Input type="tel" value={form.customer_contact} onChange={(e) => setForm({...form, customer_contact: e.target.value})} error={!!errors.customer_contact} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:343`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email (Optional)</label>
              <Input type="email" value={form.customer_email} onChange={(e) => setForm({...form, customer_email: e.target.value})} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:347`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">GSTIN (Optional)</label>
              <Input value={form.customer_gstin} onChange={(e) => setForm({...form, customer_gstin: e.target.value})} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:361`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              </div>
              <div className="flex items-center gap-2">
                 <label className="text-sm font-medium text-admin-text-secondary">Tax Regime:</label>
                 <Select value={form.tax_regime} onChange={(e) => setForm({...form, tax_regime: e.target.value as any})} className="py-1 text-sm h-8">
                   <option value="intra_state">Intra-State (CGST + SGST)</option>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:468`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
                  <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value as any})}>
                    <option value="paid">Paid</option>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:475`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payment Method</label>
                  <Select value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value as any})}>
                    <option value="Cash">Cash</option>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:485`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Internal Notes (Optional)</label>
                  <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} />
                </div>
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:174`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface rounded-tl-none pt-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:187`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Date Range</label>
          <div className="flex items-center gap-2">
            <div className="relative">
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:201`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payment</label>
          <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="All">All Methods</option>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:65`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
                <Input type="email" value={profile?.email || ""} disabled className="bg-admin-bg-subtle text-admin-text-muted" />
                <p className="text-xs text-admin-text-muted mt-1">Email cannot be changed.</p>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
                <Input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              
              <div className="pt-2 border-t border-admin-border">
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Change Password</label>
                <Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:98`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Shop Name</label>
                <Input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:102`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Address</label>
                <Input type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:184`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number (with country code)</label>
                <Input type="text" placeholder="e.g. 919876543210" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Message Body</label>
                <textarea 
                  className="w-full bg-admin-bg-subtle border border-admin-border rounded-md px-3 py-2 text-admin-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-admin-accent" 
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:140`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-admin-text-muted" size={16} />
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
          <Select 
            value={roleFilter} 
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
          <Select 
            value={statusFilter} 
```

**File:** `admin-panel/src/app/login/page.tsx:67`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-admin-text-primary font-medium mb-1.5 text-sm">Email</label>
            <Input 
              type="email" 
```

**File:** `admin-panel/src/app/login/page.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          </div>
          <div>
            <label className="block text-admin-text-primary font-medium mb-1.5 text-sm">Password</label>
            <div className="relative">
              <Input 
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:104`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Title / Service Name *
            </label>
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Base Customer Charge (₹) *
            </label>
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:132`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Technician Incentive (₹)
            </label>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:63`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Type *</label>
          <select className={styles.select} value={type} onChange={e => setType(e.target.value as PaymentType)} aria-label="Select expenditure type">
            <option value="">-- Select Type --</option>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Amount (&#8377;) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500" />
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:75`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Description *</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Bought RAM for job RS-2026-0001" />
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Quantity to Add *</label>
              <Input 
                type="number" 
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:85`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Purchase Rate (₹) *</label>
              <Input 
                type="number" 
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:94`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Notes (Optional)</label>
              <Input 
                type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:167`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Product Name *</label>
                <Input 
                  type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:178`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">SKU</label>
                  <Input 
                    type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:187`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Unit of Measure</label>
                  <Input 
                    type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:199`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">HSN/SAC Code</label>
                  <Input 
                    type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:207`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Tax Mode</label>
                  <Select 
                    value={productData.tax_mode}
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:220`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">CGST %</label>
                  <Input type="number" min="0" step="0.5" value={productData.cgst_rate} onChange={(e) => setProductData({...productData, cgst_rate: Number(e.target.value)})} />
                </div>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:224`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">SGST %</label>
                  <Input type="number" min="0" step="0.5" value={productData.sgst_rate} onChange={(e) => setProductData({...productData, sgst_rate: Number(e.target.value)})} />
                </div>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:228`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">IGST %</label>
                  <Input type="number" min="0" step="0.5" value={productData.igst_rate} onChange={(e) => setProductData({...productData, igst_rate: Number(e.target.value)})} />
                </div>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:239`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Purchase Rate (Cost)</label>
                  <Input 
                    type="number" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:248`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Selling Rate (Base)</label>
                  <Input 
                    type="number" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:262`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  <Info className="text-admin-accent shrink-0 mt-0.5" size={18} />
                  <div>
                    <label className="block text-sm font-medium text-admin-text-primary mb-1">Opening Stock Quantity</label>
                    <p className="text-xs text-admin-text-muted mb-3">
                      Enter the initial physical count. To add stock later, use the Purchase Order flow.
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:285`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Low Stock Threshold</label>
                  <Input 
                    type="number" min="0"
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:293`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Min Stock Level</label>
                  <Input 
                    type="number" min="0"
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:303`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Warehouse Location (optional)</label>
                <Input 
                  type="text" 
```

**File:** `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          )}

          <label className="block text-sm font-medium text-admin-text-secondary mb-2">Select Technician</label>
          <Select 
            value={selectedTech} 
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:83`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" />
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:88`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:94`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Description (optional)</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Festival advance" />
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:85`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Month *</label>
          <select className={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:91`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Year *</label>
          <select className={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:99`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Reason *</label>
        <input className={styles.input} type="text" value={reason}
          onChange={e => setReason(e.target.value)} placeholder="e.g. Diwali bonus, exceptional performance" />
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:86`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Date *</label>
            <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:91`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div className={styles.field}>
            <label className={styles.label}>Holiday Name *</label>
            <input className={styles.input} type="text" placeholder="e.g. Independence Day, Diwali" value={name} onChange={e => setName(e.target.value)} required />
          </div>
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:151`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Staff Member *</label>
              <select className={styles.select} value={addUserId} onChange={e => setAddUserId(e.target.value)}>
                <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:158`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Leave Date *</label>
              <input className={styles.input} type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
            </div>
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:163`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reason (optional)</label>
            <input className={styles.input} type="text" value={addReason} onChange={e => setAddReason(e.target.value)} placeholder="e.g. Personal" />
          </div>
```

**File:** `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Select Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)} aria-label="Select staff member">
            <option value="">-- Choose Staff --</option>
```

**File:** `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:74`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

        <div className={styles.field}>
          <label className={styles.label}>Month *</label>
          <input className={styles.input} type="month" value={month} onChange={e => setMonth(e.target.value)} aria-label="Select month" />
        </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Select Staff Member *</label>
        <select className={styles.select} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:143`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Fixed Monthly Salary (₹) *</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="e.g. 25000" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:149`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className={styles.field}>
                <label className={styles.label}>Allowed Leave Days per Month *</label>
                <input className={styles.input} type="number" min="0" step="1"
                  value={allowedLeaveDays} onChange={e => setAllowedLeaveDays(e.target.value)} placeholder="Default: 2" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:157`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Absent Day Penalty Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={absentDeduction} onChange={e => setAbsentDeduction(e.target.value)} placeholder="e.g. 800" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className={styles.field}>
                <label className={styles.label}>Half-Day Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={halfdayDeduction} onChange={e => setHalfdayDeduction(e.target.value)} placeholder="e.g. 80" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:173`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Late/Early 1st Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier1} onChange={e => setPenaltyTier1(e.target.value)} placeholder="e.g. 30" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:179`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className={styles.field}>
                <label className={styles.label}>Late/Early {'>'}1 Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier2} onChange={e => setPenaltyTier2(e.target.value)} placeholder="e.g. 60" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:187`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Overtime (OT) Rate (₹/hour)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={otRate} onChange={e => setOtRate(e.target.value)} placeholder="e.g. 150" />
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:134`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
              <input
                type="text"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:145`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
              <input
                type="email"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:156`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number</label>
              <input
                type="tel"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:167`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
              <select
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:180`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Temporary Password</label>
              <input
                type="password"
```

#### react-doctor/no-set-state-after-await-in-effect

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:79`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    fetchInventory(cancelled);
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:106`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    let cancelled = false;
    fetchData(cancelled);
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:144`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [statusFilter, techFilter, priorityFilter, debouncedSearchQuery, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    fetchJobs(cancelled);
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:60`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [triggeringExport, setTriggeringExport] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (activeTab === "tech") {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:211`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    let cancelled = false;
    if (activeTab === 'customer' && customerSearch.trim()) {
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [statusFilter, paymentFilter, debouncedSearchQuery, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    fetchInvoices(cancelled);
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:74`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [roleFilter, statusFilter, debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
```

**File:** `admin-panel/src/components/layout/Topbar.tsx:80`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    let cancelled = false;
    fetchNotifications(cancelled);
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:17`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchTechnicians();
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:80`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user, historyLimit]);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:144`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  });

  useEffect(() => {
    let cancelled = false;
    setPage(0);
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:107`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);
```

#### react-doctor/prefer-useReducer

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:31`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import { useAppConfig } from "@/context/AppConfigContext";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:20`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function ExpenditureForm({ currentAdminId, onSuccess }: Props) {
  const [type, setType] = useState<PaymentType | ''>('');
  const [amount, setAmount] = useState('');
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:20`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function AdvanceSalaryForm({ staff, currentAdminId, currentAdminName, onSuccess }: Props) {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:17`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function BonusForm({ staff, onSuccess }: Props) {
  const now = new Date();
  const [userId,  setUserId]  = useState('');
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:14`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function StaffRateForm({ staff }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rate, setRate] = useState<StaffRate | null>(null);
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:29`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
};

export default function AddMaterialModal({ visible, jobId, onClose, onAdded }: AddMaterialModalProps) {
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
```

**File:** `RepairShopApp/src/screens/admin/OverviewScreen.tsx:38`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
};

export default function OverviewScreen() {
  const { user, signOut, displayName } = useAuth();
  const navigation = useNavigation<any>();
```

**File:** `RepairShopApp/src/screens/admin/ReportsScreen.tsx:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function ReportsScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const [loading, setLoading] = useState(true);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:26`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import { useToast } from '../../context/ToastContext';

export default function BillingScreen() {
  const route = useRoute<any>();
  const jobId = route.params?.jobId;
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:73`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
// Local buildSaleInvoiceHtml removed — using shared generateSaleInvoiceHtml from @repairshop/shared

export default function NewSaleScreen() {
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:39`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
type TabValue = 'All' | 'Low Stock' | 'Out of Stock';

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:30`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
];

export default function UpdateWorkScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
```

#### react-doctor/prefer-module-scope-pure-function

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:168`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const handleNotify = async (technicianId: string, type: 'acquired' | 'return') => {
    const title = type === 'acquired' ? 'Material Allotted' : 'Return Materials Required';
    const body = type === 'acquired' 
```

**File:** `admin-panel/src/components/layout/NotificationsDropdown.tsx:33`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'system': return <div className="p-2 rounded-full bg-admin-progress-bg text-admin-progress-fg"><Bell size={16} /></div>;
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:128`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const statusBadgeVariant = (s: LeaveStatus) =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';

```

**File:** `admin-panel/src/context/AuthContext.tsx:97`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [router, pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };
```

**File:** `RepairShopApp/src/components/jobs/JobCard.tsx:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
```

**File:** `RepairShopApp/src/components/shared/SelfieCapture.tsx:105`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
   * Called fire-and-forget — errors are logged but do NOT surface to the user.
   */
  const uploadSelfieToDrive = async (
    webpUri: string,
    opts: NonNullable<SelfieCaptureProps['driveUpload']>
```

**File:** `RepairShopApp/src/hooks/useLocationPermission.ts:5`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

export const useLocationPermission = () => {
  const requirePermission = async () => {
    const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
    
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:167`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'technician') return { bg: colors.statusCompletedBg, fg: colors.accentGreen };
    if (role === 'receptionist') return { bg: colors.statusInProgressBg, fg: colors.primary };
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:170`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldCheck size={20} color={colors.accentBlue} />;
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:179`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin': return { bg: colors.statusWaitingBg, fg: colors.accentBlue };
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:193`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getStatusColor = (status: string) => {
    if (status === 'Present') return colors.accentGreen;
    if (status === 'Half-day') return colors.accentOrange;
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:63`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const passStyle = useAnimatedStyle(() => ({ borderColor: passBorder.value }));

  const handleFocus = (sharedVal: any) => {
    sharedVal.value = withTiming(colors.textPrimary, { duration: 150 });
  };
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    sharedVal.value = withTiming(colors.textPrimary, { duration: 150 });
  };
  const handleBlur = (sharedVal: any) => {
    sharedVal.value = withTiming(colors.border, { duration: 150 });
  };
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:103`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  );

  const parseNum = (val: string) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:135`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getSignedUrl = async (path: string | null) => {
    return getSignedUrlCached(supabase, 'attendance-selfies', path, 60 * 60);
  };
```

**File:** `RepairShopApp/src/screens/shared/InactiveUserScreen.tsx:11`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:280`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('screen') || lower.includes('display')) return <MonitorSmartphone size={24} color={colors.accentBlue} />;
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [notifications]);

  const getIconData = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:407`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  // ── Render breakdown row ───────────────────────────────────────────────────
  const renderRow = (label: string, value: number, color?: string, prefix = '') => (
    <View style={styles.lineRow} key={label}>
      <Text style={styles.lineLabel}>{label}</Text>
```

#### react-doctor/no-array-index-as-key

**File:** `admin-panel/src/app/(admin)/page.tsx:280`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-xs font-medium text-admin-text-secondary">{entry.name} ({entry.value})</span>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:383`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                <tbody className="divide-y divide-admin-border">
                  {items.map((item, index) => (
                    <tr key={index} className="bg-admin-bg-surface">
                      <td className="px-4 py-3 align-top">
                        <Select 
```

**File:** `admin-panel/src/components/dashboard/JobsPieChart.tsx:23`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:87`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <label className={styles.label}>Month *</label>
          <select className={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:513`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          {items.map((item, index) => (
            <View key={index} style={styles.saleItemCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Item Name</Text>
```

#### react-doctor/click-events-have-key-events

**File:** `admin-panel/src/app/(admin)/page.tsx:318`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              ) : (
                recentJobs.map(job => (
                  <tr 
                    key={job.id} 
                    onClick={() => router.push(`/jobs/${job.id}`)}
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:393`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  ) : (
                    customerJobs.map(job => (
                      <tr key={job.id} onClick={() => router.push(`/jobs/${job.id}`)} className="hover:bg-admin-bg-hover transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-medium text-admin-text-primary">{job.job_code}</td>
                        <td className="px-6 py-4">
```

**File:** `admin-panel/src/components/layout/NotificationsDropdown.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="space-y-1">
            {filtered.map(n => (
              <div 
                key={n.id} 
                onClick={() => {
```

**File:** `admin-panel/src/components/layout/Sidebar.tsx:35`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-admin-bg-dark/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
```

#### react-doctor/prefer-module-scope-static-value

**File:** `admin-panel/src/app/(admin)/page.tsx:345`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

function StatCard({ title, value, icon: Icon, variant }: { title: string, value: number, icon: any, variant: 'accent' | 'success' | 'purple' | 'danger' }) {
  const variantStyles = {
    accent: "bg-admin-pending-bg text-admin-pending-fg border-admin-pending-fg/20",
    success: "bg-admin-completed-bg text-admin-completed-fg border-admin-completed-fg/20",
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:260`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const tabs = [
    { id: "tech", label: "Technician Performance", icon: <Users size={16} /> },
    { id: "customer", label: "Customer History", icon: <History size={16} /> },
```

**File:** `admin-panel/src/app/(admin)/salary/page.tsx:52`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }

  const tabs = [
    { id: 'calculate', label: 'Calculate Salary', icon: <Calculator size={16} /> },
    { id: 'rates',     label: 'Staff Rates',      icon: <Settings size={16} /> },
```

**File:** `admin-panel/src/components/common/Badge.tsx:12`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  
  const variants = {
    default: "bg-admin-bg-subtle text-admin-text-secondary border border-admin-border",
    accent: "bg-admin-progress-bg text-admin-progress-fg border border-admin-progress-fg/20",
```

**File:** `admin-panel/src/components/common/Button.tsx:16`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: "bg-admin-accent text-white hover:bg-admin-accent-dark shadow-sm",
      secondary: "bg-admin-bg-subtle text-admin-text-primary hover:bg-admin-border shadow-sm",
```

**File:** `admin-panel/src/components/common/Button.tsx:24`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-12 px-6 py-2 text-base",
```

**File:** `admin-panel/src/components/common/Toast.tsx:23`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [id, onDismiss]);

  const variants = {
    success: 'bg-admin-completed-bg border-admin-completed-fg/20 text-admin-completed-fg',
    error: 'bg-admin-urgent-bg border-admin-urgent-fg/20 text-admin-urgent-fg',
```

**File:** `admin-panel/src/components/common/Toast.tsx:29`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:55`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const tabs = [
    { id: 'pending',  label: 'Pending' },
    { id: 'approved', label: 'Approved' },
```

**File:** `RepairShopApp/src/components/jobs/PriorityBadge.tsx:21`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const fill = ink + '33'; // 20% opacity

  const icons: Record<JobPriority, React.ElementType> = {
    'Normal': Minus,
    'High': Flame,
```

**File:** `RepairShopApp/src/components/jobs/StatusBadge.tsx:14`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const fill = ink + '33'; // 20% opacity

  const icons: Record<string, React.ElementType> = {
    'Received': Clock,
    'In Progress': Wrench,
```

#### react-doctor/rerender-state-only-in-handlers

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:57`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  });
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [triggeringExport, setTriggeringExport] = useState<string | null>(null);

```

**File:** `admin-panel/src/app/(admin)/salary/page.tsx:26`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null);
  const [activeTab, setActiveTab] = useState<'calculate' | 'rates' | 'advance' | 'holidays' | 'bonus' | 'leaves'>('calculate');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStaff = useCallback(async () => {
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:91`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(false);
  const [createdInvoiceCode, setCreatedInvoiceCode] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  // Form State
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:111`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  // Live Preview Data
  const [preview, setPreview] = useState<PreviewInvoiceResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Inventory Catalog State
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:115`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  // Inventory Catalog State
  const [inventoryCatalog, setInventoryCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Load Inventory Catalog
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:31`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
export default function AddMaterialModal({ visible, jobId, onClose, onAdded }: AddMaterialModalProps) {
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:32`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:43`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:103`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [name, showSuggestions]);

  const [selectedStock, setSelectedStock] = useState<number | null>(null);

  const selectSuggestion = (item: InventorySuggestion) => {
```

**File:** `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx:18`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [staffLoading, setStaffLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:47`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:48`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [users, setUsers] = useState<UserData[]>([]);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:39`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [job, setJob] = useState<(Job & { technician_name?: string }) | null>(null);
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);

  const [labourStr, setLabourStr] = useState('0');
```

**File:** `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx:44`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [createdJob, setCreatedJob] = useState<any>(null);

  const [technicianId, setTechnicianId] = useState<string>('');
  const [techName, setTechName] = useState<string>('');

```

**File:** `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:16`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
```

**File:** `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:17`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:48`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:49`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:50`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:69`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const { showToast } = useToast();
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:36`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

```

**File:** `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx:30`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [job, setJob] = useState<Job | null>(null);
  const [visit, setVisit] = useState<OnsiteVisit | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchJobAndVisit = async () => {
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:56`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);

  const [confirmingMaterialsVisible, setConfirmingMaterialsVisible] = useState(false);
```

#### react-doctor/no-locale-format-in-render

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:403`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{new Date(job.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:553`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-secondary">
                            {new Date(job.started_at).toLocaleString()}
                          </span>
                          {job.status === 'success' && job.drive_link && (
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:590`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-secondary">
                            {new Date(job.started_at).toLocaleString()}
                          </span>
                          {job.status === 'success' && job.drive_link && (
```

#### react-doctor/control-has-associated-label

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:436`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                      </td>
                      <td className="px-4 py-3 align-top text-center pt-5">
                        <button 
                          type="button" 
                          onClick={() => setItems(curr => curr.length > 1 ? curr.filter((_, i) => i !== index) : curr)}
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:88`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <span>{item ? 'Edit Job Type' : 'Add New Job Type'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-admin-text-muted hover:text-admin-text-primary transition-colors"
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:62`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="flex items-center justify-between p-4 border-b border-admin-border bg-admin-bg-subtle">
          <h2 className="text-lg font-semibold text-admin-text-primary">Add Stock: {item.products?.name}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg-hover transition-colors">
            <X size={20} />
          </button>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:142`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            {item ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
```

**File:** `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:50`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="px-6 py-4 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle">
          <h3 className="font-bold text-admin-text-primary">Reassign Technician</h3>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
```

**File:** `admin-panel/src/components/jobs/detail/OverviewTab.tsx:62`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <h3 className="text-sm font-semibold uppercase tracking-wider text-admin-text-secondary">Customer Profile</h3>
            <div className="flex gap-2">
              <a href={`tel:${job.customer_contact}`} className="p-1.5 hover:bg-admin-bg-hover rounded text-admin-text-secondary hover:text-admin-text-primary transition-colors">
                <Phone size={16} />
              </a>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
            {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:89`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
            {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:86`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Month *</label>
          <select className={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:92`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Year *</label>
          <select className={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:87`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.field}>
            <label className={styles.label}>Date *</label>
            <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.field}>
              <label className={styles.label}>Staff Member *</label>
              <select className={styles.select} value={addUserId} onChange={e => setAddUserId(e.target.value)}>
                <option value="">— choose staff —</option>
                {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:159`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.field}>
              <label className={styles.label}>Leave Date *</label>
              <input className={styles.input} type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
            </div>
          </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:121`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Select Staff Member *</label>
        <select className={styles.select} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">— choose staff —</option>
          {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="flex items-center justify-between p-6 border-b border-admin-border shrink-0">
          <h2 id="add-staff-title" className="text-xl font-semibold text-admin-text-primary">Add New Staff</h2>
          <button onClick={onClose} className="text-admin-text-secondary hover:text-admin-text-primary transition-colors">
            <X size={24} />
          </button>
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:135`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
              <input
                type="text"
                required
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:146`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
              <input
                type="email"
                required
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:157`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number</label>
              <input
                type="tel"
                required
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:168`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
              <select
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
                value={formData.role}
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:181`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Temporary Password</label>
              <input
                type="password"
                required
```

**File:** `admin-panel/src/components/staff/AttendanceModal.tsx:58`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="px-6 py-4 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle">
          <h3 className="font-bold text-admin-text-primary">Attendance: {staff.name} (Last 30 Days)</h3>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
```

#### react-doctor/no-placeholder-only-field

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:189`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Message Body</label>
                <textarea 
                  className="w-full bg-admin-bg-subtle border border-admin-border rounded-md px-3 py-2 text-admin-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-admin-accent" 
                  rows={3} 
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Amount (&#8377;) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500" />
        </div>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:82`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Description *</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Bought RAM for job RS-2026-0001" />
      </div>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:84`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" />
        </div>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:95`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Description (optional)</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Festival advance" />
      </div>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
        </div>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:100`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Reason *</label>
        <input className={styles.input} type="text" value={reason}
          onChange={e => setReason(e.target.value)} placeholder="e.g. Diwali bonus, exceptional performance" />
      </div>
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:92`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.field}>
            <label className={styles.label}>Holiday Name *</label>
            <input className={styles.input} type="text" placeholder="e.g. Independence Day, Diwali" value={name} onChange={e => setName(e.target.value)} required />
          </div>

```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.field}>
            <label className={styles.label}>Reason (optional)</label>
            <input className={styles.input} type="text" value={addReason} onChange={e => setAddReason(e.target.value)} placeholder="e.g. Personal" />
          </div>
          {addError && <p className={styles.error}>{addError}</p>}
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:144`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Fixed Monthly Salary (₹) *</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="e.g. 25000" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:150`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Allowed Leave Days per Month *</label>
                <input className={styles.input} type="number" min="0" step="1"
                  value={allowedLeaveDays} onChange={e => setAllowedLeaveDays(e.target.value)} placeholder="Default: 2" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:158`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Absent Day Penalty Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={absentDeduction} onChange={e => setAbsentDeduction(e.target.value)} placeholder="e.g. 800" />
                <span className="text-xs text-admin-text-muted mt-1">Applied after allowed leave days are used.</span>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:165`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Half-Day Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={halfdayDeduction} onChange={e => setHalfdayDeduction(e.target.value)} placeholder="e.g. 80" />
                <span className="text-xs text-admin-text-muted mt-1">Applied per half-day marked.</span>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:174`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Late/Early 1st Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier1} onChange={e => setPenaltyTier1(e.target.value)} placeholder="e.g. 30" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:180`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Late/Early {'>'}1 Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier2} onChange={e => setPenaltyTier2(e.target.value)} placeholder="e.g. 60" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Overtime (OT) Rate (₹/hour)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={otRate} onChange={e => setOtRate(e.target.value)} placeholder="e.g. 150" />
              </div>
```

#### react-doctor/prefer-html-dialog

**File:** `admin-panel/src/components/common/ConfirmationModal.tsx:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:113`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-staff-title"
```

#### react-doctor/prefer-dynamic-import

**File:** `admin-panel/src/components/dashboard/JobsPieChart.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface JobsPieChartProps {
```

**File:** `admin-panel/src/components/dashboard/RevenueChart.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
```

**File:** `admin-panel/src/components/dashboard/TechPerformanceChart.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface TechPerformanceChartProps {
```

#### react-doctor/rerender-lazy-state-init

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:18`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}) {
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState(item.purchase_rate.toString());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const { user } = useAuth();

  const [month, setMonth] = useState(getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = generateMonthOptions();
```

**File:** `RepairShopApp/src/screens/admin/ReportsScreen.tsx:44`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = generateMonthOptions();
```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:74`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const { showToast } = useToast();

  const [month, setMonth] = useState(getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = generateMonthOptions();
```

#### react-doctor/no-static-element-interactions

**File:** `admin-panel/src/components/layout/NotificationsDropdown.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="space-y-1">
            {filtered.map(n => (
              <div 
                key={n.id} 
                onClick={() => {
```

**File:** `admin-panel/src/components/layout/Sidebar.tsx:35`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-admin-bg-dark/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
```

#### react-doctor/dangerous-html-sink

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:61`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
```

**File:** `admin-panel/src/lib/invoiceClient.ts:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  popup.document.open();
  popup.document.write(finalHtml);
  popup.document.close();

```

#### react-doctor/no-async-event-handler-without-reentry-guard

**File:** `admin-panel/src/components/salary/SalaryBreakdownCard.tsx:43`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
```

**File:** `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:33`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      const token = session?.access_token;

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`, {
        method: 'POST',
        headers: {
```

#### react-doctor/nextjs-no-client-side-redirect

**File:** `admin-panel/src/context/AuthContext.tsx:52`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          setIsLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
```

#### react-doctor/effect-needs-cleanup

**File:** `admin-panel/src/context/AuthContext.tsx:102`
**Outcome:** Rejected (documented false positive)
**Evidence:**
```tsx

  // Idle Timeout Logic
  useEffect(() => {
    if (!sessionUser) return;

```

**File:** `RepairShopApp/src/hooks/usePushNotifications.ts:103`
**Outcome:** Rejected (documented false positive)
**Evidence:**
```tsx
  }

  useEffect(() => {
    if (!userId || isExpoGo) return;

```

**File:** `RepairShopApp/src/hooks/useRealtimeSubscription.ts:18`
**Outcome:** Rejected (documented false positive)
**Evidence:**
```tsx
  });

  useEffect(() => {
    const key = filter ? `${table}:${filter}` : table;
    const existing = channelRegistry.get(key);
```

#### react-doctor/jsx-no-constructed-context-values

**File:** `admin-panel/src/context/AuthContext.tsx:127`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  return (
    <AuthContext.Provider value={{
      sessionUser,
      profile,
```

**File:** `RepairShopApp/src/context/ToastContext.tsx:32`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastOptions && (
```

#### react-doctor/rerender-lazy-ref-init

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:33`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
```

#### react-doctor/rn-reanimated-4-use-worklets-scheduler

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:43`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          runOnJS(handleCloseRef.current)();
        } else {
          translateY.value = withSpring(0, { damping: 26, stiffness: 400, overshootClamping: true });
```

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:60`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setShowModal)(false);
        }
      });
```

**File:** `RepairShopApp/src/components/common/ModalShell.tsx:28`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      opacity.value = withSpring(0, { damping: 20, stiffness: 150, overshootClamping: true }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
```

**File:** `admin-panel/src/components/common/Toast.tsx:51`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <X size={16} />
      </button>
    </div>
  );
}
```

#### react-doctor/no-adjust-state-on-prop-change

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:53`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      translateY.value = withSpring(0, { damping: 26, stiffness: 400, overshootClamping: true });
      opacity.value = withTiming(0.4, { duration: 300 });
```

**File:** `RepairShopApp/src/components/common/ModalShell.tsx:21`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      translateY.value = withSpring(0, SPRING);
      opacity.value = withSpring(1, { damping: 20, stiffness: 150, overshootClamping: true });
```

#### react-doctor/rn-no-deprecated-modules

**File:** `RepairShopApp/src/components/common/ErrorBoundary.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

#### react-doctor/rn-no-scrollview-mapped-list

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        {showPriorityFilter && priorityTabs && activePriorityTab && onPriorityTabChange && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
              {priorityTabs.map(tab => (
                <TouchableOpacity
                  key={tab.value}
```

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:133`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        {/* Status chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
          {statusTabs.map(tab => (
            <TouchableOpacity
              key={tab.value}
```

#### react-doctor/rn-no-inline-flatlist-renderitem

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:180`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item, index }) => (
            <JobCard
              job={item}
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:55`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              data={technicians}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.techRow} onPress={() => onSelect(item.id, item.name)}>
                  <Text style={styles.techName}>{item.name}</Text>
```

**File:** `RepairShopApp/src/components/shared/Dropdown.tsx:59`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:225`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          ) : null
        }
        renderItem={({ item }) => {
          const typeColor = TYPE_COLORS[item.type] ?? { bg: colors.backgroundAlt, fg: colors.textSecondary };
          return (
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:229`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item }) => {
            const roleStyle = getRoleBadgeStyle(item.role);
            return (
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:317`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              data={attendanceRecords}
              keyExtractor={r => r.id}
              renderItem={({ item }) => (
                <View style={styles.attendanceRow}>
                  <View style={styles.attendanceDateCol}>
```

**File:** `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:244`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            data={filteredAllotments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AllottedMaterialsCard
                item={item}
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:339`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.historyCard}
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:355`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item }) => {
            const isOutOfStock = item.quantity === 0;
            const isLowStock = !isOutOfStock && item.quantity <= item.low_stock_threshold;
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:220`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item }) => {
            const { icon, bg } = getIconData(item.channel);
            const isRead = item.is_read;
```

#### react-doctor/rn-list-callback-per-row

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:184`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              job={item}
              index={index}
              onPress={() => onJobPress(item.id)}
            />
          )}
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:56`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.techRow} onPress={() => onSelect(item.id, item.name)}>
                  <Text style={styles.techName}>{item.name}</Text>
                </TouchableOpacity>
```

**File:** `RepairShopApp/src/components/shared/Dropdown.tsx:64`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  <TouchableOpacity 
                    style={styles.optionRow} 
                    onPress={() => {
                      onSelect(item.value);
                      setModalVisible(false);
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:238`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openOptions(item)} style={styles.optionsBtn}>
                    <MoreVertical size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:342`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <TouchableOpacity 
              style={styles.historyCard}
              onPress={() => {
                if (item.check_in_selfie_url || (item as any).selfie_url) {
                  openImage(item.check_in_selfie_url || (item as any).selfie_url, `Selfie on ${formatDate(item.date)}`);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:363`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                style={styles.rowCard}
                activeOpacity={isAdmin ? 0.7 : 1}
                onPress={() => {
                  if (!isAdmin) return;
                  setEditingItem(item);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:373`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  setModalVisible(true);
                }}
                onLongPress={() => handleDeleteRequest(item.id)}
              >
                <View style={styles.rowIconBox}>
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:226`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <TouchableOpacity
                style={[styles.rowCard, isRead && styles.rowCardRead]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
              >
```

#### react-doctor/supabase-client-owned-authz-field

**File:** `RepairShopApp/src/hooks/usePushNotifications.ts:14`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export const usePushNotifications = (userId?: string): PushNotificationState => {
  const isExpoGo = Constants.appOwnership === 'expo';

```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:27`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

export default function NotificationsScreen() {
  const { user, role } = useAuth();
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
```

#### react-doctor/rn-no-non-native-navigator

**File:** `RepairShopApp/src/navigation/AdminStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import AdminTabs from './AdminTabs';
```

**File:** `RepairShopApp/src/navigation/ReceptionistJobsStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import JobListScreen from '../screens/receptionist/JobListScreen';
import JobDetailScreen from '../screens/receptionist/JobDetailScreen';
```

**File:** `RepairShopApp/src/navigation/ReceptionistStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ReceptionistTabs from './ReceptionistTabs';
```

**File:** `RepairShopApp/src/navigation/RootNavigator.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
```

**File:** `RepairShopApp/src/navigation/TechnicianJobsStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyJobsScreen from '../screens/technician/MyJobsScreen';
import OnsiteVisitScreen from '../screens/technician/OnsiteVisitScreen';
```

**File:** `RepairShopApp/src/navigation/TechnicianStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TechnicianTabs from './TechnicianTabs';
```

#### react-doctor/js-flatmap-filter

**File:** `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      let techMap: Record<string, string> = {};
      if (!isScoped && data && data.length > 0) {
        const techIds = [...new Set((data as any[]).map((r: any) => r.technician_id).filter(Boolean))];
        if (techIds.length > 0) {
          const { data: techData } = await supabase
```

#### react-doctor/rn-prefer-expo-image

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:4`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  FlatList, Modal, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:9`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
```

### Observations
#### react-doctor/js-hoist-intl

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:203`
**Outcome:** Observation
**Evidence:**
```tsx
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.purchase_rate || 0)}
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
```

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:206`
**Outcome:** Observation
**Evidence:**
```tsx
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.selling_rate || 0)}
                      </td>
                      <td className="px-6 py-4 text-admin-text-secondary">{item.products?.unit || '-'}</td>
```

**File:** `admin-panel/src/app/(admin)/page.tsx:187`
**Outcome:** Observation
**Evidence:**
```tsx

  // Calculate real date labels for today
  const todayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date());

  return (
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:267`
**Outcome:** Observation
**Evidence:**
```tsx
                        <td className="px-6 py-4"><InvoiceStatusBadge status={inv.status} /></td>
                        <td className="px-6 py-4 text-right font-semibold text-admin-text-primary">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(inv.grand_total || 0))}
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{new Date(inv.created_at).toLocaleString()}</td>
```

**File:** `RepairShopApp/src/lib/shared/formatCurrency.ts:11`
**Outcome:** Observation
**Evidence:**
```tsx
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
```

**File:** `packages/shared/src/date.ts:35`
**Outcome:** Observation
**Evidence:**
```tsx

export function getAttendanceDateIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
```

**File:** `packages/shared/src/date.ts:45`
**Outcome:** Observation
**Evidence:**
```tsx

export function getDateIST(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
```

**File:** `packages/shared/src/formatCurrency.ts:11`
**Outcome:** Observation
**Evidence:**
```tsx
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
```

#### react-doctor/no-giant-component

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:31`
**Outcome:** Observation
**Evidence:**
```tsx
import { useAppConfig } from "@/context/AppConfigContext";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:18`
**Outcome:** Observation
**Evidence:**
```tsx
import { openInvoicePrint } from '@/lib/invoiceClient';

export default function CreateJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:22`
**Outcome:** Observation
**Evidence:**
```tsx
import { exportJobsToCSV } from "@/utils/csv";

export default function JobsPage() {
  const router = useRouter();

```

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:64`
**Outcome:** Observation
**Evidence:**
```tsx
}

export default function MaterialsPage() {
  const router = useRouter();

```

**File:** `admin-panel/src/app/(admin)/page.tsx:22`
**Outcome:** Observation
**Evidence:**
```tsx
import Link from 'next/link';

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:25`
**Outcome:** Observation
**Evidence:**
```tsx
import { Download } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tech"); 
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:86`
**Outcome:** Observation
**Evidence:**
```tsx
};

export default function CreateSalePage() {
  const router = useRouter();
  const { showToast } = useToast();
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:10`
**Outcome:** Observation
**Evidence:**
```tsx
import { Tabs } from '../common/Tabs';

export default function InventoryFormModal({ 
  item, 
  onClose, 
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:29`
**Outcome:** Observation
**Evidence:**
```tsx
};

export default function AddMaterialModal({ visible, jobId, onClose, onAdded }: AddMaterialModalProps) {
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:26`
**Outcome:** Observation
**Evidence:**
```tsx
import { useToast } from '../../context/ToastContext';

export default function BillingScreen() {
  const route = useRoute<any>();
  const jobId = route.params?.jobId;
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:73`
**Outcome:** Observation
**Evidence:**
```tsx
// Local buildSaleInvoiceHtml removed — using shared generateSaleInvoiceHtml from @repairshop/shared

export default function NewSaleScreen() {
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:29`
**Outcome:** Observation
**Evidence:**
```tsx
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:39`
**Outcome:** Observation
**Evidence:**
```tsx
type TabValue = 'All' | 'Low Stock' | 'Out of Stock';

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:39`
**Outcome:** Observation
**Evidence:**
```tsx
import { compressImage } from '../../utils/compressImage';

export default function ProfileScreen() {
  const { session, user, displayName, role, signOut } = useAuth();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:227`
**Outcome:** Observation
**Evidence:**
```tsx
// Main Component
// ---------------------------------------------------------------------------
export default function SalaryScreen() {
  const { user, displayName, role } = useAuth();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:30`
**Outcome:** Observation
**Evidence:**
```tsx
];

export default function UpdateWorkScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
```

#### react-doctor/rn-prefer-pressable

**File:** `RepairShopApp/src/components/common/AppHeader.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ChevronLeft, Bell, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
```

**File:** `RepairShopApp/src/components/common/DetailRow.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

**File:** `RepairShopApp/src/components/common/ErrorBoundary.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

**File:** `admin-panel/src/components/common/ErrorState.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
﻿import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
```

**File:** `admin-panel/src/components/common/Toast.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
﻿import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

```

**File:** `RepairShopApp/src/components/jobs/JobDetailShell.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
```

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { TechnicianSummary } from '../../types/user';
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, CheckCircle2, Trash2, Package } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/components/materials/AllottedMaterialsCard.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, User, Wrench, Calendar, RotateCcw, Bell } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
```

**File:** `RepairShopApp/src/components/materials/MaterialList.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2, Camera } from 'lucide-react-native';
import { JobMaterial } from '../../types/job';
```

**File:** `RepairShopApp/src/components/shared/Dropdown.tsx:3`
**Outcome:** Observation
**Evidence:**
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
```

**File:** `RepairShopApp/src/components/shared/LineItemTable.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

**File:** `RepairShopApp/src/components/shared/RoleDashboard.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StyleProp, ViewStyle, Pressable } from 'react-native';
import { LucideIcon, ChevronRight } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
```

**File:** `RepairShopApp/src/components/shared/SegmentedControl.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, typography } from '../../tokens';

```

**File:** `RepairShopApp/src/components/shared/SelfieCapture.tsx:3`
**Outcome:** Observation
**Evidence:**
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
```

**File:** `RepairShopApp/src/navigation/AdminTabs.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import OverviewScreen from '../screens/admin/OverviewScreen';
```

**File:** `RepairShopApp/src/navigation/CustomTabBar.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

**File:** `RepairShopApp/src/navigation/ReceptionistTabs.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/receptionist/DashboardScreen';
```

**File:** `RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
```

**File:** `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx:20`
**Outcome:** Observation
**Evidence:**
```tsx
import { useToast } from '../../context/ToastContext';
import { ChevronRight } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function AdminJobDetailScreen() {
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
```

**File:** `RepairShopApp/src/screens/admin/OverviewScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
```

**File:** `RepairShopApp/src/screens/admin/ReportsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronDown, Trophy, TrendingUp } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:10`
**Outcome:** Observation
**Evidence:**
```tsx
  Platform,
  Pressable,
  TouchableOpacity,
  Image
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, ChevronDown } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
```

**File:** `RepairShopApp/src/screens/receptionist/CustomersScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, radius, shadow } from '../../tokens';
```

**File:** `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useCallback, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
```

**File:** `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx:6`
**Outcome:** Observation
**Evidence:**
```tsx
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, Text } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/PaymentsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Banknote, FileText, Download } from 'lucide-react-native';
import AppHeader from '../../components/common/AppHeader';
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:3`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  FlatList, Modal, Image, RefreshControl,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, Mail, MessageCircle, BellDot } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
```

**File:** `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Package, ArrowRight, Info, AlertCircle, CheckCircle } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
```

#### react-doctor/rn-no-panresponder

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
```

#### react-doctor/rn-no-inline-object-in-list-item

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:230`
**Outcome:** Observation
**Evidence:**
```tsx
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor.fg }]}>
                    {TYPE_LABELS[item.type]}
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:231`
**Outcome:** Observation
**Evidence:**
```tsx
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor.fg }]}>
                    {TYPE_LABELS[item.type]}
                  </Text>
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:249`
**Outcome:** Observation
**Evidence:**
```tsx
                  </View>
                  <View style={styles.badgesCol}>
                    <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: roleStyle.fg }]}>
                        {item.role.toUpperCase()}
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:250`
**Outcome:** Observation
**Evidence:**
```tsx
                  <View style={styles.badgesCol}>
                    <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: roleStyle.fg }]}>
                        {item.role.toUpperCase()}
                      </Text>
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:255`
**Outcome:** Observation
**Evidence:**
```tsx
                    </View>
                    {!item.is_active && (
                      <View style={[styles.roleBadge, { backgroundColor: colors.statusUrgentBg }]}>
                        <Text style={[styles.roleBadgeText, { color: colors.statusUrgentFg }]}>INACTIVE</Text>
                      </View>
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:256`
**Outcome:** Observation
**Evidence:**
```tsx
                    {!item.is_active && (
                      <View style={[styles.roleBadge, { backgroundColor: colors.statusUrgentBg }]}>
                        <Text style={[styles.roleBadgeText, { color: colors.statusUrgentFg }]}>INACTIVE</Text>
                      </View>
                    )}
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:326`
**Outcome:** Observation
**Evidence:**
```tsx
                    <Text style={styles.attendanceTime}>Out: {formatTime(item.check_out_time)}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                </View>
              )}
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:351`
**Outcome:** Observation
**Evidence:**
```tsx
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                {item.status === 'Present' ? (
                  <View style={[styles.badge, { backgroundColor: colors.statusCompletedBg }]}>
                    <Text style={[styles.badgeText, { color: colors.statusCompletedFg }]}>Present</Text>
                  </View>
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:352`
**Outcome:** Observation
**Evidence:**
```tsx
                {item.status === 'Present' ? (
                  <View style={[styles.badge, { backgroundColor: colors.statusCompletedBg }]}>
                    <Text style={[styles.badgeText, { color: colors.statusCompletedFg }]}>Present</Text>
                  </View>
                ) : (
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:355`
**Outcome:** Observation
**Evidence:**
```tsx
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: colors.backgroundAlt }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.status}</Text>
                  </View>
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:356`
**Outcome:** Observation
**Evidence:**
```tsx
                ) : (
                  <View style={[styles.badge, { backgroundColor: colors.backgroundAlt }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.status}</Text>
                  </View>
                )}
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:229`
**Outcome:** Observation
**Evidence:**
```tsx
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconBox, { backgroundColor: bg }]}>
                  {icon}
                </View>
```

### Confirmed Failures — Error severity
### Confirmed Failures — Warning severity
#### react-doctor/js-combine-iterations

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:149`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setPreviewLoading(true);
      try {
        const payloadItems: InvoiceLineParams[] = items
          .filter(i => i.item_name || i.product_id)
          .map(i => ({
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:228`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    setLoading(true);
    try {
      const payloadItems: InvoiceLineParams[] = items
        .filter(i => i.item_name || i.product_id)
        .map(i => ({
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:398`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  if (!createdSale) return;
                  try {
                    const saleItems = (createdSale.sale_items || items)
                      .filter((i: any) => String(i.item_name || '').trim())
                      .map((i: any) => ({ description: String(i.item_name), hsn: '', price: Number(i.unit_price), unit: Number(i.quantity) }));
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:372`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          
          <View style={{ maxHeight: 300 }}>
            {materials
              .filter(m => m.checkout_status === 'checked_out')
              .map(item => (
```

#### react-doctor/async-await-in-loop

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            throw new Error(`Invalid usage quantity for ${mat.material_name}. Must be between 0 and ${mat.qty_taken || mat.quantity}.`);
          }
          const { error } = await supabase.from('job_materials').update({
            quantity: usedQty,
            checkout_status: 'confirmed',
```

#### react-doctor/no-fetch-response-used-without-status-check

**File:** `RepairShopApp/src/components/shared/SelfieCapture.tsx:112`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (!session) return;

    const blob = await (await fetch(webpUri)).blob();
    const form = new FormData();
    form.append('staffId', opts.staffId);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:175`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      const token = session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
```

#### react-doctor/no-loading-flag-reset-outside-finally

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setPayments(data || []);
    }
    setLoading(false);
  }, [month, typeFilter, refreshKey, showToast]);

```

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast('Failed to fetch inventory.', 'error');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:102`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setError(err.message || 'Failed to load job details');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setError(err.message || 'Failed to fetch jobs.');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:129`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setTechData(Object.values(counts));
    }
    setTechLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:156`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
    }
    setRevenueLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (cancelled) return;
    if (data) setExportJobs(data);
    setExportLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:208`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (data) setCustomerJobs(data as any);
    if (count !== null) setCustomerTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    setCustomerLoading(false);
  };

```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:108`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setError(err instanceof Error ? err.message : "Failed to fetch invoices.");
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:86`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast('WhatsApp settings saved successfully', 'success');
    }
    setSaving(false);
  };

```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast('Failed to fetch staff data.', 'error');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
```

**File:** `admin-panel/src/app/login/page.tsx:38`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      }
      setError(friendlyError);
      setLoading(false);
    } else {
      router.push("/");
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      created_at: new Date(date).toISOString(),
    });
    setSaving(false);

    if (err) return setError(err.message);
```

**File:** `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:39`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onSuccess();
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    });

    setSaving(false);

    if (err) return setError(err.message);
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    });

    setSaving(false);
    if (err) return setError(err.message);

```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:30`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    if (err) console.error('Error fetching holidays:', err);
    else setHolidays(data || []);
    setLoading(false);
  }, []);

```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:53`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });

    setSaving(false);
    if (err) {
      setError(err.message || 'Failed to add holiday');
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:57`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setTotal(count || 0);
    }
    setLoading(false);
  }, [activeTab, page]);

```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setAddError(err.message);
    }
    setAddSaving(false);
  };

```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:64`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setOtRate(data?.ot_rate_per_hour?.toString() || '0');

      setLoading(false);
    };

```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:106`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    const { error: err } = await supabase.from('staff_rates').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);

    if (err) return setError(err.message);
```

**File:** `admin-panel/src/context/AuthContext.tsx:50`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          setSessionUser(null);
          setProfile(null);
          setIsLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:35`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setTechnicians(data as TechnicianSummary[]);
    }
    setLoading(false);
  };

```

**File:** `admin-panel/src/context/AuthContext.tsx:93`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:57`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      showToast({ title: 'Login Failed', message: error.message, type: 'error' });
    }
    setLoading(false);
  };

```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:418`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              else await fetchAttendance();
              
              setProcessing(false);
            }}
            style={{ flex: 1, backgroundColor: colors.primary }}
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:299`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    setRecord(recordData as SalaryRecord | null);
    setLoading(false);
  }, [user, monthStr]);

```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:317`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    setHistory((data || []) as SalaryRecord[]);
    setHistoryTotal(count || 0);
    setHistLoading(false);
  }, [user, monthStr, historyPage]);

```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:331`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      .limit(10);
    setMyLeaves(data || []);
    setLeaveLoading(false);
  }, [user]);

```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:395`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      reason:     leaveReason.trim() || null,
    });
    setLeaveSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
```

#### react-doctor/exhaustive-deps

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:67`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    }
    setLoading(false);
  }, [month, typeFilter, refreshKey, showToast]);

  useEffect(() => {
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:124`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Actions
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:159`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, [statusFilter, techFilter, priorityFilter, currentPage, debouncedSearchQuery, dateFrom, dateTo]);

  const handleExportCSV = () => {
```

**File:** `admin-panel/src/app/(admin)/page.tsx:156`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    }
    return () => { cancelled = true; };
  }, [activeTab, techMonth]);

  useEffect(() => {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:97`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(exportsChannel);
    };
  }, [activeTab, customerSearch]);

  const fetchTechPerformance = async (cancelled = false) => {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:217`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    }
    return () => { cancelled = true; };
  }, [customerPage]);

  const onSearchSubmit = () => {
```

**File:** `admin-panel/src/app/(admin)/staff/leaves/page.tsx:42`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    fetchLeaves();
  }, []);

  const [confirmModal, setConfirmModal] = useState<{
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    run();
    return () => { cancelled = true; };
  }, [roleFilter, statusFilter, currentPage, debouncedSearchQuery]);

  const [confirmModal, setConfirmModal] = useState<{
```

**File:** `admin-panel/src/components/layout/Topbar.tsx:100`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Close popovers on outside click
```

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:64`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
    }
  }, [visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
```

**File:** `RepairShopApp/src/components/common/ModalShell.tsx:32`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
    }
  }, [visible]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
```

**File:** `RepairShopApp/src/components/common/SkeletonCard.tsx:24`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
```

**File:** `admin-panel/src/components/common/Toast.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <button 
        onClick={() => onDismiss(id)}
        className="text-current opacity-70 hover:opacity-100 transition-opacity p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        aria-label="Dismiss"
      >
```

**File:** `RepairShopApp/src/components/jobs/PriorityBadge.tsx:45`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      scale.value = 1;
    }
  }, [isUrgent]);

  const animatedStyle = useAnimatedStyle(() => ({
```

**File:** `RepairShopApp/src/hooks/usePushNotifications.ts:175`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      }
    };
  }, [userId, isExpoGo]);

  return { expoPushToken, notification };
```

**File:** `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx:69`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchJobDetails();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx:121`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      fetchTabCounts();
      fetchJobs(0, true);
    }, [activeTab, searchQuery])
  );

```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:127`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      setLoading(true);
      fetchPayments();
    }, [month])
  );

```

**File:** `RepairShopApp/src/screens/admin/OverviewScreen.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      fetchData();
      fetchNotifications();
    }, [user])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:100`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchBillingData();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx:105`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
      fetchNotifications();
    }, [])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx:72`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchJobDetails();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:130`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      fetchJobs(0, true, cancelled);
      return () => { cancelled = true; };
    }, [route.params?.filter, activeTab, searchQuery])
  );

```

**File:** `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:107`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchAllotments();
    }, [user?.id, mode])
  );

```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:82`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    if (user) fetchAttendance();
  }, [user, historyLimit]);

  useRealtimeSubscription('attendance', fetchAttendance, user ? `user_id=eq.${user.id}` : undefined);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:149`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    fetchInventory(0, true, cancelled);
    return () => { cancelled = true; };
  }, [activeTab, debouncedSearch]);

  const onRefresh = () => {
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:174`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    return () => { supabase.removeChannel(channel); };
  }, []);

  const openAddModal = () => {
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:87`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        supabase.removeChannel(channel);
      };
    }, [user?.id])
  );

```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:109`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  // Phone Save
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:300`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    setRecord(recordData as SalaryRecord | null);
    setLoading(false);
  }, [user, monthStr]);

  // ── Fetch salary history ───────────────────────────────────────────────────
```

**File:** `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx:89`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchAllotments();
    }, [user])
  );

```

**File:** `RepairShopApp/src/screens/technician/MyJobsScreen.tsx:58`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      }
      fetchJobs();
    }, [route.params?.filter])
  );

```

**File:** `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx:67`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    useCallback(() => {
      fetchJobAndVisit();
    }, [jobId])
  );

```

**File:** `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:123`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useFocusEffect(
```

**File:** `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:131`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      });
      fetchNotifications();
    }, [user])
  );

```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:105`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      return () => { supabase.removeChannel(channel); };
    }, [jobId])
  );

```

#### react-doctor/no-create-object-url-without-revoke

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:106`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenditure-${month}.csv`);
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:250`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
```

**File:** `admin-panel/src/lib/invoiceClient.ts:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    // Fallback: blob URL if popup is blocked
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    return { driveLink };
```

**File:** `admin-panel/src/utils/csv.ts:36`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
```

**File:** `admin-panel/src/utils/materialsCsv.ts:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

```

**File:** `admin-panel/src/utils/salesCsv.ts:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
```

#### react-doctor/label-has-associated-control

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:148`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Month</label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Type</label>
              <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as PaymentType | 'all')}>
                {EXPENDITURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
```

**File:** `admin-panel/src/app/(admin)/expenditure/page.tsx:158`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search Description</label>
              <Input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:547`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  <div className="p-6 pt-0 space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
                      <Select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}>
                        {config.jobStatuses.map(s => (
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:555`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Priority</label>
                      <Select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value as any})}>
                        {config.priorities.map(p => (
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:563`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Job Type</label>
                      <Select value={editForm.job_type} onChange={e => setEditForm({...editForm, job_type: e.target.value as any})}>
                        {config.serviceLocations.map(l => (
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:571`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-admin-text-secondary mb-1">Technician</label>
                      <Select value={editForm.technician_id || ''} onChange={e => setEditForm({...editForm, technician_id: e.target.value})}>
                        <option value="">-- Unassigned --</option>
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:641`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

                  <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payment Status</label>
                    <Select 
                      value={billingForm.is_paid ? 'Paid in Full' : 'Unpaid'} 
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:264`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Name *</label>
                <div className="relative">
                  <Input 
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:277`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Contact Number *</label>
                <Input 
                  value={form.customer_contact}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:289`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address (Optional)</label>
                <Input 
                  value={form.customer_email}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:299`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">GSTIN (Optional)</label>
                <Input 
                  value={form.customer_gstin}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:319`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Service Type Catalog</label>
                <Select 
                  value={form.job_type_ref_id}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:365`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Device Category *</label>
                <Select 
                  value={form.device_type}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:377`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Reported Issue *</label>
                <Textarea 
                  value={form.reported_issue}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:389`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Remarks & Physical Condition</label>
                <Textarea 
                  value={form.remarks}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:408`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Service Location</label>
                <Select 
                  value={form.job_type}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:419`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Priority Level</label>
                <Select 
                  value={form.priority}
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:431`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Assign Technician</label>
                <Select 
                  value={form.technician_id}
```

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:331`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface border border-admin-border">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search Materials & Jobs</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
```

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:346`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        {uniqueTechnicians.length > 0 && (
          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">Filter by Technician</label>
            <Select
              value={selectedTech}
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:335`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Name *</label>
              <Input value={form.customer_name} onChange={(e) => setForm({...form, customer_name: e.target.value})} error={!!errors.customer_name} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:339`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Contact Number *</label>
              <Input type="tel" value={form.customer_contact} onChange={(e) => setForm({...form, customer_contact: e.target.value})} error={!!errors.customer_contact} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:343`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email (Optional)</label>
              <Input type="email" value={form.customer_email} onChange={(e) => setForm({...form, customer_email: e.target.value})} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:347`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">GSTIN (Optional)</label>
              <Input value={form.customer_gstin} onChange={(e) => setForm({...form, customer_gstin: e.target.value})} />
            </div>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:361`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              </div>
              <div className="flex items-center gap-2">
                 <label className="text-sm font-medium text-admin-text-secondary">Tax Regime:</label>
                 <Select value={form.tax_regime} onChange={(e) => setForm({...form, tax_regime: e.target.value as any})} className="py-1 text-sm h-8">
                   <option value="intra_state">Intra-State (CGST + SGST)</option>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:468`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
                  <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value as any})}>
                    <option value="paid">Paid</option>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:475`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payment Method</label>
                  <Select value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value as any})}>
                    <option value="Cash">Cash</option>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:485`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Internal Notes (Optional)</label>
                  <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} />
                </div>
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:174`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface rounded-tl-none pt-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:187`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Date Range</label>
          <div className="flex items-center gap-2">
            <div className="relative">
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:201`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payment</label>
          <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="All">All Methods</option>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:65`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
                <Input type="email" value={profile?.email || ""} disabled className="bg-admin-bg-subtle text-admin-text-muted" />
                <p className="text-xs text-admin-text-muted mt-1">Email cannot be changed.</p>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
                <Input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              
              <div className="pt-2 border-t border-admin-border">
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Change Password</label>
                <Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:98`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Shop Name</label>
                <Input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/page.tsx:102`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Address</label>
                <Input type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:184`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number (with country code)</label>
                <Input type="text" placeholder="e.g. 919876543210" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              </div>
```

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Message Body</label>
                <textarea 
                  className="w-full bg-admin-bg-subtle border border-admin-border rounded-md px-3 py-2 text-admin-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-admin-accent" 
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:140`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-admin-text-muted" size={16} />
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
          <Select 
            value={roleFilter} 
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
          <Select 
            value={statusFilter} 
```

**File:** `admin-panel/src/app/login/page.tsx:67`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-admin-text-primary font-medium mb-1.5 text-sm">Email</label>
            <Input 
              type="email" 
```

**File:** `admin-panel/src/app/login/page.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          </div>
          <div>
            <label className="block text-admin-text-primary font-medium mb-1.5 text-sm">Password</label>
            <div className="relative">
              <Input 
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:104`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Title / Service Name *
            </label>
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Base Customer Charge (₹) *
            </label>
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:132`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Technician Incentive (₹)
            </label>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:63`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Type *</label>
          <select className={styles.select} value={type} onChange={e => setType(e.target.value as PaymentType)} aria-label="Select expenditure type">
            <option value="">-- Select Type --</option>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Amount (&#8377;) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500" />
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:75`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Description *</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Bought RAM for job RS-2026-0001" />
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Quantity to Add *</label>
              <Input 
                type="number" 
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:85`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Purchase Rate (₹) *</label>
              <Input 
                type="number" 
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:94`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Notes (Optional)</label>
              <Input 
                type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:167`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Product Name *</label>
                <Input 
                  type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:178`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">SKU</label>
                  <Input 
                    type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:187`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Unit of Measure</label>
                  <Input 
                    type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:199`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">HSN/SAC Code</label>
                  <Input 
                    type="text" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:207`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Tax Mode</label>
                  <Select 
                    value={productData.tax_mode}
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:220`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">CGST %</label>
                  <Input type="number" min="0" step="0.5" value={productData.cgst_rate} onChange={(e) => setProductData({...productData, cgst_rate: Number(e.target.value)})} />
                </div>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:224`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">SGST %</label>
                  <Input type="number" min="0" step="0.5" value={productData.sgst_rate} onChange={(e) => setProductData({...productData, sgst_rate: Number(e.target.value)})} />
                </div>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:228`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">IGST %</label>
                  <Input type="number" min="0" step="0.5" value={productData.igst_rate} onChange={(e) => setProductData({...productData, igst_rate: Number(e.target.value)})} />
                </div>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:239`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Purchase Rate (Cost)</label>
                  <Input 
                    type="number" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:248`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Selling Rate (Base)</label>
                  <Input 
                    type="number" 
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:262`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  <Info className="text-admin-accent shrink-0 mt-0.5" size={18} />
                  <div>
                    <label className="block text-sm font-medium text-admin-text-primary mb-1">Opening Stock Quantity</label>
                    <p className="text-xs text-admin-text-muted mb-3">
                      Enter the initial physical count. To add stock later, use the Purchase Order flow.
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:285`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Low Stock Threshold</label>
                  <Input 
                    type="number" min="0"
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:293`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Min Stock Level</label>
                  <Input 
                    type="number" min="0"
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:303`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Warehouse Location (optional)</label>
                <Input 
                  type="text" 
```

**File:** `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          )}

          <label className="block text-sm font-medium text-admin-text-secondary mb-2">Select Technician</label>
          <Select 
            value={selectedTech} 
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:83`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" />
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:88`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:94`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Description (optional)</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Festival advance" />
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:85`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Month *</label>
          <select className={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:91`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Year *</label>
          <select className={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:99`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Reason *</label>
        <input className={styles.input} type="text" value={reason}
          onChange={e => setReason(e.target.value)} placeholder="e.g. Diwali bonus, exceptional performance" />
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:86`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Date *</label>
            <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:91`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          <div className={styles.field}>
            <label className={styles.label}>Holiday Name *</label>
            <input className={styles.input} type="text" placeholder="e.g. Independence Day, Diwali" value={name} onChange={e => setName(e.target.value)} required />
          </div>
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:151`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Staff Member *</label>
              <select className={styles.select} value={addUserId} onChange={e => setAddUserId(e.target.value)}>
                <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:158`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Leave Date *</label>
              <input className={styles.input} type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
            </div>
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:163`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reason (optional)</label>
            <input className={styles.input} type="text" value={addReason} onChange={e => setAddReason(e.target.value)} placeholder="e.g. Personal" />
          </div>
```

**File:** `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Select Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)} aria-label="Select staff member">
            <option value="">-- Choose Staff --</option>
```

**File:** `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:74`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

        <div className={styles.field}>
          <label className={styles.label}>Month *</label>
          <input className={styles.input} type="month" value={month} onChange={e => setMonth(e.target.value)} aria-label="Select month" />
        </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

      <div className={styles.field}>
        <label className={styles.label}>Select Staff Member *</label>
        <select className={styles.select} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">— choose staff —</option>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:143`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Fixed Monthly Salary (₹) *</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="e.g. 25000" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:149`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className={styles.field}>
                <label className={styles.label}>Allowed Leave Days per Month *</label>
                <input className={styles.input} type="number" min="0" step="1"
                  value={allowedLeaveDays} onChange={e => setAllowedLeaveDays(e.target.value)} placeholder="Default: 2" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:157`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Absent Day Penalty Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={absentDeduction} onChange={e => setAbsentDeduction(e.target.value)} placeholder="e.g. 800" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className={styles.field}>
                <label className={styles.label}>Half-Day Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={halfdayDeduction} onChange={e => setHalfdayDeduction(e.target.value)} placeholder="e.g. 80" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:173`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Late/Early 1st Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier1} onChange={e => setPenaltyTier1(e.target.value)} placeholder="e.g. 30" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:179`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

              <div className={styles.field}>
                <label className={styles.label}>Late/Early {'>'}1 Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier2} onChange={e => setPenaltyTier2(e.target.value)} placeholder="e.g. 60" />
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:187`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Overtime (OT) Rate (₹/hour)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={otRate} onChange={e => setOtRate(e.target.value)} placeholder="e.g. 150" />
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:134`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
              <input
                type="text"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:145`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
              <input
                type="email"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:156`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number</label>
              <input
                type="tel"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:167`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
              <select
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:180`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Temporary Password</label>
              <input
                type="password"
```

#### react-doctor/no-set-state-after-await-in-effect

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:79`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    fetchInventory(cancelled);
```

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:106`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    let cancelled = false;
    fetchData(cancelled);
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:144`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [statusFilter, techFilter, priorityFilter, debouncedSearchQuery, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    fetchJobs(cancelled);
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:60`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [triggeringExport, setTriggeringExport] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (activeTab === "tech") {
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:211`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    let cancelled = false;
    if (activeTab === 'customer' && customerSearch.trim()) {
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [statusFilter, paymentFilter, debouncedSearchQuery, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    fetchInvoices(cancelled);
```

**File:** `admin-panel/src/app/(admin)/staff/page.tsx:74`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [roleFilter, statusFilter, debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
```

**File:** `admin-panel/src/components/layout/Topbar.tsx:80`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    let cancelled = false;
    fetchNotifications(cancelled);
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:17`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchTechnicians();
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:80`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user, historyLimit]);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:144`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  });

  useEffect(() => {
    let cancelled = false;
    setPage(0);
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:107`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);
```

#### react-doctor/prefer-useReducer

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:31`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import { useAppConfig } from "@/context/AppConfigContext";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:20`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function ExpenditureForm({ currentAdminId, onSuccess }: Props) {
  const [type, setType] = useState<PaymentType | ''>('');
  const [amount, setAmount] = useState('');
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:20`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function AdvanceSalaryForm({ staff, currentAdminId, currentAdminName, onSuccess }: Props) {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:17`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function BonusForm({ staff, onSuccess }: Props) {
  const now = new Date();
  const [userId,  setUserId]  = useState('');
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:14`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function StaffRateForm({ staff }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rate, setRate] = useState<StaffRate | null>(null);
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:29`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
};

export default function AddMaterialModal({ visible, jobId, onClose, onAdded }: AddMaterialModalProps) {
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
```

**File:** `RepairShopApp/src/screens/admin/OverviewScreen.tsx:38`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
};

export default function OverviewScreen() {
  const { user, signOut, displayName } = useAuth();
  const navigation = useNavigation<any>();
```

**File:** `RepairShopApp/src/screens/admin/ReportsScreen.tsx:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export default function ReportsScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const [loading, setLoading] = useState(true);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:26`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import { useToast } from '../../context/ToastContext';

export default function BillingScreen() {
  const route = useRoute<any>();
  const jobId = route.params?.jobId;
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:73`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
// Local buildSaleInvoiceHtml removed — using shared generateSaleInvoiceHtml from @repairshop/shared

export default function NewSaleScreen() {
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:39`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
type TabValue = 'All' | 'Low Stock' | 'Out of Stock';

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:30`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
];

export default function UpdateWorkScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
```

#### react-doctor/prefer-module-scope-pure-function

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:168`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const handleNotify = async (technicianId: string, type: 'acquired' | 'return') => {
    const title = type === 'acquired' ? 'Material Allotted' : 'Return Materials Required';
    const body = type === 'acquired' 
```

**File:** `admin-panel/src/components/layout/NotificationsDropdown.tsx:33`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'system': return <div className="p-2 rounded-full bg-admin-progress-bg text-admin-progress-fg"><Bell size={16} /></div>;
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:128`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const statusBadgeVariant = (s: LeaveStatus) =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';

```

**File:** `admin-panel/src/context/AuthContext.tsx:97`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [router, pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };
```

**File:** `RepairShopApp/src/components/jobs/JobCard.tsx:40`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
```

**File:** `RepairShopApp/src/components/shared/SelfieCapture.tsx:105`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
   * Called fire-and-forget — errors are logged but do NOT surface to the user.
   */
  const uploadSelfieToDrive = async (
    webpUri: string,
    opts: NonNullable<SelfieCaptureProps['driveUpload']>
```

**File:** `RepairShopApp/src/hooks/useLocationPermission.ts:5`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

export const useLocationPermission = () => {
  const requirePermission = async () => {
    const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
    
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:167`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'technician') return { bg: colors.statusCompletedBg, fg: colors.accentGreen };
    if (role === 'receptionist') return { bg: colors.statusInProgressBg, fg: colors.primary };
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:170`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldCheck size={20} color={colors.accentBlue} />;
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:179`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin': return { bg: colors.statusWaitingBg, fg: colors.accentBlue };
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:193`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getStatusColor = (status: string) => {
    if (status === 'Present') return colors.accentGreen;
    if (status === 'Half-day') return colors.accentOrange;
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:63`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const passStyle = useAnimatedStyle(() => ({ borderColor: passBorder.value }));

  const handleFocus = (sharedVal: any) => {
    sharedVal.value = withTiming(colors.textPrimary, { duration: 150 });
  };
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:66`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    sharedVal.value = withTiming(colors.textPrimary, { duration: 150 });
  };
  const handleBlur = (sharedVal: any) => {
    sharedVal.value = withTiming(colors.border, { duration: 150 });
  };
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:103`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  );

  const parseNum = (val: string) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:135`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getSignedUrl = async (path: string | null) => {
    return getSignedUrlCached(supabase, 'attendance-selfies', path, 60 * 60);
  };
```

**File:** `RepairShopApp/src/screens/shared/InactiveUserScreen.tsx:11`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:280`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('screen') || lower.includes('display')) return <MonitorSmartphone size={24} color={colors.accentBlue} />;
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [notifications]);

  const getIconData = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:407`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  // ── Render breakdown row ───────────────────────────────────────────────────
  const renderRow = (label: string, value: number, color?: string, prefix = '') => (
    <View style={styles.lineRow} key={label}>
      <Text style={styles.lineLabel}>{label}</Text>
```

#### react-doctor/no-array-index-as-key

**File:** `admin-panel/src/app/(admin)/page.tsx:280`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-xs font-medium text-admin-text-secondary">{entry.name} ({entry.value})</span>
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:383`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                <tbody className="divide-y divide-admin-border">
                  {items.map((item, index) => (
                    <tr key={index} className="bg-admin-bg-surface">
                      <td className="px-4 py-3 align-top">
                        <Select 
```

**File:** `admin-panel/src/components/dashboard/JobsPieChart.tsx:23`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:87`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <label className={styles.label}>Month *</label>
          <select className={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:513`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

          {items.map((item, index) => (
            <View key={index} style={styles.saleItemCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Item Name</Text>
```

#### react-doctor/click-events-have-key-events

**File:** `admin-panel/src/app/(admin)/page.tsx:318`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              ) : (
                recentJobs.map(job => (
                  <tr 
                    key={job.id} 
                    onClick={() => router.push(`/jobs/${job.id}`)}
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:393`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  ) : (
                    customerJobs.map(job => (
                      <tr key={job.id} onClick={() => router.push(`/jobs/${job.id}`)} className="hover:bg-admin-bg-hover transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-medium text-admin-text-primary">{job.job_code}</td>
                        <td className="px-6 py-4">
```

**File:** `admin-panel/src/components/layout/NotificationsDropdown.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="space-y-1">
            {filtered.map(n => (
              <div 
                key={n.id} 
                onClick={() => {
```

**File:** `admin-panel/src/components/layout/Sidebar.tsx:35`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-admin-bg-dark/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
```

#### react-doctor/prefer-module-scope-static-value

**File:** `admin-panel/src/app/(admin)/page.tsx:345`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

function StatCard({ title, value, icon: Icon, variant }: { title: string, value: number, icon: any, variant: 'accent' | 'success' | 'purple' | 'danger' }) {
  const variantStyles = {
    accent: "bg-admin-pending-bg text-admin-pending-fg border-admin-pending-fg/20",
    success: "bg-admin-completed-bg text-admin-completed-fg border-admin-completed-fg/20",
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:260`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const tabs = [
    { id: "tech", label: "Technician Performance", icon: <Users size={16} /> },
    { id: "customer", label: "Customer History", icon: <History size={16} /> },
```

**File:** `admin-panel/src/app/(admin)/salary/page.tsx:52`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }

  const tabs = [
    { id: 'calculate', label: 'Calculate Salary', icon: <Calculator size={16} /> },
    { id: 'rates',     label: 'Staff Rates',      icon: <Settings size={16} /> },
```

**File:** `admin-panel/src/components/common/Badge.tsx:12`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  
  const variants = {
    default: "bg-admin-bg-subtle text-admin-text-secondary border border-admin-border",
    accent: "bg-admin-progress-bg text-admin-progress-fg border border-admin-progress-fg/20",
```

**File:** `admin-panel/src/components/common/Button.tsx:16`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: "bg-admin-accent text-white hover:bg-admin-accent-dark shadow-sm",
      secondary: "bg-admin-bg-subtle text-admin-text-primary hover:bg-admin-border shadow-sm",
```

**File:** `admin-panel/src/components/common/Button.tsx:24`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-12 px-6 py-2 text-base",
```

**File:** `admin-panel/src/components/common/Toast.tsx:23`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [id, onDismiss]);

  const variants = {
    success: 'bg-admin-completed-bg border-admin-completed-fg/20 text-admin-completed-fg',
    error: 'bg-admin-urgent-bg border-admin-urgent-fg/20 text-admin-urgent-fg',
```

**File:** `admin-panel/src/components/common/Toast.tsx:29`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:55`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  };

  const tabs = [
    { id: 'pending',  label: 'Pending' },
    { id: 'approved', label: 'Approved' },
```

**File:** `RepairShopApp/src/components/jobs/PriorityBadge.tsx:21`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const fill = ink + '33'; // 20% opacity

  const icons: Record<JobPriority, React.ElementType> = {
    'Normal': Minus,
    'High': Flame,
```

**File:** `RepairShopApp/src/components/jobs/StatusBadge.tsx:14`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const fill = ink + '33'; // 20% opacity

  const icons: Record<string, React.ElementType> = {
    'Received': Clock,
    'In Progress': Wrench,
```

#### react-doctor/rerender-state-only-in-handlers

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:57`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  });
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [triggeringExport, setTriggeringExport] = useState<string | null>(null);

```

**File:** `admin-panel/src/app/(admin)/salary/page.tsx:26`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null);
  const [activeTab, setActiveTab] = useState<'calculate' | 'rates' | 'advance' | 'holidays' | 'bonus' | 'leaves'>('calculate');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStaff = useCallback(async () => {
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:91`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(false);
  const [createdInvoiceCode, setCreatedInvoiceCode] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  // Form State
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:111`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  // Live Preview Data
  const [preview, setPreview] = useState<PreviewInvoiceResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Inventory Catalog State
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:115`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  // Inventory Catalog State
  const [inventoryCatalog, setInventoryCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Load Inventory Catalog
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:31`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
export default function AddMaterialModal({ visible, jobId, onClose, onAdded }: AddMaterialModalProps) {
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:32`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:43`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:103`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  }, [name, showSuggestions]);

  const [selectedStock, setSelectedStock] = useState<number | null>(null);

  const selectSuggestion = (item: InventorySuggestion) => {
```

**File:** `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx:18`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [staffLoading, setStaffLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:46`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:47`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:48`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [users, setUsers] = useState<UserData[]>([]);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:39`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [job, setJob] = useState<(Job & { technician_name?: string }) | null>(null);
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);

  const [labourStr, setLabourStr] = useState('0');
```

**File:** `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx:44`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [createdJob, setCreatedJob] = useState<any>(null);

  const [technicianId, setTechnicianId] = useState<string>('');
  const [techName, setTechName] = useState<string>('');

```

**File:** `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:16`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
```

**File:** `RepairShopApp/src/screens/receptionist/JobListScreen.tsx:17`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:48`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:49`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:50`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:69`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const { showToast } = useToast();
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:36`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

```

**File:** `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx:30`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [job, setJob] = useState<Job | null>(null);
  const [visit, setVisit] = useState<OnsiteVisit | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchJobAndVisit = async () => {
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:56`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);

  const [confirmingMaterialsVisible, setConfirmingMaterialsVisible] = useState(false);
```

#### react-doctor/no-locale-format-in-render

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:403`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{new Date(job.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:553`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-secondary">
                            {new Date(job.started_at).toLocaleString()}
                          </span>
                          {job.status === 'success' && job.drive_link && (
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:590`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-secondary">
                            {new Date(job.started_at).toLocaleString()}
                          </span>
                          {job.status === 'success' && job.drive_link && (
```

#### react-doctor/control-has-associated-label

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:436`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                      </td>
                      <td className="px-4 py-3 align-top text-center pt-5">
                        <button 
                          type="button" 
                          onClick={() => setItems(curr => curr.length > 1 ? curr.filter((_, i) => i !== index) : curr)}
```

**File:** `admin-panel/src/components/catalog/JobTypeFormModal.tsx:88`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <span>{item ? 'Edit Job Type' : 'Add New Job Type'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-admin-text-muted hover:text-admin-text-primary transition-colors"
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:76`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
```

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:62`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="flex items-center justify-between p-4 border-b border-admin-border bg-admin-bg-subtle">
          <h2 className="text-lg font-semibold text-admin-text-primary">Add Stock: {item.products?.name}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg-hover transition-colors">
            <X size={20} />
          </button>
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:142`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            {item ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
```

**File:** `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx:50`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="px-6 py-4 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle">
          <h3 className="font-bold text-admin-text-primary">Reassign Technician</h3>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
```

**File:** `admin-panel/src/components/jobs/detail/OverviewTab.tsx:62`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <h3 className="text-sm font-semibold uppercase tracking-wider text-admin-text-secondary">Customer Profile</h3>
            <div className="flex gap-2">
              <a href={`tel:${job.customer_contact}`} className="p-1.5 hover:bg-admin-bg-hover rounded text-admin-text-secondary hover:text-admin-text-primary transition-colors">
                <Phone size={16} />
              </a>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
            {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:89`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Staff Member *</label>
          <select className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
            {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:86`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Month *</label>
          <select className={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:92`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Year *</label>
          <select className={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:87`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.field}>
            <label className={styles.label}>Date *</label>
            <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:152`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.field}>
              <label className={styles.label}>Staff Member *</label>
              <select className={styles.select} value={addUserId} onChange={e => setAddUserId(e.target.value)}>
                <option value="">— choose staff —</option>
                {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:159`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div className={styles.field}>
              <label className={styles.label}>Leave Date *</label>
              <input className={styles.input} type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
            </div>
          </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:121`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Select Staff Member *</label>
        <select className={styles.select} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">— choose staff —</option>
          {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:120`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="flex items-center justify-between p-6 border-b border-admin-border shrink-0">
          <h2 id="add-staff-title" className="text-xl font-semibold text-admin-text-primary">Add New Staff</h2>
          <button onClick={onClose} className="text-admin-text-secondary hover:text-admin-text-primary transition-colors">
            <X size={24} />
          </button>
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:135`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Full Name</label>
              <input
                type="text"
                required
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:146`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email Address</label>
              <input
                type="email"
                required
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:157`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Phone Number</label>
              <input
                type="tel"
                required
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:168`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
              <select
                className="w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none"
                value={formData.role}
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:181`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <div>
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Temporary Password</label>
              <input
                type="password"
                required
```

**File:** `admin-panel/src/components/staff/AttendanceModal.tsx:58`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className="px-6 py-4 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle">
          <h3 className="font-bold text-admin-text-primary">Attendance: {staff.name} (Last 30 Days)</h3>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
```

#### react-doctor/no-placeholder-only-field

**File:** `admin-panel/src/app/(admin)/settings/whatsapp/page.tsx:189`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Message Body</label>
                <textarea 
                  className="w-full bg-admin-bg-subtle border border-admin-border rounded-md px-3 py-2 text-admin-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-admin-accent" 
                  rows={3} 
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:71`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Amount (&#8377;) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500" />
        </div>
```

**File:** `admin-panel/src/components/expenditure/ExpenditureForm.tsx:82`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Description *</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Bought RAM for job RS-2026-0001" />
      </div>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:84`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" />
        </div>
```

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:95`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Description (optional)</label>
        <input className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Festival advance" />
      </div>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <div className={styles.field}>
          <label className={styles.label}>Amount (₹) *</label>
          <input className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
        </div>
```

**File:** `admin-panel/src/components/salary/BonusForm.tsx:100`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div className={styles.field}>
        <label className={styles.label}>Reason *</label>
        <input className={styles.input} type="text" value={reason}
          onChange={e => setReason(e.target.value)} placeholder="e.g. Diwali bonus, exceptional performance" />
      </div>
```

**File:** `admin-panel/src/components/salary/HolidayCalendarForm.tsx:92`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.field}>
            <label className={styles.label}>Holiday Name *</label>
            <input className={styles.input} type="text" placeholder="e.g. Independence Day, Diwali" value={name} onChange={e => setName(e.target.value)} required />
          </div>

```

**File:** `admin-panel/src/components/salary/LeaveManagement.tsx:164`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className={styles.field}>
            <label className={styles.label}>Reason (optional)</label>
            <input className={styles.input} type="text" value={addReason} onChange={e => setAddReason(e.target.value)} placeholder="e.g. Personal" />
          </div>
          {addError && <p className={styles.error}>{addError}</p>}
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:144`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Fixed Monthly Salary (₹) *</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="e.g. 25000" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:150`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Allowed Leave Days per Month *</label>
                <input className={styles.input} type="number" min="0" step="1"
                  value={allowedLeaveDays} onChange={e => setAllowedLeaveDays(e.target.value)} placeholder="Default: 2" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:158`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Absent Day Penalty Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={absentDeduction} onChange={e => setAbsentDeduction(e.target.value)} placeholder="e.g. 800" />
                <span className="text-xs text-admin-text-muted mt-1">Applied after allowed leave days are used.</span>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:165`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Half-Day Deduction (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={halfdayDeduction} onChange={e => setHalfdayDeduction(e.target.value)} placeholder="e.g. 80" />
                <span className="text-xs text-admin-text-muted mt-1">Applied per half-day marked.</span>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:174`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Late/Early 1st Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier1} onChange={e => setPenaltyTier1(e.target.value)} placeholder="e.g. 30" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:180`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Late/Early {'>'}1 Hr Penalty (₹)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier2} onChange={e => setPenaltyTier2(e.target.value)} placeholder="e.g. 60" />
              </div>
```

**File:** `admin-panel/src/components/salary/StaffRateForm.tsx:188`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <div className={styles.field}>
                <label className={styles.label}>Overtime (OT) Rate (₹/hour)</label>
                <input className={styles.input} type="number" min="0" step="0.01"
                  value={otRate} onChange={e => setOtRate(e.target.value)} placeholder="e.g. 150" />
              </div>
```

#### react-doctor/prefer-html-dialog

**File:** `admin-panel/src/components/common/ConfirmationModal.tsx:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
```

**File:** `admin-panel/src/components/staff/AddStaffModal.tsx:113`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-staff-title"
```

#### react-doctor/prefer-dynamic-import

**File:** `admin-panel/src/components/dashboard/JobsPieChart.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface JobsPieChartProps {
```

**File:** `admin-panel/src/components/dashboard/RevenueChart.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
```

**File:** `admin-panel/src/components/dashboard/TechPerformanceChart.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface TechPerformanceChartProps {
```

#### react-doctor/rerender-lazy-state-init

**File:** `admin-panel/src/components/inventory/AddStockModal.tsx:18`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}) {
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState(item.purchase_rate.toString());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:81`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const { user } = useAuth();

  const [month, setMonth] = useState(getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = generateMonthOptions();
```

**File:** `RepairShopApp/src/screens/admin/ReportsScreen.tsx:44`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = generateMonthOptions();
```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:74`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  const { showToast } = useToast();

  const [month, setMonth] = useState(getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = generateMonthOptions();
```

#### react-doctor/no-static-element-interactions

**File:** `admin-panel/src/components/layout/NotificationsDropdown.tsx:78`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          <div className="space-y-1">
            {filtered.map(n => (
              <div 
                key={n.id} 
                onClick={() => {
```

**File:** `admin-panel/src/components/layout/Sidebar.tsx:35`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-admin-bg-dark/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
```

#### react-doctor/dangerous-html-sink

**File:** `admin-panel/src/components/salary/AdvanceSalaryForm.tsx:61`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
```

**File:** `admin-panel/src/lib/invoiceClient.ts:77`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  popup.document.open();
  popup.document.write(finalHtml);
  popup.document.close();

```

#### react-doctor/no-async-event-handler-without-reentry-guard

**File:** `admin-panel/src/components/salary/SalaryBreakdownCard.tsx:43`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
```

**File:** `admin-panel/src/components/salary/SalaryCalculatorForm.tsx:33`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      const token = session?.access_token;

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`, {
        method: 'POST',
        headers: {
```

#### react-doctor/nextjs-no-client-side-redirect

**File:** `admin-panel/src/context/AuthContext.tsx:52`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          setIsLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
```

#### react-doctor/effect-needs-cleanup

**File:** `admin-panel/src/context/AuthContext.tsx:102`
**Outcome:** Rejected (documented false positive)
**Evidence:**
```tsx

  // Idle Timeout Logic
  useEffect(() => {
    if (!sessionUser) return;

```

**File:** `RepairShopApp/src/hooks/usePushNotifications.ts:103`
**Outcome:** Rejected (documented false positive)
**Evidence:**
```tsx
  }

  useEffect(() => {
    if (!userId || isExpoGo) return;

```

**File:** `RepairShopApp/src/hooks/useRealtimeSubscription.ts:18`
**Outcome:** Rejected (documented false positive)
**Evidence:**
```tsx
  });

  useEffect(() => {
    const key = filter ? `${table}:${filter}` : table;
    const existing = channelRegistry.get(key);
```

#### react-doctor/jsx-no-constructed-context-values

**File:** `admin-panel/src/context/AuthContext.tsx:127`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  return (
    <AuthContext.Provider value={{
      sessionUser,
      profile,
```

**File:** `RepairShopApp/src/context/ToastContext.tsx:32`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastOptions && (
```

#### react-doctor/rerender-lazy-ref-init

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:33`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
```

#### react-doctor/rn-reanimated-4-use-worklets-scheduler

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:43`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          runOnJS(handleCloseRef.current)();
        } else {
          translateY.value = withSpring(0, { damping: 26, stiffness: 400, overshootClamping: true });
```

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:60`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setShowModal)(false);
        }
      });
```

**File:** `RepairShopApp/src/components/common/ModalShell.tsx:28`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      opacity.value = withSpring(0, { damping: 20, stiffness: 150, overshootClamping: true }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
```

**File:** `admin-panel/src/components/common/Toast.tsx:51`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        <X size={16} />
      </button>
    </div>
  );
}
```

#### react-doctor/no-adjust-state-on-prop-change

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:53`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      translateY.value = withSpring(0, { damping: 26, stiffness: 400, overshootClamping: true });
      opacity.value = withTiming(0.4, { duration: 300 });
```

**File:** `RepairShopApp/src/components/common/ModalShell.tsx:21`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      translateY.value = withSpring(0, SPRING);
      opacity.value = withSpring(1, { damping: 20, stiffness: 150, overshootClamping: true });
```

#### react-doctor/rn-no-deprecated-modules

**File:** `RepairShopApp/src/components/common/ErrorBoundary.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

#### react-doctor/rn-no-scrollview-mapped-list

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:117`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        {showPriorityFilter && priorityTabs && activePriorityTab && onPriorityTabChange && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
              {priorityTabs.map(tab => (
                <TouchableOpacity
                  key={tab.value}
```

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:133`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
        {/* Status chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
          {statusTabs.map(tab => (
            <TouchableOpacity
              key={tab.value}
```

#### react-doctor/rn-no-inline-flatlist-renderitem

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:180`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item, index }) => (
            <JobCard
              job={item}
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:55`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              data={technicians}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.techRow} onPress={() => onSelect(item.id, item.name)}>
                  <Text style={styles.techName}>{item.name}</Text>
```

**File:** `RepairShopApp/src/components/shared/Dropdown.tsx:59`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:225`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
          ) : null
        }
        renderItem={({ item }) => {
          const typeColor = TYPE_COLORS[item.type] ?? { bg: colors.backgroundAlt, fg: colors.textSecondary };
          return (
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:229`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item }) => {
            const roleStyle = getRoleBadgeStyle(item.role);
            return (
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:317`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              data={attendanceRecords}
              keyExtractor={r => r.id}
              renderItem={({ item }) => (
                <View style={styles.attendanceRow}>
                  <View style={styles.attendanceDateCol}>
```

**File:** `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:244`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            data={filteredAllotments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AllottedMaterialsCard
                item={item}
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:339`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.historyCard}
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:355`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item }) => {
            const isOutOfStock = item.quantity === 0;
            const isLowStock = !isOutOfStock && item.quantity <= item.low_stock_threshold;
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:220`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            />
          }
          renderItem={({ item }) => {
            const { icon, bg } = getIconData(item.channel);
            const isRead = item.is_read;
```

#### react-doctor/rn-list-callback-per-row

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:184`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              job={item}
              index={index}
              onPress={() => onJobPress(item.id)}
            />
          )}
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:56`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.techRow} onPress={() => onSelect(item.id, item.name)}>
                  <Text style={styles.techName}>{item.name}</Text>
                </TouchableOpacity>
```

**File:** `RepairShopApp/src/components/shared/Dropdown.tsx:64`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  <TouchableOpacity 
                    style={styles.optionRow} 
                    onPress={() => {
                      onSelect(item.value);
                      setModalVisible(false);
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:238`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openOptions(item)} style={styles.optionsBtn}>
                    <MoreVertical size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:342`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
            <TouchableOpacity 
              style={styles.historyCard}
              onPress={() => {
                if (item.check_in_selfie_url || (item as any).selfie_url) {
                  openImage(item.check_in_selfie_url || (item as any).selfie_url, `Selfie on ${formatDate(item.date)}`);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:363`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                style={styles.rowCard}
                activeOpacity={isAdmin ? 0.7 : 1}
                onPress={() => {
                  if (!isAdmin) return;
                  setEditingItem(item);
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:373`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
                  setModalVisible(true);
                }}
                onLongPress={() => handleDeleteRequest(item.id)}
              >
                <View style={styles.rowIconBox}>
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:226`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
              <TouchableOpacity
                style={[styles.rowCard, isRead && styles.rowCardRead]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
              >
```

#### react-doctor/supabase-client-owned-authz-field

**File:** `RepairShopApp/src/hooks/usePushNotifications.ts:14`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
}

export const usePushNotifications = (userId?: string): PushNotificationState => {
  const isExpoGo = Constants.appOwnership === 'expo';

```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:27`
**Outcome:** Confirmed failure
**Evidence:**
```tsx

export default function NotificationsScreen() {
  const { user, role } = useAuth();
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
```

#### react-doctor/rn-no-non-native-navigator

**File:** `RepairShopApp/src/navigation/AdminStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import AdminTabs from './AdminTabs';
```

**File:** `RepairShopApp/src/navigation/ReceptionistJobsStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import JobListScreen from '../screens/receptionist/JobListScreen';
import JobDetailScreen from '../screens/receptionist/JobDetailScreen';
```

**File:** `RepairShopApp/src/navigation/ReceptionistStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ReceptionistTabs from './ReceptionistTabs';
```

**File:** `RepairShopApp/src/navigation/RootNavigator.tsx:3`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
```

**File:** `RepairShopApp/src/navigation/TechnicianJobsStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyJobsScreen from '../screens/technician/MyJobsScreen';
import OnsiteVisitScreen from '../screens/technician/OnsiteVisitScreen';
```

**File:** `RepairShopApp/src/navigation/TechnicianStack.tsx:2`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TechnicianTabs from './TechnicianTabs';
```

#### react-doctor/js-flatmap-filter

**File:** `RepairShopApp/src/screens/shared/AllottedMaterialsScreen.tsx:70`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
      let techMap: Record<string, string> = {};
      if (!isScoped && data && data.length > 0) {
        const techIds = [...new Set((data as any[]).map((r: any) => r.technician_id).filter(Boolean))];
        if (techIds.length > 0) {
          const { data: techData } = await supabase
```

#### react-doctor/rn-prefer-expo-image

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:4`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  FlatList, Modal, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:9`
**Outcome:** Confirmed failure
**Evidence:**
```tsx
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
```

### Observations
#### react-doctor/js-hoist-intl

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:203`
**Outcome:** Observation
**Evidence:**
```tsx
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.purchase_rate || 0)}
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
```

**File:** `admin-panel/src/app/(admin)/inventory/page.tsx:206`
**Outcome:** Observation
**Evidence:**
```tsx
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.selling_rate || 0)}
                      </td>
                      <td className="px-6 py-4 text-admin-text-secondary">{item.products?.unit || '-'}</td>
```

**File:** `admin-panel/src/app/(admin)/page.tsx:187`
**Outcome:** Observation
**Evidence:**
```tsx

  // Calculate real date labels for today
  const todayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date());

  return (
```

**File:** `admin-panel/src/app/(admin)/sales/page.tsx:267`
**Outcome:** Observation
**Evidence:**
```tsx
                        <td className="px-6 py-4"><InvoiceStatusBadge status={inv.status} /></td>
                        <td className="px-6 py-4 text-right font-semibold text-admin-text-primary">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(inv.grand_total || 0))}
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{new Date(inv.created_at).toLocaleString()}</td>
```

**File:** `RepairShopApp/src/lib/shared/formatCurrency.ts:11`
**Outcome:** Observation
**Evidence:**
```tsx
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
```

**File:** `packages/shared/src/date.ts:35`
**Outcome:** Observation
**Evidence:**
```tsx

export function getAttendanceDateIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
```

**File:** `packages/shared/src/date.ts:45`
**Outcome:** Observation
**Evidence:**
```tsx

export function getDateIST(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
```

**File:** `packages/shared/src/formatCurrency.ts:11`
**Outcome:** Observation
**Evidence:**
```tsx
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
```

#### react-doctor/no-giant-component

**File:** `admin-panel/src/app/(admin)/jobs/[id]/page.tsx:31`
**Outcome:** Observation
**Evidence:**
```tsx
import { useAppConfig } from "@/context/AppConfigContext";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
```

**File:** `admin-panel/src/app/(admin)/jobs/new/page.tsx:18`
**Outcome:** Observation
**Evidence:**
```tsx
import { openInvoicePrint } from '@/lib/invoiceClient';

export default function CreateJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
```

**File:** `admin-panel/src/app/(admin)/jobs/page.tsx:22`
**Outcome:** Observation
**Evidence:**
```tsx
import { exportJobsToCSV } from "@/utils/csv";

export default function JobsPage() {
  const router = useRouter();

```

**File:** `admin-panel/src/app/(admin)/materials/page.tsx:64`
**Outcome:** Observation
**Evidence:**
```tsx
}

export default function MaterialsPage() {
  const router = useRouter();

```

**File:** `admin-panel/src/app/(admin)/page.tsx:22`
**Outcome:** Observation
**Evidence:**
```tsx
import Link from 'next/link';

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
```

**File:** `admin-panel/src/app/(admin)/reports/page.tsx:25`
**Outcome:** Observation
**Evidence:**
```tsx
import { Download } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tech"); 
```

**File:** `admin-panel/src/app/(admin)/sales/new/page.tsx:86`
**Outcome:** Observation
**Evidence:**
```tsx
};

export default function CreateSalePage() {
  const router = useRouter();
  const { showToast } = useToast();
```

**File:** `admin-panel/src/components/inventory/InventoryFormModal.tsx:10`
**Outcome:** Observation
**Evidence:**
```tsx
import { Tabs } from '../common/Tabs';

export default function InventoryFormModal({ 
  item, 
  onClose, 
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:29`
**Outcome:** Observation
**Evidence:**
```tsx
};

export default function AddMaterialModal({ visible, jobId, onClose, onAdded }: AddMaterialModalProps) {
  const [name, setName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:26`
**Outcome:** Observation
**Evidence:**
```tsx
import { useToast } from '../../context/ToastContext';

export default function BillingScreen() {
  const route = useRoute<any>();
  const jobId = route.params?.jobId;
```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:73`
**Outcome:** Observation
**Evidence:**
```tsx
// Local buildSaleInvoiceHtml removed — using shared generateSaleInvoiceHtml from @repairshop/shared

export default function NewSaleScreen() {
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:29`
**Outcome:** Observation
**Evidence:**
```tsx
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:39`
**Outcome:** Observation
**Evidence:**
```tsx
type TabValue = 'All' | 'Low Stock' | 'Out of Stock';

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:39`
**Outcome:** Observation
**Evidence:**
```tsx
import { compressImage } from '../../utils/compressImage';

export default function ProfileScreen() {
  const { session, user, displayName, role, signOut } = useAuth();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:227`
**Outcome:** Observation
**Evidence:**
```tsx
// Main Component
// ---------------------------------------------------------------------------
export default function SalaryScreen() {
  const { user, displayName, role } = useAuth();
  const bottomPadding = useBottomInsetPadding('nav');
```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:30`
**Outcome:** Observation
**Evidence:**
```tsx
];

export default function UpdateWorkScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
```

#### react-doctor/rn-prefer-pressable

**File:** `RepairShopApp/src/components/common/AppHeader.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ChevronLeft, Bell, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
```

**File:** `RepairShopApp/src/components/common/DetailRow.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

**File:** `RepairShopApp/src/components/common/ErrorBoundary.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

**File:** `admin-panel/src/components/common/ErrorState.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
﻿import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
```

**File:** `admin-panel/src/components/common/Toast.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
﻿import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

```

**File:** `RepairShopApp/src/components/jobs/JobDetailShell.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
```

**File:** `RepairShopApp/src/components/jobs/JobList.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
```

**File:** `RepairShopApp/src/components/jobs/TechnicianPicker.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { TechnicianSummary } from '../../types/user';
```

**File:** `RepairShopApp/src/components/materials/AddMaterialModal.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, CheckCircle2, Trash2, Package } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/components/materials/AllottedMaterialsCard.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, User, Wrench, Calendar, RotateCcw, Bell } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
```

**File:** `RepairShopApp/src/components/materials/MaterialList.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2, Camera } from 'lucide-react-native';
import { JobMaterial } from '../../types/job';
```

**File:** `RepairShopApp/src/components/shared/Dropdown.tsx:3`
**Outcome:** Observation
**Evidence:**
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
```

**File:** `RepairShopApp/src/components/shared/LineItemTable.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';
```

**File:** `RepairShopApp/src/components/shared/RoleDashboard.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StyleProp, ViewStyle, Pressable } from 'react-native';
import { LucideIcon, ChevronRight } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
```

**File:** `RepairShopApp/src/components/shared/SegmentedControl.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, typography } from '../../tokens';

```

**File:** `RepairShopApp/src/components/shared/SelfieCapture.tsx:3`
**Outcome:** Observation
**Evidence:**
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
```

**File:** `RepairShopApp/src/navigation/AdminTabs.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import OverviewScreen from '../screens/admin/OverviewScreen';
```

**File:** `RepairShopApp/src/navigation/CustomTabBar.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

**File:** `RepairShopApp/src/navigation/ReceptionistTabs.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/receptionist/DashboardScreen';
```

**File:** `RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
```

**File:** `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx:20`
**Outcome:** Observation
**Evidence:**
```tsx
import { useToast } from '../../context/ToastContext';
import { ChevronRight } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function AdminJobDetailScreen() {
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
```

**File:** `RepairShopApp/src/screens/admin/OverviewScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
```

**File:** `RepairShopApp/src/screens/admin/ReportsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronDown, Trophy, TrendingUp } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/admin/SalaryScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/auth/LoginScreen.tsx:10`
**Outcome:** Observation
**Evidence:**
```tsx
  Platform,
  Pressable,
  TouchableOpacity,
  Image
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, ChevronDown } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
```

**File:** `RepairShopApp/src/screens/receptionist/CustomersScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, radius, shadow } from '../../tokens';
```

**File:** `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useCallback, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
```

**File:** `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx:6`
**Outcome:** Observation
**Evidence:**
```tsx
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, Text } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

```

**File:** `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/receptionist/PaymentsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Banknote, FileText, Download } from 'lucide-react-native';
import AppHeader from '../../components/common/AppHeader';
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:3`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  FlatList, Modal, Image, RefreshControl,
} from 'react-native';
```

**File:** `RepairShopApp/src/screens/shared/InventoryScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, Mail, MessageCircle, BellDot } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/shared/ProfileScreen.tsx:7`
**Outcome:** Observation
**Evidence:**
```tsx
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
```

**File:** `RepairShopApp/src/screens/shared/SalaryScreen.tsx:8`
**Outcome:** Observation
**Evidence:**
```tsx
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
```

**File:** `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Package, ArrowRight, Info, AlertCircle, CheckCircle } from 'lucide-react-native';
```

**File:** `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

```

**File:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
```

#### react-doctor/rn-no-panresponder

**File:** `RepairShopApp/src/components/common/BottomSheet.tsx:2`
**Outcome:** Observation
**Evidence:**
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
```

#### react-doctor/rn-no-inline-object-in-list-item

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:230`
**Outcome:** Observation
**Evidence:**
```tsx
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor.fg }]}>
                    {TYPE_LABELS[item.type]}
```

**File:** `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx:231`
**Outcome:** Observation
**Evidence:**
```tsx
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor.fg }]}>
                    {TYPE_LABELS[item.type]}
                  </Text>
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:249`
**Outcome:** Observation
**Evidence:**
```tsx
                  </View>
                  <View style={styles.badgesCol}>
                    <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: roleStyle.fg }]}>
                        {item.role.toUpperCase()}
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:250`
**Outcome:** Observation
**Evidence:**
```tsx
                  <View style={styles.badgesCol}>
                    <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: roleStyle.fg }]}>
                        {item.role.toUpperCase()}
                      </Text>
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:255`
**Outcome:** Observation
**Evidence:**
```tsx
                    </View>
                    {!item.is_active && (
                      <View style={[styles.roleBadge, { backgroundColor: colors.statusUrgentBg }]}>
                        <Text style={[styles.roleBadgeText, { color: colors.statusUrgentFg }]}>INACTIVE</Text>
                      </View>
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:256`
**Outcome:** Observation
**Evidence:**
```tsx
                    {!item.is_active && (
                      <View style={[styles.roleBadge, { backgroundColor: colors.statusUrgentBg }]}>
                        <Text style={[styles.roleBadgeText, { color: colors.statusUrgentFg }]}>INACTIVE</Text>
                      </View>
                    )}
```

**File:** `RepairShopApp/src/screens/admin/StaffScreen.tsx:326`
**Outcome:** Observation
**Evidence:**
```tsx
                    <Text style={styles.attendanceTime}>Out: {formatTime(item.check_out_time)}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                </View>
              )}
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:351`
**Outcome:** Observation
**Evidence:**
```tsx
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                {item.status === 'Present' ? (
                  <View style={[styles.badge, { backgroundColor: colors.statusCompletedBg }]}>
                    <Text style={[styles.badgeText, { color: colors.statusCompletedFg }]}>Present</Text>
                  </View>
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:352`
**Outcome:** Observation
**Evidence:**
```tsx
                {item.status === 'Present' ? (
                  <View style={[styles.badge, { backgroundColor: colors.statusCompletedBg }]}>
                    <Text style={[styles.badgeText, { color: colors.statusCompletedFg }]}>Present</Text>
                  </View>
                ) : (
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:355`
**Outcome:** Observation
**Evidence:**
```tsx
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: colors.backgroundAlt }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.status}</Text>
                  </View>
```

**File:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:356`
**Outcome:** Observation
**Evidence:**
```tsx
                ) : (
                  <View style={[styles.badge, { backgroundColor: colors.backgroundAlt }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.status}</Text>
                  </View>
                )}
```

**File:** `RepairShopApp/src/screens/shared/NotificationsScreen.tsx:229`
**Outcome:** Observation
**Evidence:**
```tsx
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconBox, { backgroundColor: bg }]}>
                  {icon}
                </View>
```

## RepairShopApp — Findings
### Confirmed Failures — Error severity
### Confirmed Failures — Warning severity
### Observations
## Cross-Codebase Patterns
Both codebases heavily use inline arrow functions inside render (lists) and non-memoized pure functions. The `useFocusEffect` hooks in React Native frequently duplicate the `exhaustive-deps` warnings seen in Next.js.

## Prioritized Findings List
Review and resolve Error severity items first, followed by Warning severity items affecting Correctness or Security.

## What Couldn't Be Verified and Why
Due to the massive number of occurrences, evidence collection was automated to extract the exact lines of code surrounding the reported line number. Deeper architectural context for each occurrence was not manually cross-checked.
