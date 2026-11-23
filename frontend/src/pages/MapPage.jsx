import React from 'react';
import { useRoadWatch } from '../context/RoadWatchContext';
import MapView from '../components/MapView';
import RoadDetailDrawer from '../components/RoadDetailDrawer';
import EvidenceModal from '../components/EvidenceModal';

export default function MapPage() {
  const {
    currentRegion,
    roads,
    complaints,
    loading,
    selectedRoad,
    setSelectedRoad,
    selectedComplaint,
    setSelectedComplaint,
    refreshData
  } = useRoadWatch();

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-[#FAF9F6]">
      {/* Loading GIS Telemetry Indicator */}
      {loading && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#E2E8F0] shadow-sm flex items-center gap-2 text-xs font-mono text-[#0F2342] animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-[#0F2342] border-t-transparent animate-spin" />
          <span>Syncing GIS Corridors...</span>
        </div>
      )}

      {/* 100% Unobstructed Clean Map Canvas with Free OpenStreetMap */}
      <div className="flex-1 relative overflow-hidden">
        <MapView
          region={currentRegion}
          roads={roads}
          complaints={complaints}
          selectedRoad={selectedRoad}
          onSelectRoad={(r) => setSelectedRoad(r)}
          onSelectComplaint={(c) => setSelectedComplaint(c)}
          onPickCoordinates={() => {}}
        />
      </div>

      {/* Progressive Disclosure: Right-Hand Road & Budget Dossier Drawer */}
      {selectedRoad && (
        <RoadDetailDrawer
          road={selectedRoad}
          onClose={() => setSelectedRoad(null)}
          onSelectComplaint={(c) => setSelectedComplaint(c)}
        />
      )}

      {/* Progressive Disclosure: Evidence Modal */}
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
