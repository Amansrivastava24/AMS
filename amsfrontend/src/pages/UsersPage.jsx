import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { referenceService } from '../services/referenceService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/common/FeedbackStates';
import { ROLES, canManageTargetUser } from '../permissions/permissions';
import { useDebounce } from '../hooks/useDebounce';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { 
  Users, 
  Plus, 
  Search, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Shield, 
  Edit, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertTriangle,
  RotateCcw,
  Lock
} from 'lucide-react';

export function UsersPage() {
  const { user: currentUser, role: currentRole, refreshProfile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isSuperAdmin = currentRole === ROLES.SUPER_ADMIN;

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Queries
  const queryParams = {
    page,
    pageSize,
    search: debouncedSearch.trim() || undefined,
    role: roleFilter || undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
    status: status || undefined,
  };

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => userService.getUsers(queryParams),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: referenceService.getDepartments,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: referenceService.getRoles,
  });

  const users = data?.items || [];
  const totalItems = data?.totalItems || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => userService.createUser(payload),
    onSuccess: (newUser) => {
      toast.success(`User ${newUser.name} created successfully`);
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => userService.updateUser(id, payload),
    onSuccess: (_, variables) => {
      toast.success('User updated successfully');
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (Number(variables.id) === Number(currentUser?.id)) {
        refreshProfile?.();
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => userService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(`User status changed to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user status');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, roleId }) => userService.updateRole(id, roleId),
    onSuccess: () => {
      toast.success('User role updated successfully');
      setRoleChangeUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => userService.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted successfully');
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete user');
    },
  });

  const handleToggleStatus = (targetUser) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ id: targetUser.id, status: newStatus });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setRoleFilter('');
    setDepartmentId('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-ams-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-light border border-brand-primary/30 flex items-center justify-center text-brand-deep">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ams-text tracking-tight">User Administration</h1>
            <p className="text-xs text-ams-muted mt-0.5">
              Manage enterprise user credentials, department assignments, and system authorization roles.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-deep hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-subtle transition-smooth"
        >
          <Plus className="w-4 h-4" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search text */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">Search User</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ams-muted absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                placeholder="Name, email, or employee ID..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">Role</label>
            <SearchableSelect
              size="sm"
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Roles' },
                ...roles.map((r) => ({
                  value: r.name,
                  label: r.name,
                })),
              ]}
              placeholder="All Roles"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">Department</label>
            <SearchableSelect
              size="sm"
              value={departmentId}
              onChange={(val) => {
                setDepartmentId(val);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map((d) => ({
                  value: String(d.id),
                  label: d.name,
                })),
              ]}
              placeholder="All Departments"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-ams-muted mb-1">Account Status</label>
              <SearchableSelect
                size="sm"
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'INACTIVE', label: 'INACTIVE' },
                ]}
                placeholder="All Statuses"
              />
            </div>

            {(searchInput || roleFilter || departmentId || status) && (
              <button
                onClick={handleResetFilters}
                className="p-2 text-ams-muted hover:text-ams-error bg-ams-bg rounded-lg border border-ams-border transition-colors shrink-0"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-ams-border shadow-subtle overflow-hidden">
        <div className="px-5 py-3 border-b border-ams-border flex items-center justify-between bg-ams-bg/30">
          <div className="text-xs text-ams-muted">
            Total Users: <span className="font-semibold text-ams-text">{totalItems}</span>
            {isFetching && <span className="ml-2 text-brand-deep animate-pulse">(Updating...)</span>}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8">
            <LoadingState message="Loading users from database..." />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState title="Failed to load users" message={error?.message} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No users found"
              message="No user accounts match the selected filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ams-border">
                {users.map((u) => {
                  const targetRole = u.role || 'GENERAL';
                  const canAct = canManageTargetUser(currentRole, targetRole, currentUser?.id, u.id);

                  return (
                    <tr key={u.id} className="hover:bg-brand-very-light/70 transition-colors">
                      <td className="font-mono font-bold text-xs text-brand-deep">
                        {u.employeeId}
                      </td>
                      <td className="font-semibold text-ams-text">
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-brand-light text-brand-deep">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-ams-muted">
                        {u.email}
                      </td>
                      <td className="text-xs text-ams-muted">
                        <div>{u.departmentName || departments.find((d) => d.id === u.departmentId)?.name || 'Unassigned'}</div>
                        {(u.city || u.country) && (
                          <div className="text-[10px] text-ams-muted font-mono">{[u.city, u.country].filter(Boolean).join(', ')}</div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={targetRole} />
                      </td>
                      <td>
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle status (Active / Inactive) */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={!canAct || (targetRole === ROLES.SUPER_ADMIN && !isSuperAdmin)}
                            className={`p-1 rounded transition-colors ${
                              canAct
                                ? u.status === 'ACTIVE'
                                  ? 'text-ams-muted hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-brand-deep hover:bg-brand-light'
                                : 'opacity-30 cursor-not-allowed text-ams-muted'
                            }`}
                            title={
                              !canAct
                                ? 'Permission denied: Cannot modify admin/super admin account'
                                : u.status === 'ACTIVE'
                                ? 'Deactivate account'
                                : 'Activate account'
                            }
                          >
                            {u.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Role Promotion (Super Admin only) */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => setRoleChangeUser(u)}
                              className="p-1 text-purple-700 hover:bg-purple-50 rounded transition-colors"
                              title="Change Role"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit user details */}
                          <button
                            onClick={() => setEditingUser(u)}
                            disabled={!canAct}
                            className={`p-1 rounded transition-colors ${
                              canAct
                                ? 'text-ams-muted hover:text-ams-text hover:bg-gray-100'
                                : 'opacity-30 cursor-not-allowed text-ams-muted'
                            }`}
                            title={canAct ? 'Edit user' : 'Cannot edit privileged account'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete user */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={!canAct || u.id === currentUser?.id}
                            className={`p-1 rounded transition-colors ${
                              canAct && u.id !== currentUser?.id
                                ? 'text-ams-muted hover:text-ams-error hover:bg-red-50'
                                : 'opacity-30 cursor-not-allowed text-ams-muted'
                            }`}
                            title={
                              u.id === currentUser?.id
                                ? 'Cannot delete your own account'
                                : canAct
                                ? 'Delete user'
                                : 'Permission denied'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalItems > 0 && (
          <div className="px-5 py-3 border-t border-ams-border flex items-center justify-between bg-white">
            <span className="text-xs text-ams-muted">
              Page <span className="font-semibold text-ams-text">{page}</span> of{' '}
              <span className="font-semibold text-ams-text">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-ams-border hover:bg-ams-bg disabled:opacity-40 text-ams-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-ams-border hover:bg-ams-bg disabled:opacity-40 text-ams-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit User Dialog */}
      {(isCreateOpen || editingUser) && (
        <UserModal
          user={editingUser}
          departments={departments}
          roles={roles}
          isSuperAdmin={isSuperAdmin}
          serverError={createMutation.error?.message || updateMutation.error?.message}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingUser(null);
            createMutation.reset();
            updateMutation.reset();
          }}
          onSubmit={(payload) => {
            if (editingUser) {
              updateMutation.mutate({ id: editingUser.id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Role Change Modal (Super Admin) */}
      {roleChangeUser && (
        <RoleChangeModal
          user={roleChangeUser}
          roles={roles}
          onClose={() => setRoleChangeUser(null)}
          onSubmit={(newRoleId) =>
            roleMutation.mutate({ id: roleChangeUser.id, roleId: newRoleId })
          }
          isSubmitting={roleMutation.isPending}
        />
      )}

      {/* Delete User Dialog */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-ams-error">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ams-text">Delete User Account</h3>
            </div>
            <p className="text-xs text-ams-muted leading-relaxed">
              Are you sure you want to permanently delete user <strong className="text-ams-text">{deletingUser.name}</strong> ({deletingUser.employeeId})? If the user is referenced as an asset owner or custodian, deletion will be safely rejected.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingUser.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-ams-error hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * User Creation & Editing Modal
 */
function UserModal({ user, departments, roles = [], isSuperAdmin, serverError, onClose, onSubmit, isSubmitting }) {
  const isEditing = Boolean(user?.id);

  const [employeeId, setEmployeeId] = useState(user?.employeeId || '');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState(user?.departmentId ? String(user.departmentId) : '');
  const defaultRoleId = user?.roleId || roles.find((r) => r.name === 'GENERAL')?.id || roles[0]?.id || '';
  const [roleId, setRoleId] = useState(defaultRoleId);
  const [status, setStatus] = useState(user?.status || 'ACTIVE');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || '');
  const [errorMsg, setErrorMsg] = useState('');

  const activeError = errorMsg || serverError;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!employeeId.trim()) {
      setErrorMsg('Employee ID is required');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Full name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Valid email is required');
      return;
    }
    if (!isEditing && (!password || password.length < 8)) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }

    const payload = {
      employeeId: employeeId.trim(),
      name: name.trim(),
      email: email.trim(),
      departmentId: departmentId ? Number(departmentId) : null,
      roleId: Number(roleId),
      status,
      city: city.trim() || null,
      country: country.trim() || null,
    };

    if (!isEditing || password) {
      payload.password = password;
    }

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-ams-border flex items-center justify-between bg-brand-very-light">
          <h3 className="font-bold text-sm text-ams-text">
            {isEditing ? `Edit User: ${user.name}` : 'Create New User Account'}
          </h3>
          <button onClick={onClose} className="p-1 text-ams-muted hover:text-ams-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeError && (
          <div className="mx-5 mt-3 p-2.5 rounded bg-red-50 border border-ams-error/20 text-xs text-ams-error font-medium">
            {activeError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Employee ID <span className="text-ams-error">*</span></label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP1099"
                disabled={isEditing}
                className="w-full px-3 py-2 rounded-lg border border-ams-border font-mono focus:outline-none focus:ring-1 focus:ring-brand-deep disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Full Name <span className="text-ams-error">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ams-text mb-1">Email Address <span className="text-ams-error">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane.doe@landisgyr.com"
              className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          <div>
            <label className="block font-semibold text-ams-text mb-1">
              {isEditing ? 'New Password (leave blank to retain current)' : 'Password *'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditing ? '••••••••' : 'Min 8 characters with upper, lower, digit'}
              className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ams-text mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Noida"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-ams-text mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. India"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Department</label>
              <SearchableSelect
                size="sm"
                value={departmentId}
                onChange={(val) => setDepartmentId(val)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...departments.map((d) => ({
                    value: String(d.id),
                    label: d.name,
                  })),
                ]}
                placeholder="Select Department..."
              />
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Role Assignment</label>
              <SearchableSelect
                size="sm"
                value={String(roleId)}
                onChange={(val) => setRoleId(val)}
                disabled={isEditing ? !isSuperAdmin : false}
                options={roles
                  .filter((r) => isSuperAdmin || r.name === 'GENERAL' || r.name === 'CUSTODIAN')
                  .map((r) => ({
                    value: String(r.id),
                    label: r.name,
                  }))}
                allowClear={false}
              />
              {!isSuperAdmin && (
                <span className="text-[10px] text-ams-muted mt-0.5 block">
                  {isEditing
                    ? 'Only Super Admins can modify user authorization roles'
                    : 'Admins can only create General or Custodian accounts'}
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-ams-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-brand-deep hover:bg-brand-dark text-white text-xs font-semibold disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Privileged Role Change Modal (Super Admin only)
 */
function RoleChangeModal({ user, roles = [], onClose, onSubmit, isSubmitting }) {
  const [roleId, setRoleId] = useState(user.roleId || roles[0]?.id || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(roleId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-ams-border flex items-center justify-between bg-purple-50">
          <div className="flex items-center gap-2 text-purple-700">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold text-sm">Elevate / Modify Role</h3>
          </div>
          <button onClick={onClose} className="p-1 text-ams-muted hover:text-ams-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="text-ams-muted">
            Changing role for <strong className="text-ams-text">{user.name}</strong> ({user.employeeId}):
          </p>

          <div>
            <label className="block font-semibold text-ams-text mb-1">Select New Role</label>
            <SearchableSelect
              value={String(roleId)}
              onChange={(val) => setRoleId(val)}
              options={roles.map((r) => ({
                value: String(r.id),
                label: r.name,
                subLabel: r.name === 'SUPER_ADMIN' ? 'Full System & Role Control' : r.name === 'ADMIN' ? 'Asset & Ordinary User Management' : r.name === 'CUSTODIAN' ? 'Assigned Asset Inspection & Update' : 'Inventory Viewing & Export only',
              }))}
              allowClear={false}
            />
          </div>

          <div className="pt-3 border-t border-ams-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold disabled:opacity-60"
            >
              {isSubmitting ? 'Updating...' : 'Confirm Role Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
