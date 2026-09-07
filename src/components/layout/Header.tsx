import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  ChevronDown,
  Search,
  Menu,
  X,
  User,
  Shield,
  BookOpen,
  Sparkles,
  Building2,
  Trophy,
  LogOut,
  LayoutGrid,
} from 'lucide-react';
import { MegaMenu } from './MegaMenu.tsx';
import { Button } from '../common/Button.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

const NAV_LINKS = [
  { to: '/programs', label: 'All Programs', icon: BookOpen },
  { to: '/free-courses', label: 'Free Courses', icon: Sparkles },
  { to: '/career-support', label: 'Career Support', icon: Trophy },
  { to: '/success-stories', label: 'Success Stories', icon: User },
  { to: '/enterprise', label: 'Enterprise', icon: Building2 },
];

export const Header: React.FC = () => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile, role, signOut, user } = useAuth();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const isCurrent = (path: string) => location.pathname === path;

  // Subtle elevation once the page scrolls — keeps the header light at rest.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  // Close overlays on route change and on Escape.
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMegaMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsMegaMenuOpen(false);
        setIsUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const initial = profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : null;

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-white/90 backdrop-blur-md transition-shadow duration-200 ${
          scrolled ? 'border-b border-slate-200 shadow-[0_1px_3px_0_rgb(15_23_42/0.08)]' : 'border-b border-slate-200/70'
        }`}
      >
        <div className="apex-container-wide">
          <div className="flex h-16 items-center gap-4">

            {/* ---- Brand ---- */}
            <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Apex Academy — home">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="leading-none">
                <span className="block text-[17px] font-semibold tracking-tight text-slate-900">
                  APEX<span className="text-indigo-600">ACADEMY</span>
                </span>
                <span className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
                  Learning &amp; Certification
                </span>
              </div>
            </Link>

            {/* ---- Desktop nav ---- */}
            <div
              className="hidden xl:block"
              onMouseEnter={() => setIsMegaMenuOpen(true)}
            >
              <button
                onClick={() => setIsMegaMenuOpen((v) => !v)}
                aria-expanded={isMegaMenuOpen}
                aria-haspopup="true"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                <span>Explore Programs</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            <nav className="hidden min-w-0 flex-1 items-center gap-0.5 xl:flex" aria-label="Primary">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={isCurrent(to) ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg px-2 py-2 text-[12.5px] font-semibold transition-colors ${
                    isCurrent(to)
                      ? 'text-indigo-700 bg-indigo-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* ---- Right: search + auth ---- */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {/* Desktop search */}
              <form onSubmit={handleSearchSubmit} className="relative hidden lg:block xl:hidden 2xl:block" role="search">
                <label htmlFor="apex-search" className="sr-only">Search courses and programs</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="apex-search"
                  type="search"
                  placeholder="Search courses…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-800 transition-all placeholder:text-slate-500 focus:w-56 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 2xl:w-48 2xl:focus:w-60"
                />
              </form>

              {/* Compact search for the xl..2xl band, where the full input would
                  push the header past the viewport width. */}
              <Link
                to="/search"
                aria-label="Search courses and programs"
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 xl:flex 2xl:hidden"
              >
                <Search className="h-4 w-4" />
              </Link>

              {isAuthenticated ? (
                <div
                  className="relative"
                  onMouseEnter={() => setIsUserDropdownOpen(true)}
                  onMouseLeave={() => setIsUserDropdownOpen(false)}
                >
                  <button
                    onClick={() => setIsUserDropdownOpen((v) => !v)}
                    aria-expanded={isUserDropdownOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700 shadow-xs transition-colors hover:bg-indigo-100"
                  >
                    {initial ?? <User className="h-4 w-4" />}
                  </button>

                  {isUserDropdownOpen && (
                    <div
                      role="menu"
                      className="animate-fade-in absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                    >
                      <div className="border-b border-slate-100 px-4 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Signed in as</p>
                        <p className="mt-0.5 truncate text-[13px] font-bold text-slate-800">
                          {profile?.full_name || user?.email || 'Student'}
                        </p>
                      </div>

                      <Link
                        to="/student/dashboard"
                        role="menuitem"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-700"
                      >
                        <GraduationCap className="h-4 w-4 shrink-0 text-slate-500" />
                        <span>Student Dashboard</span>
                      </Link>

                      {role === 'ADMIN' && (
                        <Link
                          to="/admin/dashboard"
                          role="menuitem"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                        >
                          <Shield className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      <button
                        role="menuitem"
                        onClick={() => { setIsUserDropdownOpen(false); signOut(); }}
                        className="mt-1 flex w-full cursor-pointer items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 shrink-0 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="primary" size="sm">Register Free</Button>
                  </Link>
                </div>
              )}

              {/* Mobile toggle */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="-mr-1 rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 xl:hidden"
                aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={isMobileMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Full-width dropdown — must be a direct child of <header> to span it */}
        <MegaMenu isOpen={isMegaMenuOpen} onClose={() => setIsMegaMenuOpen(false)} />
      </header>

      {/* ---- Mobile drawer ---- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                APEX<span className="text-indigo-600">ACADEMY</span>
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleSearchSubmit} className="relative mb-5" role="search">
                <label htmlFor="apex-search-mobile" className="sr-only">Search courses and programs</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="apex-search-mobile"
                  type="search"
                  placeholder="Search courses & programs…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-500 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </form>

              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Browse</p>
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isCurrent(to) ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isCurrent(to) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-6 flex flex-col gap-2.5 border-t border-slate-100 pt-5">
                {isAuthenticated ? (
                  <>
                    <Link to="/student/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="primary" fullWidth icon={<GraduationCap className="h-4 w-4" />}>
                        Student Dashboard
                      </Button>
                    </Link>
                    {role === 'ADMIN' && (
                      <Link to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" fullWidth icon={<Shield className="h-4 w-4 text-amber-600" />}>
                          Admin Control Panel
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => { setIsMobileMenuOpen(false); signOut(); }}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      icon={<LogOut className="h-4 w-4" />}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" fullWidth>Sign In</Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="primary" fullWidth>Register Free Account</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
