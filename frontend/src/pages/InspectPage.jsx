import React, { useState, useEffect } from 'react';
import { UploadCloud, Cpu, AlertTriangle, CheckCircle2, ArrowRight, Clock, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useRoadWatch } from '../context/RoadWatchContext';
import { resolveEvidenceUrl, FALLBACK_EVIDENCE_FRAME } from '../utils/imageFallback';

// Quick 1-click sample defect chips for viva testing
const PRESETS = [
  {
    id: 'pothole',
    title: 'Pothole Defect',
    label: 'Deep Asphalt Crater',
    coords: { lat: 23.0775, lng: 76.8515 },
  },
  {
    id: 'cavein',
    title: 'Road Cave-in',
    label: 'Catastrophic Sinkhole',
    coords: { lat: 23.0760, lng: 76.8530 },
  },
  {
    id: 'crack',
    title: 'Surface Crack',
    label: 'Fatigue Rutting Fissure',
    coords: { lat: 23.0780, lng: 76.8520 },
  },
  {
    id: 'waterlogging',
    title: 'Waterlogging',
    label: 'Drainage Flood Pool',
    coords: { lat: 23.0890, lng: 76.8460 },
  },
];

export default function InspectPage() {
  const { currentRegion, roads, prefilledRoadForInspect, refreshData, addNewComplaint } = useRoadWatch();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activePreset, setActivePreset] = useState(null);

  const [selectedRoadId, setSelectedRoadId] = useState('');
  const [latitude, setLatitude] = useState(23.0775);
  const [longitude, setLongitude] = useState(76.8513);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Initialize or update road selection & auto-fill coordinates
  useEffect(() => {
    if (prefilledRoadForInspect) {
      setSelectedRoadId(prefilledRoadForInspect.id);
      if (prefilledRoadForInspect.coordinates && prefilledRoadForInspect.coordinates.length > 0) {
        setLatitude(prefilledRoadForInspect.coordinates[0][0]);
        setLongitude(prefilledRoadForInspect.coordinates[0][1]);
      }
    } else if (roads.length > 0 && !selectedRoadId) {
      // Default to first road
      const defaultRoad = roads[0];
      setSelectedRoadId(defaultRoad.id);
      if (defaultRoad.coordinates && defaultRoad.coordinates.length > 0) {
        setLatitude(defaultRoad.coordinates[0][0]);
        setLongitude(defaultRoad.coordinates[0][1]);
      }
    }
  }, [prefilledRoadForInspect, roads]);

  const handleRoadChange = (e) => {
    const roadId = parseInt(e.target.value);
    setSelectedRoadId(roadId);
    const matched = roads.find((r) => r.id === roadId);
    if (matched && matched.coordinates && matched.coordinates.length > 0) {
      setLatitude(matched.coordinates[0][0]);
      setLongitude(matched.coordinates[0][1]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setActivePreset(null);
      setError(null);
    }
  };

  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    setLatitude(preset.coords.lat);
    setLongitude(preset.coords.lng);

    // Generate synthetic damage canvas for fast viva loading
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 640, 480);
    
    // Lane markings
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 6;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(320, 480);
    ctx.stroke();

    ctx.setLineDash([]);
    if (preset.id === 'cavein') {
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(320, 260, 130, 70, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (preset.id === 'waterlogging') {
      ctx.fillStyle = '#1E3A5F';
      ctx.beginPath();
      ctx.ellipse(340, 280, 150, 80, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (preset.id === 'crack') {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(180, 180);
      ctx.lineTo(260, 260);
      ctx.lineTo(360, 230);
      ctx.lineTo(440, 320);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(300, 270, 90, 50, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      const file = new File([blob], `${preset.id}_inspection.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(canvas.toDataURL('image/jpeg'));
    }, 'image/jpeg');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an inspection photo or choose one of the sample defect chips.');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('region', currentRegion);
      if (selectedRoadId) {
        formData.append('road_id', selectedRoadId);
      }

      const res = await axios.post('/api/complaints/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(res.data);
      if (res.data?.complaint) {
        addNewComplaint(res.data.complaint);
      } else {
        refreshData();
      }
    } catch (err) {
      console.error('AI inspection failed:', err);
      setError(err.response?.data?.detail || 'Inference engine communication error.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div className="text-center space-y-2 pb-6 border-b border-[#E2E8F0]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0F2342] text-white text-[10px] font-mono font-bold tracking-widest uppercase">
          AI Civic Audit Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2342] tracking-tight">
          AI Road Damage Inspector
        </h1>
        <p className="text-xs text-[#64748B] max-w-lg mx-auto leading-relaxed">
          Ultralytics YOLOv8 defect inference, dynamic severity calculation, and statutory SLA authority dispatch.
        </p>
      </div>

      {/* Step 1: Input Panel */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F2342]">
            Step 1 — Upload Surface Photo & Select Corridor
          </span>
          <span className="text-[11px] text-[#64748B] font-mono">
            YOLOv8 Engine Ready
          </span>
        </div>

        {/* Clean Dashed-Gold Dropzone */}
        <div className="relative border-2 border-dashed border-[#B48A3E]/40 hover:border-[#B48A3E] bg-[#FAF9F6] p-6 text-center rounded-xl transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {previewUrl ? (
            <div className="space-y-2">
              <img
                src={previewUrl}
                alt="Uploaded Defect Preview"
                className="max-h-52 rounded-lg mx-auto object-cover border border-[#E2E8F0] shadow-xs"
              />
              <div className="text-xs text-[#64748B] font-mono">
                {selectedFile?.name || 'Inspection Image Loaded'} • Click or drop to replace
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <UploadCloud className="w-9 h-9 text-[#B48A3E] mx-auto" />
              <p className="text-xs font-semibold text-[#0F2342]">
                Select a road defect photo, or drag and drop
              </p>
              <p className="text-[11px] text-[#64748B]">Supports JPG, PNG (Potholes, Cracks, Cave-ins, Waterlogging)</p>
            </div>
          )}
        </div>

        {/* Quick Sample Defect Chips (1-Click Viva Presets) */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            Or choose a 1-click sample defect chip:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-2 rounded text-left text-xs border transition-all ${
                  activePreset === p.id
                    ? 'border-[#B48A3E] bg-[#FDF8EE] text-[#0F2342] font-bold shadow-2xs'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F2342]'
                }`}
              >
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-[10px] text-[#64748B] truncate mt-0.5">{p.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Minimal Inline Selector for Road Stretch & GPS (Auto-Filled) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2">
          <div className="sm:col-span-7 space-y-1">
            <label className="text-xs font-semibold text-[#64748B] block">
              Monitored Road Corridor
            </label>
            <select
              value={selectedRoadId}
              onChange={handleRoadChange}
              className="w-full bg-[#FAF9F6] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#0F2342] focus:outline-none focus:border-[#0F2342] font-medium"
            >
              {roads.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.road_type}] {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-5 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#64748B] block">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full bg-[#FAF9F6] border border-[#CBD5E1] rounded px-2.5 py-2 text-xs font-mono text-[#0F2342] focus:outline-none focus:border-[#0F2342] tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#64748B] block">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full bg-[#FAF9F6] border border-[#CBD5E1] rounded px-2.5 py-2 text-xs font-mono text-[#0F2342] focus:outline-none focus:border-[#0F2342] tabular-nums"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ONE Imperial Navy Primary Action Button */}
        <button
          type="submit"
          disabled={analyzing}
          className="w-full py-3.5 px-6 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#0F2342] hover:bg-[#162D4F] text-white transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Defect via YOLOv8 & Routing to Authority...</span>
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4 text-[#B48A3E]" />
              <span>Run AI Audit & Route Complaint</span>
            </>
          )}
        </button>
      </form>

      {/* Step 2: Result Dossier (Smoothly revealed structured official receipt) */}
      {result && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#B48A3E]/40 shadow-sm space-y-6 animate-scale-up">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#B48A3E] block">
                Official Receipt Issued
              </span>
              <h2 className="text-lg font-serif font-bold text-[#0F2342]">
                Statutory Defect Audit Dossier
              </h2>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#0F2342] text-[#B48A3E] font-bold">
              {result.complaint.tracking_id}
            </span>
          </div>

          {/* Structured Two-Column Receipt */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: YOLOv8 Annotated Image */}
            <div className="md:col-span-5 space-y-2">
              <div className="rounded-lg overflow-hidden border border-[#E2E8F0] bg-slate-900/5 relative shadow-2xs">
                <div className="absolute top-2 left-2 bg-[#0F2342]/90 text-white text-[9px] px-2 py-0.5 rounded font-mono font-bold z-10 border border-[#B48A3E]/40">
                  Confidence: {(result.ai_detection.confidence * 100).toFixed(1)}%
                </div>
                <img
                  src={resolveEvidenceUrl(result.ai_detection.evidence_image_url)}
                  alt="YOLOv8 Output"
                  className="w-full max-h-56 object-contain mx-auto"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_EVIDENCE_FRAME;
                  }}
                />
              </div>
              <p className="text-[11px] text-[#64748B] text-center font-mono">
                BBox Area: {result.ai_detection.area_percentage}% of camera frame
              </p>
            </div>

            {/* Right: Structured Key-Value Summary Table */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="border border-[#E2E8F0] rounded-lg overflow-hidden divide-y divide-[#E2E8F0] text-xs">
                <div className="flex justify-between p-2.5 bg-[#FAF9F6]">
                  <span className="text-[#64748B] font-medium">Tracking ID</span>
                  <span className="font-mono font-bold text-[#0F2342]">{result.complaint.tracking_id}</span>
                </div>

                <div className="flex justify-between p-2.5 bg-white">
                  <span className="text-[#64748B] font-medium">Detected Defect Class</span>
                  <span className="font-bold text-[#0F2342]">{result.ai_detection.primary_damage}</span>
                </div>

                <div className="flex justify-between p-2.5 bg-[#FAF9F6]">
                  <span className="text-[#64748B] font-medium">Severity & Legal SLA</span>
                  <span className="font-bold text-[#B48A3E] font-mono tabular-nums">
                    {result.ai_detection.severity} ({result.ai_detection.sla_hours} Hours SLA)
                  </span>
                </div>

                <div className="flex justify-between p-2.5 bg-white">
                  <span className="text-[#64748B] font-medium">Auto-Routed Authority</span>
                  <span className="font-bold text-[#0F2342] text-right truncate max-w-[200px]" title={result.routing.routed_authority}>
                    {result.routing.routed_authority}
                  </span>
                </div>

                <div className="flex justify-between p-2.5 bg-[#FAF9F6]">
                  <span className="text-[#64748B] font-medium">Escalation Hierarchy</span>
                  <span className="font-mono text-[11px] text-[#1E293B] text-right truncate max-w-[200px]" title={result.routing.escalation_ladder}>
                    {result.routing.escalation_ladder}
                  </span>
                </div>
              </div>

              {/* Minimal Navigation Links */}
              <div className="flex items-center justify-between text-xs pt-1">
                <Link
                  to="/map"
                  className="text-[#0F2342] hover:text-[#B48A3E] font-semibold hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Locate Pin on Map</span>
                </Link>
                <Link
                  to="/ledger"
                  className="text-[#0F2342] hover:text-[#B48A3E] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Review in Accountability Ledger →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
