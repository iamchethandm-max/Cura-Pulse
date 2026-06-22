import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PatientBooking from './components/PatientBooking';
import DoctorPortal from './components/DoctorPortal';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import AnalyticsPanel from './components/AnalyticsPanel';
import { AppState, Doctor, Appointment, SystemSettings, WebhookLog, UserRole, IntakeForm, Medication } from './types';
import { 
  Heart, 
  Stethoscope, 
  Calendar, 
  Users, 
  Settings, 
  ShieldAlert, 
  Laptop, 
  Activity, 
  TrendingUp, 
  Video, 
  FileCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<UserRole>('patient');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('doc_1');
  const [loading, setLoading] = useState<boolean>(true);
  const [state, setState] = useState<AppState>({
    doctors: [],
    appointments: [],
    settings: {
      systemMode: 'hospital',
      reminderBufferMinutes: 30,
      patientTemplate: '',
      doctorTemplate: '',
      webhookEmailUrl: '',
      webhookSmsUrl: '',
      webhookWhatsappUrl: ''
    },
    webhookLogs: []
  });

  // Fetch application state from Express backend
  const fetchAppState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
        // Sync selected doctor if empty
        if (data.doctors && data.doctors.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(data.doctors[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load CuraPulse backend state", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppState();
  }, []);

  // 1. Book clinical appointment
  const handleBookAppointment = async (bookingData: {
    doctorId: string;
    patientName: string;
    patientAge: number;
    patientGender: 'Male' | 'Female' | 'Other';
    patientContact: string;
    appointmentDate: string;
    appointmentTime: string;
    telehealthEnabled: boolean;
  }) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAppState(); // Reload latest state
        return { success: true, appointment: data.appointment };
      }
      return { success: false };
    } catch (err) {
      console.error("Booking api failed", err);
      throw err;
    }
  };

  // 2. Mark arrived / Update status
  const handleUpdateStatus = async (apptId: string, status: any) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchAppState();
      }
    } catch (err) {
      console.error("Failed to update appointment status", err);
    }
  };

  // 3. Hand tablet client and register Intake
  const handleSubmitIntake = async (apptId: string, intakeData: IntakeForm) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intakeData)
      });
      if (res.ok) {
        await fetchAppState();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error("Intake register failed", err);
      throw err;
    }
  };

  // 4. Save and issue prescription
  const handleSavePrescription = async (appointmentId: string, rx: {
    notes: string;
    medications: Medication[];
    sentChannels: ('Email' | 'SMS' | 'WhatsApp')[];
  }) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rx)
      });
      if (res.ok) {
        await fetchAppState();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error("Prescription dispatch failed", err);
      throw err;
    }
  };

  // 5. Update Doctor Self-Service Profile
  const handleUpdateDoctor = async (doctorId: string, docData: Partial<Doctor>) => {
    try {
      const res = await fetch(`/api/doctors/${doctorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docData)
      });
      if (res.ok) {
        await fetchAppState();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error("Doctor profile save failed", err);
      throw err;
    }
  };

  // 6. Save central operations Settings
  const handleSaveSettings = async (settingsData: Partial<SystemSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      if (res.ok) {
        await fetchAppState();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error("Settings save failed", err);
      throw err;
    }
  };

  // 7. Manually trigger background Reminders Task Cron
  const handleTriggerReminders = async (forceAll: boolean) => {
    try {
      const res = await fetch('/api/reminders/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAppState();
        return { success: true, ...data };
      }
      return { success: false };
    } catch (err) {
      console.error("Trigger reminders failed", err);
      throw err;
    }
  };

  // Quick switch of default system mode from navbar
  const handleToggleSystemMode = async () => {
    const nextMode = state.settings.systemMode === 'clinic' ? 'hospital' : 'clinic';
    await handleSaveSettings({ systemMode: nextMode });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12" id="curapulse-loading-screen">
        <div className="bg-[#005A9C] text-white p-3.5 rounded-2xl animate-spin mb-4 shadow-lg">
          <Activity className="h-8 w-8" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Initializing CuraPulse Operations Core...</h3>
        <p className="text-xs text-slate-400 mt-1">Splicing Express state adapters & microservices</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" id="curapulse-application-root">
      
      {/* Dynamic Navigation Toolbar Header */}
      <Navbar
        currentRole={role}
        setRole={setRole}
        systemMode={state.settings.systemMode}
        toggleSystemMode={handleToggleSystemMode}
        selectedDoctorId={selectedDoctorId}
        setSelectedDoctorId={setSelectedDoctorId}
        allDoctors={state.doctors.map(d => ({ id: d.id, name: d.name }))}
      />

      {/* Main Container Stage */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="curapulse-main-stage">
        
        {/* ROLE 1: PATIENT PORTAL PORTVIEW */}
        {role === 'patient' && (
          <div className="space-y-8" id="patient-portal-stage">
            {/* Split layout: Schedule on left/center, active queue list in sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              <div className="lg:col-span-3">
                <PatientBooking 
                  doctors={state.doctors}
                  systemMode={state.settings.systemMode}
                  onBookAppointment={handleBookAppointment}
                />
              </div>

              {/* Sidebar Patient Registrations overview */}
              <div className="lg:col-span-1 space-y-6 text-left" id="patient-sidebar-recordings">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                  <h3 className="text-xs font-extrabold text-slate-800 mb-4 uppercase tracking-widest flex items-center space-x-1.5">
                    <FileCheck className="h-4 w-4 text-[#005A9C]" />
                    <span>My Registered Consultations</span>
                  </h3>

                  <div className="space-y-3.5">
                    {state.appointments.length === 0 ? (
                      <p className="text-slate-400 text-xs italic text-center py-4">No reservations recorded yet.</p>
                    ) : (
                      state.appointments.slice(0, 5).map(appt => (
                        <div key={appt.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] text-[#005A9C] font-semibold bg-[#005A9C]/5 px-2 py-0.5 rounded-md">
                              {appt.id}
                            </span>
                            <span className={`text-[8px] font-bold uppercase py-0.5 px-2 rounded-full ${
                              appt.status === 'Confirmed'
                                ? 'bg-[#005A9C]/10 text-[#005A9C]'
                                : appt.status === 'Arrived'
                                ? 'bg-amber-100 text-amber-800'
                                : appt.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {appt.status}
                            </span>
                          </div>
                          
                          <h4 className="text-xs font-bold text-slate-900 mt-2">{appt.doctorName}</h4>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {appt.appointmentDate} @ {appt.appointmentTime}
                          </span>

                          {appt.telehealthEnabled && appt.status === 'Confirmed' && (
                            <a 
                              href={appt.telehealthLink} 
                              target="_blank" 
                              referrerPolicy="no-referrer"
                              className="mt-2 text-[10px] font-bold text-center py-1 bg-[#00A896] text-white rounded-lg flex items-center justify-center space-x-1 hover:bg-opacity-95"
                            >
                              <Video className="h-3 w-3" />
                              <span>Join Virtual Consultation</span>
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-400 mt-4 text-center">Displaying your latest 5 bookings. System is set up with persistent state.</p>
                </div>

                {/* Patient Information guide */}
                <div className="bg-gradient-to-br from-[#005A9C]/5 to-[#00A896]/5 border border-slate-200 rounded-3xl p-5 text-left space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <HelpCircle className="h-4 w-4 text-[#005A9C]" />
                    <span>General Directives</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    1. For in-clinic sessions, please arrive 15 minutes early so front-desk receptionists can log blood pressures, heartrates and allergens using our clinical tablet.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    2. For telemedicine appointments, a secure secure audio-video Jitsi pipeline will activate 5 minutes before scheduled consulting hours.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ROLE 2: DOCTOR SELF-SERVICE SUITE */}
        {role === 'doctor' && (
          <div id="doctor-portal-stage">
            <DoctorPortal
              doctors={state.doctors}
              selectedDoctorId={selectedDoctorId}
              setSelectedDoctorId={setSelectedDoctorId}
              appointments={state.appointments}
              onUpdateDoctor={handleUpdateDoctor}
              onSavePrescription={handleSavePrescription}
            />
          </div>
        )}

        {/* ROLE 3: RECEPTIONIST FRONT-DESK & SYSTEM AUDITING */}
        {role === 'receptionist' && (
          <div className="space-y-8" id="front-desk-stage">
            
            {/* Quick KPI Overview bar in Front Desk view */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-left" id="receptionist-header-summary">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Front desk Operations Control</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manage physician loads, run virtual digital patient check-ins, configure notification layouts, and inspect telemetry webhook pings.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Mode Active:</span>
                  <span className={`text-xs font-bold py-1 px-3 rounded-full uppercase ${
                    state.settings.systemMode === 'clinic' 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {state.settings.systemMode === 'clinic' ? 'Single Clinic Mode' : 'Hospital Mode (Directory Active)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dashboard Subcomponents Toggle tabs */}
            <ReceptionistDashboard
              appointments={state.appointments}
              doctors={state.doctors}
              settings={state.settings}
              webhookLogs={state.webhookLogs}
              onUpdateStatus={handleUpdateStatus}
              onSaveSettings={handleSaveSettings}
              onTriggerReminders={handleTriggerReminders}
              onSubmitIntake={handleSubmitIntake}
            />

            {/* Inline Analytics widget showing summary graphics */}
            <div className="border-t border-slate-200 pt-8 text-left">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800">Operational Real-Time Informatics</h3>
                <p className="text-xs text-slate-400">Lightweight analytics derived dynamically from scheduling database state records.</p>
              </div>
              <AnalyticsPanel
                appointments={state.appointments}
                doctors={state.doctors}
              />
            </div>

          </div>
        )}

      </main>

      {/* Unified Footers */}
      <footer className="bg-slate-900 text-slate-500 py-8 border-t border-slate-800 text-xs mt-12 text-center" id="curapulse-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Activity className="h-5 w-5 text-[#00A896]" />
              <span>CuraPulse Healthcare Management System</span>
            </div>
            <div className="flex space-x-4">
              <span className="hover:text-white cursor-pointer">HIPAA Compliance Guidelines</span>
              <span>·</span>
              <span className="hover:text-white cursor-pointer">Security Protocol Logs</span>
              <span>·</span>
              <span className="hover:text-white cursor-pointer">Enterprise API licensing</span>
            </div>
          </div>
          <p className="text-slate-500 text-[10px] text-left max-w-3xl leading-relaxed">
            Legal Disclaimer: This sandboxed operational interface mimics clinic scheduling pipelines, omnichannel notifications triggers (SMS, Email, WhatsApp Business Meta Node hooks), doctor availability matrices, and patient diagnostics flows. It is built strictly for HIPAA demonstration purposes and sandbox evaluation metrics.
          </p>
          <div className="flex justify-between items-center border-t border-slate-800 pt-4 text-[10px] text-slate-600">
            <span>© 2026 CuraPulse Inc. All rights reserved.</span>
            <span>Local Node: Sandbox Container Running Port 3000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
