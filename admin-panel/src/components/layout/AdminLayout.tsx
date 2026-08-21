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
      <div className="flex h-screen bg-admin-bg-base overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r border-admin-border bg-admin-bg-surface p-4 space-y-4">
          <div className="h-8 w-36 bg-admin-bg-subtle rounded skeleton-pulse" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 w-full bg-admin-bg-subtle rounded-lg skeleton-pulse" />
            ))}
          </div>
        </div>
        {/* Main area skeleton */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="h-16 border-b border-admin-border bg-admin-bg-surface px-6 flex items-center justify-between">
            <div className="h-6 w-32 bg-admin-bg-subtle rounded skeleton-pulse" />
            <div className="h-8 w-8 rounded-full bg-admin-bg-subtle skeleton-pulse" />
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            <div className="h-8 w-48 bg-admin-bg-subtle rounded skeleton-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-admin-bg-surface border border-admin-border rounded-xl skeleton-pulse" />
              ))}
            </div>
            <div className="h-64 bg-admin-bg-surface border border-admin-border rounded-xl skeleton-pulse" />
          </div>
        </div>
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
