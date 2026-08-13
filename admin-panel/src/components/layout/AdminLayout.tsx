"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '../common/Button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isActive, isLoading, sessionUser, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-admin-bg-base">
        <Loader2 className="animate-spin text-admin-accent mb-4" size={32} />
        <p className="text-admin-text-secondary">Loading Digital Solution Admin...</p>
      </div>
    );
  }

  if (!sessionUser) {
    return null; 
  }

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-admin-bg-base p-6">
        <div className="bg-admin-bg-surface border border-admin-border p-8 rounded-lg shadow-sm text-center max-w-md w-full border-t-[3px] border-t-admin-danger">
          <h2 className="text-xl font-bold mb-2 text-admin-text-primary">Access Denied</h2>
          <p className="text-admin-text-secondary mb-6">You do not have permission to access the admin panel. Only administrators are allowed.</p>
          <Button variant="danger" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-admin-bg-base p-6">
        <div className="bg-admin-bg-surface border border-admin-border p-8 rounded-lg shadow-sm text-center max-w-md w-full border-t-[3px] border-t-admin-danger">
          <h2 className="text-xl font-bold mb-2 text-admin-text-primary">Account Inactive</h2>
          <p className="text-admin-text-secondary mb-6">Your administrator account has been blocked or is inactive. Please contact support.</p>
          <Button variant="danger" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-admin-bg-base font-sans overflow-hidden text-admin-text-primary">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
