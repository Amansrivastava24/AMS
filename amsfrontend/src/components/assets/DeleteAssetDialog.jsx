import React, { useState } from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';

export function DeleteAssetDialog({ asset, onConfirm, onCancel, isDeleting }) {
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full border border-ams-border shadow-modal overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 text-ams-error flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ams-text">Confirm Asset Deletion</h3>
            <p className="text-xs text-ams-muted mt-1 leading-relaxed">
              Are you sure you want to permanently delete asset{' '}
              <strong className="text-ams-text font-mono">[{asset.assetCode}] {asset.name}</strong>?
            </p>
            <p className="text-[11px] text-ams-error/90 bg-red-50 p-2.5 rounded-md border border-red-200 mt-3">
              This will execute a permanent database deletion of this physical asset record.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-ams-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3.5 py-2 rounded-lg bg-white border border-ams-border text-xs font-semibold text-ams-text hover:bg-ams-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(asset.id)}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-ams-error hover:bg-red-700 text-white text-xs font-semibold shadow-subtle transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
