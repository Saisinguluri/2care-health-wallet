import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Activity,
  Share2,
  Inbox,
  LogOut,
  Menu,
  X,
  Heart,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const ownerNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/vitals', label: 'Vitals', icon: Activity },
  { to: '/sharing', label: 'Sharing', icon: Share2 },
];

const viewerNav = [
  { to: '/shared', label: 'Shared With Me', icon: Inbox },
];

export default function Layout({ children }) {
  const { user, logout, isOwner } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isOwner ? ownerNav : viewerNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItems = ({ onClick }) => (
    <>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClick}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900">2care</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 hover:bg-slate-100">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <nav className="absolute left-0 top-14 w-64 space-y-1 bg-white p-4 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <NavItems onClick={() => setMobileOpen(false)} />
          </nav>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">2care</h1>
                <p className="text-xs text-slate-500">Health Wallet</p>
              </div>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              <NavItems />
            </nav>

            <div className="border-t border-slate-100 p-4">
              <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
