import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, Users, Package, Boxes, BarChart3, Wallet, FileText, Settings, Tag, Tags, Wrench, X, Receipt, Truck, ShoppingCart, CalendarDays } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Job Types', href: '/job-types', icon: Tag },
  { label: 'Sales', href: '/sales', icon: Receipt },
  { label: 'Allotted Materials', href: '/materials', icon: Boxes },
  { label: 'Staff', href: '/staff', icon: Users },
  { label: 'Attendance', href: '/attendance', icon: CalendarDays },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Salary', href: '/salary', icon: Wallet },
  { label: 'Expenditure', href: '/expenditure', icon: FileText },
  { label: 'Settings', href: '/settings/geofence', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <button
          aria-label="Close Sidebar Backdrop" 
          className="fixed inset-0 z-40 w-full h-full cursor-default bg-admin-bg-dark/80 backdrop-blur-sm lg:hidden border-none"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-admin-sidebar-bg flex flex-col my-4 ml-4 rounded-2xl border border-white/10 shadow-card shrink-0 overflow-hidden transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:mr-2",
        isOpen ? "translate-x-0" : "-translate-x-[120%]"
      )}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden p-1 border border-white/10">
              <Image src="/logo.webp" alt="Digital Solution Logo" width={36} height={36} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-white tracking-wide text-base">Digital Solution</span>
          </div>
          <button 
            className="p-1.5 text-slate-300 hover:text-white lg:hidden rounded-lg hover:bg-white/10 transition-colors" 
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-150 ease-in-out text-sm font-medium border-l-4",
                  isActive 
                    ? "bg-admin-sidebar-active-bg text-admin-sidebar-active border-admin-sidebar-accent-border shadow-sm" 
                    : "text-slate-300 border-transparent hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={18} className={cn("transition-colors duration-150 shrink-0", isActive ? "text-admin-accent" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 shrink-0 flex items-center gap-3 bg-black/10">
          <div className="w-9 h-9 rounded-full bg-admin-accent/20 text-indigo-300 flex items-center justify-center font-bold shrink-0 border border-admin-accent/30 text-sm">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{profile?.name || 'Admin User'}</p>
            <p className="text-xs text-slate-400 capitalize truncate">{profile?.role || 'Admin'} • v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
