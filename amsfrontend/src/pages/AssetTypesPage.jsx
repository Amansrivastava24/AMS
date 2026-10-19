import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referenceService } from '../services/referenceService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { LoadingState, ErrorState, EmptyState } from '../components/common/FeedbackStates';
import { ROLES } from '../permissions/permissions';
import { Tag, Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react';

export function AssetTypesPage() {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const canManage = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: assetTypes = [], isLoading, isError, error } = useQuery({
    queryKey: ['asset-types'],
    queryFn: referenceService.getAssetTypes,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => referenceService.createAssetType(payload),
    onSuccess: (newType) => {
      toast.success(`Asset type "${newType.name}" created`);
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Failed to create asset type');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => referenceService.updateAssetType(id, payload),
    onSuccess: () => {
      toast.success('Asset type updated successfully');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Failed to update asset type');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => referenceService.deleteAssetType(id),
    onSuccess: () => {
      toast.success('Asset type deleted successfully');
      setDeletingType(null);
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete asset type. Existing assets may reference it.');
    },
  });

  const openCreateModal = () => {
    setEditingType(null);
    setName('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingType(item);
    setName(item.name);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setName('');
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Asset type name is required');
      return;
    }

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, payload: { name: name.trim() } });
    } else {
      createMutation.mutate({ name: name.trim() });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-ams-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-light border border-brand-primary/30 flex items-center justify-center text-brand-deep">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ams-text tracking-tight">Asset Types & Classifications</h1>
            <p className="text-xs text-ams-muted mt-0.5">
              Equipment taxonomy for hardware, metering systems, IT assets, and grid sensors.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-deep hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-subtle transition-smooth"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset Type</span>
          </button>
        )}
      </div>

      {/* Asset Types Table */}
      <div className="bg-white rounded-xl border border-ams-border shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingState message="Loading asset types..." />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState title="Failed to load asset types" message={error?.message} />
          </div>
        ) : assetTypes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No asset types found"
              message="No taxonomy categories have been registered yet."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr>
                  <th className="w-20">ID</th>
                  <th>Classification Name</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ams-border">
                {assetTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-brand-very-light/70 transition-colors">
                    <td className="font-mono text-xs text-ams-muted">#{type.id}</td>
                    <td className="font-semibold text-ams-text text-xs">{type.name}</td>
                    {canManage && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(type)}
                            className="p-1 text-ams-muted hover:text-ams-text hover:bg-gray-100 rounded transition-colors"
                            title="Edit Asset Type"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingType(type)}
                            className="p-1 text-ams-muted hover:text-ams-error hover:bg-red-50 rounded transition-colors"
                            title="Delete Asset Type"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-ams-border flex items-center justify-between bg-brand-very-light">
              <h3 className="font-bold text-sm text-ams-text">
                {editingType ? 'Edit Asset Type' : 'Create Asset Type'}
              </h3>
              <button onClick={closeModal} className="p-1 text-ams-muted hover:text-ams-text rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-3 p-2.5 rounded bg-red-50 border border-ams-error/20 text-xs text-ams-error font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ams-text mb-1">
                  Asset Type Name <span className="text-ams-error">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Energy Grid Meters"
                  className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
                />
              </div>

              <div className="pt-3 border-t border-ams-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-brand-deep hover:bg-brand-dark text-white text-xs font-semibold disabled:opacity-60"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-ams-error">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ams-text">Delete Asset Type</h3>
            </div>
            <p className="text-xs text-ams-muted leading-relaxed">
              Are you sure you want to delete classification <strong className="text-ams-text">{deletingType.name}</strong>? Deletion is safely prevented if existing assets reference this asset type.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingType(null)}
                className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingType.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-ams-error hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
