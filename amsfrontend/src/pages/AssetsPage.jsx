import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '../services/assetService';
import { referenceService } from '../services/referenceService';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/common/FeedbackStates';
import { AssetFormModal } from '../components/assets/AssetFormModal';
import { AssetDetailsModal } from '../components/assets/AssetDetailsModal';
import { DeleteAssetDialog } from '../components/assets/DeleteAssetDialog';
import { useAuth } from '../hooks/useAuth';
import { ROLES, hasPermission } from '../permissions/permissions';
import { useToast } from '../components/common/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { 
  Plus, 
  Search, 
  Filter, 
  RotateCcw, 
  Eye, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  X,
  FileSpreadsheet,
  CheckSquare
} from 'lucide-react';

export function AssetsPage() {
  const { role, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const canCreate = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const canDelete = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  // Query states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [taggingStatus, setTaggingStatus] = useState('');
  const [assetTypeId, setAssetTypeId] = useState('');
  const [costCenter, setCostCenter] = useState('');

  // Modals
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const [verifyingAsset, setVerifyingAsset] = useState(null);
  const [verifyStatusChoice, setVerifyStatusChoice] = useState('FOUND');
  const [verifySerialFound, setVerifySerialFound] = useState('');

  // Query key dependencies
  const queryParams = {
    page,
    pageSize,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter || undefined,
    verificationStatus: verificationFilter || undefined,
    taggingStatus: taggingStatus || undefined,
    assetTypeId: assetTypeId ? Number(assetTypeId) : undefined,
    costCenter: costCenter.trim() || undefined,
  };

  // Load Asset Types dynamically
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: referenceService.getAssetTypes,
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await assetService.exportAssets(queryParams);
      toast.success('Assets exported successfully to Excel');
    } catch (err) {
      toast.error(err.message || 'Failed to export assets');
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['assets', queryParams],
    queryFn: () => assetService.getAssets(queryParams),
  });

  const assets = data?.items || [];
  const totalItems = data?.totalItems || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => assetService.createAsset(payload),
    onSuccess: (newAsset) => {
      toast.success(`Asset ${newAsset.assetCode} created successfully`);
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-assets'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create asset');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => assetService.updateAsset(id, payload),
    onSuccess: (updated) => {
      toast.success(`Asset ${updated.assetCode} updated successfully`);
      setEditingAsset(null);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-assets'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update asset');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, payload }) => assetService.updateVerification(id, payload),
    onSuccess: (updated) => {
      toast.success(`Verification status updated to ${updated.verificationStatus}`);
      setVerifyingAsset(null);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-assets'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update verification status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => assetService.deleteAsset(id),
    onSuccess: () => {
      toast.success('Asset deleted successfully');
      setDeletingAsset(null);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-assets'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete asset');
    },
  });

  // Filter reset helper
  const handleResetFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setVerificationFilter('');
    setTaggingStatus('');
    setAssetTypeId('');
    setCostCenter('');
    setPage(1);
  };

  const activeFilterCount = [
    Boolean(debouncedSearch),
    Boolean(statusFilter),
    Boolean(verificationFilter),
    Boolean(taggingStatus),
    Boolean(assetTypeId),
    Boolean(costCenter),
  ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Physical Assets"
        description="Every record represents an independent physical asset. Track tags, serial numbers, and audit verification."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-ams-border hover:bg-ams-bg rounded-lg text-xs font-semibold text-ams-text shadow-subtle transition-smooth disabled:opacity-60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-brand-deep" />
              <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
            </button>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-ams-border hover:bg-ams-bg rounded-lg text-xs font-semibold text-ams-text shadow-subtle transition-smooth"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand-deep ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {canCreate && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-deep hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-subtle transition-smooth"
              >
                <Plus className="w-4 h-4" />
                <span>Add Physical Asset</span>
              </button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-ams-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search code, barcode tag, serial, equipment..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep transition-smooth"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-ams-muted hover:text-ams-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Physical Status */}
          <div className="lg:col-span-2">
            <SearchableSelect
              size="sm"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Physical Status' },
                { value: 'AVAILABLE', label: 'AVAILABLE' },
                { value: 'ASSIGNED', label: 'ASSIGNED' },
                { value: 'UNDER_REPAIR', label: 'UNDER_REPAIR' },
                { value: 'LOST', label: 'LOST' },
                { value: 'DAMAGED', label: 'DAMAGED' },
                { value: 'RETIRED', label: 'RETIRED' },
                { value: 'DISPOSED', label: 'DISPOSED' },
              ]}
              placeholder="All Physical Status"
            />
          </div>

          {/* Verification Status */}
          <div className="lg:col-span-2">
            <SearchableSelect
              size="sm"
              value={verificationFilter}
              onChange={(val) => {
                setVerificationFilter(val);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Verification' },
                { value: 'FOUND', label: 'FOUND' },
                { value: 'MISSING', label: 'MISSING' },
                { value: 'NOT_CHECKED', label: 'NOT_CHECKED' },
              ]}
              placeholder="All Verification"
            />
          </div>

          {/* Asset Type */}
          <div className="lg:col-span-2">
            <SearchableSelect
              size="sm"
              value={assetTypeId}
              onChange={(val) => {
                setAssetTypeId(val);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Types' },
                ...assetTypes.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                })),
              ]}
              placeholder="All Types"
            />
          </div>

          {/* Tagging Status */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <div className="flex-1">
              <SearchableSelect
                size="sm"
                value={taggingStatus}
                onChange={(val) => {
                  setTaggingStatus(val);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'Tag Status' },
                  { value: 'T', label: 'T — Tagged' },
                  { value: 'TR', label: 'TR — To Review' },
                  { value: 'NA', label: 'NA — Not Applicable' },
                ]}
                placeholder="Tag Status"
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="p-2 text-ams-muted hover:text-brand-deep bg-ams-bg hover:bg-brand-very-light rounded-lg border border-ams-border transition-smooth shrink-0"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Asset Table Container */}
      <div className="bg-white rounded-xl border border-ams-border shadow-subtle overflow-hidden">
        {isLoading ? (
          <LoadingState message="Fetching physical assets from database..." />
        ) : isError ? (
          <ErrorState message={error?.message} onRetry={() => refetch()} />
        ) : assets.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No assets match your criteria"
              description="Try adjusting your search terms or clearing active filters to view physical equipment."
              action={
                activeFilterCount > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 bg-brand-deep text-white rounded-lg text-xs font-semibold"
                  >
                    Reset Filters
                  </button>
                ) : canCreate ? (
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-3.5 py-1.5 bg-brand-deep text-white rounded-lg text-xs font-semibold"
                  >
                    Add First Asset
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ams-bg text-ams-muted font-semibold border-b border-ams-border select-none">
                  <tr>
                    <th className="py-3 px-3.5">Asset Code</th>
                    <th className="py-3 px-3.5">Asset Tag</th>
                    <th className="py-3 px-3.5">Serial Number</th>
                    <th className="py-3 px-3.5">Equipment Name</th>
                    <th className="py-3 px-3.5">Physical Status</th>
                    <th className="py-3 px-3.5">Verification</th>
                    <th className="py-3 px-3.5">Tagging</th>
                    <th className="py-3 px-3.5">Cost Center</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ams-border">
                  {assets.map((item) => {
                    const isAssignedCustodian = role === ROLES.CUSTODIAN && Number(item.custodianId) === Number(user?.id);
                    const canEditItem = (role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) || isAssignedCustodian;

                    return (
                    <tr key={item.id} className="hover:bg-ams-bg/50 transition-colors group">
                      <td className="py-3 px-3.5 font-mono font-semibold text-brand-deep">
                        {item.assetCode}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-ams-text">
                        {item.assetTag || <span className="text-gray-400 italic">None</span>}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-ams-muted">
                        {item.serialNumber || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-ams-text max-w-[200px] truncate" title={item.name}>
                        {item.name}
                      </td>
                      <td className="py-3 px-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-3.5">
                        <StatusBadge status={item.verificationStatus} />
                      </td>
                      <td className="py-3 px-3.5">
                        <StatusBadge status={item.taggingStatus} />
                      </td>
                      <td className="py-3 px-3.5 text-ams-muted">
                        {item.costCenter || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Inspect details */}
                          <button
                            onClick={() => setSelectedAssetForDetails(item)}
                            className="p-1 text-ams-muted hover:text-brand-deep hover:bg-brand-very-light rounded transition-colors"
                            title="View complete details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick audit verify */}
                          {canEditItem && (
                            <button
                              onClick={() => {
                                setVerifyingAsset(item);
                                setVerifyStatusChoice(item.verificationStatus === 'FOUND' ? 'FOUND' : 'FOUND');
                                setVerifySerialFound(item.serialNumberFound || item.serialNumber || '');
                              }}
                              className="p-1 text-ams-muted hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Audit verification"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit (role-guarded) */}
                          {canEditItem && (
                            <button
                              onClick={() => setEditingAsset(item)}
                              className="p-1 text-ams-muted hover:text-brand-deep hover:bg-brand-very-light rounded transition-colors"
                              title="Edit asset metadata"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete (role-guarded) */}
                          {canDelete && (
                            <button
                              onClick={() => setDeletingAsset(item)}
                              className="p-1 text-ams-muted hover:text-ams-error hover:bg-red-50 rounded transition-colors"
                              title="Delete asset permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            <div className="p-3.5 border-t border-ams-border bg-ams-bg/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ams-muted">
              <div className="flex items-center gap-2">
                <span>Showing page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
                <span>&bull;</span>
                <span>Total records: <strong>{totalItems}</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Page Size:</span>
                  <div className="w-20">
                    <SearchableSelect
                      size="sm"
                      value={String(pageSize)}
                      onChange={(val) => {
                        setPageSize(Number(val));
                        setPage(1);
                      }}
                      options={[
                        { value: '10', label: '10' },
                        { value: '20', label: '20' },
                        { value: '50', label: '50' },
                        { value: '100', label: '100' },
                      ]}
                      allowClear={false}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded border border-ams-border bg-white hover:bg-ams-bg disabled:opacity-40 disabled:cursor-not-allowed text-ams-text"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded border border-ams-border bg-white hover:bg-ams-bg disabled:opacity-40 disabled:cursor-not-allowed text-ams-text"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedAssetForDetails && (
        <AssetDetailsModal
          asset={selectedAssetForDetails}
          onClose={() => setSelectedAssetForDetails(null)}
        />
      )}

      {/* Quick Verification Modal */}
      {verifyingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-ams-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-brand-deep" />
                <h3 className="text-sm font-bold text-ams-text">Physical Verification Audit</h3>
              </div>
              <button onClick={() => setVerifyingAsset(null)} className="text-ams-muted hover:text-ams-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <span className="text-ams-muted block text-[11px]">Asset Code & Name</span>
                <span className="font-semibold text-ams-text font-mono">[{verifyingAsset.assetCode}] {verifyingAsset.name}</span>
              </div>

              <div>
                <label className="block font-semibold text-ams-text mb-1">Audit Verification Status</label>
                <SearchableSelect
                  value={verifyStatusChoice}
                  onChange={(val) => setVerifyStatusChoice(val)}
                  options={[
                    { value: 'FOUND', label: 'FOUND — Physically Confirmed' },
                    { value: 'MISSING', label: 'MISSING — Not Located' },
                    { value: 'NOT_CHECKED', label: 'NOT_CHECKED — Pending Audit' },
                  ]}
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block font-semibold text-ams-text mb-1">Serial Number Found During Check</label>
                <input
                  type="text"
                  value={verifySerialFound}
                  onChange={(e) => setVerifySerialFound(e.target.value)}
                  placeholder="e.g. SN-091823"
                  className="w-full px-3 py-2 rounded-lg border border-ams-border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-deep/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-ams-border">
              <button
                onClick={() => setVerifyingAsset(null)}
                className="px-3.5 py-1.5 rounded-lg border border-ams-border text-xs text-ams-text hover:bg-ams-bg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  verifyMutation.mutate({
                    id: verifyingAsset.id,
                    payload: {
                      verificationStatus: verifyStatusChoice,
                      serialNumberFound: verifySerialFound.trim() || null,
                      dateOfChecking: new Date().toISOString().split('T')[0],
                    },
                  });
                }}
                disabled={verifyMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-brand-deep hover:bg-brand-dark text-white font-semibold text-xs disabled:opacity-60"
              >
                {verifyMutation.isPending ? 'Updating...' : 'Save Audit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <AssetFormModal
          onClose={() => setIsCreateOpen(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingAsset && (
        <AssetFormModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSubmit={(payload) => updateMutation.mutate({ id: editingAsset.id, payload })}
          isSubmitting={updateMutation.isPending}
        />
      )}

      {/* Delete Dialog */}
      {deletingAsset && (
        <DeleteAssetDialog
          asset={deletingAsset}
          onCancel={() => setDeletingAsset(null)}
          onConfirm={(id) => deleteMutation.mutate(id)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
