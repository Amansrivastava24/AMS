import React from 'react';
import { Menu, Activity, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { healthService } from '../../services/healthService';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../common/StatusBadge';
import logoImg from '../../assets/landisgyr-logo.png';

export function Topbar({ onOpenMobile, title }) {
  const { user, role } = useAuth();

  // Query health status every 30s
  const { data: healthData } = useQuery({
    queryKey: ['system-health'],
    queryFn: healthService.checkFullHealth,
    refetchInterval: 30000,
  });

  const isBackendUp = healthData?.connected;

  return (
    <header className="h-16 bg-white border-b border-ams-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-subtle">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-ams-muted hover:text-ams-text hover:bg-brand-very-light"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src={logoImg} alt="Landis+Gyr" className="h-7 w-auto object-contain lg:hidden" />
        <div>
          <h1 className="text-lg font-bold text-ams-text tracking-tight leading-tight">
            {title || 'Asset Management System'}
          </h1>
          <span className="text-[10px] text-brand-deep font-semibold hidden md:block leading-none">
            Intelligent Energy, Delivered.
          </span>
        </div>
      </div>

      {/* Right: Live health & User status */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Backend health pill */}
        <div
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isBackendUp
              ? 'bg-brand-light text-brand-deep border-brand-primary/30'
              : 'bg-red-50 text-ams-error border-red-200'
          }`}
          title={isBackendUp ? 'Backend API and PostgreSQL active' : 'Backend connection issue'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendUp ? 'bg-brand-deep animate-pulse' : 'bg-ams-error'
            }`}
          />
          <span className="font-mono">{isBackendUp ? 'API: ONLINE' : 'API: OFFLINE'}</span>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2">
          <StatusBadge status={role} />
        </div>
      </div>
    </header>
  );
}
