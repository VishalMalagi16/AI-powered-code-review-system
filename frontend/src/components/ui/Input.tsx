import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leadingIcon, trailingIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {leadingIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {leadingIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`block w-full rounded-lg bg-surface border text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              leadingIcon ? 'pl-10' : 'pl-3.5'
            } ${trailingIcon ? 'pr-10' : 'pr-3.5'} py-2.5 ${
              error
                ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
                : 'border-surface-border focus:border-brand-500'
            } ${className}`}
            {...props}
          />
          {trailingIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
              {trailingIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
