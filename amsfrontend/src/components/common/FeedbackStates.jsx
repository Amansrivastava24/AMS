import React from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export function LoadingState({ message = 'Loading records...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Loader2 className="w-8 h-8 text-forest animate-spin mb-3" />
      <span className="text-sm font-medium text-ams-muted">{message}</span>
    </div>
  );
}

export function EmptyState({ title = 'No records found', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-ams-border bg-white">
      <div className="w-12 h-12 rounded-full bg-ams-bg flex items-center justify-center text-ams-muted mb-3">
        <Inbox className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-semibold text-ams-text">{title}</h3>
      {description && <p className="mt-1 text-xs text-ams-muted max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-red-200 bg-red-50/50">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-ams-error mb-2.5">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-ams-text">Unable to load data</h3>
      <p className="mt-1 text-xs text-ams-muted max-w-sm">{message || 'An error occurred while fetching information from the server.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-ams-border text-xs font-semibold text-ams-text hover:bg-ams-bg shadow-subtle transition-smooth"
        >
          <RefreshCw className="w-3.5 h-3.5 text-forest" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
}
