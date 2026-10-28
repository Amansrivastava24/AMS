import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { referenceService } from '../../services/referenceService';
import { X, Package, Tag, Shield, MapPin, Calendar, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export function AssetDetailsModal({ asset, onClose }) {
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: referenceService.getLocations,
    staleTime: 60000,
  });

  if (!asset) return null;

  const loc = asset.locationId ? locations.find((l) => l.id === asset.locationId) : null;
  const locLabel = loc
    ? [loc.description, loc.seatNo ? `Seat ${loc.seatNo}` : null, loc.floorNo ? `Floor ${loc.floorNo}` : null]
        .filter(Boolean)
        .join(' — ')
    : asset.locationId
    ? `Location #${asset.locationId}`
    : 'Unassigned';
  const locGeo = loc ? [loc.city, loc.country].filter(Boolean).join(', ') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-ams-border shadow-modal overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ams-border flex items-center justify-between bg-brand-very-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-light text-brand-deep flex items-center justify-center border border-brand-primary/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-ams-text">{asset.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-ams-border text-brand-deep font-semibold">
                  {asset.assetCode}
                </span>
              </div>
              <p className="text-xs text-ams-muted mt-0.5">Physical Asset Record #{asset.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ams-muted hover:text-ams-text rounded-md hover:bg-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* 1. Identification */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-ams-text font-bold text-xs uppercase tracking-wider pb-1 border-b border-ams-border">
              <Tag className="w-4 h-4 text-brand-deep" />
              <span>Physical Asset Identification</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Asset Code</span>
                <span className="font-semibold text-brand-deep font-mono mt-0.5 block">{asset.assetCode}</span>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Asset Tag</span>
                <span className="font-semibold text-ams-text font-mono mt-0.5 block">
                  {asset.assetTag || 'Not tagged'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Serial Number</span>
                <span className="font-semibold text-ams-text font-mono mt-0.5 block">
                  {asset.serialNumber || 'Not recorded'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Asset Type ID</span>
                <span className="font-semibold text-ams-text mt-0.5 block">#{asset.assetTypeId}</span>
              </div>
            </div>
          </div>

          {/* 2. Operational & Audit Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-ams-text font-bold text-xs uppercase tracking-wider pb-1 border-b border-ams-border">
              <Shield className="w-4 h-4 text-brand-deep" />
              <span>Operational & Verification Status</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Physical Status</span>
                <div className="mt-1">
                  <StatusBadge status={asset.status} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Verification</span>
                <div className="mt-1">
                  <StatusBadge status={asset.verificationStatus} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Tagging Condition</span>
                <div className="mt-1">
                  <StatusBadge status={asset.taggingStatus} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Gate Pass</span>
                <span className="font-medium text-ams-text mt-1 block">
                  {asset.gatePassNumber || '—'}
                </span>
              </div>
            </div>

            {asset.serialNumberFound && (
              <div className="p-3 rounded-lg bg-brand-very-light border border-brand-primary/20 flex items-center justify-between">
                <span className="text-ams-muted">Audited Serial Number Found:</span>
                <span className="font-mono font-semibold text-brand-deep">{asset.serialNumberFound}</span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-ams-bg border border-ams-border flex items-center justify-between">
              <span className="text-ams-muted">Date of Verification / Checking:</span>
              <span className="font-medium text-ams-text">
                {asset.dateOfChecking || 'Not recorded'}
              </span>
            </div>
          </div>

          {/* 3. Ownership and Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-ams-text font-bold text-xs uppercase tracking-wider pb-1 border-b border-ams-border">
              <MapPin className="w-4 h-4 text-brand-deep" />
              <span>Ownership & Facility Location</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Cost Center</span>
                <span className="font-semibold text-ams-text mt-0.5 block">{asset.costCenter || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Asset Owner</span>
                <span className="font-medium text-ams-text mt-0.5 block">
                  {asset.assetOwnerName || (asset.assetOwnerId ? `User #${asset.assetOwnerId}` : 'Unassigned')}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Current Custodian</span>
                <span className="font-medium text-ams-text mt-0.5 block">
                  {asset.custodianName || (asset.custodianId ? `User #${asset.custodianId}` : 'Unassigned')}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border col-span-2 sm:col-span-1">
                <span className="text-ams-muted block text-[11px]">Location</span>
                <span className="font-medium text-ams-text mt-0.5 block truncate" title={locLabel}>
                  {locLabel}
                </span>
                {locGeo && <span className="text-[10px] text-ams-muted block font-mono">{locGeo}</span>}
              </div>
            </div>
          </div>

          {/* 4. Make, Model & Remarks */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-ams-text font-bold text-xs uppercase tracking-wider pb-1 border-b border-ams-border">
              <FileText className="w-4 h-4 text-brand-deep" />
              <span>Specifications & Notes</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                <span className="text-ams-muted block text-[11px]">Make / Model</span>
                <span className="font-medium text-ams-text mt-0.5 block">{asset.makeModel || 'None specified'}</span>
              </div>
              {asset.remarks && (
                <div className="p-3 rounded-lg bg-ams-bg border border-ams-border">
                  <span className="text-ams-muted block text-[11px]">Remarks & Inspection Notes</span>
                  <p className="font-medium text-ams-text mt-0.5 whitespace-pre-wrap">{asset.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-ams-border bg-ams-bg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-ams-border text-xs font-semibold text-ams-text hover:bg-gray-50 shadow-subtle"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
