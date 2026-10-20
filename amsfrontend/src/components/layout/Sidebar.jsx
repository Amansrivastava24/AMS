import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Boxes, 
  Package, 
  Layers, 
  Tag, 
  MapPin, 
  Building2, 
  Users, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Zap,
  ShieldCheck,
  UserCheck,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, hasPermission } from '../../permissions/permissions';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../common/Toast';
import logoImg from '../../assets/landisgyr-logo.png';

export function Sidebar({ mobileOpen, onCloseMobile }) {
  const { user, logout, role, updateUserProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editCity, setEditCity] = useState(user?.city || '');
  const [editCountry, setEditCountry] = useState(user?.country || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.city) setEditCity(user.city);
    if (user?.country) setEditCountry(user.country);
  }, [user]);

  const canManageAssets = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN || role === ROLES.CUSTODIAN;
  const canManageUsers = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const navigationItems = [
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Boxes,
      visible: true,
      badge: 'Read & Export',
    },
    {
      name: 'Assets',
      path: '/assets',
      icon: Package,
      visible: canManageAssets,
      badge: role === ROLES.CUSTODIAN ? 'Assigned' : 'Manage',
    },
    {
      name: 'Users',
      path: '/users',
      icon: Users,
      visible: canManageUsers,
      badge: role === ROLES.SUPER_ADMIN ? 'Super' : 'Admin',
    },
    {
      name: 'Departments',
      path: '/departments',
      icon: Building2,
      visible: true,
    },
    {
      name: 'Asset Types',
      path: '/asset-types',
      icon: Tag,
      visible: true,
    },
    {
      name: 'Locations',
      path: '/locations',
      icon: MapPin,
      visible: true,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-ams-text/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-ams-border flex flex-col transition-all duration-200 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header / Brand */}
        <div className="h-16 px-4 border-b border-ams-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-white border border-ams-border flex items-center justify-center p-1 shrink-0 shadow-subtle">
              <img src={logoImg} alt="Landis+Gyr" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="text-xs font-bold text-ams-text tracking-tight block truncate">
                  Asset Management System
                </span>
                <span className="text-[10px] font-semibold text-brand-deep block leading-tight truncate">
                  Intelligent Energy, Delivered.
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-md text-ams-muted hover:text-ams-text hover:bg-brand-very-light transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-ams-muted hover:text-ams-text hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-light text-brand-deep font-semibold shadow-subtle border border-brand-primary/20'
                        : 'text-ams-muted hover:text-ams-text hover:bg-brand-very-light'
                    }`
                  }
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-white/80 text-brand-deep border border-brand-primary/20">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* User profile & Logout footer */}
        <div className="p-3 border-t border-ams-border bg-ams-bg/50">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-white border border-ams-border group">
                <div className="w-8 h-8 rounded-full bg-brand-light border border-brand-primary/30 flex items-center justify-center text-brand-deep font-bold text-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="truncate flex-1">
                  <div className="text-xs font-semibold text-ams-text truncate leading-tight">
                    {user?.name || user?.employeeId || 'Authenticated User'}
                  </div>
                  <div className="text-[11px] text-ams-muted truncate leading-tight mt-0.5">
                    {user?.city ? `${user.city}, ${user.country || ''}` : (user?.email || user?.employeeId)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditCity(user?.city || 'Noida');
                    setEditCountry(user?.country || 'India');
                    setIsProfileModalOpen(true);
                  }}
                  className="p-1 text-ams-muted hover:text-brand-deep rounded hover:bg-brand-very-light transition-colors"
                  title="Edit profile & location"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                <StatusBadge status={role} />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-medium text-ams-muted hover:text-ams-error transition-colors p-1"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditCity(user?.city || 'Noida');
                  setEditCountry(user?.country || 'India');
                  setIsProfileModalOpen(true);
                }}
                className="w-8 h-8 rounded-full bg-brand-light border border-brand-primary/30 flex items-center justify-center text-brand-deep font-bold text-xs hover:ring-2 hover:ring-brand-deep/30 transition-all"
                title={`Edit Profile: ${user?.name || ''} (${role || ''})`}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 text-ams-muted hover:text-ams-error transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Admin Profile & Location Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ams-text/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-ams-border">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-deep" />
                <h3 className="font-bold text-sm text-ams-text">User Profile & Location</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-ams-muted hover:text-ams-text p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-ams-bg border border-ams-border text-ams-muted">
                <div>Account: <strong className="text-ams-text font-mono">[{user?.employeeId}] {user?.name}</strong></div>
                <div>Role: <strong className="text-brand-deep">{role}</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-ams-text mb-1">
                  City (used for location defaults) <span className="text-ams-error">*</span>
                </label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Noida"
                  className="w-full px-3 py-2 rounded-lg border border-ams-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
                />
              </div>

              <div>
                <label className="block font-semibold text-ams-text mb-1">
                  Country (used for location defaults) <span className="text-ams-error">*</span>
                </label>
                <input
                  type="text"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full px-3 py-2 rounded-lg border border-ams-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-ams-border">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !editCity.trim() || !editCountry.trim()}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await updateUserProfile({
                      city: editCity.trim(),
                      country: editCountry.trim(),
                    });
                    toast.success('Profile location updated successfully!');
                    setIsProfileModalOpen(false);
                  } catch (err) {
                    toast.error(err?.response?.data?.error || err.message || 'Failed to update profile');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-brand-deep hover:bg-brand-dark text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
