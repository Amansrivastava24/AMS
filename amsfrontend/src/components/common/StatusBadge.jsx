import React from 'react';

const STATUS_CONFIGS = {
  // Tagging Status
  T: { label: 'Tagged', className: 'bg-brand-light text-brand-deep border-brand-primary/30', dot: 'bg-brand-deep' },
  TR: { label: 'To Review', className: 'bg-amber-50 text-ams-warning border-amber-200', dot: 'bg-ams-warning' },
  NA: { label: 'Not Applicable', className: 'bg-gray-100 text-ams-muted border-gray-200', dot: 'bg-gray-400' },

  // Verification Status
  VERIFIED: { label: 'Verified', className: 'bg-brand-light text-brand-deep border-brand-primary/30', dot: 'bg-brand-deep' },
  UNVERIFIED: { label: 'Unverified', className: 'bg-gray-100 text-ams-muted border-gray-200', dot: 'bg-gray-400' },
  DISCREPANCY: { label: 'Discrepancy', className: 'bg-red-50 text-ams-error border-red-200', dot: 'bg-ams-error' },

  // Asset Item Status
  AVAILABLE: { label: 'Available', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  IN_USE: { label: 'In Use', className: 'bg-brand-light text-brand-deep border-brand-primary/30', dot: 'bg-brand-deep' },
  MAINTENANCE: { label: 'Maintenance', className: 'bg-amber-50 text-ams-warning border-amber-200', dot: 'bg-ams-warning' },
  RETIRED: { label: 'Retired', className: 'bg-gray-100 text-ams-muted border-gray-200', dot: 'bg-gray-400' },
  LOST: { label: 'Lost', className: 'bg-red-50 text-ams-error border-red-200', dot: 'bg-ams-error' },

  // User Account Status
  ACTIVE: { label: 'Active', className: 'bg-brand-light text-brand-deep border-brand-primary/30', dot: 'bg-brand-deep' },
  INACTIVE: { label: 'Inactive', className: 'bg-gray-100 text-ams-muted border-gray-200', dot: 'bg-gray-400' },

  // Roles
  SUPER_ADMIN: { label: 'Super Admin', className: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-600' },
  ADMIN: { label: 'Admin', className: 'bg-brand-light text-brand-deep border-brand-primary/30', dot: 'bg-brand-deep' },
  GENERAL: { label: 'General', className: 'bg-gray-100 text-ams-muted border-gray-200', dot: 'bg-gray-500' },
};

export function StatusBadge({ status, type }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-50 text-gray-400 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        Unspecified
      </span>
    );
  }

  const normalized = String(status).toUpperCase();
  const config = STATUS_CONFIGS[normalized] || {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
