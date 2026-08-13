import React, { useState } from 'react';
import { Bell, User, MessageCircle, Package, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';

export type NotificationType = { id: string, type: string, text: string, isRead: boolean, isImportant: boolean, time: string, jobId?: string };

interface NotificationsDropdownProps {
  onClose: () => void;
  notifications: NotificationType[];
  onMarkAllRead: () => void;
  onNotificationClick: (id: string, jobId?: string) => void;
}

type TabType = 'all' | 'unread' | 'important';

const getIcon = (type: string) => {
  switch(type) {
    case 'system': return <div className="p-2 rounded-full bg-admin-progress-bg text-admin-progress-fg"><Bell size={16} /></div>;
    case 'staff': return <div className="p-2 rounded-full bg-admin-accent-dim text-admin-accent"><User size={16} /></div>;
    case 'customer': return <div className="p-2 rounded-full bg-admin-completed-bg text-admin-completed-fg"><MessageCircle size={16} /></div>;
    case 'inventory': return <div className="p-2 rounded-full bg-admin-progress-bg text-admin-progress-fg"><Package size={16} /></div>;
    default: return <div className="p-2 rounded-full bg-admin-bg-subtle text-admin-text-secondary"><Bell size={16} /></div>;
  }
};

export function NotificationsDropdown({ onClose, notifications, onMarkAllRead, onNotificationClick }: NotificationsDropdownProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isMarking, setIsMarking] = useState(false);

  const filtered = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'important') return n.isImportant;
    return true;
  });

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    await onMarkAllRead();
    setIsMarking(false);
  };



  return (
    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-admin-bg-surface border border-admin-border rounded-xl shadow-modal animate-scale-in z-50 overflow-hidden flex flex-col">
      <div className="px-4 pt-4 border-b border-admin-border bg-admin-bg-subtle">
        <h3 className="font-semibold text-admin-text-primary mb-3">Notifications</h3>
        <div className="flex gap-4">
          {(['all', 'unread', 'important'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-2 text-sm font-medium transition-colors border-b-2 capitalize",
                activeTab === tab
                  ? "border-admin-accent text-admin-accent"
                  : "border-transparent text-admin-text-secondary hover:text-admin-text-primary"
              )}
            >
              {tab}
              {tab === 'unread' && (
                <span className="ml-1.5 bg-admin-danger/10 text-admin-danger py-0.5 px-2 rounded-full text-xs">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-admin-text-muted text-sm">
            No notifications found.
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(n => (
              <button 
                key={n.id} 
                onClick={() => {
                  onNotificationClick(n.id, n.jobId);
                  if (n.jobId) onClose();
                }}
                className={cn("w-full text-left flex gap-3 p-3 rounded-lg transition-colors hover:bg-admin-bg-hover cursor-pointer", !n.isRead && "bg-admin-bg-subtle")}
              >
                <div className="shrink-0">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm text-admin-text-primary", !n.isRead && "font-medium")}>
                    {n.text}
                  </p>
                  <p className="text-xs text-admin-text-muted mt-1">{n.time}</p>
                </div>
                {!n.isRead && (
                  <div className="shrink-0 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-admin-accent"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-admin-border bg-admin-bg-subtle text-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleMarkAllRead} 
          disabled={isMarking || notifications.every(n => n.isRead)}
          className="w-full text-admin-text-secondary hover:text-admin-text-primary"
        >
          {isMarking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Mark all as read
        </Button>
      </div>
    </div>
  );
}
