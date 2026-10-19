import React, { useState, useEffect } from 'react';
import { healthService } from '../../services/healthService';
import { Activity, RefreshCw } from 'lucide-react';

export function ApiStatusBadge() {
  const [health, setHealth] = useState({ connected: false, checking: true, app: null, db: null });
  const [expanded, setExpanded] = useState(false);

  const checkStatus = async () => {
    setHealth((prev) => ({ ...prev, checking: true }));
    try {
      const res = await healthService.checkFullHealth();
      console.log('[AMS Live Health Check]', res);
      setHealth({
        connected: res.connected,
        checking: false,
        app: res.app,
        db: res.db,
        timestamp: res.timestamp,
      });
    } catch (err) {
      console.error('[AMS Live Health Check Failed]', err);
      setHealth({
        connected: false,
        checking: false,
        app: { status: 'DOWN', error: err.message },
        db: { status: 'DOWN', error: err.message },
      });
    }
  };

  useEffect(() => {
    checkStatus();
    // Re-check periodically every 30s
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full border border-ams-border bg-[#FFFFFF] hover:bg-ams-bg transition-colors shadow-subtle"
        title="Click to view Backend & Database connection status"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            health.checking
              ? 'bg-amber-400 animate-pulse'
              : health.connected
              ? 'bg-forest'
              : 'bg-ams-error animate-pulse'
          }`}
        />
        <span className="text-ams-muted">API:</span>
        <span
          className={`font-semibold ${
            health.connected ? 'text-forest' : 'text-ams-error'
          }`}
        >
          {health.checking ? 'Checking...' : health.connected ? 'Connected' : 'Offline'}
        </span>
      </button>

      {expanded && (
        <div className="absolute right-0 mt-2 w-80 p-3.5 bg-white rounded-lg shadow-modal border border-ams-border z-50 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-ams-border">
            <div className="flex items-center gap-1.5 font-semibold text-ams-text">
              <Activity className="w-3.5 h-3.5 text-forest" />
              <span>Backend Connection Status</span>
            </div>
            <button
              onClick={checkStatus}
              disabled={health.checking}
              className="text-ams-muted hover:text-forest p-1 rounded"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${health.checking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-ams-muted">Backend (Pekko HTTP):</span>
                <span
                  className={`font-medium px-1.5 py-0.5 rounded text-[11px] ${
                    health.app?.status === 'UP'
                      ? 'bg-energy-pale text-forest font-semibold'
                      : 'bg-red-50 text-ams-error'
                  }`}
                >
                  {health.app?.status || 'DOWN'}
                </span>
              </div>
              {health.app?.error && (
                <p className="text-[10px] text-ams-error mt-0.5 break-all">{health.app.error}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center">
                <span className="text-ams-muted">PostgreSQL Database:</span>
                <span
                  className={`font-medium px-1.5 py-0.5 rounded text-[11px] ${
                    health.db?.status === 'UP'
                      ? 'bg-energy-pale text-forest font-semibold'
                      : 'bg-red-50 text-ams-error'
                  }`}
                >
                  {health.db?.status === 'UP'
                    ? `UP (${health.db.database || 'Postgres'})`
                    : health.db?.status || 'DOWN'}
                </span>
              </div>
              {health.db?.error && (
                <p className="text-[10px] text-ams-error mt-0.5 break-all">{health.db.error}</p>
              )}
            </div>

            <div className="pt-2 border-t border-ams-border/70 text-[10px] text-ams-muted flex items-center justify-between">
              <span>Target: localhost:8080</span>
              <span>Live Health Check</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
