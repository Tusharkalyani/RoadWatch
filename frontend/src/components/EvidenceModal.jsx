import React, { useState, useEffect } from 'react';
import { X, Clock, UserCheck, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { resolveEvidenceUrl, FALLBACK_EVIDENCE_FRAME } from '../utils/imageFallback';

export default function EvidenceModal({ complaint, onClose, onStatusUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(complaint?.status || 'Open');

  useEffect(() => {
    if (complaint?.status) {
      setCurrentStatus(complaint.status);
    }
  }, [complaint]);

  if (!complaint) return null;

  const severityBadges = {
    Critical: 'bg-rose-50 text-rose-700 border-rose-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdating(true);
      await axios.patch(`/api/complaints/${complaint.id}/status?status=${encodeURIComponent(newStatus)}`);
      setCurrentStatus(newStatus);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const latDisplay = typeof complaint.latitude === 'number' ? complaint.latitude.toFixed(4) : (Number(complaint.latitude) || 0).toFixed(4);
  const lngDisplay = typeof complaint.longitude === 'number' ? complaint.longitude.toFixed(4) : (Number(complaint.longitude) || 0).toFixed(4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2342]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Navy Header */}
        <div className="px-6 py-4 bg-[#0F2342] text-white flex items-center justify-between border-b border-[#1E3A5F]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#162D4F] text-[#B48A3E] border border-[#B48A3E]/30 font-bold">
              {complaint.tracking_id}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${severityBadges[complaint.severity] || severityBadges.High}`}>
              {complaint.severity} Hazard
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/20 font-medium">
              Status: {currentStatus}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 bg-[#FAF9F6]">
          {/* AI Annotated Evidence Photo */}
          <div className="rounded-lg overflow-hidden border border-[#E2E8F0] bg-white relative shadow-sm">
            <div className="absolute top-3 left-3 bg-[#0F2342]/90 backdrop-blur text-white text-[11px] px-2.5 py-1 rounded border border-[#B48A3E]/40 font-mono font-medium z-10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B48A3E]"></span>
              YOLOv8 Machine-Vision Evidence
            </div>
            <img
              src={resolveEvidenceUrl(complaint.evidence_image_url)}
              alt="Road Damage Evidence"
              className="w-full max-h-[360px] object-contain mx-auto bg-slate-900/5"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_EVIDENCE_FRAME;
              }}
            />
          </div>

          {/* AI Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block uppercase tracking-wider font-semibold">Defect Class</span>
              <span className="text-sm font-bold text-[#0F2342] mt-0.5 block">{complaint.damage_type}</span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block uppercase tracking-wider font-semibold">Model Confidence</span>
              <span className="text-sm font-bold text-[#B48A3E] mt-0.5 block tabular-nums">
                {(complaint.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block uppercase tracking-wider font-semibold">Monitored Corridor</span>
              <span className="text-xs font-bold text-[#0F2342] mt-0.5 block truncate" title={complaint.road_name}>
                {complaint.road_name || 'Corridor Link'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block uppercase tracking-wider font-semibold">Geographic Coordinates</span>
              <span className="text-xs font-mono text-[#1E293B] mt-0.5 block tabular-nums">
                {latDisplay}, {lngDisplay}
              </span>
            </div>
          </div>

          {/* Jurisdictional Routing Receipt */}
          <div className="bg-white rounded-lg p-5 border border-[#E2E8F0] space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F2342]">
              <UserCheck className="w-4 h-4 text-[#B48A3E]" />
              <span>Statutory Jurisdiction Routing Record</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs text-[#64748B] block font-medium">Assigned Authority:</span>
                <span className="text-sm font-semibold text-[#0F2342] block mt-0.5">
                  {complaint.routed_authority}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block font-medium">Binding Resolution SLA:</span>
                <span className="text-sm font-semibold text-[#B48A3E] block mt-0.5 flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#B48A3E]" />
                  {complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] block font-medium">Administrative Escalation Path:</span>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#1E293B] bg-[#FAF9F6] p-2.5 rounded border border-[#E2E8F0] font-mono">
                <ArrowRight className="w-3.5 h-3.5 text-[#B48A3E] shrink-0" />
                <span className="truncate">{complaint.escalation_path}</span>
              </div>
            </div>
          </div>

          {/* Administrative Status Lifecycle Controls */}
          <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <span className="text-xs font-bold text-[#0F2342] block">Resolution Lifecycle Stage:</span>
              <span className="text-xs text-[#64748B]">Update status according to official engineering progress</span>
            </div>
            <div className="flex items-center gap-2">
              {['Open', 'In Progress', 'Resolved'].map((st) => (
                <button
                  key={st}
                  disabled={updating || currentStatus === st}
                  onClick={() => handleUpdateStatus(st)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    currentStatus === st
                      ? 'bg-[#0F2342] text-white shadow-sm'
                      : 'bg-white text-[#64748B] hover:text-[#0F2342] hover:bg-slate-50 border border-[#E2E8F0]'
                  } disabled:opacity-50`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Formal Footer with 1 minimal action button */}
        <div className="px-6 py-3.5 border-t border-[#E2E8F0] flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold text-[#0F2342] hover:bg-slate-100 border border-[#CBD5E1] transition-colors"
          >
            Dismiss Record
          </button>
        </div>
      </div>
    </div>
  );
}
