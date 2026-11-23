import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, ArrowRight, ExternalLink, Activity, AlertTriangle, Layers, Building2 } from 'lucide-react';
import { useRoadWatch } from '../context/RoadWatchContext';
import EvidenceModal from '../components/EvidenceModal';

export default function OverviewPage() {
  const {
    currentRegion,
    setCurrentRegion,
    stats,
    complaints,
    roads,
    loading,
    setSelectedRoad,
    selectedComplaint,
    setSelectedComplaint,
    refreshData
  } = useRoadWatch();

  const navigate = useNavigate();

  // Helper to format Lakhs to Cr/Lakhs
  const formatLakhs = (val) => {
    if (!val) return '₹0.0';
    if (val >= 100) {
      return `₹${(val / 100).toFixed(2)} Cr`;
    }
    return `₹${val.toFixed(1)} L`;
  };

  // Remaining SLA helper
  const getRemainingSlaLabel = (deadlineStr) => {
    if (!deadlineStr) return '72h remaining';
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffHours = Math.round((deadline - now) / (1000 * 60 * 60));
    if (diffHours < 0) return `${Math.abs(diffHours)}h overdue`;
    if (diffHours < 48) return `${diffHours}h remaining`;
    const days = Math.round(diffHours / 24);
    return `${days}d remaining (${diffHours}h)`;
  };

  const handleInspectRoadOnMap = (road) => {
    setSelectedRoad(road);
    navigate('/map');
  };

  // Top 4 critical or high priority unresolved complaints
  const priorityComplaints = complaints
    .filter((c) => c.status !== 'Resolved')
    .slice(0, 4);

  // If no open complaints, display first 4
  const displayComplaints = priorityComplaints.length > 0 ? priorityComplaints : complaints.slice(0, 4);

  // Focus on the 5 seeded roads for Kothri Kalan / Sehore if MP, or top roads if BLR
  const summaryRoads = roads.slice(0, 5);

  const avgHealth = stats?.average_health_score || 0;
  const healthLabel =
    avgHealth >= 70 ? 'Optimal' : avgHealth >= 40 ? 'Moderate' : 'Critical Deficit';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#0F2342] text-[#B48A3E]">
              Civic Oversight
            </span>
            <span className="text-xs text-[#64748B] font-mono">
              Audit FY 2025–2026
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#0F2342] tracking-tight">
            Executive Road Infrastructure Overview
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-xl">
            Real-time condition ratings, statutory defect escalation tracking, and 3-level fiscal expenditure integrity.
          </p>
        </div>

        {/* Minimal Region Switcher */}
        <div className="inline-flex rounded border border-[#E2E8F0] bg-white p-0.5 text-xs shadow-2xs">
          <button
            onClick={() => setCurrentRegion('MP')}
            className={`px-3 py-1 font-semibold rounded transition-all ${
              currentRegion === 'MP'
                ? 'bg-[#0F2342] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F2342]'
            }`}
          >
            Kothri Kalan (MP)
          </button>
          <button
            onClick={() => setCurrentRegion('BLR')}
            className={`px-3 py-1 font-semibold rounded transition-all ${
              currentRegion === 'BLR'
                ? 'bg-[#0F2342] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F2342]'
            }`}
          >
            Bengaluru (BBMP)
          </button>
        </div>
      </div>

      {/* 1. Clean 4-Column Top KPI Strip (Thin Vertical Dividers, No Bulky Boxes) */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 space-y-2.5 animate-pulse">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-8 w-20 bg-slate-200/80 rounded" />
                <div className="h-3 w-36 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0]">
            {/* Column 1: Total Mapped Stretches */}
            <div className="p-6 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
                Total Mapped Stretches
              </span>
              <div className="text-3xl font-serif font-bold text-[#0F2342] tabular-nums">
                {stats?.total_roads || roads.length}
              </div>
              <span className="text-xs text-[#64748B] block">
                {currentRegion === 'BLR' ? '564 Arterial corridors audited' : 'NH-46, SH-18, MDR & campus links'}
              </span>
            </div>

            {/* Column 2: Average Road Health Score (/100) */}
            <div className="p-6 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
                Average Road Health
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-bold text-[#0F2342] tabular-nums">
                  {avgHealth}
                </span>
                <span className="text-xs font-semibold text-[#64748B]">/ 100</span>
              </div>
              <span className="text-xs text-[#107548] font-semibold block">
                {healthLabel} standard rating
              </span>
            </div>

            {/* Column 3: Active SLA Complaints */}
            <div className="p-6 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
                Active SLA Complaints
              </span>
              <div className="text-3xl font-serif font-bold text-[#B91C1C] tabular-nums">
                {stats?.open_complaints || 0}
              </div>
              <span className="text-xs text-[#64748B] block">
                {stats?.critical_alerts || 0} Critical (48h statutory deadline)
              </span>
            </div>

            {/* Column 4: Total Sanctioned vs. Spent Funds */}
            <div className="p-6 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
                Sanctioned vs. Spent
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-serif font-bold text-[#0F2342] tabular-nums">
                  {formatLakhs(stats?.budget_summary?.spent_lakhs)}
                </span>
                <span className="text-xs font-mono text-[#64748B] tabular-nums">
                  / {formatLakhs(stats?.budget_summary?.sanctioned_lakhs)}
                </span>
              </div>
              <span className="text-xs text-[#B48A3E] font-semibold font-mono block tabular-nums">
                {stats?.budget_summary?.utilization_pct || 0}% appropriation utilized
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Clean 2-Column Executive Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Road Jurisdiction & Condition Summary */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-xl border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-serif font-bold text-[#0F2342]">
                Road Jurisdiction & Condition Summary
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Key monitored stretches with contractor records and health score distribution
              </p>
            </div>
            <button
              onClick={() => navigate('/map')}
              className="text-xs text-[#B48A3E] hover:text-[#0F2342] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Full GIS Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Crisp, borderless list */}
          <div className="divide-y divide-[#E2E8F0]/80">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="py-3.5 flex items-center justify-between gap-3 animate-pulse px-2">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-44 bg-slate-200 rounded" />
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                  </div>
                  <div className="h-2 w-28 bg-slate-200 rounded" />
                </div>
              ))
            ) : summaryRoads.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] italic">
                No monitored corridors registered in this jurisdiction.
              </div>
            ) : (
              summaryRoads.map((road) => {
                const score = road.road_health_score;
                const barColor =
                  score >= 70 ? 'bg-[#107548]' : score >= 40 ? 'bg-[#C27803]' : 'bg-[#B91C1C]';
                const pillStyle =
                  road.road_type === 'NH'
                    ? 'bg-[#0F2342] text-white'
                    : road.road_type === 'SH'
                    ? 'bg-slate-100 text-[#0F2342] border border-[#CBD5E1]'
                    : 'bg-[#FDF8EE] text-[#B48A3E] border border-[#B48A3E]/30';

                return (
                  <div
                    key={road.id}
                    onClick={() => handleInspectRoadOnMap(road)}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer hover:bg-[#FAF9F6] px-2 rounded transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${pillStyle}`}>
                          {road.road_type}
                        </span>
                        <span className="text-sm font-semibold text-[#0F2342] group-hover:text-[#B48A3E] transition-colors">
                          {road.name}
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B] flex items-center gap-2">
                        <span>Contractor: <strong className="font-medium text-[#1E293B]">{road.contractor_name}</strong></span>
                        {road.length_km ? <span>• {road.length_km} km</span> : null}
                      </div>
                    </div>

                    {/* Health Score & Map Link */}
                    <div className="flex items-center gap-4 sm:w-48 shrink-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-[#64748B]">Score</span>
                          <span className="font-bold text-[#0F2342]">{score}/100</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                        </div>
                      </div>

                      <span className="text-xs text-[#64748B] group-hover:text-[#0F2342] group-hover:translate-x-0.5 transition-all">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Priority SLA Escalations */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-xl border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-serif font-bold text-[#0F2342]">
                Priority SLA Escalations
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Top unresolved critical & high damage filings with legal deadlines
              </p>
            </div>
            <button
              onClick={() => navigate('/ledger')}
              className="text-xs text-[#B48A3E] hover:text-[#0F2342] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]/80">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="py-3.5 space-y-2 animate-pulse px-2">
                  <div className="h-4 w-36 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              ))
            ) : displayComplaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] italic">
                No active defect escalations. All corridors within SLA compliance.
              </div>
            ) : (
              displayComplaints.map((c) => {
                const remainingText = getRemainingSlaLabel(c.sla_deadline);
                const isOverdue = remainingText.includes('overdue');

                return (
                  <div
                    key={c.id || c.tracking_id}
                    onClick={() => setSelectedComplaint(c)}
                    className="py-3.5 flex items-start justify-between gap-3 group cursor-pointer hover:bg-[#FAF9F6] px-2 rounded transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#0F2342] group-hover:text-[#B48A3E] transition-colors">
                          {c.tracking_id}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                          c.severity === 'Critical'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {c.severity}
                        </span>
                        <span className="text-xs font-semibold text-[#1E293B]">
                          {c.damage_type}
                        </span>
                      </div>

                      <div className="text-xs text-[#64748B] leading-tight">
                        Routed to: <span className="text-[#1E293B] font-medium">{c.routed_authority}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-[#64748B] tabular-nums">
                        <Clock className="w-3 h-3 text-[#B48A3E]" />
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-[#64748B]'}>
                          {remainingText}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs text-[#B48A3E] group-hover:translate-x-0.5 transition-transform shrink-0 mt-1">
                      Inspect →
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedComplaint && (
        <EvidenceModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onStatusUpdated={refreshData}
        />
      )}
    </div>
  );
}
