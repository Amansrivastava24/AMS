import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Clock, ShieldAlert, Database, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PlaceholderPage({ title, description, moduleName, backendContract }) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        badge="Coming Soon"
      />

      <div className="bg-white rounded-2xl border border-ams-border p-8 lg:p-12 shadow-subtle text-center max-w-2xl mx-auto my-6">
        <div className="w-14 h-14 rounded-2xl bg-energy-pale text-forest flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-bold text-ams-text">{moduleName} Module</h2>
        <p className="text-xs text-ams-muted mt-2 max-w-md mx-auto leading-relaxed">
          This administrative surface is scheduled for an upcoming milestone. In accordance with enterprise integrity standards, fake or mock data is not displayed.
        </p>

        {backendContract && (
          <div className="mt-6 p-4 rounded-xl bg-ams-bg border border-ams-border text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-ams-text mb-1.5">
              <Database className="w-4 h-4 text-forest" />
              <span>Pending Backend Contract</span>
            </div>
            <p className="text-[11px] text-ams-muted font-mono bg-white p-2.5 rounded border border-ams-border">
              {backendContract}
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/assets"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest hover:bg-forest-dark text-white rounded-lg text-xs font-semibold shadow-subtle transition-smooth"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Asset Inventory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
