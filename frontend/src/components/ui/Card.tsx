import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-surface-border rounded-xl shadow-sm ${
        hoverable ? 'hover:border-slate-600 transition-colors cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ title, subtitle, action, className = '', children }) => {
  if (children) {
    return <div className={`p-5 border-b border-surface-border ${className}`}>{children}</div>;
  }
  return (
    <div className={`p-5 border-b border-surface-border flex items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {title && <h3 className="text-base font-semibold text-slate-100 truncate">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`p-5 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`p-4 border-t border-surface-border bg-black/10 rounded-b-xl ${className}`}>{children}</div>;
};
