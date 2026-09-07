import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Award,
  MessageSquare,
  LogOut,
  CheckSquare,
  GraduationCap,
  ExternalLink,
  FolderOpen,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/** Navigation is data-driven so every item renders identically. */
const NAV_SECTIONS: {
  label: string;
  items: { to: string; label: string; icon: React.ElementType; matchPrefix?: boolean }[];
}[] = [
  {
    label: 'Main',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/curriculum', label: 'Curriculum', icon: BookOpen, matchPrefix: true },
      { to: '/admin/programs', label: 'Programs', icon: GraduationCap },
      { to: '/admin/assessments', label: 'Assessments', icon: CheckSquare },
      { to: '/admin/certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    label: 'Content & Leads',
    items: [
      { to: '/admin/materials', label: 'Course Materials', icon: FolderOpen },
      { to: '/admin/bulk-import', label: 'Bulk Import', icon: Sparkles },
      { to: '/admin/content', label: 'Articles', icon: FileText },
      { to: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare },
    ],
  },
  {
    label: 'People',
    items: [{ to: '/admin/students', label: 'Students', icon: Users }],
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Admin User';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (to: string, prefix?: boolean) =>
    prefix ? location.pathname.startsWith(to) : location.pathname === to;

  const currentLabel =
    NAV_SECTIONS.flatMap((s) => s.items).find((i) => isActive(i.to, i.matchPrefix))?.label || 'Admin';

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  const NavList: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
    <nav className="space-y-6 p-4" aria-label="Admin">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {section.label}
          </div>
          {section.items.map(({ to, label, icon: Icon, matchPrefix }) => {
            const active = isActive(to, matchPrefix);
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
  );

  const SidebarFooter: React.FC = () => (
    <div className="space-y-1 border-t border-slate-200 p-4">
      <Link
        to="/student/dashboard"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <GraduationCap className="h-4 w-4 shrink-0 text-slate-500" />
        <span>Student View</span>
      </Link>
      <button
        onClick={handleLogout}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-4 w-4 shrink-0 text-slate-500" />
        <span>Sign Out</span>
      </button>
      <p className="truncate px-3 pt-2 text-[11px] text-slate-500">{displayName}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white md:flex">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex h-16 items-center border-b border-slate-200 px-5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-sm">
                <Shield className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <span className="block text-[13px] font-semibold tracking-tight text-slate-900">
                  APEX<span className="text-indigo-600">ACADEMY</span>
                </span>
                <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Admin Console
                </span>
              </div>
            </Link>
          </div>
          <NavList />
        </div>
        <SidebarFooter />
      </aside>

      {/* ---- Mobile drawer ---- */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <span className="text-[13px] font-semibold tracking-tight text-slate-900">
                APEX<span className="text-indigo-600">ACADEMY</span> Admin
              </span>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close admin navigation"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <SidebarFooter />
          </div>
        </div>
      )}

      {/* ---- Main ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open admin navigation"
              className="-ml-1 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-slate-900">{currentLabel}</h1>
              <p className="hidden text-[11px] text-slate-500 sm:block">Apex Academy administration</p>
            </div>
            <span className="hidden shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 sm:inline-flex">
              Admin
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>Public Site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 2xl:p-8">{children}</main>
      </div>
    </div>
  );
};
