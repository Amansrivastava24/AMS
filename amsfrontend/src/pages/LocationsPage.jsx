import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referenceService } from '../services/referenceService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { LoadingState, ErrorState, EmptyState } from '../components/common/FeedbackStates';
import { ROLES } from '../permissions/permissions';
import { MapPin, Plus, Search, Edit, Trash2, X, AlertTriangle } from 'lucide-react';

export function LocationsPage() {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const canManage = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [deletingLoc, setDeletingLoc] = useState(null);

  const queryParams = {
    search: search.trim() || undefined,
    floor: floorFilter.trim() || undefined,
  };

  const { data: locations = [], isLoading, isError, error } = useQuery({
    queryKey: ['locations', queryParams],
    queryFn: () => referenceService.getLocations(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => referenceService.createLocation(payload),
    onSuccess: (newLoc) => {
      toast.success(`Location "${newLoc.name}" created`);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create location');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => referenceService.updateLocation(id, payload),
    onSuccess: () => {
      toast.success('Location updated successfully');
      setEditingLoc(null);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update location');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => referenceService.deleteLocation(id),
    onSuccess: () => {
      toast.success('Location deleted successfully');
      setDeletingLoc(null);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete location. Existing assets or items reference it.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-ams-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-light border border-brand-primary/30 flex items-center justify-center text-brand-deep">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ams-text tracking-tight">Facility & Physical Locations</h1>
            <p className="text-xs text-ams-muted mt-0.5">
              Buildings, floors, test laboratories, and room locations where assets are stored.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingLoc(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-deep hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-subtle transition-smooth"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ams-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by facility name, city, room..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          <div>
            <input
              type="text"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              placeholder="Filter by floor (e.g. 2, 3)"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-ams-border shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingState message="Loading locations..." />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState title="Failed to load locations" message={error?.message} />
          </div>
        ) : locations.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No locations found"
              message="No facility locations match the specified filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr>
                  <th className="w-16">ID</th>
                  <th>Location Name</th>
                  <th>Floor</th>
                  <th>Room / Lab Location</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Country</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ams-border">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-brand-very-light/70 transition-colors">
                    <td className="font-mono text-xs text-ams-muted">#{loc.id}</td>
                    <td className="font-semibold text-ams-text text-xs">{loc.name}</td>
                    <td className="text-xs">{loc.floor || '—'}</td>
                    <td className="text-xs text-brand-deep font-medium">{loc.roomLocation || '—'}</td>
                    <td className="text-xs text-ams-muted">{loc.address || '—'}</td>
                    <td className="text-xs text-ams-muted">{loc.city || '—'}</td>
                    <td className="text-xs text-ams-muted">{loc.country || '—'}</td>
                    {canManage && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingLoc(loc)}
                            className="p-1 text-ams-muted hover:text-ams-text hover:bg-gray-100 rounded transition-colors"
                            title="Edit Location"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingLoc(loc)}
                            className="p-1 text-ams-muted hover:text-ams-error hover:bg-red-50 rounded transition-colors"
                            title="Delete Location"
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

      {/* Location Modal */}
      {(isModalOpen || editingLoc) && (
        <LocationModal
          location={editingLoc}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLoc(null);
          }}
          onSubmit={(payload) => {
            if (editingLoc) {
              updateMutation.mutate({ id: editingLoc.id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deletingLoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-ams-error">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ams-text">Delete Location</h3>
            </div>
            <p className="text-xs text-ams-muted leading-relaxed">
              Are you sure you want to delete <strong className="text-ams-text">{deletingLoc.name}</strong>? Deletion will be safely blocked if assets or items are placed here.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingLoc(null)}
                className="px-3 py-1.5 rounded-lg border border-ams-border text-xs font-semibold text-ams-muted hover:text-ams-text"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingLoc.id)}
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

function LocationModal({ location, onClose, onSubmit, isSubmitting }) {
  const isEditing = Boolean(location?.id);

  const [name, setName] = useState(location?.name || '');
  const [address, setAddress] = useState(location?.address || '');
  const [city, setCity] = useState(location?.city || '');
  const [country, setCountry] = useState(location?.country || '');
  const [floor, setFloor] = useState(location?.floor || '');
  const [roomLocation, setRoomLocation] = useState(location?.roomLocation || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Location name is required');
      return;
    }

    onSubmit({
      name: name.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      floor: floor.trim() || null,
      roomLocation: roomLocation.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ams-text/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-ams-border shadow-modal max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-ams-border flex items-center justify-between bg-brand-very-light">
          <h3 className="font-bold text-sm text-ams-text">
            {isEditing ? `Edit Location: ${location.name}` : 'Create Location'}
          </h3>
          <button onClick={onClose} className="p-1 text-ams-muted hover:text-ams-text rounded">
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
              Location / Facility Name <span className="text-ams-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Headquarters Campus - Building A"
              className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ams-text mb-1">Floor</label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 2nd Floor"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
              />
            </div>
            <div>
              <label className="block font-semibold text-ams-text mb-1">Room or Seat</label>
              <input
                type="text"
                value={roomLocation}
                onChange={(e) => setRoomLocation(e.target.value)}
                placeholder="e.g. Lab 3B / Row 14"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ams-text mb-1">Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 30000 Mill Creek Ave"
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
                placeholder="e.g. Alpharetta"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
              />
            </div>
            <div>
              <label className="block font-semibold text-ams-text mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
                className="w-full px-3 py-2 rounded-lg border border-ams-border focus:outline-none focus:ring-1 focus:ring-brand-deep"
              />
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
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
