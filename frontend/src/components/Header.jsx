import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function Header() {
  const navItems = [
    { name: 'Executive Overview', path: '/' },
    { name: 'Tap-a-Road GIS Map', path: '/map' },
    { name: 'AI Damage Inspector', path: '/inspect' },
    { name: 'Accountability Ledger', path: '/ledger' },
  ];

  return (
    <header className="bg-[#0F2342] border-b border-[#1E3A5F] text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Formal Civic Brand */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-md bg-[#162D4F] border border-[#B48A3E]/40 flex items-center justify-center text-[#B48A3E] shadow-sm group-hover:border-[#B48A3E] transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif tracking-wider font-bold text-base text-white">
                  ROADWATCH
                </span>
                <span className="text-[9px] font-sans font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#B48A3E]/20 text-[#B48A3E] border border-[#B48A3E]/30">
                  Civic Audit
                </span>
              </div>
              <p className="text-[10px] tracking-wide text-[#94A3B8] uppercase font-sans">
                Infrastructure Governance Platform
              </p>
            </div>
          </NavLink>

          {/* Minimal 4 Clean Text Links (Zero Extra Buttons) */}
          <nav className="flex items-center space-x-1 sm:space-x-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-2 text-xs uppercase tracking-wider transition-all font-sans ${
                    isActive
                      ? 'text-[#B48A3E] font-bold border-b-2 border-[#B48A3E]'
                      : 'text-[#CBD5E1] hover:text-white font-medium hover:border-b-2 hover:border-[#CBD5E1]/40'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
