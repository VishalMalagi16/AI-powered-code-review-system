import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Moon,
  Sun,
  Shield,
  Key,
  CheckCircle2,
  Trash2,
  Save,
  LogOut,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { authApi } from '@/services/api/auth';
import { systemApi } from '@/services/api/system';
import { SystemHealth } from '@/types';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error: toastError } = useToast();

  const [name, setName] = useState<string>(user?.name || '');
  const [defaultLanguage, setDefaultLanguage] = useState<string>(
    user?.preferences?.default_language || 'python'
  );
  const [enableSecurityChecks, setEnableSecurityChecks] = useState<boolean>(
    user?.preferences?.enable_security_checks !== false
  );
  const [enablePerformanceChecks, setEnablePerformanceChecks] = useState<boolean>(
    user?.preferences?.enable_performance_checks !== false
  );
  const [enableStyleChecks, setEnableStyleChecks] = useState<boolean>(
    user?.preferences?.enable_style_checks !== false
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // System Health / AI status
  const [health, setHealth] = useState<SystemHealth | null>(null);

  // Account deletion modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  useEffect(() => {
    systemApi.getHealth().then(setHealth).catch(console.error);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await authApi.updateProfile({
        name,
        preferences: {
          theme,
          default_language: defaultLanguage,
          enable_security_checks: enableSecurityChecks,
          enable_performance_checks: enablePerformanceChecks,
          enable_style_checks: enableStyleChecks,
        },
      });
      updateUser(updated);
      success('Preferences updated successfully.', 'Settings Saved');
    } catch {
      toastError('Failed to save preferences.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await authApi.deleteAccount();
      await logout();
    } catch {
      toastError('Failed to delete account.', 'Error');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
      {/* Page Header */}
      <div className="pb-4 border-b border-surface-border">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your developer profile, default auditing preferences, and AI provider connectivity.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader title="Developer Profile" subtitle="Your personal information" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leadingIcon={<UserIcon className="w-4 h-4" />}
              />
              <Input
                label="Email Address (Read-only)"
                value={user?.email || ''}
                disabled
                className="opacity-70 cursor-not-allowed bg-slate-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance & Workspace Preferences */}
        <Card>
          <CardHeader title="Auditing & Interface Preferences" subtitle="Customize review options" />
          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Color Theme
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                      : 'bg-surface border-surface-border text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark Theme (Default)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    theme === 'light'
                      ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                      : 'bg-surface border-surface-border text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light Theme</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Programming Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full sm:w-64 bg-surface hover:bg-surface-hover border border-surface-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C / C++</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>

            <div className="space-y-3 pt-2">
              <span className="block text-xs font-semibold text-slate-300">
                Default Scan Checklists
              </span>
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSecurityChecks}
                  onChange={(e) => setEnableSecurityChecks(e.target.checked)}
                  className="rounded bg-surface border-surface-border text-brand-600 focus:ring-0"
                />
                <span>Include high-entropy secret token & credential scanning</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePerformanceChecks}
                  onChange={(e) => setEnablePerformanceChecks(e.target.checked)}
                  className="rounded bg-surface border-surface-border text-brand-600 focus:ring-0"
                />
                <span>Analyze resource leaks & performance anti-patterns</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableStyleChecks}
                  onChange={(e) => setEnableStyleChecks(e.target.checked)}
                  className="rounded bg-surface border-surface-border text-brand-600 focus:ring-0"
                />
                <span>Evaluate complexity, parameter limits, and clean code conventions</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* AI Provider Status Card */}
        <Card>
          <CardHeader
            title="AI Engine Configuration"
            subtitle="Server-side LLM provider status"
          />
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover border border-surface-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200">
                    Active AI Provider: <span className="capitalize text-cyan-400">{health?.ai_status.provider || 'Local AST'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {health?.ai_status.configured
                      ? 'Cloud LLM credentials configured securely in backend .env'
                      : 'Running in offline intelligent mode with deterministic AST parsers.'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Operational
              </span>
            </div>

            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/30 text-blue-300 text-[11px] leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                To configure live Google Gemini or OpenAI models, update <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">GEMINI_API_KEY</code> or <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">OPENAI_API_KEY</code> in <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">backend/.env</code>. API secrets are never exposed to browser clients.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save All Preferences
          </Button>
        </div>
      </form>

      {/* Danger Zone: Account Deletion */}
      <Card className="border-red-500/30">
        <CardHeader
          title="Account Management"
          subtitle="Permanently delete your profile and code audits"
        />
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-slate-200 text-xs">Delete Account & Data</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Permanently purges your account credentials and all audited review history.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deletion"
        description="This action is irreversible."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAccount}
              isLoading={isDeletingAccount}
            >
              Permanently Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-300 leading-relaxed">
          Are you sure you want to delete your account? All saved code reviews, issue histories, and personalized settings will be immediately deleted from the database.
        </p>
      </Modal>
    </div>
  );
};
