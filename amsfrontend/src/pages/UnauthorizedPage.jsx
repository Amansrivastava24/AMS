import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Boxes } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { StatusBadge } from '../components/common/StatusBadge';

export function UnauthorizedPage() {
  const { role, user } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-ams-border shadow-modal max-w-md w-full p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-ams-error border border-red-200 flex items-center justify-center mx-auto shadow-subtle">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-ams-text tracking-tight">Access Restricted</h1>
          <p className="text-xs text-ams-muted mt-1 leading-relaxed">
            Your current account permissions do not grant access to this administrative feature.
          </p>
        </div>

        <div className="py-3 px-4 rounded-lg bg-ams-bg border border-ams-border text-xs flex items-center justify-between">
          <span className="text-ams-muted">Current Role:</span>
          <StatusBadge status={role} />
        </div>

        <p className="text-[11px] text-ams-muted">
          If you require elevated administrative permissions (such as creating assets, altering taxonomy, or managing user accounts), please contact your system Super Administrator.
        </p>

        <div className="pt-2 flex justify-center">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-deep hover:bg-brand-dark text-white text-xs font-semibold shadow-subtle transition-smooth"
          >
            <Boxes className="w-4 h-4 text-brand-primary" />
            <span>Return to Inventory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
