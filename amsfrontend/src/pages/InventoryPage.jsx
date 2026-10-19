import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '../services/assetService';
import { referenceService } from '../services/referenceService';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/common/FeedbackStates';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../hooks/useAuth';
import { ROLES, hasPermission } from '../permissions/permissions';
import { AssetFormModal } from '../components/assets/AssetFormModal';
import { 
  Boxes, 
  Search, 
  Filter, 
  RotateCcw, 
  FileSpreadsheet, 
  Eye, 
  Edit3,
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  CheckCircle2, 
  Clock,
  Tag, 
  Building2, 
  MapPin, 
  Calendar,
  X,
  Package,
  Shield
} from 'lucide-react';

export function InventoryPage() {
  const { role, user } = useAuth();
  const isAdminOrSuperAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editingAsset, setEditingAsset] = useState(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => assetService.updateAsset(id, payload),
    onSuccess: (updated) => {
      toast.success(`Asset ${updated.assetCode} updated successfully`);
      setEditingAsset(null);
      queryClient.invalidateQueries({ queryKey: ['inventory-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update asset');
    },
  });

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);

  const [assetTypeId, setAssetTypeId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [taggingStatus, setTaggingStatus] = useState('');
  const [floor, setFloor] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [dateOfChecking, setDateOfChecking] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sorting state
  const [sortBy, setSortBy] = useState('asset_code');
  const [sortDir, setSortDir] = useState('ASC');

  // Selected asset for modal view
  const [inspectingAsset, setInspectingAsset] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load Reference Datasets for Filter Dropdowns
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: referenceService.getAssetTypes,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: referenceService.getDepartments,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: referenceService.getLocations,
  });

  // Current query params
  const queryParams = {
    page,
    pageSize,
    search: debouncedSearch.trim() || undefined,
    assetTypeId: assetTypeId ? Number(assetTypeId) : undefined,
    status: statusFilter || undefined,
    verificationStatus: verificationFilter || undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
    locationId: locationId ? Number(locationId) : undefined,
    costCenter: costCenter.trim() || undefined,
    taggingStatus: taggingStatus || undefined,
    floor: floor.trim() || undefined,
    roomLocation: roomLocation.trim() || undefined,
    dateOfChecking: dateOfChecking || undefined,
    sortBy,
    sortDir,
  };

  // Main Asset Query
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['inventory-assets', queryParams],
    queryFn: () => assetService.getAssets(queryParams),
  });

  const assets = data?.items || [];
  const totalItems = data?.totalItems || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Compute metrics from real dataset
  const verifiedCount = assets.filter((a) => a.verificationStatus === 'FOUND').length;
  const pendingCount = assets.filter((a) => a.verificationStatus !== 'FOUND').length;

  const handleResetFilters = () => {
    setSearchInput('');
    setAssetTypeId('');
    setStatusFilter('');
    setVerificationFilter('');
    setDepartmentId('');
    setLocationId('');
    setCostCenter('');
    setTaggingStatus('');
    setFloor('');
    setRoomLocation('');
    setDateOfChecking('');
    setPage(1);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await assetService.exportAssets(queryParams);
      toast.success('Inventory Excel workbook downloaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to export inventory to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || assetTypeId || statusFilter || verificationFilter || departmentId || locationId || costCenter || taggingStatus || floor || roomLocation || dateOfChecking
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-ams-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-light border border-brand-primary/30 flex items-center justify-center text-brand-deep">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ams-text tracking-tight">Enterprise Inventory</h1>
              <p className="text-xs text-ams-muted mt-0.5">
                Every record represents an independent physical asset. Search, filter, inspect, and export equipment.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action: Excel Export */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-deep hover:bg-brand-dark text-white text-xs font-semibold shadow-subtle transition-smooth disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-deep"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-primary" />
            <span>{isExporting ? 'Generating Excel...' : 'Export to Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards - Only visible for Admin and Super Admin */}
      {isAdminOrSuperAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ams-muted">Matching Physical Assets</span>
              <Package className="w-4 h-4 text-brand-deep" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ams-text">{totalItems}</span>
              <span className="text-xs text-ams-muted">independent records</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ams-muted">Physically Confirmed (Page)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">{verifiedCount}</span>
              <span className="text-xs text-ams-muted">FOUND status</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ams-muted">Pending / Not Checked (Page)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">{pendingCount}</span>
              <span className="text-xs text-ams-muted">require audit check</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-white p-5 rounded-xl border border-ams-border shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-ams-border pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-deep" />
            <span className="text-xs font-bold text-ams-text uppercase tracking-wider">Search & Filters</span>
            {hasActiveFilters && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-light text-brand-deep font-semibold">
                Filters Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-ams-muted hover:text-ams-error flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Free Text Search */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Search Code, Tag, Serial, Name
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ams-muted absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. AST-1001 or TAG-LG"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep focus:border-brand-deep"
              />
            </div>
          </div>

          {/* Physical Status */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Physical Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep bg-white"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="UNDER_REPAIR">UNDER_REPAIR</option>
              <option value="LOST">LOST</option>
              <option value="DAMAGED">DAMAGED</option>
              <option value="RETIRED">RETIRED</option>
              <option value="DISPOSED">DISPOSED</option>
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Verification Status
            </label>
            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep bg-white"
            >
              <option value="">All Verification</option>
              <option value="FOUND">FOUND</option>
              <option value="MISSING">MISSING</option>
              <option value="NOT_CHECKED">NOT_CHECKED</option>
            </select>
          </div>

          {/* Asset Type */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Asset Type
            </label>
            <select
              value={assetTypeId}
              onChange={(e) => {
                setAssetTypeId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep bg-white"
            >
              <option value="">All Asset Types</option>
              {assetTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Location
            </label>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep bg-white"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.floor ? `(Floor ${loc.floor})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Center */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Cost Center
            </label>
            <input
              type="text"
              value={costCenter}
              onChange={(e) => {
                setCostCenter(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. CC-101"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          {/* Tagging Status */}
          <div>
            <label className="block text-[11px] font-semibold text-ams-muted mb-1">
              Tagging Status
            </label>
            <select
              value={taggingStatus}
              onChange={(e) => {
                setTaggingStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep bg-white"
            >
              <option value="">All Tagging Statuses</option>
              <option value="T">Tagged (T)</option>
              <option value="TR">To Review (TR)</option>
              <option value="NA">Not Applicable (NA)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table Section */}
      <div className="bg-white rounded-xl border border-ams-border shadow-subtle overflow-hidden">
        {/* Table Top Status Bar */}
        <div className="px-5 py-3 border-b border-ams-border flex items-center justify-between bg-ams-bg/30">
          <div className="text-xs text-ams-muted">
            Showing <span className="font-semibold text-ams-text">{assets.length}</span> of{' '}
            <span className="font-semibold text-ams-text">{totalItems}</span> matching physical assets
            {isFetching && <span className="ml-2 text-brand-deep animate-pulse">(Updating...)</span>}
          </div>

          {/* Page size dropdown */}
          <div className="flex items-center gap-2 text-xs text-ams-muted">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-xs border border-ams-border rounded bg-white focus:outline-none"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Content State: Loading, Error, Empty, or Table */}
        {isLoading ? (
          <div className="p-8">
            <LoadingState message="Loading inventory from database..." />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Failed to load inventory"
              message={error?.message || 'Server error occurred'}
            />
          </div>
        ) : assets.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No assets found"
              message="No equipment matches the specified filter criteria. Try adjusting your query or resetting filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr>
                  <th>Asset Code</th>
                  <th>Barcode Tag</th>
                  <th>Serial Number</th>
                  <th>Description / Name</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Cost Center</th>
                  <th>Make / Model</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ams-border">
                {assets.map((asset) => {
                  const isAssignedCustodian = role === ROLES.CUSTODIAN && Number(asset.custodianId) === Number(user?.id);
                  const canEditItem = (role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) || isAssignedCustodian;

                  return (
                  <tr key={asset.id} className="hover:bg-brand-very-light/70 transition-colors">
                    <td className="font-mono font-semibold text-brand-deep">
                      {asset.assetCode}
                    </td>
                    <td className="font-mono text-ams-text">
                      {asset.assetTag || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="font-mono text-ams-muted">
                      {asset.serialNumber || <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td>
                      <div className="font-medium text-ams-text">{asset.name}</div>
                      {asset.remarks && (
                        <div className="text-[11px] text-ams-muted truncate max-w-xs">{asset.remarks}</div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={asset.status} />
                    </td>
                    <td>
                      <StatusBadge status={asset.verificationStatus} />
                    </td>
                    <td>
                      <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-ams-text">
                        {asset.costCenter || 'N/A'}
                      </span>
                    </td>
                    <td className="text-xs text-ams-muted">
                      {asset.makeModel || '—'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingAsset(asset)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-deep bg-brand-light hover:bg-brand-primary/20 rounded border border-brand-primary/30 transition-smooth"
                          title="View Asset Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                        {canEditItem && (
                          <button
                            onClick={() => setEditingAsset(asset)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-smooth"
                            title="Edit Asset Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
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
                className="p-1.5 rounded border border-ams-border hover:bg-ams-bg disabled:opacity-40 text-ams-muted hover:text-ams-text transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-ams-border hover:bg-ams-bg disabled:opacity-40 text-ams-muted hover:text-ams-text transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Inspection Modal */}
      {inspectingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-ams-border flex items-center justify-between bg-brand-very-light">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-deep" />
                <h3 className="text-base font-bold text-ams-text">Physical Asset Inspection</h3>
              </div>
              <button
                onClick={() => setInspectingAsset(null)}
                className="p-1 text-ams-muted hover:text-ams-text rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-ams-border">
                <div>
                  <span className="text-ams-muted block text-[11px]">Asset Code</span>
                  <span className="font-mono font-bold text-sm text-brand-deep">
                    {inspectingAsset.assetCode}
                  </span>
                </div>
                <div>
                  <span className="text-ams-muted block text-[11px]">Barcode / Asset Tag</span>
                  <span className="font-mono font-semibold text-sm text-ams-text">
                    {inspectingAsset.assetTag || 'Not tagged'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-ams-muted block text-[11px]">Equipment Name</span>
                <span className="font-semibold text-sm text-ams-text">{inspectingAsset.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-ams-muted block text-[11px]">Serial Number</span>
                  <span className="font-mono font-medium text-ams-text">{inspectingAsset.serialNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-ams-muted block text-[11px]">Physical Status</span>
                  <div className="mt-1">
                    <StatusBadge status={inspectingAsset.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-ams-muted block text-[11px]">Verification Status</span>
                  <div className="mt-1">
                    <StatusBadge status={inspectingAsset.verificationStatus} />
                  </div>
                </div>
                <div>
                  <span className="text-ams-muted block text-[11px]">Tagging Status</span>
                  <div className="mt-1">
                    <StatusBadge status={inspectingAsset.taggingStatus} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-ams-muted block text-[11px]">Cost Center</span>
                  <span className="font-mono text-ams-text">{inspectingAsset.costCenter || '—'}</span>
                </div>
                <div>
                  <span className="text-ams-muted block text-[11px]">Make / Model</span>
                  <span className="text-ams-text">{inspectingAsset.makeModel || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-ams-muted block text-[11px]">Date of Checking</span>
                  <span className="text-ams-text">{inspectingAsset.dateOfChecking || '—'}</span>
                </div>
                <div>
                  <span className="text-ams-muted block text-[11px]">Gate Pass</span>
                  <span className="text-ams-text">{inspectingAsset.gatePassNumber || '—'}</span>
                </div>
              </div>

              {inspectingAsset.serialNumberFound && (
                <div className="p-2.5 rounded bg-brand-very-light border border-brand-primary/20">
                  <span className="text-ams-muted block text-[11px]">Serial Number Audited / Found:</span>
                  <span className="font-mono font-semibold text-brand-deep">{inspectingAsset.serialNumberFound}</span>
                </div>
              )}

              {inspectingAsset.remarks && (
                <div className="pt-2 border-t border-ams-border">
                  <span className="text-ams-muted block text-[11px]">Remarks</span>
                  <p className="mt-1 text-ams-text bg-ams-bg p-2 rounded border border-ams-border">
                    {inspectingAsset.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-ams-border bg-ams-bg/40 flex justify-end">
              <button
                onClick={() => setInspectingAsset(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white border border-ams-border hover:bg-ams-bg text-ams-text"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal for Authorized Roles (Custodian, Admin, Super Admin) */}
      {editingAsset && (
        <AssetFormModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSubmit={(payload) => updateMutation.mutate({ id: editingAsset.id, payload })}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </div>
  );
}
