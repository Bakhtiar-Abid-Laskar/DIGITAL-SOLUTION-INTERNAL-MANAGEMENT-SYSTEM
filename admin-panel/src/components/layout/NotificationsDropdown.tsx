import React, { useState } from 'react';
import { 
  Bell, 
  User, 
  Package, 
  Check, 
  Loader2, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Layers, 
  Banknote, 
  MapPin, 
  ExternalLink,
  CheckCheck,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';

export interface NotificationType {
  id: string;
  title: string;
  message: string;
  type: string;
  channel?: string;
  isRead: boolean;
  isImportant: boolean;
  createdAt: string;
  formattedTime: string;
  fullDateTime: string;
  jobId?: string;
  linkUrl?: string;
}

interface NotificationsDropdownProps {
  onClose: () => void;
  notifications: NotificationType[];
  onMarkAllRead: () => Promise<void> | void;
  onNotificationClick: (id: string, linkUrl?: string, jobId?: string) => void;
}

type TabType = 'all' | 'unread' | 'important';

const getNotificationBadge = (type: string, isImportant: boolean) => {
  const normalized = (type || '').toLowerCase();

  if (isImportant || normalized === 'urgent') {
    return {
      icon: <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400" />,
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
      label: 'Urgent'
    };
  }

  if (normalized.includes('job') || normalized === 'job_assigned' || normalized === 'job_status') {
    return {
      icon: <Wrench size={15} className="text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
      label: 'Repair Job'
    };
  }

  if (normalized.includes('inventory') || normalized.includes('stock') || normalized === 'low_stock') {
    return {
      icon: <Package size={15} className="text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
      label: 'Inventory'
    };
  }

  if (normalized.includes('late') || normalized.includes('attendance')) {
    return {
      icon: <Clock size={15} className="text-purple-600 dark:text-purple-400" />,
      bg: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300',
      label: 'Attendance'
    };
  }

  if (normalized.includes('leave')) {
    return {
      icon: <Calendar size={15} className="text-cyan-600 dark:text-cyan-400" />,
      bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300',
      label: 'Leave'
    };
  }

  if (normalized.includes('material')) {
    return {
      icon: <Layers size={15} className="text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
      label: 'Materials'
    };
  }

  if (normalized.includes('salary') || normalized.includes('finance') || normalized.includes('payment') || normalized.includes('advance')) {
    return {
      icon: <Banknote size={15} className="text-teal-600 dark:text-teal-400" />,
      bg: 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300',
      label: 'Finance'
    };
  }

  if (normalized.includes('onsite')) {
    return {
      icon: <MapPin size={15} className="text-sky-600 dark:text-sky-400" />,
      bg: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
      label: 'Onsite'
    };
  }

  if (normalized.includes('staff')) {
    return {
      icon: <User size={15} className="text-indigo-600 dark:text-indigo-400" />,
      bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
      label: 'Staff'
    };
  }

  return {
    icon: <Bell size={15} className="text-admin-text-secondary" />,
    bg: 'bg-admin-bg-subtle border-admin-border text-admin-text-secondary',
    label: 'System'
  };
};

export function NotificationsDropdown({ 
  onClose, 
  notifications, 
  onMarkAllRead, 
  onNotificationClick 
}: NotificationsDropdownProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isMarking, setIsMarking] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const importantCount = notifications.filter(n => n.isImportant).length;

  const filtered = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'important') return n.isImportant;
    return true;
  });

  const handleMarkAllRead = async () => {
    try {
      setIsMarking(true);
      await onMarkAllRead();
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div 
      className="absolute top-full right-0 mt-2.5 w-[340px] sm:w-[420px] bg-admin-bg-surface border border-admin-border rounded-2xl shadow-modal animate-scale-in z-50 overflow-hidden flex flex-col backdrop-blur-xl"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 border-b border-admin-border bg-admin-bg-subtle/70">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-admin-text-primary text-base">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-admin-accent/10 text-admin-accent border border-admin-accent/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarking}
              className="text-xs font-medium text-admin-accent hover:text-admin-accent-hover transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:underline disabled:opacity-50"
            >
              {isMarking ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2">
          {(['all', 'unread', 'important'] as TabType[]).map((tab) => {
            const count = tab === 'all' 
              ? notifications.length 
              : tab === 'unread' 
                ? unreadCount 
                : importantCount;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
                  activeTab === tab
                    ? "bg-admin-bg-surface text-admin-text-primary shadow-xs border border-admin-border font-semibold"
                    : "text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-bg-hover"
                )}
              >
                <span>{tab}</span>
                {count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    activeTab === tab 
                      ? "bg-admin-bg-subtle text-admin-text-secondary" 
                      : "bg-admin-bg-surface text-admin-text-muted border border-admin-border"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto divide-y divide-admin-border/50 p-1.5 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-admin-bg-subtle border border-admin-border flex items-center justify-center text-admin-text-muted mb-3 shadow-inner">
              {activeTab === 'unread' ? <Sparkles size={22} className="text-admin-accent" /> : <Bell size={22} />}
            </div>
            <p className="text-sm font-semibold text-admin-text-primary">
              {activeTab === 'unread' 
                ? "You're all caught up!" 
                : activeTab === 'important' 
                  ? "No urgent alerts" 
                  : "No notifications yet"}
            </p>
            <p className="text-xs text-admin-text-muted mt-1 max-w-[240px]">
              {activeTab === 'unread'
                ? "There are no unread notifications right now."
                : "Activity and status updates will appear here in real time."}
            </p>
          </div>
        ) : (
          filtered.map(n => {
            const badge = getNotificationBadge(n.type, n.isImportant);

            return (
              <button 
                key={n.id} 
                onClick={() => {
                  onNotificationClick(n.id, n.linkUrl, n.jobId);
                  if (n.jobId || n.linkUrl) {
                    onClose();
                  }
                }}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-admin-bg-hover group relative cursor-pointer",
                  !n.isRead && "bg-admin-accent/[0.04] dark:bg-admin-accent/[0.08]"
                )}
              >
                {/* Badge Icon */}
                <div className={cn(
                  "p-2 rounded-xl border shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                  badge.bg
                )}>
                  {badge.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "text-sm text-admin-text-primary leading-tight truncate",
                      !n.isRead ? "font-semibold text-admin-text-primary" : "font-medium text-admin-text-secondary"
                    )}>
                      {n.title}
                    </p>
                    <span 
                      className="text-[11px] text-admin-text-muted shrink-0 whitespace-nowrap"
                      title={n.fullDateTime}
                    >
                      {n.formattedTime}
                    </span>
                  </div>

                  <p className="text-xs text-admin-text-secondary mt-1 leading-snug break-words line-clamp-2">
                    {n.message}
                  </p>

                  {(n.jobId || n.linkUrl) && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-admin-accent opacity-90 group-hover:opacity-100 transition-opacity">
                      <span>View details</span>
                      <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>

                {/* Unread Glow Dot */}
                {!n.isRead && (
                  <div className="shrink-0 pt-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full bg-admin-accent block ring-4 ring-admin-accent/20 animate-pulse" 
                      aria-label="Unread notification"
                    />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-admin-border bg-admin-bg-subtle/50 flex items-center justify-between gap-2">
        <span className="text-xs text-admin-text-muted px-2">
          {notifications.length} total notifications
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleMarkAllRead} 
          disabled={isMarking || notifications.every(n => n.isRead)}
          className="text-xs text-admin-text-secondary hover:text-admin-text-primary h-8"
        >
          {isMarking ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
          Mark all read
        </Button>
      </div>
    </div>
  );
}

