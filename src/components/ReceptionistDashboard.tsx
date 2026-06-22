import React, { useState, useMemo } from 'react';
import { Appointment, SystemSettings, WebhookLog, Doctor, IntakeForm } from '../types';
import { 
  Users, 
  Calendar, 
  Check, 
  Clock, 
  AlertCircle, 
  UserPlus, 
  Send, 
  Settings, 
  Mail, 
  PhoneCall, 
  CheckCircle, 
  FileText, 
  RefreshCw,
  Search,
  Eye,
  Info,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface ReceptionistDashboardProps {
  appointments: Appointment[];
  doctors: Doctor[];
  settings: SystemSettings;
  webhookLogs: WebhookLog[];
  onUpdateStatus: (appointmentId: string, status: any) => Promise<any>;
  onSaveSettings: (settingsData: Partial<SystemSettings>) => Promise<any>;
  onTriggerReminders: (forceAll: boolean) => Promise<any>;
  onSubmitIntake: (appointmentId: string, intakeData: IntakeForm) => Promise<any>;
}

export default function ReceptionistDashboard({
  appointments,
  doctors,
  settings,
  webhookLogs,
  onUpdateStatus,
  onSaveSettings,
  onTriggerReminders,
  onSubmitIntake
}: ReceptionistDashboardProps) {
  const [activeSegment, setActiveSegment] = useState<'scheduler' | 'settings' | 'logs'>('scheduler');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [doctorFilter, setDoctorFilter] = useState<string>('All');

  // SETTINGS STATE FORM
  const [mode, setMode] = useState(settings.systemMode);
  const [buffer, setBuffer] = useState(settings.reminderBufferMinutes);
  const [pTemplate, setPTemplate] = useState(settings.patientTemplate);
  const [dTemplate, setDTemplate] = useState(settings.doctorTemplate);
  const [emailWeb, setEmailWeb] = useState(settings.webhookEmailUrl);
  const [smsWeb, setSmsWeb] = useState(settings.webhookSmsUrl);
  const [waWeb, setWaWeb] = useState(settings.webhookWhatsappUrl);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState({ text: '', type: '' });

  // INTAKE TABLET MODE STATE (Hand patient the tablet)
  const [tabletOpen, setTabletOpen] = useState(false);
  const [tabletAppt, setTabletAppt] = useState<Appointment | null>(null);
  
  // Intake fields
  const [inName, setInName] = useState('');
  const [inAge, setInAge] = useState(30);
  const [inGender, setInGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [inContact, setInContact] = useState('');
  const [inSymptoms, setInSymptoms] = useState('');
  const [inAllergies, setInAllergies] = useState('');
  const [inBP, setInBP] = useState('120/80');
  const [inPulse, setInPulse] = useState<number>(72);
  const [intakeSuccess, setIntakeSuccess] = useState(false);

  // LOG EXPANSION STATE
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // CRON LAUNCHER FEEDBACK
  const [cronFeedback, setCronFeedback] = useState({ active: false, text: '', triggered: 0 });

  // Sync settings inputs when props update
  React.useEffect(() => {
    setMode(settings.systemMode);
    setBuffer(settings.reminderBufferMinutes);
    setPTemplate(settings.patientTemplate);
    setDTemplate(settings.doctorTemplate);
    setEmailWeb(settings.webhookEmailUrl);
    setSmsWeb(settings.webhookSmsUrl);
    setWaWeb(settings.webhookWhatsappUrl);
  }, [settings]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const matchSearch = appt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          appt.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'All' || appt.status === statusFilter;
      const matchDoctor = doctorFilter === 'All' || appt.doctorId === doctorFilter;
      return matchSearch && matchStatus && matchDoctor;
    });
  }, [appointments, searchTerm, statusFilter, doctorFilter]);

  // Handle front desk status trigger
  const handleStatusChange = async (apptId: string, status: any) => {
    await onUpdateStatus(apptId, status);
  };

  const handleOpenTabletIntake = (appt: Appointment) => {
    setTabletAppt(appt);
    setInName(appt.patientName);
    setInAge(appt.patientAge);
    setInGender(appt.patientGender);
    setInContact(appt.patientContact);
    setInSymptoms(appt.intakeForm?.symptoms || '');
    setInAllergies(appt.intakeForm?.allergies || '');
    
    if (appt.intakeForm?.vitals) {
      setInBP(appt.intakeForm.vitals.bp || '120/80');
      setInPulse(appt.intakeForm.vitals.pulse || 72);
    } else {
      setInBP('120/80');
      setInPulse(72);
    }
    
    setIntakeSuccess(false);
    setTabletOpen(true);
  };

  // Submit hand-over clinical intake form
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tabletAppt) return;

    try {
      await onSubmitIntake(tabletAppt.id, {
        fullName: inName,
        age: Number(inAge),
        gender: inGender,
        contactNumber: inContact,
        symptoms: inSymptoms,
        allergies: inAllergies,
        vitals: {
          bp: inBP,
          pulse: inPulse ? Number(inPulse) : undefined
        }
      });
      setIntakeSuccess(true);
      setTimeout(() => {
        setTabletOpen(false);
        setTabletAppt(null);
      }, 1500);
    } catch (err) {
      alert("Error saving tablet intake form.");
    }
  };

  // Save Settings Form
  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsFeedback({ text: '', type: '' });
    try {
      await onSaveSettings({
        systemMode: mode,
        reminderBufferMinutes: Number(buffer),
        patientTemplate: pTemplate,
        doctorTemplate: dTemplate,
        webhookEmailUrl: emailWeb,
        webhookSmsUrl: smsWeb,
        webhookWhatsappUrl: waWeb
      });
      setSettingsFeedback({ text: 'Operations and webhook configurations committed successfully!', type: 'success' });
    } catch (err: any) {
      setSettingsFeedback({ text: err.message || 'Error occurred.', type: 'err' });
    } finally {
      setSettingsLoading(false);
    }
  };

  // Manual cron scheduler
  const triggerRemindersCron = async () => {
    setCronFeedback({ active: true, text: 'Executing automated background scheduler scans...', triggered: 0 });
    try {
      const response = await onTriggerReminders(true); // force all for demonstration
      if (response && response.success) {
        setCronFeedback({
          active: false,
          text: `Task Scheduler Run Complete. Processed ${response.processedAppointments} rows. Triggered ${response.triggeredToday} near-time notifications.`,
          triggered: response.triggeredToday
        });
      }
    } catch (err) {
      setCronFeedback({ active: false, text: 'Cron execution failure.', triggered: 0 });
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-2" id="receptionist-dashboard-root">
      {/* Sub Tabs Buttons */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 mb-6 gap-4" id="frontdesk-toolbar">
        <div className="flex space-x-1">
          {[
            { id: 'scheduler', label: '1. Appointments Board', icon: Users },
            { id: 'settings', label: '2. Settings & Templates', icon: Settings },
            { id: 'logs', label: '3. Outgoing Webhook Stream', icon: Laptop }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSegment(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold transition-all relative top-[1px] ${
                activeSegment === tab.id
                  ? 'text-[#005A9C] border-b-2 border-[#005A9C]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id={`frontdesk-tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Cron Widget Action */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 space-x-3 mb-1">
          <div className="text-left">
            <span className="text-[9px] text-[#00A896] uppercase font-bold tracking-tight block">Automated Cron-Job</span>
            <span className="text-[10px] text-slate-500 block">Runs reminders prior {settings.reminderBufferMinutes}m</span>
          </div>
          <button
            onClick={triggerRemindersCron}
            className="px-3 py-1 bg-[#005A9C] text-white text-[10px] font-bold rounded-lg hover:bg-opacity-95 active:scale-95 transition-all flex items-center space-x-1"
            title="Scan upcoming appointments and dispatch reminders"
            id="btn-run-cron-scheduler"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Simulate Cron</span>
          </button>
        </div>
      </div>

      {/* Cron Feedback Banner */}
      {cronFeedback.text && (
        <div className="mb-6 p-3 bg-[#005A9C]/10 border border-[#005A9C]/20 text-[#005A9C] rounded-xl text-xs flex items-center space-x-2 text-left animate-bounce">
          <Info className="h-4 w-4 shrink-0" />
          <span>{cronFeedback.text}</span>
        </div>
      )}

      {/* SEGMENT 1: OPERATIONS APPOINTMENTS BOARD */}
      {activeSegment === 'scheduler' && (
        <div className="space-y-4" id="segment-appointments-board">
          {/* SEARCH FILTERS HEADER */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, ID Ref..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-[#005A9C] outline-hidden"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-400 font-semibold">Triage status:</span>
              <select
                className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs text-slate-700 focus:outline-hidden"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Arrived">Arrived</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <span className="text-xs text-slate-400 font-semibold ml-2">Consultant:</span>
              <select
                className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs text-slate-700 focus:outline-hidden"
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                <option value="All">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* GRID OF APPOINTMENTS */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-slate-400 text-xs italic text-center">
              No medical appointments logged matching the active query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="appointments-front-desk-grid">
              {filteredAppointments.map(appt => {
                const doc = doctors.find(d => d.id === appt.doctorId);
                return (
                  <div key={appt.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs hover:shadow-xs transition-shadow text-left flex flex-col justify-between" id={`appt-card-${appt.id}`}>
                    <div className="space-y-4">
                      {/* Top status */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-[10px] font-bold text-slate-400">{appt.id}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            appt.status === 'Confirmed'
                              ? 'bg-[#005A9C]/10 text-[#005A9C]'
                              : appt.status === 'Arrived'
                              ? 'bg-amber-100 text-amber-800'
                              : appt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      </div>

                      {/* Info lines */}
                      <div className="space-y-2">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-semibold">PATIENT IDENTITY</span>
                          <span className="text-xs font-bold text-slate-800">{appt.patientName}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">({appt.patientAge}yr, {appt.patientGender})</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-semibold">SCHEDULED CONSULTANT</span>
                          <span className="text-xs font-semibold text-slate-700">{appt.doctorName}</span>
                          <span className="text-[9px] text-[#00A896] bg-[#00A896]/5 px-1.5 py-0.2 rounded font-bold ml-1.5">{doc?.specialty}</span>
                        </div>
                        <div className="flex justify-between text-xs bg-slate-50 p-2 border border-slate-100 rounded-xl">
                          <div>
                            <span className="text-[8px] text-slate-400 block font-semibold">Target date</span>
                            <strong className="text-slate-800 text-[10px]">{appt.appointmentDate}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-slate-400 block font-semibold">consultation time</span>
                            <strong className="text-slate-800 text-[10px]">{appt.appointmentTime}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Telehealth Flag */}
                      {appt.telehealthEnabled && (
                        <div className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-800 text-[10px] px-2.5 py-1 rounded-xl border border-emerald-100">
                          <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Video Consulting: <strong className="font-bold underline cursor-pointer hover:text-emerald-950">Join Jitsi Link</strong></span>
                        </div>
                      )}

                      {/* Display intake vitals preview if registered */}
                      {appt.intakeForm && appt.intakeForm.vitals?.bp ? (
                        <div className="bg-slate-50 text-[10px] p-2 rounded-xl text-slate-600 border border-slate-100 space-y-1">
                          <span className="font-bold text-slate-700 block">✓ Digital Intake records logged:</span>
                          <div className="grid grid-cols-2 gap-1 font-mono">
                            <span>BP: <strong className="text-slate-800">{appt.intakeForm.vitals.bp}</strong></span>
                            <span>Pulse: <strong className="text-slate-800">{appt.intakeForm.vitals.pulse} bpm</strong></span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {appt.status === 'Confirmed' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(appt.id, 'Arrived')}
                            className="flex-1 py-1 px-2.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center justify-center space-x-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>Mark as Arrived</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                            className="py-1 px-2.5 text-rose-600 text-[10px] font-bold border border-rose-200 rounded-lg hover:bg-rose-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {appt.status === 'Arrived' && (
                        <div className="flex gap-1 w-full flex-wrap">
                          <button
                            onClick={() => handleOpenTabletIntake(appt)}
                            className="flex-1 py-1.5 px-3 bg-[#005A9C] text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center space-x-1 shadow-sm"
                            title="Hand tablet client to patient to complete intake records"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Run Digital Intake Tablet</span>
                          </button>
                          <button
                            onClick={() => {
                              alert(`Sent SMS and WhatsApp secure portal URL links immediately to: ${appt.patientContact}`);
                            }}
                            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-[10px] font-bold"
                            title="Trigger link delivery via cellular nodes"
                          >
                            Send SMS Link
                          </button>
                        </div>
                      )}

                      {appt.status === 'Completed' && (
                        <div className="w-full text-center py-1 text-emerald-800 text-[10px] font-bold bg-emerald-50 border border-emerald-100 rounded-lg">
                          ✓ Session Complete (Digital Prescription pads dispatched)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SEGMENT 2: SETTINGS & GENERAL OPERATIONAL TEMPLATES */}
      {activeSegment === 'settings' && (
        <form onSubmit={handleSaveSettingsSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-left shadow-xs space-y-6" id="segment-settings-templates">
          <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-1.5">
            <Settings className="h-4 w-4 text-[#005A9C]" />
            <span>Master System Toggles & Webhook Routing endpoints</span>
          </h3>

          {/* Settings grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">Default System Variant Mode</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('clinic')}
                  className={`py-2 text-xs font-medium text-center rounded-xl transition-all ${
                    mode === 'clinic'
                      ? 'bg-white text-[#005A9C] shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Clinic Mode (Single-Doctor)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('hospital')}
                  className={`py-2 text-xs font-medium text-center rounded-xl transition-all ${
                    mode === 'hospital'
                      ? 'bg-white text-[#00A896] shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Hospital Mode (Multi-Doctor)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block" htmlFor="set-buffer-time">Scheduler Reminders Dispatch Buffer</label>
              <select
                id="set-buffer-time"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C]"
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
              >
                <option value={30}>30 Minutes before consultation</option>
                <option value={60}>1 Hours before consultation</option>
                <option value={120}>2 Hours before consultation</option>
                <option value={1440}>24 Hours prior session</option>
              </select>
            </div>

            {/* Notifications format */}
            <div className="space-y-2 md:col-span-2">
              <h4 className="text-xs font-bold text-slate-700 mt-2 block">Customizable Omnichannel Templates</h4>
              <p className="text-[11px] text-slate-400">Placeholders: [Patient Name], [Doctor Name], [Date], [Time], [ApptID], [TeleLink]</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="set-p-template">Patient Notification Content format</label>
              <textarea
                id="set-p-template"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-[#005A9C]"
                value={pTemplate}
                onChange={(e) => setPTemplate(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="set-d-template">Doctor Notification Content format</label>
              <textarea
                id="set-d-template"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-[#005A9C]"
                value={dTemplate}
                onChange={(e) => setDTemplate(e.target.value)}
              />
            </div>

            {/* Webhook API endpoints */}
            <div className="space-y-2 md:col-span-2">
              <h4 className="text-xs font-bold text-slate-700 mt-2 block">Enterprise Outbound API webhooks Routing</h4>
              <p className="text-[11px] text-slate-400">The server-side notifications engine fires full HTTP POST JSON payloads to these gateways during operational triggers.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="set-h-email">SendGrid Email Hook Gateway</label>
              <input
                id="set-h-email"
                type="url"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1"
                value={emailWeb}
                onChange={(e) => setEmailWeb(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="set-h-sms">Twilio/SMS Alert hook Gateway</label>
              <input
                id="set-h-sms"
                type="url"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1"
                value={smsWeb}
                onChange={(e) => setSmsWeb(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="set-h-wa">Meta WhatsApp API Business Hook Gateway</label>
              <input
                id="set-h-wa"
                type="url"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-[#005A9C]"
                value={waWeb}
                onChange={(e) => setWaWeb(e.target.value)}
              />
            </div>
          </div>

          {settingsFeedback.text && (
            <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
              settingsFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}>
              <CheckCircle className="h-4 w-4" />
              <span>{settingsFeedback.text}</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-5 py-2.5 bg-[#005A9C] text-white text-xs font-semibold rounded-xl flex items-center space-x-1 shadow-sm"
              id="btn-save-central-settings"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{settingsLoading ? 'Saving changes...' : 'Save Configuration Parameters'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SEGMENT 3: OUTGOING WEBHOOK LOGS STREAM */}
      {activeSegment === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 text-left shadow-xs space-y-4" id="segment-webhook-stream">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Omnichannel outgoing delivery logs</h3>
              <p className="text-xs text-slate-500">Real-time mock logs representation showing HTTP payloads dispatched by the express backend nodes.</p>
            </div>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Active: {webhookLogs.length} logged
            </span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {webhookLogs.length === 0 ? (
              <div className="p-12 text-slate-400 text-xs text-center italic">
                Logs console empty. Book clinical consultations or trigger cron scans to record telemetry logs.
              </div>
            ) : (
              webhookLogs.map(log => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="border border-slate-100 rounded-2xl bg-slate-50 py-3 px-4 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold text-white tracking-wide uppercase ${
                          log.channel === 'Email' 
                            ? 'bg-[#005A9C]' 
                            : log.channel === 'SMS' 
                            ? 'bg-purple-600' 
                            : 'bg-[#00A896]'
                        }`}>
                          {log.channel}
                        </span>
                        <span className="text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="text-xs font-semibold text-slate-800">To: {log.recipient}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {log.status} (201 OK)
                        </span>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-[#005A9C] text-[10px] font-bold hover:underline cursor-pointer"
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-600 whitespace-pre-wrap font-sans bg-white p-2.5 rounded-lg border border-slate-200/50 mt-1">
                      {log.content}
                    </p>

                    {isExpanded && (
                      <div className="p-3 bg-slate-900 text-[#00A896] font-mono text-[9px] rounded-xl overflow-x-auto mt-2 select-all border border-slate-800">
                        <span className="text-slate-500 block font-bold mb-1">// Outbound HTTP POST Request</span>
                        <span className="text-[#005A9C] block font-semibold">POST {log.endpoint}</span>
                        <pre className="mt-1">{log.payload}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* DIALOG CLINIC TABLET MODAL OVERLAY */}
      {tabletOpen && tabletAppt && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in" id="tablet-intake-dialog-container">
          <div className="bg-white border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full flex flex-col" id="tablet-frame">
            {/* Tablet Header Indicator */}
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Laptop className="h-5 w-5 text-[#00A896]" />
                <span className="font-bold tracking-tight text-sm uppercase">CuraPulse Operational Clinical Tablet</span>
              </div>
              <span className="text-[9px] bg-slate-700 px-2.5 py-0.5 rounded-full text-slate-300 font-bold border border-slate-600">
                Tablet ID: CPD-04
              </span>
            </div>

            <div className="p-6 overflow-y-auto max-h-[580px] text-left">
              {intakeSuccess ? (
                <div className="py-12 text-center" id="tablet-success-view">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Intake Records Committed</h3>
                  <p className="text-slate-500 text-xs mt-1">Ready for clinician. Triage metrics uploaded to console successfully.</p>
                </div>
              ) : (
                <form onSubmit={handleIntakeSubmit} className="space-y-4" id="tablet-intake-form">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-800">CuraPulse Smart Clinical Triage Intake Form</h3>
                    <p className="text-xs text-slate-500">Please provide and confirm medical demographics and vital logs prior to seeing the physician.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600" htmlFor="tablet-pat-name">Full Name</label>
                      <input
                        id="tablet-pat-name"
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        value={inName}
                        onChange={(e) => setInName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600" htmlFor="tablet-pat-phone">Contact Number</label>
                      <input
                        id="tablet-pat-phone"
                        type="tel"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        value={inContact}
                        onChange={(e) => setInContact(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600" htmlFor="tablet-pat-age">Age</label>
                      <input
                        id="tablet-pat-age"
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        value={inAge}
                        onChange={(e) => setInAge(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">Gender Identity</label>
                      <div className="grid grid-cols-3 gap-1">
                        {['Male', 'Female', 'Other'].map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setInGender(g as any)}
                            className={`py-1 rounded-md border text-[11px] font-medium transition-all text-center ${
                              inGender === g
                                ? 'bg-[#005A9C] text-white border-[#005A9C]'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-semibold text-slate-600" htmlFor="tablet-pat-symptoms">Current Symptoms / Reason for Visit*</label>
                    <textarea
                      id="tablet-pat-symptoms"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                      placeholder="e.g. Cough, mild joint soreness, general fatigue..."
                      value={inSymptoms}
                      onChange={(e) => setInSymptoms(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-semibold text-slate-600" htmlFor="tablet-pat-allergies">Allergies Identified*</label>
                    <input
                      id="tablet-pat-allergies"
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-rose-800"
                      placeholder="e.g. None reports, Penicillin, seasonal pollens..."
                      value={inAllergies}
                      onChange={(e) => setInAllergies(e.target.value)}
                      required
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <span className="text-xs font-bold text-slate-700 block mb-2">Physician Triage Vitals (Optional / frontdesk logs)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600" htmlFor="tablet-pat-bp">Blood Pressure (BP -mmHg)</label>
                        <input
                          id="tablet-pat-bp"
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                          placeholder="e.g. 120/80"
                          value={inBP}
                          onChange={(e) => setInBP(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600" htmlFor="tablet-pat-pulse">Heart Rate / Pulse (BPM)</label>
                        <input
                          id="tablet-pat-pulse"
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                          placeholder="e.g. 72"
                          value={inPulse || ''}
                          onChange={(e) => setInPulse(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-5 mt-4">
                    <button
                      type="button"
                      onClick={() => setTabletOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-xs text-slate-700 rounded-xl hover:bg-slate-50"
                    >
                      Close Tablet Screen
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#00A896] text-white text-xs font-bold rounded-xl hover:bg-opacity-95"
                    >
                      Register Triage Intake
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
