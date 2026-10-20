import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referenceService } from '../../services/referenceService';
import { userService } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../permissions/permissions';
import { X, Package, Check, MapPin, Plus, RotateCcw, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { useToast } from '../common/Toast';

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

const FLOOR_OPTIONS = [
  { value: 'Basement', label: 'Basement' },
  { value: 'Ground Floor', label: 'Ground Floor' },
  { value: '1', label: '1st Floor (1)' },
  { value: '2', label: '2nd Floor (2)' },
  { value: '3', label: '3rd Floor (3)' },
  { value: '4', label: '4th Floor (4)' },
  { value: '5', label: '5th Floor (5)' },
  { value: '6', label: '6th Floor (6)' },
];

const PHYSICAL_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'AVAILABLE — In storage / ready' },
  { value: 'ASSIGNED', label: 'ASSIGNED — In active use' },
  { value: 'UNDER_REPAIR', label: 'UNDER_REPAIR — Service center' },
  { value: 'LOST', label: 'LOST — Cannot be located' },
  { value: 'DAMAGED', label: 'DAMAGED — Broken / defective' },
  { value: 'RETIRED', label: 'RETIRED — End of lifecycle' },
  { value: 'DISPOSED', label: 'DISPOSED — Recycled / scrapped' },
];

const VERIFICATION_STATUS_OPTIONS = [
  { value: 'NOT_CHECKED', label: 'NOT_CHECKED — Pending verification' },
  { value: 'FOUND', label: 'FOUND — Physically verified' },
  { value: 'MISSING', label: 'MISSING — Not at registered location' },
];

const TAGGING_STATUS_OPTIONS = [
  { value: 'T', label: 'T — Tagged & Legible' },
  { value: 'TR', label: 'TR — To Review / Re-tag' },
  { value: 'NA', label: 'NA — Not Applicable' },
];

