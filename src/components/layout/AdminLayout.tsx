import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { cn } from '../../lib/utils';
import {
  ADMIN_POSTER_DISMISSED_KEY,
  AdminWelcomePosterModal,
} from '../admin/AdminWelcomePosterModal';

const ADMIN_NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree },
  { label: 'Businesses', to: '/admin/businesses', icon: Building2 },
  { label: 'Data Quality', to: '/admin/data-quality', icon: ShieldCheck },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Coupons', to: '/admin/coupons', icon: Ticket },
  { label: 'Reviews', to: '/admin/reviews', icon: MessageSquare },
  { label: 'Portal & Banners', to: '/admin/banners', icon: ImageIcon },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { settings } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);

  useEffect(() => {
    if (
      settings.admin_poster_enabled !== false &&
      typeof window !== 'undefined' &&
      !window.sessionStorage.getItem(ADMIN_POSTER_DISMISSED_KEY)
    ) {
      setPosterOpen(true);
    }
  }, [settings.admin_poster_enabled]);

  function handleClosePoster() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ADMIN_POSTER_DISMISSED_KEY, '1');
    }
    setPosterOpen(false);
  }

  const currentNav =
    ADMIN_NAV.find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    ) ?? ADMIN_NAV[0];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1E293B] text-[#CBD5E1]">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-700/60">
        <Link to="/admin" className="font-display text-lg font-extrabold text-white tracking-tight">
          Zyro <span className="text-[#FF6B35]">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close admin sidebar"
          className="lg:hidden p-1.5 text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Admin navigation">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-[#FF6B35] text-white'
                    : 'text-[#CBD5E1] hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700/60 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#CBD5E1] hover:bg-slate-800 hover:text-white"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          <span>View Storefront</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            signOut();
            navigate('/');
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-slate-800 hover:text-red-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8F8F8] text-[#1A1A1A]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 h-full">{sidebarContent}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-[#E8E8E8] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin sidebar"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#1A1A1A] hover:bg-[#F3F4F6] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#6B7280]">Admin</span>
              <span className="text-[#9CA3AF]">/</span>
              <span className="font-display font-semibold text-[#1A1A1A]">
                {currentNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setPosterOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] bg-[#FFF0EA]/50 text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span className="hidden sm:inline">Welcome Poster</span>
            </button>
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-[#1A1A1A] leading-tight">{user?.full_name}</p>
              <p className="text-xs text-[#6B7280]">Store Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#1E293B] text-white font-display text-xs font-bold flex items-center justify-center">
              {user?.full_name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>

      <AdminWelcomePosterModal open={posterOpen} onClose={handleClosePoster} />
    </div>
  );
}
