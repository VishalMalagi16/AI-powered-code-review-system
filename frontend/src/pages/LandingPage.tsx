import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  Bug,
  Lock,
  Zap,
  Sparkles,
  CheckCircle2,
  Code2,
  Terminal,
  FileCheck,
  Cpu,
  Layers,
  ChevronRight,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleStartReview = () => {
    if (isAuthenticated) {
      navigate('/app/workspace');
    } else {
      navigate('/register');
    }
  };

  const languages = [
    { name: 'Python', icon: '🐍', tag: 'AST + Bandit' },
    { name: 'JavaScript', icon: '🟨', tag: 'ESLint + XSS' },
    { name: 'TypeScript', icon: '🔷', tag: 'Type Guard + DOM' },
    { name: 'Java', icon: '☕', tag: 'SQLi + Resource Leaks' },
    { name: 'C / C++', icon: '⚡', tag: 'Buffer Overflow' },
    { name: 'Go', icon: '🐹', tag: 'Concurrency + Secrets' },
    { name: 'Rust', icon: '🦀', tag: 'Unsafe Blocks' },
  ];

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col selection:bg-brand-500/30">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-background/80 backdrop-blur-md px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            CodeGuard <span className="text-cyan-400 font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#workflow" className="hover:text-white transition-colors">How It Works</a>
          <a href="#languages" className="hover:text-white transition-colors">Languages</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button variant="primary" size="sm" onClick={() => navigate('/app/dashboard')}>
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors">
                Sign In
              </Link>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Get Started Free
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Subtle background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Gen Multi-Layer Code Auditing Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Write Better Code. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-brand-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
            Catch Bugs Before They Ship.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          CodeGuard AI combines deterministic AST static analysis, high-entropy secret scanning, and deep LLM intelligence to evaluate vulnerabilities, syntax defects, and architectural maintainability in milliseconds.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartReview}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto shadow-lg shadow-brand-600/30 font-semibold"
          >
            Start Reviewing Code
          </Button>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center text-sm font-medium px-5 py-2.5 rounded-lg border border-slate-700 bg-surface hover:bg-surface-hover text-slate-200 transition-colors"
          >
            Explore Features
          </a>
        </div>

        {/* Live Interactive Mockup / Product Preview */}
        <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-surface-border bg-surface/80 p-2 shadow-2xl backdrop-blur-sm">
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0b0f17]">
            {/* Window chrome header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">codeguard-review.py</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Quality Score: 72/100</span>
              </div>
            </div>

            {/* Split pane preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 text-left font-mono text-xs">
              {/* Left pane: Code */}
              <div className="lg:col-span-7 p-4 bg-[#0d1117] text-slate-300 overflow-x-auto space-y-1">
                <div className="text-slate-500">1  import os</div>
                <div className="text-slate-500">2  import hashlib</div>
                <div className="text-slate-500">3  </div>
                <div className="text-slate-300">4  def authenticate(user_token, payload):</div>
                <div className="bg-red-500/10 text-red-300 border-l-2 border-red-500 pl-2 -ml-2">
                  5      # SEC-PY-001: Dangerous dynamic execution
                </div>
                <div className="bg-red-500/15 text-red-200 pl-2 -ml-2">
                  6      eval(payload)  # &lt;-- Remote Code Execution risk
                </div>
                <div className="bg-orange-500/10 text-orange-300 border-l-2 border-orange-500 pl-2 -ml-2">
                  7      os.system(f"log.sh &#123;user_token&#125;") # Command Injection
                </div>
                <div className="text-slate-500">8      return True</div>
              </div>

              {/* Right pane: Review Findings */}
              <div className="lg:col-span-5 p-4 bg-slate-900/40 space-y-3 font-sans">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-200">2 Vulnerabilities Detected</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-mono text-[11px] font-bold">1 CRITICAL</span>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-red-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-red-400">SEC-PY-001: eval() Execution</span>
                    <span className="font-mono text-[10px] text-slate-400">Line 6</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Arbitrary code execution flaw detected via AST visitor.
                  </p>
                  <div className="text-[10px] text-brand-300 bg-brand-950/60 p-2 rounded border border-brand-800/40 font-mono mt-1">
                    Fix: ast.literal_eval() or JSON parser
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-orange-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-orange-400">SEC-PY-002: os.system Shell</span>
                    <span className="font-mono text-[10px] text-slate-400">Line 7</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Shell command string formatting allows parameter injection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-surface-border">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono mb-2">Core Capabilities</h2>
          <h3 className="text-3xl font-extrabold text-white">Engineered for High-Velocity Engineering Teams</h3>
          <p className="text-slate-400 mt-3 text-sm">
            Deterministic AST rules safeguard your applications against critical flaws without brittle guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-surface border border-surface-border hover:border-brand-500/50 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <Bug className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100">Deep AST Bug Detection</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Catches mutable default arguments, swallowed bare exceptions, logic bugs, type coercion pitfalls, and syntax errors.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-surface-border hover:border-brand-500/50 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100">Security & Secret Auditing</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Discovers embedded AWS keys, private SSH certificates, database connection strings, SQL injection, and DOM XSS vulnerabilities.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-surface-border hover:border-brand-500/50 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100">Code Quality & Metrics</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates Halstead and Cyclomatic complexity, maintainability index (0-100), function line lengths, and parameter counts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-surface-border hover:border-brand-500/50 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100">AI Remediation Diffs</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates production-ready replacement code diffs and in-depth contextual explanations on why each issue matters.
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Workflow */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-surface-border bg-black/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-400 font-mono mb-2">Simple Workflow</h2>
          <h3 className="text-3xl font-extrabold text-white">Three Steps to Flawless Code</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="p-6 rounded-xl bg-surface/70 border border-surface-border relative">
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center mb-4">
              1
            </div>
            <h4 className="text-lg font-bold text-slate-100 mb-2">Input or Upload Code</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste code into the Monaco Editor, drag-and-drop source files, or inspect sample templates across multiple languages.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface/70 border border-surface-border relative">
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center mb-4">
              2
            </div>
            <h4 className="text-lg font-bold text-slate-100 mb-2">Multi-Pass Automated Audit</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              CodeGuard executes AST parsers, secret scanners, and optional AI synthesis to pinpoint exact line discrepancies.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface/70 border border-surface-border relative">
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center mb-4">
              3
            </div>
            <h4 className="text-lg font-bold text-slate-100 mb-2">Review, Diff, & Export</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Navigate directly to code lines, inspect side-by-side fix diffs, resolve items, and export audit reports as JSON or Markdown.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Languages */}
      <section id="languages" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-surface-border">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono mb-2">Polyglot Support</h2>
          <h3 className="text-3xl font-extrabold text-white">Supported Languages</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {languages.map((lang) => (
            <div key={lang.name} className="p-4 rounded-xl bg-surface border border-surface-border text-center space-y-1">
              <div className="text-3xl mb-1">{lang.icon}</div>
              <div className="text-sm font-bold text-slate-200">{lang.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{lang.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Privacy Guarantee */}
      <section id="security" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-surface-border text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Enterprise Privacy & Sandboxed Execution</h3>
        <p className="mt-4 text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          CodeGuard AI enforces strict read-only static analysis by default. Submitted source code is never executed on the host server. API keys remain exclusively server-side in encrypted environment variables, ensuring complete isolation.
        </p>
        <div className="mt-8">
          <Button variant="primary" size="lg" onClick={handleStartReview}>
            Start Reviewing Code Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-surface-border py-8 px-4 sm:px-8 bg-surface/30 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-slate-200">CodeGuard AI</span>
          <span>© 2026. Production-Oriented Code Quality & Security Platform.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          <a href="#features" className="hover:text-white transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
};
