import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { referenceService } from '../../services/referenceService';
import { userService } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../permissions/permissions';
import { X, Package, Check } from 'lucide-react';

const assetSchema = z.object({
  assetCode: z.string().min(1, 'Asset code is required').trim(),
  name: z.string().min(1, 'Equipment name is required').trim(),
  assetTypeId: z.coerce.number().min(1, 'Please select an asset type'),
  assetTag: z.string().optional(),
  serialNumber: z.string().optional(),
  serialNumberFound: z.string().optional(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_REPAIR', 'LOST', 'DAMAGED', 'RETIRED', 'DISPOSED']),
  verificationStatus: z.enum(['NOT_CHECKED', 'FOUND', 'MISSING']),
  costCenter: z.string().optional(),
  assetOwnerId: z.string().optional(),
  custodianId: z.string().optional(),
  locationId: z.string().optional(),
  dateOfChecking: z.string().optional(),
  taggingStatus: z.enum(['T', 'NA', 'TR', '']).optional(),
  gatePassNumber: z.string().optional(),
  makeModel: z.string().optional(),
  remarks: z.string().optional(),
});

export function AssetFormModal({ asset, onClose, onSubmit, isSubmitting }) {
  const { role: currentRole, user: currentUser } = useAuth();
  const isCustodian = currentRole === ROLES.CUSTODIAN;
  const isEditing = Boolean(asset?.id);
  const isUnauthorizedCustodian = isCustodian && isEditing && Number(asset.custodianId) !== Number(currentUser?.id);

  // Load Reference Datasets for Dropdowns
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: referenceService.getAssetTypes,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: referenceService.getLocations,
  });

  const { data: custodians = [] } = useQuery({
    queryKey: ['custodians'],
    queryFn: referenceService.getCustodians,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: () => userService.getUsers({ pageSize: 100 }),
    enabled: !isCustodian,
  });
  const users = usersData?.items || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetCode: '',
      assetTag: '',
      serialNumber: '',
      serialNumberFound: '',
      name: '',
      assetTypeId: 1,
      status: 'AVAILABLE',
      verificationStatus: 'NOT_CHECKED',
      costCenter: '',
      assetOwnerId: '',
      custodianId: '',
      locationId: '',
      dateOfChecking: '',
      taggingStatus: 'T',
      gatePassNumber: '',
      makeModel: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (asset) {
      reset({
        assetCode: asset.assetCode || '',
        assetTag: asset.assetTag || '',
        serialNumber: asset.serialNumber || '',
        serialNumberFound: asset.serialNumberFound || '',
        name: asset.name || '',
        assetTypeId: asset.assetTypeId || 1,
        status: asset.status || 'AVAILABLE',
        verificationStatus: asset.verificationStatus || 'NOT_CHECKED',
        costCenter: asset.costCenter || '',
        assetOwnerId: asset.assetOwnerId ? String(asset.assetOwnerId) : '',
        custodianId: asset.custodianId ? String(asset.custodianId) : '',
        locationId: asset.locationId ? String(asset.locationId) : '',
        dateOfChecking: asset.dateOfChecking || '',
        taggingStatus: asset.taggingStatus || 'T',
        gatePassNumber: asset.gatePassNumber || '',
        makeModel: asset.makeModel || '',
        remarks: asset.remarks || '',
      });
    }
  }, [asset, reset]);

  const onFormSubmit = (data) => {
    if (isUnauthorizedCustodian) return;

    const payload = {
      assetCode: data.assetCode.trim(),
      assetTag: data.assetTag && data.assetTag.trim() ? data.assetTag.trim() : null,
      serialNumber: data.serialNumber && data.serialNumber.trim() ? data.serialNumber.trim() : null,
      serialNumberFound: data.serialNumberFound && data.serialNumberFound.trim() ? data.serialNumberFound.trim() : null,
      name: data.name.trim(),
      assetTypeId: Number(data.assetTypeId),
      status: data.status,
      verificationStatus: data.verificationStatus,
      quantity: 1,
      actualFound: data.verificationStatus === 'FOUND' ? 1 : (data.verificationStatus === 'MISSING' ? 0 : 1),
      costCenter: data.costCenter && data.costCenter.trim() ? data.costCenter.trim() : null,
      assetOwnerId: isCustodian && asset ? (asset.assetOwnerId ? Number(asset.assetOwnerId) : null) : (data.assetOwnerId ? Number(data.assetOwnerId) : null),
      custodianId: isCustodian && asset ? (asset.custodianId ? Number(asset.custodianId) : null) : (data.custodianId ? Number(data.custodianId) : null),
      locationId: data.locationId ? Number(data.locationId) : null,
      dateOfChecking: data.dateOfChecking ? data.dateOfChecking : null,
      taggingStatus: data.taggingStatus ? data.taggingStatus : null,
      gatePassNumber: data.gatePassNumber && data.gatePassNumber.trim() ? data.gatePassNumber.trim() : null,
      makeModel: data.makeModel && data.makeModel.trim() ? data.makeModel.trim() : null,
      remarks: data.remarks && data.remarks.trim() ? data.remarks.trim() : null,
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-ams-border shadow-modal overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ams-border flex items-center justify-between bg-brand-very-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-light text-brand-deep flex items-center justify-center border border-brand-primary/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-ams-text">
                {isEditing ? `Edit Asset: ${asset.assetCode}` : 'Register Physical Asset'}
              </h3>
              <p className="text-xs text-ams-muted mt-0.5">
                {isEditing ? 'Update physical asset identification and status' : 'Enter unique physical asset record into enterprise inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ams-muted hover:text-ams-text rounded-md hover:bg-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {isUnauthorizedCustodian && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-ams-error text-xs">
              <strong>Access Denied:</strong> Custodians are only permitted to edit assets allotted to them. You cannot modify this asset.
            </div>
          )}
          {/* Row 1: Code and Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Asset Code <span className="text-ams-error">*</span>
              </label>
              <input
                type="text"
                {...register('assetCode')}
                placeholder="e.g. AST-1004"
                className={`w-full px-3 py-2 rounded-lg border font-mono ${
                  errors.assetCode ? 'border-ams-error bg-red-50/50' : 'border-ams-border'
                } focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep`}
              />
              {errors.assetCode && <p className="text-ams-error text-[11px] mt-1">{errors.assetCode.message}</p>}
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Equipment Name <span className="text-ams-error">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Smart Grid Meter E350"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.name ? 'border-ams-error bg-red-50/50' : 'border-ams-border'
                } focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep`}
              />
              {errors.name && <p className="text-ams-error text-[11px] mt-1">{errors.name.message}</p>}
            </div>
          </div>

          {/* Row 2: Asset Tag & Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Barcode / Asset Tag
              </label>
              <input
                type="text"
                {...register('assetTag')}
                placeholder="e.g. TAG-LG-0941"
                className="w-full px-3 py-2 rounded-lg border border-ams-border font-mono focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
              />
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Serial Number
              </label>
              <input
                type="text"
                {...register('serialNumber')}
                placeholder="e.g. SN-981247012"
                className="w-full px-3 py-2 rounded-lg border border-ams-border font-mono focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
              />
            </div>
          </div>

          {/* Row 3: Asset Type, Physical Status, Verification Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Asset Type <span className="text-ams-error">*</span>
              </label>
              <select
                {...register('assetTypeId')}
                className={`w-full px-3 py-2 rounded-lg border bg-white ${
                  errors.assetTypeId ? 'border-ams-error bg-red-50/50' : 'border-ams-border'
                } focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep`}
              >
                {assetTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.assetTypeId && <p className="text-ams-error text-[11px] mt-1">{errors.assetTypeId.message}</p>}
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Physical Status <span className="text-ams-error">*</span>
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 rounded-lg border border-ams-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="UNDER_REPAIR">UNDER_REPAIR</option>
                <option value="LOST">LOST</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="RETIRED">RETIRED</option>
                <option value="DISPOSED">DISPOSED</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Verification Status <span className="text-ams-error">*</span>
              </label>
              <select
                {...register('verificationStatus')}
                className="w-full px-3 py-2 rounded-lg border border-ams-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
              >
                <option value="NOT_CHECKED">NOT_CHECKED</option>
                <option value="FOUND">FOUND</option>
                <option value="MISSING">MISSING</option>
              </select>
            </div>
          </div>

          {/* Row 4: Tagging Status, Date of Checking, Gate Pass Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Tagging Status</label>
              <select
                {...register('taggingStatus')}
                className="w-full px-3 py-2 rounded-lg border border-ams-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
              >
                <option value="T">Tagged (T)</option>
                <option value="TR">To Review (TR)</option>
                <option value="NA">Not Applicable (NA)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Date of Checking</label>
              <input
                type="date"
                {...register('dateOfChecking')}
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
              />
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Gate Pass Number</label>
              <input
                type="text"
                {...register('gatePassNumber')}
                placeholder="e.g. GP-2026-09"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
              />
            </div>
          </div>

          {/* Row 5: Owner, Custodian, Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Asset Owner</label>
              <select
                {...register('assetOwnerId')}
                disabled={isCustodian}
                className="w-full px-3 py-2 rounded-lg border border-ams-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.employeeId})
                  </option>
                ))}
              </select>
              {isCustodian && (
                <span className="text-[10px] text-ams-muted mt-0.5 block">
                  Custodians cannot change asset ownership
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Current Custodian</label>
              <select
                {...register('custodianId')}
                disabled={isCustodian || isUnauthorizedCustodian}
                className="w-full px-3 py-2 rounded-lg border border-ams-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {custodians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.employeeId})
                  </option>
                ))}
              </select>
              {isCustodian && (
                <span className="text-[10px] text-ams-muted mt-0.5 block">
                  Custodians cannot change custodian assignment
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Facility / Location</label>
              <select
                {...register('locationId')}
                disabled={isUnauthorizedCustodian}
                className="w-full px-3 py-2 rounded-lg border border-ams-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.floor ? `(Fl ${loc.floor})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Cost Center, Make/Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Cost Center</label>
              <input
                type="text"
                {...register('costCenter')}
                disabled={isUnauthorizedCustodian}
                placeholder="e.g. CC-101"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Make / Model</label>
              <input
                type="text"
                {...register('makeModel')}
                disabled={isUnauthorizedCustodian}
                placeholder="e.g. Landis+Gyr Gridstream Series 5"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 7: Remarks */}
          <div>
            <label className="block font-semibold text-ams-text mb-1">Remarks & Inspection Notes</label>
            <textarea
              rows={2}
              {...register('remarks')}
              disabled={isUnauthorizedCustodian}
              placeholder="Physical condition, deployment notes..."
              className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-ams-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-ams-border text-ams-text hover:bg-ams-bg font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUnauthorizedCustodian}
              className="px-5 py-2 rounded-lg bg-brand-deep hover:bg-brand-dark text-white font-semibold text-xs flex items-center gap-2 shadow-subtle disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Asset'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
