import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ text, fullScreen = false }: LoadingProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-bg-dark flex flex-col items-center justify-center z-50">
        <Loader2 className="w-12 h-12 text-gold animate-spin" />
        {text && <p className="mt-4 text-muted">{text}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="w-8 h-8 text-gold animate-spin" />
      {text && <p className="mt-3 text-muted text-sm">{text}</p>}
    </div>
  );
}

// Skeleton components for loading states
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="h-6 w-3/4 mb-3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function PlayerRowSkeleton() {
  return (
    <div className="player-row">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div>
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-12 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    </div>
  );
}
