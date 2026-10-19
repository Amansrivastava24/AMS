import React from 'react';

export function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-6 border-b border-ams-border">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl lg:text-2xl font-bold text-forest-dark tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-energy-pale text-forest border border-energy/30">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-ams-muted font-normal max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
