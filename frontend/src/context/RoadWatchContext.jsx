import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const RoadWatchContext = createContext(null);

export function RoadWatchProvider({ children }) {
  const [currentRegion, setCurrentRegion] = useState('MP'); // 'MP' | 'BLR'
  const [roads, setRoads] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inspector & Modal state
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [prefilledRoadForInspect, setPrefilledRoadForInspect] = useState(null);

  const fetchData = useCallback(async (region = currentRegion) => {
    try {
      setLoading(true);
      setError(null);
      const [roadsRes, compRes, statsRes] = await Promise.all([
        axios.get(`/api/roads?region=${region}&limit=400`),
        axios.get(`/api/complaints?region=${region}`),
        axios.get(`/api/stats?region=${region}`),
      ]);
      setRoads(roadsRes.data || []);
      setComplaints(compRes.data || []);
      setStats(statsRes.data || null);

      setSelectedRoad((prevSelected) => {
        if (!prevSelected) return null;
        const match = (roadsRes.data || []).find((r) => r.id === prevSelected.id);
        return match || prevSelected;
      });
    } catch (err) {
      console.error('Failed to fetch RoadWatch data:', err);
      setError('Could not connect to the backend server. Please verify FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, [currentRegion]);

  useEffect(() => {
    fetchData(currentRegion);
  }, [currentRegion]);

  const changeRegion = (newRegion) => {
    if (newRegion !== currentRegion) {
      setSelectedRoad(null);
      setCurrentRegion(newRegion);
    }
  };

  /**
   * Immediately adds a newly filed complaint into local state,
   * updates KPI stats & road health score instantaneously across all 4 pages,
   * and syncs with backend in background.
   */
  const addNewComplaint = useCallback((newComplaint) => {
    if (!newComplaint) return;

    // 1. Immediately prepend to complaints state
    setComplaints((prev) => {
      const exists = prev.some((c) => c.id === newComplaint.id || c.tracking_id === newComplaint.tracking_id);
      if (exists) return prev;
      return [newComplaint, ...prev];
    });

    // 2. Immediately increment KPI numbers on '/'
    setStats((prevStats) => {
      if (!prevStats) return prevStats;
      const isCritical = newComplaint.severity === 'Critical';
      return {
        ...prevStats,
        total_complaints: (prevStats.total_complaints || 0) + 1,
        open_complaints: (prevStats.open_complaints || 0) + 1,
        critical_alerts: isCritical ? (prevStats.critical_alerts || 0) + 1 : (prevStats.critical_alerts || 0),
      };
    });

    // 3. Immediately update the road's complaints array and deduce health score
    if (newComplaint.road_id) {
      setRoads((prevRoads) =>
        prevRoads.map((r) => {
          if (r.id === newComplaint.road_id) {
            const updatedComplaints = [
              {
                id: newComplaint.id,
                tracking_id: newComplaint.tracking_id,
                damage_type: newComplaint.damage_type,
                severity: newComplaint.severity,
                status: newComplaint.status || 'Open',
                created_at: newComplaint.created_at || new Date().toISOString(),
              },
              ...(r.complaints || []),
            ];
            const penalty = newComplaint.severity === 'Critical' ? 15 : newComplaint.severity === 'High' ? 10 : 5;
            const newScore = Math.max(10, (r.road_health_score || 70) - penalty);
            return {
              ...r,
              complaints: updatedComplaints,
              road_health_score: newScore,
            };
          }
          return r;
        })
      );
    }

    // 4. Background sync with backend
    fetchData(currentRegion);
  }, [currentRegion, fetchData]);

  /**
   * Immediately updates a complaint's status in local state and calls backend.
   */
  const updateComplaintStatus = useCallback(async (complaintId, newStatus) => {
    // Optimistic local update
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
    );

    // Update stats
    setStats((prevStats) => {
      if (!prevStats) return prevStats;
      const wasOpen = prevStats.open_complaints || 0;
      const wasResolved = prevStats.resolved_complaints || 0;
      if (newStatus === 'Resolved') {
        return {
          ...prevStats,
          open_complaints: Math.max(0, wasOpen - 1),
          resolved_complaints: wasResolved + 1,
        };
      } else if (newStatus === 'Open' || newStatus === 'In Progress') {
        return {
          ...prevStats,
          open_complaints: wasOpen + 1,
          resolved_complaints: Math.max(0, wasResolved - 1),
        };
      }
      return prevStats;
    });

    try {
      await axios.patch(`/api/complaints/${complaintId}/status?status=${encodeURIComponent(newStatus)}`);
    } catch (err) {
      console.error('Status sync error:', err);
    } finally {
      fetchData(currentRegion);
    }
  }, [currentRegion, fetchData]);

  return (
    <RoadWatchContext.Provider
      value={{
        currentRegion,
        setCurrentRegion: changeRegion,
        roads,
        complaints,
        stats,
        loading,
        error,
        refreshData: () => fetchData(currentRegion),
        addNewComplaint,
        updateComplaintStatus,
        selectedRoad,
        setSelectedRoad,
        selectedComplaint,
        setSelectedComplaint,
        prefilledRoadForInspect,
        setPrefilledRoadForInspect,
      }}
    >
      {children}
    </RoadWatchContext.Provider>
  );
}

export function useRoadWatch() {
  const ctx = useContext(RoadWatchContext);
  if (!ctx) {
    throw new Error('useRoadWatch must be used within a RoadWatchProvider');
  }
  return ctx;
}