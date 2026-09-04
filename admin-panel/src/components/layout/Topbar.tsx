import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, Bell, Menu, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationsDropdown, NotificationType } from './NotificationsDropdown';
import { useToast } from '../common/ToastProvider';
import { playNotificationChime, requestWebNotificationPermission, showWebNotification } from '@/lib/webNotifications';
import { formatRelativeTime, formatFullDateTime } from '@repairshop/shared';

interface TopbarProps {
  onMenuClick?: () => void;
}

const mapNotificationRecord = (n: any): NotificationType => {
  const createdAt = n.created_at || n.sent_at || new Date().toISOString();
  const rawType = (n.type || '').toLowerCase();
  
  const title = n.title || (
    rawType.includes('job') ? 'Job Update' :
    rawType.includes('stock') || rawType.includes('inventory') ? 'Inventory Alert' :
    rawType.includes('late') || rawType.includes('attendance') ? 'Attendance Alert' :
    rawType.includes('leave') ? 'Leave Request' :
    rawType.includes('material') ? 'Materials Update' :
    rawType.includes('salary') || rawType.includes('payment') || rawType.includes('finance') ? 'Finance Update' :
    rawType.includes('onsite') ? 'Onsite Visit' :
    'Notification'
  );

  let linkUrl: string | undefined = undefined;
  if (n.job_id) {
    linkUrl = `/jobs/${n.job_id}`;
  } else if (rawType.includes('inventory') || rawType.includes('stock') || rawType === 'low_stock') {
    linkUrl = '/inventory';
  } else if (rawType.includes('late') || rawType.includes('attendance')) {
    linkUrl = '/attendance';
  } else if (rawType.includes('leave')) {
    linkUrl = '/staff/leaves';
  } else if (rawType.includes('material')) {
    linkUrl = '/materials';
  } else if (rawType.includes('salary') || rawType.includes('payment') || rawType.includes('finance')) {
    linkUrl = '/expenditure';
  }

  const isImportant = Boolean(
    n.type === 'urgent' ||
    n.type === 'job_assigned' ||
    (n.title && n.title.toLowerCase().includes('urgent')) ||
    (n.message && n.message.toLowerCase().includes('urgent'))
  );

  return {
    id: n.id,
    title,
    message: n.message || n.title || 'No message content',
    type: n.type || 'system',
    channel: n.channel,
    isRead: Boolean(n.is_read),
    isImportant,
    createdAt,
    formattedTime: formatRelativeTime(createdAt),
    fullDateTime: formatFullDateTime(createdAt),
    jobId: n.job_id || undefined,
    linkUrl,
  };
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const logoutRef = useRef<HTMLDivElement>(null);

  // Request browser notification permission once on mount
  useEffect(() => {
    if (profile?.id) {
      requestWebNotificationPermission().catch(() => {});
    }
  }, [profile?.id]);

  const fetchNotifications = useCallback(async (cancelled = false) => {
    if (!profile?.id) return;
    try {
      // Order strictly by created_at DESC so newest are at the top
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (cancelled) return;
      if (error) throw error;
      if (data) {
        const parsed = data.map(mapNotificationRecord);
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(parsed);
      }
    } catch (err) {
      if (cancelled) return;
      console.error('Failed to fetch notifications:', err);
    }
  }, [profile?.id]);

  const handleMarkAllRead = async () => {
    if (!profile?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_user_id', profile.id)
      .eq('is_read', false);
  };

  const handleNotificationClick = async (id: string, linkUrl?: string, jobId?: string) => {
    const target = notifications.find(n => n.id === id);
    if (target && !target.isRead) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    }

    const targetDestination = linkUrl || (jobId ? `/jobs/${jobId}` : undefined);
    if (targetDestination) {
      router.push(targetDestination);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchNotifications(cancelled);

    if (!profile?.id) return;
    const channel = supabase
      .channel('admin-topbar-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${profile.id}` },
        (payload) => {
          const newNotif = payload.new as any;
          if (newNotif) {
            const formatted = mapNotificationRecord(newNotif);

            // 1. Instant optimistic state update (newest at index 0)
            setNotifications((prev) => {
              const filtered = prev.filter((item) => item.id !== formatted.id);
              const updated = [formatted, ...filtered];
              return updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            });

            // 2. Play Web Audio Chime
            playNotificationChime();

            // 3. Trigger native desktop browser notification
            showWebNotification({
              title: formatted.title,
              body: formatted.message,
              icon: '/logo.webp',
              tag: `notif-${formatted.id}`,
              onClick: () => {
                if (formatted.linkUrl) {
                  router.push(formatted.linkUrl);
                } else if (formatted.jobId) {
                  router.push(`/jobs/${formatted.jobId}`);
                }
              }
            });

            // 4. Trigger In-App Rich Toast Popup with Action Button
            const targetDest = formatted.linkUrl || (formatted.jobId ? `/jobs/${formatted.jobId}` : undefined);
            showToast(
              formatted.message,
              formatted.isImportant ? 'error' : 'info',
              {
                title: formatted.title,
                action: targetDest ? {
                  label: 'View',
                  onClick: () => router.push(targetDest)
                } : undefined
              }
            );
          }
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${profile.id}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated) {
            setNotifications(prev => prev.map(n => n.id === updated.id ? { ...n, isRead: Boolean(updated.is_read) } : n));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchNotifications, router, showToast]);


  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogoutConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    if (pathname === '/') return 'Overview';
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((part: string, i: number) => {
      const isLast = i === parts.length - 1;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
      const isLongId = part.length > 20 && part.includes('-');

      const formatted = (isUuid || isLongId)
        ? 'Details'
        : part
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

      return (
        <React.Fragment key={part}>
          <span className={isLast ? 'text-admin-text-primary font-semibold' : 'text-admin-text-muted hover:text-admin-text-secondary transition-colors'}>
            {formatted}
          </span>
          {!isLast && <ChevronRight size={14} className="text-admin-text-muted mx-1 shrink-0" />}
        </React.Fragment>
      );
    });
  };

  // Dynamic unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 mt-4 mr-4 ml-4 lg:ml-2 bg-admin-bg-surface border border-admin-border rounded-2xl flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-30 relative">
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <button 
          onClick={onMenuClick}
          className="p-2 text-admin-text-secondary hover:text-admin-text-primary transition-colors lg:hidden shrink-0 rounded-lg hover:bg-admin-bg-subtle min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center text-base font-medium whitespace-nowrap overflow-hidden text-ellipsis truncate">
          {generateBreadcrumbs()}
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-3">
        
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-admin-text-secondary hover:text-admin-accent transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent rounded-lg hover:bg-admin-bg-subtle min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-admin-danger rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationsDropdown 
              onClose={() => setShowNotifications(false)} 
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
            />
          )}
        </div>

        <div className="h-5 w-px bg-admin-border mx-1 sm:mx-2 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-admin-text-primary leading-tight">
              {profile?.name || 'Admin User'}
            </p>
            <p className="text-xs text-admin-text-muted capitalize">
              {profile?.role || 'Admin'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-admin-accent-dim text-admin-accent flex items-center justify-center font-bold border border-admin-accent/20 text-sm">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
          </div>
        </div>

        <div className="relative ml-1" ref={logoutRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)} 
            aria-label="Logout" 
            className="text-admin-text-secondary hover:text-admin-danger hover:bg-admin-danger-dim/30 focus-visible:ring-admin-danger rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <LogOut size={19} />
          </Button>

          {showLogoutConfirm && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-admin-bg-surface border border-admin-border rounded-xl shadow-modal animate-scale-in z-50 p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-admin-text-primary text-center">Log out of Digital Solution?</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(false)} className="flex-1">Cancel</Button>
                <Button variant="danger" size="sm" onClick={signOut} className="flex-1">Log out</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {unreadCount > 0 ? `You have ${unreadCount} unread notifications.` : 'All notifications read.'}
      </div>
    </header>
  );
}
