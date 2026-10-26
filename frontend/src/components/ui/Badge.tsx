import React from 'react';
import { Severity, FindingCategory } from '@/types';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ShieldCheck, Bug, Zap, Palette, Wrench } from 'lucide-react';

interface SeverityBadgeProps {
  severity: Severity;
  showIcon?: boolean;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showIcon = true,
  className = '',
}) => {
  const configs: Record<Severity, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
    critical: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      label: 'Critical',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />,
    },
    high: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      label: 'High',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
    },
    medium: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      label: 'Medium',
      icon: <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />,
    },
    low: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      label: 'Low',
      icon: <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
    },
    informational: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      label: 'Info',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    },
  };

  const config = configs[severity] || configs.informational;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: FindingCategory; className?: string }> = ({
  category,
  className = '',
}) => {
  const getIcon = () => {
    switch (category) {
      case 'security':
        return <ShieldAlert className="w-3 h-3 text-red-400" />;
      case 'bug':
        return <Bug className="w-3 h-3 text-amber-400" />;
      case 'performance':
        return <Zap className="w-3 h-3 text-cyan-400" />;
      case 'style':
        return <Palette className="w-3 h-3 text-purple-400" />;
      case 'maintainability':
        return <Wrench className="w-3 h-3 text-blue-400" />;
      default:
        return <Info className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-surface text-slate-300 border border-surface-border ${className}`}>
      {getIcon()}
      <span className="capitalize">{category}</span>
    </span>
  );
};