export function AssetFormModal({ asset, onClose, onSubmit, isSubmitting }) {
  const { role: currentRole, user: currentUser, updateUserProfile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isCustodian = currentRole === ROLES.CUSTODIAN;
  const isEditing = Boolean(asset?.id);
  const isUnauthorizedCustodian = isCustodian && isEditing && Number(asset.custodianId) !== Number(currentUser?.id);

  // Location Details mode: 'select' (Option A) vs 'new' (Option B)
  const [locationMode, setLocationMode] = useState('select');

  // Inline New Location state
  const [newLocDescription, setNewLocDescription] = useState('');
  const [newLocSeatNo, setNewLocSeatNo] = useState('');
  const [newLocFloorNo, setNewLocFloorNo] = useState('');
  const [inlineLocError, setInlineLocError] = useState('');
  const [isCreatingInlineLoc, setIsCreatingInlineLoc] = useState(false);

  // Authenticated Admin Profile City & Country
  const adminCity = currentUser?.city ? currentUser.city.trim() : '';
  const adminCountry = currentUser?.country ? currentUser.country.trim() : '';
  const isProfileMissingLocation = !adminCity || !adminCountry;

  // Quick Profile Location Edit State
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileCityInput, setProfileCityInput] = useState(adminCity || 'Noida');
  const [profileCountryInput, setProfileCountryInput] = useState(adminCountry || 'India');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (currentUser?.city) setProfileCityInput(currentUser.city);
    if (currentUser?.country) setProfileCountryInput(currentUser.country);
  }, [currentUser]);

  // Load Reference Datasets for Dropdowns
  const { data: assetTypes = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ['asset-types'],
    queryFn: referenceService.getAssetTypes,
  });

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => referenceService.getLocations(),
  });

  const { data: custodians = [], isLoading: isLoadingCustodians } = useQuery({
    queryKey: ['custodians'],
    queryFn: referenceService.getCustodians,
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: () => userService.getUsers({ pageSize: 100 }),
    enabled: !isCustodian,
  });
  const users = usersData?.items || [];

  // Merge all users from custodians API and users API to ensure all active users
  // across all roles (General, Custodian, Admin, Super Admin) can be assigned as Custodian or Owner
  const allEligibleUsers = React.useMemo(() => {
    const map = new Map();
    custodians.forEach((c) => {
      if (c && c.id) map.set(Number(c.id), c);
    });
    users.forEach((u) => {
      if (u && u.id && !map.has(Number(u.id))) map.set(Number(u.id), u);
    });
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [custodians, users]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
      setLocationMode('select');
    }
  }, [asset, reset]);

  // Selected location details for supplementary info
  const selectedLocationId = watch('locationId');
  const selectedLocation = locations.find((l) => String(l.id) === String(selectedLocationId));

  // Handler to explicitly save a location inline first
  const handleSaveLocationInline = async () => {
    setInlineLocError('');

    if (!newLocDescription.trim()) {
      setInlineLocError('Location description is required.');
      return;
    }

    if (isProfileMissingLocation) {
      setInlineLocError('Admin profile is missing City or Country. Please update your profile before creating a location.');
      return;
    }

    setIsCreatingInlineLoc(true);
    try {
      const created = await referenceService.createLocation({
        description: newLocDescription.trim(),
        seatNo: newLocSeatNo.trim() || null,
        floorNo: newLocFloorNo.trim() || null,
      });

      toast.success(`Location created and selected: ${created.description}`);
      queryClient.invalidateQueries({ queryKey: ['locations'] });

      // Automatically select the newly created location
      setValue('locationId', String(created.id), { shouldValidate: true });

      // Reset inline form and switch back to select mode with newly created location selected
      setNewLocDescription('');
      setNewLocSeatNo('');
      setNewLocFloorNo('');
      setLocationMode('select');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to create location';
      setInlineLocError(msg);
      toast.error(msg);
    } finally {
      setIsCreatingInlineLoc(false);
    }
  };

  const onFormSubmit = (data) => {
    if (isUnauthorizedCustodian) return;

    // If user is currently in "Add New Location" mode and hasn't clicked "Save & Select Location" yet
    let newLocationPayload = null;
    if (locationMode === 'new') {
      if (!newLocDescription.trim()) {
        setInlineLocError('Location description is required when creating a new location.');
        return;
      }
      if (isProfileMissingLocation) {
        setInlineLocError('Admin profile is missing City or Country. Please update your profile before creating a location.');
        return;
      }
      newLocationPayload = {
        description: newLocDescription.trim(),
        seatNo: newLocSeatNo.trim() || null,
        floorNo: newLocFloorNo.trim() || null,
      };
    }

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
      locationId: locationMode === 'new' ? null : (data.locationId ? Number(data.locationId) : null),
      dateOfChecking: data.dateOfChecking ? data.dateOfChecking : null,
      taggingStatus: data.taggingStatus ? data.taggingStatus : null,
      gatePassNumber: data.gatePassNumber && data.gatePassNumber.trim() ? data.gatePassNumber.trim() : null,
      makeModel: data.makeModel && data.makeModel.trim() ? data.makeModel.trim() : null,
      remarks: data.remarks && data.remarks.trim() ? data.remarks.trim() : null,
      newLocation: newLocationPayload,
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-ams-error text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span><strong>Access Denied:</strong> Custodians are only permitted to edit assets allotted to them. You cannot modify this asset.</span>
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
              <SearchableSelect
                value={watch('assetTypeId')}
                onChange={(val) => setValue('assetTypeId', val ? Number(val) : '', { shouldValidate: true })}
                options={assetTypes.map((type) => ({
                  value: type.id,
                  label: type.name,
                }))}
                placeholder="Type to search type..."
                error={Boolean(errors.assetTypeId)}
                isLoading={isLoadingTypes}
              />
              {errors.assetTypeId && <p className="text-ams-error text-[11px] mt-1">{errors.assetTypeId.message}</p>}
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Physical Status <span className="text-ams-error">*</span>
              </label>
              <SearchableSelect
                value={watch('status')}
                onChange={(val) => setValue('status', val, { shouldValidate: true })}
                options={PHYSICAL_STATUS_OPTIONS}
                placeholder="Type to filter status..."
                allowClear={false}
              />
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">
                Verification Status <span className="text-ams-error">*</span>
              </label>
              <SearchableSelect
                value={watch('verificationStatus')}
                onChange={(val) => setValue('verificationStatus', val, { shouldValidate: true })}
                options={VERIFICATION_STATUS_OPTIONS}
                placeholder="Type to filter..."
                allowClear={false}
              />
            </div>
          </div>

          {/* Row 4: Tagging Status, Date of Checking, Gate Pass Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Tagging Status</label>
              <SearchableSelect
                value={watch('taggingStatus')}
                onChange={(val) => setValue('taggingStatus', val, { shouldValidate: true })}
                options={TAGGING_STATUS_OPTIONS}
                placeholder="Select / type tagging..."
                allowClear={false}
              />
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Date of Checking</label>
              <input
                type="date"
                {...register('dateOfChecking')}
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep bg-white"
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

          {/* Row 5: Owner & Custodian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Asset Owner</label>
              <SearchableSelect
                value={watch('assetOwnerId')}
                onChange={(val) => setValue('assetOwnerId', val, { shouldValidate: true })}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...allEligibleUsers.map((u) => ({
                    value: String(u.id),
                    label: u.name,
                    subLabel: [u.employeeId ? `(${u.employeeId})` : null, u.role].filter(Boolean).join(' • '),
                  })),
                ]}
                placeholder="Unassigned (Type name or ID...)"
                disabled={isCustodian}
                error={Boolean(errors.assetOwnerId)}
                isLoading={isLoadingUsers || isLoadingCustodians}
              />
              {isCustodian && (
                <span className="text-[10px] text-ams-muted mt-0.5 block">
                  Custodians cannot change asset ownership
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-ams-text mb-1">Current Custodian</label>
              <SearchableSelect
                value={watch('custodianId')}
                onChange={(val) => setValue('custodianId', val, { shouldValidate: true })}
                options={[
                  { value: '', label: 'Unassigned (No custodian assigned)' },
                  ...allEligibleUsers.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                    subLabel: [c.employeeId ? `(${c.employeeId})` : null, c.role].filter(Boolean).join(' • '),
                  })),
                ]}
                placeholder="Unassigned (Type name or ID...)"
                disabled={isCustodian || isUnauthorizedCustodian}
                error={Boolean(errors.custodianId)}
                isLoading={isLoadingCustodians || isLoadingUsers}
              />
              {isCustodian && (
                <span className="text-[10px] text-ams-muted mt-0.5 block">
                  Custodians cannot change custodian assignment
                </span>
              )}
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
              placeholder="Physical condition, deployment notes, audit observations..."
              className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* ========================================================================= */}
          {/* LOCATION DETAILS SECTION (Distinct, clearly separated before action buttons) */}
          {/* ========================================================================= */}
          <div className="border border-brand-primary/25 rounded-xl bg-gradient-to-b from-brand-very-light/60 to-white p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ams-border/70 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-light text-brand-deep flex items-center justify-center border border-brand-primary/30">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-ams-text uppercase tracking-wider flex items-center gap-2">
                    <span>Location Details</span>
                    <span className="text-[10px] font-semibold text-brand-deep bg-brand-light px-2 py-0.5 rounded-full lowercase">
                      {locationMode === 'new' ? 'Option B: New Location' : 'Option A: Existing'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-ams-muted">
                    {locationMode === 'new'
                      ? 'Define a new physical facility or lab inline; City and Country are populated from your profile.'
                      : 'Select a registered building, floor, and seat, or register a new one inline.'}
                  </p>
                </div>
              </div>

              {!isCustodian && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {locationMode === 'select' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationMode('new');
                        setInlineLocError('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-light hover:bg-brand-primary/20 text-brand-deep font-semibold text-xs border border-brand-primary/30 transition-smooth"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Location</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationMode('select');
                        setInlineLocError('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-ams-border bg-white text-ams-text hover:bg-ams-bg font-semibold text-xs transition-smooth"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-ams-muted" />
                      <span>Select Existing Location</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Option A: Select Existing Location */}
            {locationMode === 'select' && (
              <div className="space-y-2">
                <div>
                  <label className="block font-semibold text-ams-text mb-1">
                    Existing Facility / Location
                  </label>
                  <SearchableSelect
                    value={watch('locationId')}
                    onChange={(val) => setValue('locationId', val, { shouldValidate: true })}
                    options={[
                      { value: '', label: 'Unassigned (No location attached)' },
                      ...locations.map((loc) => {
                        const parts = [loc.description];
                        if (loc.seatNo) parts.push(`Seat ${loc.seatNo}`);
                        if (loc.floorNo) parts.push(`Floor ${loc.floorNo}`);
                        const label = parts.join(' — ');

                        const subParts = [];
                        if (loc.city) subParts.push(loc.city);
                        if (loc.country) subParts.push(loc.country);
                        const subLabel = subParts.length > 0 ? `(${subParts.join(', ')})` : '';

                        return {
                          value: String(loc.id),
                          label,
                          subLabel,
                        };
                      }),
                    ]}
                    placeholder="Type to search: Description — Seat No. — Floor No."
                    disabled={isUnauthorizedCustodian}
                    isLoading={isLoadingLocations}
                    error={Boolean(errors.locationId)}
                  />
                </div>

                {/* Supplementary Information for selected location */}
                {selectedLocation && (
                  <div className="p-2.5 rounded-lg bg-white border border-brand-primary/20 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ams-muted animate-in fade-in duration-150">
                    <span className="font-semibold text-brand-deep flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Selected: {selectedLocation.description}</span>
                    </span>
                    {selectedLocation.seatNo && (
                      <span>Seat: <strong className="text-ams-text">{selectedLocation.seatNo}</strong></span>
                    )}
                    {selectedLocation.floorNo && (
                      <span>Floor: <strong className="text-ams-text">{selectedLocation.floorNo}</strong></span>
                    )}
                    <span>
                      City: <strong className="text-ams-text">{selectedLocation.city || '—'}</strong>
                    </span>
                    <span>
                      Country: <strong className="text-ams-text">{selectedLocation.country || '—'}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Option B: Add New Location (Inline Fields) */}
            {locationMode === 'new' && (
              <div className="space-y-3 pt-1">
                {/* Profile validation alert if city or country missing */}
                {isProfileMissingLocation && (
                  <div className="p-3.5 bg-red-50 border border-ams-error/30 rounded-lg text-ams-error text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-semibold">Missing Profile Location</strong>
                      <span>
                        Your administrator profile is missing City or Country. Please set your location before creating new locations.
                      </span>
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileCityInput(adminCity || 'Noida');
                            setProfileCountryInput(adminCountry || 'India');
                            setIsProfileEditOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ams-error hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Update Admin Profile Location</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {inlineLocError && (
                  <div className="p-2.5 bg-red-50 border border-ams-error/30 rounded-lg text-ams-error text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{inlineLocError}</span>
                  </div>
                )}

                {/* Inline Location Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Field 1: Description (Required) */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-ams-text mb-1">
                      Location Description <span className="text-ams-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLocDescription}
                      onChange={(e) => setNewLocDescription(e.target.value)}
                      placeholder="e.g. Main Lab 4B / Testing Bench"
                      className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep bg-white"
                    />
                  </div>

                  {/* Field 2: Seat No. (Optional) */}
                  <div>
                    <label className="block font-semibold text-ams-text mb-1">
                      Seat No. <span className="text-ams-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={newLocSeatNo}
                      onChange={(e) => setNewLocSeatNo(e.target.value)}
                      placeholder="e.g. S-104 or Bench 3"
                      className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Field 3: Floor No. (Searchable dropdown with custom entry) */}
                  <div>
                    <label className="block font-semibold text-ams-text mb-1">Floor No.</label>
                    <SearchableSelect
                      value={newLocFloorNo}
                      onChange={(val) => setNewLocFloorNo(val)}
                      options={FLOOR_OPTIONS}
                      placeholder="Select / type floor..."
                      allowCustom={true}
                      allowClear={true}
                    />
                  </div>

                  {/* Field 4: City (Read-only, derived from admin profile) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-ams-text">City</label>
                      <span className="text-[10px] text-brand-deep bg-brand-light px-1.5 py-0.2 rounded font-medium">
                        Read-only • Profile
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={adminCity || 'Not specified in profile'}
                      className={`w-full px-3 py-2 rounded-lg border text-xs cursor-not-allowed ${
                        adminCity ? 'bg-gray-100 text-ams-text border-gray-200 font-medium' : 'bg-red-50 text-ams-error border-red-200'
                      }`}
                    />
                  </div>

                  {/* Field 5: Country (Read-only, derived from admin profile) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-ams-text">Country</label>
                      <span className="text-[10px] text-brand-deep bg-brand-light px-1.5 py-0.2 rounded font-medium">
                        Read-only • Profile
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={adminCountry || 'Not specified in profile'}
                      className={`w-full px-3 py-2 rounded-lg border text-xs cursor-not-allowed ${
                        adminCountry ? 'bg-gray-100 text-ams-text border-gray-200 font-medium' : 'bg-red-50 text-ams-error border-red-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Inline Action Bar for Location */}
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[11px] text-ams-muted">
                    This location will be saved and linked directly to your new asset upon submission.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLocationMode('select')}
                      className="px-2.5 py-1 text-ams-muted hover:text-ams-text font-semibold text-[11px]"
                    >
                      Cancel New Location
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLocationInline}
                      disabled={isCreatingInlineLoc || isProfileMissingLocation || !newLocDescription.trim()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-60 transition-smooth"
                    >
                      {isCreatingInlineLoc ? (
                        <span>Saving Location...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save & Select Location</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                <span>Saving Asset...</span>
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

      {/* Quick Profile Location Modal */}
      {isProfileEditOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-ams-text/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-ams-border">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-deep" />
                <h3 className="font-bold text-sm text-ams-text">Set Admin City & Country</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileEditOpen(false)}
                className="text-ams-muted hover:text-ams-text p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ams-muted leading-relaxed">
              New physical locations inherit City and Country from your verified administrator profile:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ams-text mb-1">
                  City <span className="text-ams-error">*</span>
                </label>
                <input
                  type="text"
                  value={profileCityInput}
                  onChange={(e) => setProfileCityInput(e.target.value)}
                  placeholder="e.g. Noida"
                  className="w-full px-3 py-2 rounded-lg border border-ams-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
                />
              </div>

              <div>
                <label className="block font-semibold text-ams-text mb-1">
                  Country <span className="text-ams-error">*</span>
                </label>
                <input
                  type="text"
                  value={profileCountryInput}
                  onChange={(e) => setProfileCountryInput(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full px-3 py-2 rounded-lg border border-ams-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-ams-border">
              <button
                type="button"
                onClick={() => setIsProfileEditOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingProfile || !profileCityInput.trim() || !profileCountryInput.trim()}
                onClick={async () => {
                  setIsSavingProfile(true);
                  try {
                    await updateUserProfile({
                      city: profileCityInput.trim(),
                      country: profileCountryInput.trim(),
                    });
                    toast.success('Admin profile location updated successfully!');
                    setIsProfileEditOpen(false);
                    setInlineLocError('');
                  } catch (err) {
                    toast.error(err?.response?.data?.error || err.message || 'Failed to update profile location');
                  } finally {
                    setIsSavingProfile(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-brand-deep hover:bg-brand-dark text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
