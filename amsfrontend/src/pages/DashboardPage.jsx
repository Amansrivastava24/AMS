import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { assetService } from '../services/assetService';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/common/FeedbackStates';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  Tag, 
  Building2,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-assets'],
    queryFn: () => assetService.getAssets({ page: 1, pageSize: 50 }),
  });

  const assets = data?.items || [];
  const totalRecords = data?.totalItems || assets.length;

  // Aggregate metrics from physical asset records
  const verifiedQuantity = data?.totalFound !== undefined ? data.totalFound : assets.filter((a) => a.verificationStatus === 'FOUND').length;
  const pendingQuantity = data?.totalPending !== undefined ? data.totalPending : assets.filter((a) => a.verificationStatus === 'NOT_CHECKED').length;
  const missingCount = assets.filter((a) => a.verificationStatus === 'MISSING').length;

  // Requiring attention: TaggingStatus == 'TR', status is LOST/DAMAGED, or verificationStatus is MISSING
  const requiringAttentionCount = assets.filter((a) => {
    return a.taggingStatus === 'TR' || a.verificationStatus === 'MISSING' || a.status === 'LOST' || a.status === 'DAMAGED';
  }).length;

  // Chart: By Cost Center
  const costCenterMap = {};
  assets.forEach((a) => {
    const cc = a.costCenter || 'Unassigned';
    costCenterMap[cc] = (costCenterMap[cc] || 0) + (Number(a.quantity) || 1);
  });
  const costCenterData = Object.entries(costCenterMap).map(([name, quantity]) => ({
    name,
    quantity,
  }));

  // Chart: Tagging Status Distribution
  const taggingMap = { T: 0, NA: 0, TR: 0, Unspecified: 0 };
  assets.forEach((a) => {
    const status = a.taggingStatus || 'Unspecified';
    if (taggingMap[status] !== undefined) {
      taggingMap[status] += 1;
    } else {
      taggingMap.Unspecified += 1;
    }
  });

  const taggingData = [
    { name: 'Tagged (T)', value: taggingMap.T, color: '#176B4D' },
    { name: 'To Review (TR)', value: taggingMap.TR, color: '#B7791F' },
    { name: 'Not Applicable (NA)', value: taggingMap.NA, color: '#68756E' },
    { name: 'Unspecified', value: taggingMap.Unspecified, color: '#A0AEC0' },
  ].filter((item) => item.value > 0);

  return (
    <div>
      <PageHeader
        title="Asset Overview"
        description="A clear view of company assets, inventory, and verification status."
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-ams-border hover:bg-ams-bg rounded-lg text-xs font-semibold text-ams-text shadow-subtle transition-smooth"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-forest ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        }
      />

      {isLoading ? (
        <LoadingState message="Connecting to Scala backend and aggregating assets..." />
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          {/* Top 5 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Records */}
            <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-ams-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Asset Records</span>
                <div className="w-8 h-8 rounded-lg bg-energy-pale flex items-center justify-center text-forest">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-forest-dark">{totalRecords}</div>
                <div className="text-[11px] text-ams-muted mt-0.5">Registered SKUs/items</div>
              </div>
            </div>

            {/* 2. Total Quantity */}
            <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-ams-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Quantity</span>
                <div className="w-8 h-8 rounded-lg bg-energy-pale flex items-center justify-center text-forest">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-forest-dark">{totalQuantity}</div>
                <div className="text-[11px] text-ams-muted mt-0.5">Physical items ledger</div>
              </div>
            </div>

            {/* 3. Verified Found */}
            <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-ams-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Quantity Verified</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-forest">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-forest">{verifiedQuantity}</div>
                <div className="text-[11px] text-ams-muted mt-0.5">Physically confirmed</div>
              </div>
            </div>

            {/* 4. Pending Verification */}
            <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-ams-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Check</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-ams-warning">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-ams-warning">{pendingQuantity}</div>
                <div className="text-[11px] text-ams-muted mt-0.5">
                  {missingCount > 0 ? `${missingCount} marked MISSING` : 'Pending physical audit'}
                </div>
              </div>
            </div>

            {/* 5. Requiring Attention */}
            <div className="bg-white p-4 rounded-xl border border-ams-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-ams-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Requires Attention</span>
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-ams-error">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-ams-error">{requiringAttentionCount}</div>
                <div className="text-[11px] text-ams-muted mt-0.5">Variance or Review status</div>
              </div>
            </div>
          </div>

          {/* Visual Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inventory by Cost Center */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-ams-border shadow-subtle">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-forest" />
                  <h3 className="text-sm font-bold text-ams-text">Inventory by Cost Center</h3>
                </div>
                <span className="text-[11px] text-ams-muted">Aggregated quantity</span>
              </div>
              {costCenterData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costCenterData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#68756E' }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: '#68756E' }} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1E8E1', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="quantity" fill="#176B4D" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="No Cost Center Data" description="Assets have not yet been assigned cost centers." />
              )}
            </div>

            {/* Tagging Status Distribution */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-ams-border shadow-subtle">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-forest" />
                  <h3 className="text-sm font-bold text-ams-text">Tagging Status Distribution</h3>
                </div>
                <span className="text-[11px] text-ams-muted">Records</span>
              </div>
              {taggingData.length > 0 ? (
                <div className="h-64 w-full flex flex-col justify-center items-center">
                  <ResponsiveContainer width="100%" height="75%">
                    <PieChart>
                      <Pie
                        data={taggingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {taggingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1E8E1', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-1">
                    {taggingData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-ams-muted">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span>{d.name}: <strong className="text-ams-text">{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState title="No Tagging Data" description="Tagging status is currently unspecified." />
              )}
            </div>
          </div>

          {/* Recent Assets Table Summary */}
          <div className="bg-white rounded-xl border border-ams-border shadow-subtle overflow-hidden">
            <div className="p-4 lg:p-5 border-b border-ams-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ams-text">Registered Assets Inventory</h3>
                <p className="text-xs text-ams-muted mt-0.5">
                  Latest equipment recorded on the Scala PostgreSQL database
                </p>
              </div>
              <Link
                to="/assets"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-energy-pale rounded-lg transition-smooth"
              >
                <span>View all assets</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ams-bg/70 text-ams-muted font-semibold border-b border-ams-border">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Asset Name</th>
                    <th className="py-3 px-4">Make / Model</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Actual Found</th>
                    <th className="py-3 px-4">Cost Center</th>
                    <th className="py-3 px-4">Tagging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ams-border">
                  {assets.slice(0, 6).map((item) => (
                    <tr key={item.id} className="hover:bg-ams-bg/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-forest-dark">{item.assetCode}</td>
                      <td className="py-3 px-4 font-medium text-ams-text">{item.name}</td>
                      <td className="py-3 px-4 text-ams-muted">{item.makeModel || '—'}</td>
                      <td className="py-3 px-4 text-right font-medium text-ams-text">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {item.actualFound !== null && item.actualFound !== undefined ? (
                          <span className={item.actualFound < item.quantity ? 'text-ams-warning' : 'text-forest'}>
                            {item.actualFound}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-ams-muted">{item.costCenter || '—'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.taggingStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
