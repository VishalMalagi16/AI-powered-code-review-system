import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`animate-pulse bg-slate-800/80 rounded-md ${className}`} />;
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-6 w-20 rounded" />
        <Skeleton className="h-6 w-24 rounded" />
      </div>
    </div>
  );
};
