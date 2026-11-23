import React from 'react';
import { X, Shield, AlertTriangle, CheckCircle, DollarSign, Calendar, HardHat, PlusCircle, Phone, UserCheck, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoadWatch } from '../context/RoadWatchContext';

export default function RoadDetailDrawer({ road, onClose, onSelectComplaint }) {
  const navigate = useNavigate();
  const { setPrefilledRoadForInspect, complaints } = useRoadWatch();

  if (!road) return null;

  // Format INR in Lakhs / Crores
  const formatLakhs = (val) => {
    if (val >= 100) {
      return `₹${(val / 100).toFixed(2)} Cr`;
    }
    return `₹${val.toFixed(1)} L`;
  };

  const sanctioned = road.budget_sanctioned || 0;
  const released = road.budget_released || 0;
  const spent = road.budget_spent || 0;
  const unspent = road.budget_unspent || Math.max(0, released - spent);

  // Proportions for bar chart
  const maxBudget = Math.max(sanctioned, released, spent, 1);
  const sanctionedPct = Math.min(100, (sanctioned / maxBudget) * 100);
  const releasedPct = Math.min(100, (released / maxBudget) * 100);
  const spentPct = Math.min(100, (spent / maxBudget) * 100);

  // Audit Red Flags
  const isOverReleased = released > sanctioned;
  const overReleaseDiff = (released - sanctioned).toFixed(1);
  const isFiscalIrregularity = spent > 0.85 * released && road.road_health_score < 45;

  const healthScore = road.road_health_score;
  const healthBadge =
    healthScore >= 70
      ? { label: 'Optimal Condition', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      : healthScore >= 40
      ? { label: 'Moderate Wear', color: 'text-amber-700 bg-amber-50 border-amber-200' }
      : { label: 'Severe Distress', color: 'text-rose-700 bg-rose-50 border-rose-200' };

  const handleLaunchInspector = () => {
    setPrefilledRoadForInspect(road);
    if (onClose) onClose();
    navigate('/inspect');
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] bg-white border-l border-[#E2E8F0] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Imperial Navy Header */}
      <div className="p-6 bg-[#0F2342] text-white flex items-start justify-between border-b border-[#1E3A5F]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#B48A3E]/20 text-[#B48A3E] border border-[#B48A3E]/30 font-mono">
              {road.road_type} Highway
            </span>
            {road.bbmp_division && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/10 text-slate-200 border border-white/20">
                {road.bbmp_division} Division
              </span>
            )}
            {road.road_ref && (
              <span className="text-[11px] text-slate-300 font-mono">
                {road.road_ref}
              </span>
            )}
          </div>
          <h2 className="text-xl font-serif font-bold text-white tracking-tight leading-snug">
            {road.name}
          </h2>
          <div className="text-[11px] text-slate-300 font-mono mt-1">
            Way ID: {road.osm_way_id} {road.length_km ? `• Length: ${road.length_km} km` : ''}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF9F6]">
        {/* Health Index Card */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F2342] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#B48A3E]" />
              Road Health Index (RHI)
            </span>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${healthBadge.color}`}>
              {healthBadge.label}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-3xl font-serif font-bold text-[#0F2342] tabular-nums">
              {healthScore}
            </span>
            <span className="text-xs font-semibold text-[#64748B]">/ 100</span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-[#E2E8F0]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                healthScore >= 70 ? 'bg-[#107548]' : healthScore >= 40 ? 'bg-[#C27803]' : 'bg-[#B91C1C]'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Defect Liability Period (DLP) Warranty Record */}
        {road.dlp_expiry_date && (
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F2342] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#B48A3E]" />
                Defect Liability Period (DLP)
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-[#0F2342] border border-[#CBD5E1]">
                {road.dlp_period || '3 Years'}
              </span>
            </div>
            <div className="text-xs text-[#1E293B]">
              Handover: <span className="font-mono text-[#0F2342]">{road.completion_date || 'N/A'}</span> • DLP Validity: <span className="font-mono text-[#B48A3E] font-bold">{road.dlp_expiry_date}</span>
            </div>
            <div className="p-3 rounded bg-[#FDF8EE] border border-[#B48A3E]/30 text-[#0F2342] text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#B48A3E] shrink-0 mt-0.5" />
              <span>
                Contractor <strong>{road.contractor_name}</strong> is statutorily liable to rectify structural ruts and potholes at zero municipal cost under Clause 34.
              </span>
            </div>
          </div>
        )}

        {/* Assigned Contractor & Civic Engineers */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] space-y-4 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
              Infrastructure Contractor
            </span>
            <span className="text-sm font-serif font-bold text-[#0F2342] block">
              {road.contractor_name}
            </span>
          </div>

          {(road.executive_engineer || road.asst_engineer) && (
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-[#B48A3E]" />
                Supervising Public Engineers
              </span>

              {road.executive_engineer && (
                <div className="flex items-center justify-between text-xs bg-[#FAF9F6] p-2.5 rounded border border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B] text-[10px] block font-medium">Executive Engineer</span>
                    <span className="font-semibold text-[#0F2342]">{road.executive_engineer}</span>
                  </div>
                  {road.ee_contact && (
                    <a
                      href={`tel:${road.ee_contact}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white text-[#B48A3E] hover:text-[#0F2342] border border-[#E2E8F0] font-mono text-[11px]"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{road.ee_contact}</span>
                    </a>
                  )}
                </div>
              )}

              {road.asst_engineer && (
                <div className="flex items-center justify-between text-xs bg-[#FAF9F6] p-2.5 rounded border border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B] text-[10px] block font-medium">Assistant Engineer</span>
                    <span className="font-semibold text-[#0F2342]">{road.asst_engineer}</span>
                  </div>
                  {road.ae_contact && (
                    <a
                      href={`tel:${road.ae_contact}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white text-[#B48A3E] hover:text-[#0F2342] border border-[#E2E8F0] font-mono text-[11px]"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{road.ae_contact}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3-Level Budget Comparison Bar */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F2342] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#B48A3E]" />
              3-Level Fiscal Budget Integrity
            </span>
            <span className="text-[11px] font-mono text-[#64748B]">INR (Lakhs / Cr)</span>
          </div>

          {/* Audit Red Flag Warnings */}
          {isOverReleased && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">AUDIT IRREGULARITY:</strong> Released grant ({formatLakhs(released)}) exceeds sanctioned appropriation ({formatLakhs(sanctioned)}) by ₹{overReleaseDiff} Lakhs without cabinet revision!
              </div>
            </div>
          )}

          {isFiscalIrregularity && !isOverReleased && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">EXPENDITURE ANOMALY:</strong> Over 85% of allocated public funds spent ({formatLakhs(spent)}), yet the road remains severely distressed ({healthScore}/100).
              </div>
            </div>
          )}

          {/* Level 1: Sanctioned */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[#64748B]">1. Sanctioned Appropriation</span>
              <span className="font-mono text-[#0F2342] font-semibold tabular-nums">{formatLakhs(sanctioned)}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full" style={{ width: `${sanctionedPct}%` }} />
            </div>
          </div>

          {/* Level 2: Released */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[#64748B]">2. Released to Authority</span>
              <span className={`font-mono font-semibold tabular-nums ${isOverReleased ? 'text-rose-700 font-bold' : 'text-[#0F2342]'}`}>
                {formatLakhs(released)}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isOverReleased ? 'bg-rose-600' : 'bg-[#0F2342]'}`}
                style={{ width: `${releasedPct}%` }}
              />
            </div>
          </div>

          {/* Level 3: Spent */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[#64748B]">3. Invoiced by Contractor</span>
              <span className="font-mono text-[#0F2342] font-semibold tabular-nums">{formatLakhs(spent)}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#B48A3E] rounded-full" style={{ width: `${spentPct}%` }} />
            </div>
          </div>

          <div className="text-[11px] text-[#64748B] flex justify-between pt-1 font-mono tabular-nums border-t border-slate-100">
            <span>Utilization: {((spent / (released || 1)) * 100).toFixed(1)}%</span>
            <span>Unspent Balance: {formatLakhs(unspent)}</span>
          </div>
        </div>

        {/* Complaints on this Road */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
            Reported Defects ({road.complaints?.length || 0})
          </span>

          {(!road.complaints || road.complaints.length === 0) ? (
            <p className="text-xs text-[#64748B] italic">No defects recorded on this stretch.</p>
          ) : (
            <div className="space-y-2">
              {road.complaints.map((c) => {
                const fullComplaint = (complaints || []).find(
                  (item) => item.id === c.id || item.tracking_id === c.tracking_id
                ) || c;

                return (
                  <div
                    key={c.id || c.tracking_id}
                    onClick={() => onSelectComplaint && onSelectComplaint(fullComplaint)}
                    className="p-3 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#B48A3E] cursor-pointer transition-all flex items-center justify-between text-xs shadow-2xs group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        c.severity === 'Critical' ? 'bg-[#B91C1C]' : c.severity === 'High' ? 'bg-[#EA580C]' : 'bg-[#C27803]'
                      }`} />
                      <span className="font-mono text-[#0F2342] font-bold group-hover:text-[#B48A3E] transition-colors">{c.tracking_id}</span>
                      <span className="text-[#64748B]">• {c.damage_type}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                      c.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Exactly One Primary Action Button (Strict Minimal Button Rule) */}
      <div className="p-4 bg-white border-t border-[#E2E8F0]">
        <button
          onClick={handleLaunchInspector}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider bg-[#0F2342] hover:bg-[#162D4F] text-white transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4 text-[#B48A3E]" />
          <span>Launch AI Defect Inspection on this Stretch</span>
        </button>
      </div>
    </aside>
  );
}
