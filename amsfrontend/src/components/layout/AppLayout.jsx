import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ams_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ams_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-ams-bg">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div
        className={`${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        } transition-all duration-200 ease-in-out flex flex-col min-h-screen`}
      >
        <Topbar
          onOpenMobile={() => setMobileOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        <main className="flex-1 p-4 lg:p-6 w-full max-w-[1920px] mx-auto transition-all duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
