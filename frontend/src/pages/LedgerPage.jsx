import React, { useState } from 'react';
import { Search, RefreshCw, Clock, ChevronRight } from 'lucide-react';
import { useRoadWatch } from '../context/RoadWatchContext';
import EvidenceModal from '../components/EvidenceModal';

export default function LedgerPage() {
  const { complaints, loading, refreshData, selectedComplaint, setSelectedComplaint } = useRoadWatch();

  const [regionFilter, setRegionFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const severityBadges = {
    Critical: 'bg-rose-50 text-rose-700 border-rose-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const statusBadges = {
    Open: 'bg-amber-50 text-amber-800 border-amber-200',
    'In Progress': 'bg-sky-50 text-sky-800 border-sky-200',
    Resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  const filteredComplaints = complaints.filter((c) => {
    if (regionFilter !== 'All' && c.region !== regionFilter) return false;
    if (severityFilter !== 'All' && c.severity !== severityFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrack = c.tracking_id?.toLowerCase().includes(q);
      const matchRoad = c.road_name?.toLowerCase().includes(q);
      const matchType = c.damage_type?.toLowerCase().includes(q);
      const matchAuth = c.routed_authority?.toLowerCase().includes(q);
      if (!matchTrack && !matchRoad && !matchType && !matchAuth) return false;
    }
    return true;
  });

  // Calculate SLA countdown or overdue label
  const getSlaLabel = (deadlineStr) => {
    if (!deadlineStr) return { text: 'N/A', overdue: false };
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffHours = Math.round((deadline - now) / (1000 * 60 * 60));
    if (diffHours < 0) {
      return { text: `${Math.abs(diffHours)}h overdue`, overdue: true };
    }
    if (diffHours < 48) {
      return { text: `${diffHours}h left`, overdue: false };
    }
    const days = Math.round(diffHours / 24);
    return { text: `${days}d left`, overdue: false };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Formal Civic Header with Exactly One Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#0F2342] text-[#B48A3E]">
              Statutory Register
            </span>
            <span className="text-xs text-[#64748B] font-mono">
              Binding Civic Escalation Ledger
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#0F2342] tracking-tight">
            Accountability Ledger
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Verifiable public record of machine-detected road hazards, jurisdictional assignments to NHAI, State PWD, and BBMP, with binding statutory resolution SLAs.
          </p>
        </div>

        {/* Strict Single Primary Action Button on Page */}
        <button
          onClick={refreshData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2342] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#162D4F] transition-colors shadow-sm shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#B48A3E]" />
          <span>Sync Audit Ledger</span>
        </button>
      </div>

      {/* Minimalist Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tracking ID, road stretch, authority..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF9F6] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-xs text-[#0F2342] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F2342]"
          />
        </div>

        {/* Region Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold">Region:</span>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-[#FAF9F6] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F2342] focus:outline-none focus:border-[#0F2342]"
          >
            <option value="All">All Jurisdictions</option>
            <option value="BLR">Bengaluru (BLR)</option>
            <option value="MP">Kothri Kalan (MP)</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#FAF9F6] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F2342] focus:outline-none focus:border-[#0F2342]"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical (48h)</option>
            <option value="High">High (7d)</option>
            <option value="Medium">Medium (15d)</option>
            <option value="Low">Low (30d)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FAF9F6] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F2342] focus:outline-none focus:border-[#0F2342]"
          >
            <option value="All">All Stages</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Audit Record Summary Strip */}
      <div className="flex items-center justify-between text-xs text-[#64748B] px-1 font-mono">
        <span>Showing {filteredComplaints.length} of {complaints.length} statutory filings</span>
        <span className="hidden sm:inline">Tap any record to inspect machine-vision evidence & escalation path</span>
      </div>

      {/* Formal Spacious Data Table with Zero Inline Action Buttons */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] text-[#64748B] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-4 px-5">Tracking ID</th>
                <th className="py-4 px-5">Road & Jurisdiction</th>
                <th className="py-4 px-5">Damage & Severity</th>
                <th className="py-4 px-5">Routed Authority</th>
                <th className="py-4 px-5">SLA Deadline</th>
                <th className="py-4 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-100 rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 w-36 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 w-20 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-100 rounded" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-5 w-16 bg-slate-200 rounded-full inline-block" />
                    </td>
                  </tr>
                ))
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748B] italic">
                    No statutory filings match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => {
                  const sla = getSlaLabel(c.sla_deadline);
                  return (
                    <tr
                      key={c.id || c.tracking_id}
                      onClick={() => setSelectedComplaint(c)}
                      className="group cursor-pointer hover:bg-slate-50 transition-colors"
                      title="Click to inspect full audit record and machine vision evidence"
                    >
                      {/* Column 1: Tracking ID */}
                      <td className="py-4 px-5 align-top">
                        <div className="font-mono font-bold text-xs text-[#0F2342] group-hover:text-[#B48A3E] transition-colors tabular-nums">
                          {c.tracking_id}
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono mt-0.5 tabular-nums">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active Record'}
                        </div>
                      </td>

                      {/* Column 2: Road & Jurisdiction */}
                      <td className="py-4 px-5 align-top max-w-[220px]">
                        <div className="font-semibold text-xs text-[#0F2342] truncate" title={c.road_name}>
                          {c.road_name || 'Corridor Link'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-[#0F2342] border border-[#CBD5E1] font-semibold">
                            {c.road_type || 'MDR'}
                          </span>
                          <span className="text-[10px] text-[#64748B] truncate">
                            {c.region === 'BLR' ? 'Bengaluru (BBMP)' : 'Kothri Kalan (MP)'}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Damage & Severity Pill */}
                      <td className="py-4 px-5 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0F2342]">
                            {c.damage_type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityBadges[c.severity] || severityBadges.High}`}>
                            {c.severity}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono mt-0.5 tabular-nums">
                          {(c.confidence * 100).toFixed(0)}% AI confidence
                        </div>
                      </td>

                      {/* Column 4: Routed Authority */}
                      <td className="py-4 px-5 align-top max-w-[240px]">
                        <div className="font-medium text-xs text-[#1E293B] truncate" title={c.routed_authority}>
                          {c.routed_authority}
                        </div>
                        <div className="text-[10px] text-[#64748B] truncate mt-0.5" title={c.escalation_path}>
                          {c.escalation_path}
                        </div>
                      </td>

                      {/* Column 5: SLA Deadline */}
                      <td className="py-4 px-5 align-top">
                        <div className="font-mono text-xs text-[#0F2342] tabular-nums">
                          {c.sla_deadline ? new Date(c.sla_deadline).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 font-mono text-[10px] tabular-nums">
                          <Clock className="w-3 h-3 text-[#B48A3E]" />
                          <span className={sla.overdue ? 'text-rose-600 font-bold' : 'text-[#64748B]'}>
                            {sla.text}
                          </span>
                        </div>
                      </td>

                      {/* Column 6: Status */}
                      <td className="py-4 px-5 align-top text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusBadges[c.status] || statusBadges.Open}`}>
                            {c.status}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#B48A3E] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clean Centered Evidence & Audit Modal */}
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