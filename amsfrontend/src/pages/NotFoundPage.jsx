import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-ams-bg flex items-center justify-center p-6 text-center">
      <div className="bg-white p-8 lg:p-12 rounded-2xl border border-ams-border shadow-modal max-w-md w-full">
        <div className="w-14 h-14 rounded-2xl bg-energy-pale text-forest flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-ams-text">Page Not Found</h1>
        <p className="text-xs text-ams-muted mt-2 leading-relaxed">
          The requested system route does not exist or has been relocated within the asset platform.
        </p>
        <div className="mt-6">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-deep hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-subtle transition-smooth"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Inventory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
