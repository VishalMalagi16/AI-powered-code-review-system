import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Code2,
  History,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { systemApi } from '@/services/api/system';
import { SystemHealth } from '@/types';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch health check once on mount
  useEffect(() => {
    systemApi.getHealth().then(setSystemHealth).catch(() => setSystemHealth(null));
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { label: 'Review Workspace', path: '/app/workspace', icon: <Code2 className="w-5 h-5 shrink-0" /> },
    { label: 'Review History', path: '/app/reviews', icon: <History className="w-5 h-5 shrink-0" /> },
    { label: 'Code Analytics', path: '/app/analytics', icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
    { label: 'Settings', path: '/app/settings', icon: <Settings className="w-5 h-5 shrink-0" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col selection:bg-brand-500/20">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 h-16 border-b border-surface-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover focus:outline-none"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <NavLink to="/app/dashboard" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-cyan-500 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-bold text-base tracking-tight text-white">
                <span>CodeGuard</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30 uppercase font-mono">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline tracking-wide font-medium">Enterprise Security & AST Review</span>
            </div>
          </NavLink>
        </div>

        {/* Right: Quick actions, Health, Theme, User */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* System Health Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-surface-border text-xs text-slate-300">
            {systemHealth?.status === 'healthy' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
            <span className="text-slate-400">Engine:</span>
            <span className="font-medium text-slate-200 capitalize">
              {systemHealth?.ai_status?.provider || 'Live'}
            </span>
          </div>

          {/* Quick Review Workspace CTA */}
          <button
            onClick={() => navigate('/app/workspace')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/90 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-colors border border-brand-400/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>New Review</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-surface-border">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</span>
              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{user?.email}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-700/80 border border-brand-500/40 text-cyan-200 flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Body with Sidebar + Content */}
      <div className="flex-1 flex min-w-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-surface-border bg-surface/50 p-4 justify-between">
          <nav className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Platform
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </NavLink>
            ))}
          </nav>

          {/* Engine Status Capsule in Sidebar */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-surface-border text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Scanner Status</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              AST analyzer and security token scanners active with zero-compromise static validation.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer & Backdrop */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed top-0 bottom-0 left-0 w-72 bg-surface border-r border-surface-border p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-400" />
                    <span className="font-bold text-slate-100">CodeGuard AI</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1.5">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                          isActive
                            ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                        }`
                      }
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-surface-border space-y-3">
                <div className="text-xs text-slate-400">
                  Signed in as <span className="font-semibold text-slate-200">{user?.name}</span>
                </div>
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - min-w-0 prevents flex children from overflowing or overlapping */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
