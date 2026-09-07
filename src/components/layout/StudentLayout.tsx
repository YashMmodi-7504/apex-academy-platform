import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Award,
  User as UserIcon,
  LogOut,
  Home,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const NAV_SECTIONS: {
  label: string;
  items: { to: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: 'Learning',
    items: [
      { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/student/my-learning', label: 'My Learning', icon: BookOpen },
      { to: '/student/certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/student/profile', label: 'Profile', icon: UserIcon }],
  },
];

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, role, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const displayEmail = user?.email || '';
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'ST';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isCurrent = (path: string) => location.pathname === path;
  const currentLabel =
    NAV_SECTIONS.flatMap((s) => s.items).find((i) => isCurrent(i.to))?.label || 'Student portal';

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  const SidebarBody: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
    <>
      <nav className="space-y-6 p-4" aria-label="Student">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.label}
            </div>
            {section.items.map(({ to, label, icon: Icon }) => {
              const active = isCurrent(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-slate-200 p-4">
        {role === 'ADMIN' && (
          <Link
            to="/admin/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-amber-700 transition-colors hover:bg-amber-50"
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span>Admin console</span>
          </Link>
        )}
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Home className="h-4 w-4 shrink-0 text-slate-500" />
          <span>Public site</span>
        </Link>

        <div className="mt-3 flex items-center gap-3 border-t border-slate-200 pt-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-900">{displayName}</p>
            {displayEmail && (
              <p className="truncate text-[11px] text-slate-500">{displayEmail}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white md:flex">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex h-16 items-center border-b border-slate-200 px-5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <span className="block text-[13px] font-semibold tracking-tight text-slate-900">
                  APEX<span className="text-indigo-600">ACADEMY</span>
                </span>
                <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Learner portal
                </span>
              </div>
            </Link>
          </div>
          <SidebarBody />
        </div>
      </aside>

      {/* ---- Mobile drawer ---- */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <span className="text-[13px] font-semibold tracking-tight text-slate-900">
                APEX<span className="text-indigo-600">ACADEMY</span>
              </span>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarBody onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* ---- Main ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              className="-ml-1 cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-sm font-bold tracking-tight text-slate-900">
              {currentLabel}
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 2xl:p-8">{children}</main>
      </div>
    </div>
  );
};
