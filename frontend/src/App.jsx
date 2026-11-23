import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoadWatchProvider } from './context/RoadWatchContext';
import Header from './components/Header';
import OverviewPage from './pages/OverviewPage';
import MapPage from './pages/MapPage';
import InspectPage from './pages/InspectPage';
import LedgerPage from './pages/LedgerPage';

export default function App() {
  return (
    <RoadWatchProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#FAF9F6] text-[#1E293B] flex flex-col font-sans selection:bg-[#B48A3E]/20 selection:text-[#0F2342]">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/inspect" element={<InspectPage />} />
              <Route path="/ledger" element={<LedgerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </RoadWatchProvider>
  );
}
