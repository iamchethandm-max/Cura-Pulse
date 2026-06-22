import React from 'react';
import { UserRole, SystemMode } from '../types';
import { Activity, Stethoscope, Users, User, ShieldAlert, Settings } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  systemMode: SystemMode;
  toggleSystemMode: () => void;
  selectedDoctorId: string;
  setSelectedDoctorId: (id: string) => void;
  allDoctors: { id: string; name: string }[];
}

export default function Navbar({
  currentRole,
  setRole,
  systemMode,
  toggleSystemMode,
  selectedDoctorId,
  setSelectedDoctorId,
  allDoctors
}: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs" id="curapulse-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Brand */}
          <div className="flex items-center space-x-2" id="nav-brand">
            <div className="bg-[#005A9C] text-white p-2 rounded-xl flex items-center justify-center animate-pulse">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">CuraPulse</span>
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                v1.2.0
              </span>
            </div>
          </div>

          {/* Quick Config: System Variant toggle */}
          <div className="hidden md:flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 space-x-1" id="variant-config-selectors">
            <span className="text-xs font-semibold text-slate-500 px-2">Mode:</span>
            <button
              onClick={() => toggleSystemMode()}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                systemMode === 'clinic'
                  ? 'bg-white text-[#005A9C] shadow-xs ring-1 ring-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="btn-toggle-mode-clinic"
            >
              1. Individual Clinic
            </button>
            <button
              onClick={() => toggleSystemMode()}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                systemMode === 'hospital'
                  ? 'bg-white text-[#00A896] shadow-xs ring-1 ring-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="btn-toggle-mode-hospital"
            >
              2. Hospital Directory
            </button>
          </div>

          {/* Persona selector tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2" id="persona-tabs">
            <span className="text-xs text-slate-400 font-medium hidden lg:inline mr-2">Simulate Access:</span>
            
            <button
              onClick={() => setRole('patient')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                currentRole === 'patient'
                  ? 'bg-[#005A9C]/10 text-[#005A9C] font-bold border border-[#005A9C]/20'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
              title="Patient Portal"
              id="role-tab-patient"
            >
              <User className="h-4 w-4" />
              <span>Patient</span>
            </button>

            <button
              onClick={() => setRole('doctor')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                currentRole === 'doctor'
                  ? 'bg-[#00A896]/10 text-[#00A896] font-bold border border-[#00A896]/20'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
              title="Doctor Consultation Portal"
              id="role-tab-doctor"
            >
              <Stethoscope className="h-4 w-4" />
              <span>Doctor</span>
            </button>

            <button
              onClick={() => setRole('receptionist')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                currentRole === 'receptionist'
                  ? 'bg-amber-500/10 text-amber-700 font-bold border border-amber-500/20'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
              title="Centralized Booking Console"
              id="role-tab-receptionist"
            >
              <Users className="h-4 w-4" />
              <span>Admin / Front desk</span>
            </button>
          </div>
        </div>

        {/* Small mobile row for configurations and active doctor selector */}
        <div className="flex flex-wrap items-center justify-between py-2 border-t border-slate-100 gap-2 md:hidden">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => toggleSystemMode()}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md ${
                systemMode === 'clinic' ? 'bg-white text-[#005A9C] font-bold' : 'text-slate-600'
              }`}
            >
              Clinic Mode
            </button>
            <button
              onClick={() => toggleSystemMode()}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md ${
                systemMode === 'hospital' ? 'bg-white text-[#00A896] font-bold' : 'text-slate-600'
              }`}
            >
              Hospital Mode
            </button>
          </div>

          {currentRole === 'doctor' && (
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">As Dr:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-white border border-slate-200 rounded-md p-0.5 text-slate-800 font-medium"
              >
                {allDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name.split(' ').slice(1).join(' ')}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
