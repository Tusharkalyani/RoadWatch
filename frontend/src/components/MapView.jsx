import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Refined Severity Pins
const createSeverityIcon = (severity) => {
  const colorMap = {
    Critical: '#B91C1C', // Crimson
    High: '#EA580C',     // Orange
    Medium: '#C27803',   // Amber
    Low: '#107548',      // Forest Emerald
  };
  const color = colorMap[severity] || '#B91C1C';
  const isCritical = severity === 'Critical';

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
      ${isCritical ? '<div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(185, 28, 28, 0.25);" class="royal-pulse"></div>' : ''}
      <div style="width: 18px; height: 18px; border-radius: 9999px; background: ${color}; border: 2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(15, 35, 66, 0.2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; font-family: sans-serif;">
        !
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-defect-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function MapClickListener({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function MapRecenter({ region }) {
  const map = useMap();
  useEffect(() => {
    if (region === 'BLR') {
      map.flyTo([12.9450, 77.5850], 12, { duration: 1.2 });
    } else {
      map.flyTo([23.0775, 76.8513], 13, { duration: 1.2 });
    }
  }, [region, map]);
  return null;
}

export default function MapView({
  region,
  roads,
  complaints,
  selectedRoad,
  onSelectRoad,
  onSelectComplaint,
  onPickCoordinates
}) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'NH' | 'SH' | 'MDR'
  const [clickedCoord, setClickedCoord] = useState(null);

  const initialCenter = region === 'BLR' ? [12.9450, 77.5850] : [23.0775, 76.8513];
  const initialZoom = region === 'BLR' ? 12 : 13;

  const getRoadColor = (score) => {
    if (score >= 70) return '#107548'; // Forest Emerald
    if (score >= 40) return '#C27803'; // Amber
    return '#B91C1C'; // Crimson
  };

  const handleMapClick = (coords) => {
    setClickedCoord(coords);
    if (onPickCoordinates) {
      onPickCoordinates(coords);
    }
  };

  const clickedIcon = L.divIcon({
    html: `
      <div style="width: 22px; height: 22px; border-radius: 9999px; background: #0F2342; border: 2px solid #B48A3E; box-shadow: 0 2px 6px rgba(15,35,66,0.3); display: flex; align-items: center; justify-content: center; color: #B48A3E; font-size: 11px; font-weight: bold;">
        +
      </div>
    `,
    className: 'custom-click-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  // Filter roads cleanly according to the top-left floating pill bar
  const filteredRoads = roads.filter((r) => {
    if (filter === 'CRITICAL') return r.road_health_score < 50;
    if (filter === 'NH') return r.road_type === 'NH';
    if (filter === 'SH') return r.road_type === 'SH';
    if (filter === 'MDR') return r.road_type === 'MDR';
    return true;
  });

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Free OpenStreetMap (OSM) Tile Layer (No API Key Required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapRecenter region={region} />
        <MapClickListener onMapClick={handleMapClick} />

        {/* Filtered Road Polylines */}
        {filteredRoads.map((road) => {
          const isSelected = selectedRoad?.id === road.id;
          const color = getRoadColor(road.road_health_score);

          return (
            <Polyline
              key={road.id}
              positions={road.coordinates}
              pathOptions={{
                color: isSelected ? '#0F2342' : color,
                weight: isSelected ? 8 : 5,
                opacity: isSelected ? 1 : 0.85,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: road.road_type === 'MDR' ? '6, 8' : undefined
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectRoad(road);
                },
              }}
            >
              <Tooltip sticky>
                <div className="p-1 font-sans text-xs bg-white text-[#0F2342]">
                  <div className="font-serif font-bold text-[#0F2342] flex items-center gap-1.5">
                    <span>{road.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-[#64748B] border border-[#CBD5E1]">
                      {road.road_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Health Score: <span className="font-bold tabular-nums" style={{ color }}>{road.road_health_score}/100</span>
                  </div>
                  <div className="text-[10px] text-[#B48A3E] font-medium mt-0.5">Click to open Road Dossier</div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Defect Markers */}
        {complaints
          .filter(
            (c) =>
              typeof c.latitude === 'number' &&
              typeof c.longitude === 'number' &&
              !isNaN(c.latitude) &&
              !isNaN(c.longitude)
          )
          .map((c) => (
            <Marker
              key={c.id || c.tracking_id}
              position={[c.latitude, c.longitude]}
              icon={createSeverityIcon(c.severity)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectComplaint(c);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <div className="p-1 font-sans text-xs bg-white text-[#0F2342]">
                  <div className="font-mono font-bold text-[#0F2342]">{c.tracking_id}</div>
                  <div className="text-[#1E293B] font-semibold">{c.damage_type} ({c.severity})</div>
                  <div className="text-[10px] text-[#B48A3E] mt-0.5 font-medium">Click to inspect machine-vision receipt</div>
                </div>
              </Tooltip>
            </Marker>
          ))}

        {/* Clicked coordinate marker */}
        {clickedCoord && (
          <Marker position={[clickedCoord.lat, clickedCoord.lng]} icon={clickedIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <strong className="text-[#0F2342] block font-mono">Selected Point</strong>
                <span className="text-[#64748B] block font-mono mt-0.5 tabular-nums">
                  {clickedCoord.lat.toFixed(5)}, {clickedCoord.lng.toFixed(5)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Single Subtle Floating Filter Pill Bar at Top-Left (No Extra Map Buttons) */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-full border border-[#E2E8F0] p-1 shadow-sm flex items-center gap-1 text-xs">
          {[
            { id: 'ALL', label: 'All Roads' },
            { id: 'CRITICAL', label: 'Critical / Poor' },
            { id: 'NH', label: 'NH' },
            { id: 'SH', label: 'SH' },
            { id: 'MDR', label: 'MDR' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filter === item.id
                  ? 'bg-[#0F2342] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F2342] hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
