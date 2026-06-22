import React, { useState, useMemo } from 'react';
import { Doctor, Appointment, AppointmentStatus, Medication } from '../types';
import { 
  Save, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  User, 
  FileText, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';

interface DoctorPortalProps {
  doctors: Doctor[];
  selectedDoctorId: string;
  setSelectedDoctorId: (id: string) => void;
  appointments: Appointment[];
  onUpdateDoctor: (doctorId: string, doctorData: Partial<Doctor>) => Promise<any>;
  onSavePrescription: (appointmentId: string, prescription: {
    notes: string;
    medications: Medication[];
    sentChannels: ('Email' | 'SMS' | 'WhatsApp')[];
  }) => Promise<any>;
}

export default function DoctorPortal({
  doctors,
  selectedDoctorId,
  setSelectedDoctorId,
  appointments,
  onUpdateDoctor,
  onSavePrescription
}: DoctorPortalProps) {
  const activeDoctor = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId) || doctors[0];
  }, [doctors, selectedDoctorId]);

  // Tab management inside portal
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'availability' | 'prescribe'>('profile');

  // PROFILE STATE
  const [name, setName] = useState(activeDoctor?.name || '');
  const [specialty, setSpecialty] = useState(activeDoctor?.specialty || '');
  const [bio, setBio] = useState(activeDoctor?.bio || '');
  const [fees, setFees] = useState(activeDoctor?.consultingFees || 100);
  const [imageUrl, setImageUrl] = useState(activeDoctor?.profileImage || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // AVAILABILITY STATE (Sync with active doctor availability fields)
  const [availability, setAvailability] = useState(JSON.parse(JSON.stringify(activeDoctor?.availability || {})));
  const [vacationInput, setVacationInput] = useState('');
  const [vacationsList, setVacationsList] = useState<string[]>(activeDoctor?.vacationDates || []);

  // PRESCRIPTION PAD STATE
  const [prescribeApptId, setPrescribeApptId] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [medsList, setMedsList] = useState<Medication[]>([]);
  // Individual med input
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');
  const [newMedDur, setNewMedDur] = useState('');
  const [channels, setChannels] = useState<('Email' | 'SMS' | 'WhatsApp')[]>(['Email', 'WhatsApp']);
  const [rxSubmitting, setRxSubmitting] = useState(false);

  // Sync state if selected doctor switches
  React.useEffect(() => {
    if (activeDoctor) {
      setName(activeDoctor.name);
      setSpecialty(activeDoctor.specialty);
      setBio(activeDoctor.bio);
      setFees(activeDoctor.consultingFees);
      setImageUrl(activeDoctor.profileImage);
      setAvailability(JSON.parse(JSON.stringify(activeDoctor.availability || {})));
      setVacationsList(activeDoctor.vacationDates || []);
      
      // Auto-set the first arrived/confirmed appointment as the prescription target
      const list = appointments.filter(a => a.doctorId === activeDoctor.id && (a.status === 'Arrived' || a.status === 'Confirmed'));
      if (list.length > 0 && !prescribeApptId) {
        setPrescribeApptId(list[0].id);
      }
    }
  }, [selectedDoctorId, activeDoctor, appointments]);

  const doctorAppointments = useMemo(() => {
    return appointments.filter(a => a.doctorId === selectedDoctorId);
  }, [appointments, selectedDoctorId]);

  const arrivedPatients = useMemo(() => {
    return doctorAppointments.filter(a => a.status === 'Arrived');
  }, [doctorAppointments]);

  const activePrescribeAppt = useMemo(() => {
    return appointments.find(a => a.id === prescribeApptId);
  }, [appointments, prescribeApptId]);

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setFeedback({ text: '', type: '' });
    try {
      await onUpdateDoctor(activeDoctor.id, {
        name,
        specialty,
        bio,
        consultingFees: Number(fees),
        profileImage: imageUrl
      });
      setFeedback({ text: 'Doctor profile information successfully saved!', type: 'success' });
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error occurred saving profile.', type: 'err' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Availability Helpers
  const handleToggleDay = (day: string) => {
    const updated = { ...availability };
    if (updated[day]) {
      updated[day].enabled = !updated[day].enabled;
      if (updated[day].enabled && updated[day].slots.length === 0) {
        updated[day].slots = [{ start: '09:00', end: '17:00' }];
      }
      setAvailability(updated);
    }
  };

  const handleUpdateSlot = (day: string, index: number, field: 'start' | 'end', val: string) => {
    const updated = { ...availability };
    if (updated[day] && updated[day].slots[index]) {
      updated[day].slots[index][field] = val;
      setAvailability(updated);
    }
  };

  const handleAddSlot = (day: string) => {
    const updated = { ...availability };
    if (updated[day]) {
      updated[day].slots.push({ start: '09:00', end: '13:00' });
      setAvailability(updated);
    }
  };

  const handleRemoveSlot = (day: string, index: number) => {
    const updated = { ...availability };
    if (updated[day]) {
      updated[day].slots.splice(index, 1);
      setAvailability(updated);
    }
  };

  const handleSaveAvailability = async () => {
    setSaveLoading(true);
    setFeedback({ text: '', type: '' });
    try {
      await onUpdateDoctor(activeDoctor.id, {
        availability,
        vacationDates: vacationsList
      });
      setFeedback({ text: 'Clinical availability grid successfully committed!', type: 'success' });
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error saving availability grid.', type: 'err' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Vacation Helpers
  const handleAddVacation = () => {
    if (vacationInput && !vacationsList.includes(vacationInput)) {
      setVacationsList([...vacationsList, vacationInput].sort());
      setVacationInput('');
    }
  };

  const handleRemoveVacation = (date: string) => {
    setVacationsList(vacationsList.filter(d => d !== date));
  };

  // Prescription Pad Helpers
  const handleAddMedication = () => {
    if (!newMedName.trim() || !newMedDosage.trim()) return;
    const med: Medication = {
      name: newMedName,
      dosage: newMedDosage,
      frequency: newMedFreq || "Daily",
      duration: newMedDur || "5 days"
    };
    setMedsList([...medsList, med]);
    setNewMedName('');
    setNewMedDosage('');
    setNewMedFreq('');
    setNewMedDur('');
  };

  const handleRemoveMedication = (index: number) => {
    setMedsList(medsList.filter((_, i) => i !== index));
  };

  const handleSendPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescribeApptId) {
      alert("No medical consultation active to address.");
      return;
    }
    setRxSubmitting(true);
    setFeedback({ text: '', type: '' });

    try {
      await onSavePrescription(prescribeApptId, {
        notes: prescriptionNotes,
        medications: medsList,
        sentChannels: channels
      });
      setFeedback({ text: `Prescription issued and dispatched via ${channels.join(', ')} successfully!`, type: 'success' });
      
      // Reset prescription pad
      setPrescriptionNotes('');
      setMedsList([]);
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to dispatch.', type: 'err' });
    } finally {
      setRxSubmitting(false);
    }
  };

  // Quick Prescription Templates
  const applyClinicalTemplate = (type: string) => {
    if (type === 'reflux') {
      setPrescriptionNotes('Take acid suppression medication on empty stomach. Avoid heavy files or sleeping flat immediately following meals. Elevate headboard by 15 degrees.');
      setMedsList([
        { name: 'Omeprazole 20mg Delayed-Release', dosage: '1 capsule', frequency: 'Once daily (before breakfast)', duration: '14 days' },
        { name: 'Gaviscon Double Action Susp', dosage: '10ml', frequency: 'As needed (post meal)', duration: '10 days' }
      ]);
    } else if (type === 'pharyngitis') {
      setPrescriptionNotes('Warm salt water gargles every 4 hours. Stay hydrated with hot tea. Avoid dry room environments; use a bedroom humidifier.');
      setMedsList([
        { name: 'Amoxicillin 500mg Oral Capsule', dosage: '1 capsule', frequency: 'Three times daily', duration: '10 days' },
        { name: 'Paracetamol (Acetaminophen) 500mg', dosage: '1-2 tablets', frequency: 'Every 6 hours (if fever)', duration: '5 days' }
      ]);
    } else if (type === 'hypertension') {
      setPrescriptionNotes('Strict daily salt reduction (ideally < 1500mg). Log arterial BP at morning and night. Maintain periodic light cardiovascular aerobic walks.');
      setMedsList([
        { name: 'Amlodipine Besylate 5mg', dosage: '1 tablet', frequency: 'Once daily (morning)', duration: '30 days' },
        { name: 'Lisinopril 10mg', dosage: '1 tablet', frequency: 'Once daily (evening)', duration: '30 days' }
      ]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-2" id="doctor-portal-root">
      {/* Selector & Mini Bio Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4">
          <img
            src={activeDoctor?.profileImage}
            alt={activeDoctor?.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#00A896]/10"
          />
          <div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{activeDoctor?.name}</h2>
              <span className="bg-[#00A896]/10 text-[#00A896] text-[10px] font-bold py-0.5 px-2.5 rounded-full border border-[#00A896]/10 uppercase">
                {activeDoctor?.specialty}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1 max-w-lg leading-relaxed line-clamp-1">{activeDoctor?.bio}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
              <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                Hourly Fee: <b className="text-slate-700">${activeDoctor?.consultingFees}</b>
              </span>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                Department: <b className="text-[#005A9C]">{activeDoctor?.department}</b>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs text-slate-500 font-semibold" htmlFor="doc-portal-switch-doctor">Simulating:</span>
          <select
            id="doc-portal-switch-doctor"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-[#005A9C] rounded-xl py-2 px-3 focus:outline-hidden"
          >
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* INNER TAB BUTTONS */}
      <div className="border-b border-slate-200 mb-6 flex space-x-1" id="doctor-portal-tabs">
        {[
          { id: 'profile', label: '1. Profile Management', icon: Sliders },
          { id: 'availability', label: '2. Dynamic Availability Matrix', icon: Clock },
          { id: 'prescribe', label: '3. Digital Prescription Pad', icon: FileText }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveSubTab(t.id as any);
              setFeedback({ text: '', type: '' });
            }}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold transition-all relative top-[1px] ${
              activeSubTab === t.id
                ? 'text-[#005A9C] border-b-2 border-[#005A9C]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id={`tab-doc-${t.id}`}
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {feedback.text && (
        <div className={`mb-6 p-4 rounded-xl text-xs flex items-center space-x-2 border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TAB CONTENTS */}

      {/* PROFILE TAB */}
      {activeSubTab === 'profile' && activeDoctor && (
        <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-left shadow-xs" id="doc-profile-pane">
          <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-[#005A9C]" />
            <span>Practice Credentials & Digital Brochure</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="prof-doc-name">Doctor Name (Display)</label>
              <input
                id="prof-doc-name"
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="prof-doc-specialty">Specialization Label</label>
              <input
                id="prof-doc-specialty"
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C]"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600" htmlFor="prof-doc-fees">Consultation Booking Fee ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="prof-doc-fees"
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-3 pl-8 text-xs focus:ring-1 focus:ring-[#005A9C]"
                    value={fees}
                    onChange={(e) => setFees(Number(e.target.value))}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">Department</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden opacity-75 cursor-not-allowed"
                  value={activeDoctor?.department}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="prof-doc-image">Profile Avatar URL</label>
              <input
                id="prof-doc-image"
                type="url"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C]"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-600" htmlFor="prof-doc-bio">Professional Biography Statement</label>
              <textarea
                id="prof-doc-bio"
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a warm, greeting biography indicating specialties and certifications..."
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={saveLoading}
              className="px-5 py-2.5 bg-[#005A9C] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 hover:bg-opacity-95 shadow-sm"
              id="btn-save-doc-profile"
            >
              <Save className="h-4 w-4" />
              <span>{saveLoading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* AVAILABILITY MATRIX TAB */}
      {activeSubTab === 'availability' && activeDoctor && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-left shadow-xs space-y-8" id="doc-availability-pane">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-[#00A896]" />
              <span>Recurring Weekly Working Matrix</span>
            </h3>
            <p className="text-xs text-slate-500">
              Configure which days of the week patients are allowed to book consultations with you and set specific session intervals (e.g. morning vs. evening blocks).
            </p>
          </div>

          {/* Availability Grid */}
          <div className="space-y-4" id="weekly-grids">
            {Object.keys(availability).map((day) => {
              const schedule = availability[day];
              return (
                <div key={day} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-[150px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={() => handleToggleDay(day)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00A896]"></div>
                    </label>
                    <span className="text-xs font-bold text-slate-700 capitalize w-20">{day}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      schedule.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {schedule.enabled ? 'Active' : 'Closed'}
                    </span>
                  </div>

                  {schedule.enabled ? (
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                      {schedule.slots.map((slot: any, sIdx: number) => (
                        <div key={sIdx} className="flex items-center bg-white border border-slate-200 rounded-xl p-1.5 space-x-1.5 shadow-2xs">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => handleUpdateSlot(day, sIdx, 'start', e.target.value)}
                            className="bg-transparent border-none text-xs p-1 focus:ring-0 text-slate-700"
                          />
                          <span className="text-xs text-slate-400">to</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => handleUpdateSlot(day, sIdx, 'end', e.target.value)}
                            className="bg-transparent border-none text-xs p-1 focus:ring-0 text-slate-700"
                          />
                          <button
                            onClick={() => handleRemoveSlot(day, sIdx)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded-md"
                            title="Remove Slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddSlot(day)}
                        className="px-3 py-1.5 border border-[#00A896]/30 text-[#00A896] hover:bg-[#00A896]/5 text-[10px] font-bold rounded-lg flex items-center space-x-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Slot</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 text-xs text-slate-400 italic">
                      No online slots on this day. Appointments blocked out completely.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* VACATION PORTAL SECTION */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span>Block Out Vacation Dates (Temporary Absences)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add specific dates when the clinic is closed or you are away on holiday. Patients will not be able to schedule consultations on these dates.
            </p>

            <div className="flex items-center space-x-2 max-w-sm">
              <input
                type="date"
                value={vacationInput}
                onChange={(e) => setVacationInput(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-[#005A9C]"
              />
              <button
                onClick={handleAddVacation}
                disabled={!vacationInput}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-50"
              >
                Block Date
              </button>
            </div>

            {vacationsList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {vacationsList.map(date => (
                  <span key={date} className="inline-flex items-center bg-amber-50 text-amber-800 text-[10px] font-bold py-1 px-2.5 rounded-full border border-amber-200">
                    <span>{date}</span>
                    <button
                      onClick={() => handleRemoveVacation(date)}
                      className="ml-1.5 text-amber-400 hover:text-amber-900 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-2 italic">No custom vacation dates currently configured.</p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveAvailability}
              disabled={saveLoading}
              className="px-5 py-2.5 bg-[#00A896] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 hover:bg-opacity-95 shadow-sm"
              id="btn-save-doc-availability"
            >
              <Save className="h-4 w-4" />
              <span>{saveLoading ? 'Registering...' : 'Save Availability & Vacations'}</span>
            </button>
          </div>
        </div>
      )}

      {/* PRESCRIPTION PAD TAB */}
      {activeSubTab === 'prescribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="doc-prescription-pane">
          {/* Active Consultation List */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 text-left shadow-xs flex flex-col max-h-[640px]">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center space-x-1.5">
              <TrendingUp className="h-4 w-4 text-[#005A9C]" />
              <span>Today's Clinic Encounters</span>
            </h3>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {doctorAppointments.length === 0 ? (
                <div className="p-4 text-slate-400 text-xs italic text-center">No patient sessions registered yet.</div>
              ) : (
                doctorAppointments.map(appt => (
                  <div
                    key={appt.id}
                    onClick={() => {
                      setPrescribeApptId(appt.id);
                      setFeedback({ text: '', type: '' });
                      // Pre-fill existing prescription if it exists
                      if (appt.prescription) {
                        setPrescriptionNotes(appt.prescription.notes);
                        setMedsList(appt.prescription.medications);
                      } else {
                        setPrescriptionNotes('');
                        setMedsList([]);
                      }
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer text-left transition-all relative ${
                      prescribeApptId === appt.id
                        ? 'bg-[#005A9C]/5 border-[#005A9C] ring-1 ring-[#005A9C]/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-slate-400">{appt.id}</span>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 rounded-sm ${
                        appt.status === 'Arrived' 
                          ? 'bg-amber-100 text-amber-800' 
                          : appt.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{appt.patientName}</h4>
                    <span className="text-[10px] text-slate-500 block">{appt.appointmentDate} @ {appt.appointmentTime}</span>
                    
                    {appt.intakeForm && (
                      <span className="text-[9px] mt-1.5 inline-block text-[#00A896] font-bold">
                        ✓ Digital Intake Form Ready
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PRESCRIPTION EDITOR SHEET */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
            {activePrescribeAppt ? (
              <form onSubmit={handleSendPrescription} className="space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Digital Rx Consultation pad</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Patient: <strong className="text-slate-800">{activePrescribeAppt.patientName}</strong> ({activePrescribeAppt.patientAge}yo, {activePrescribeAppt.patientGender})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">Active Ref</span>
                    <span className="text-xs font-bold text-[#00A896] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                      {activePrescribeAppt.id}
                    </span>
                  </div>
                </div>

                {/* Patient Intake Vitals View Card if Available */}
                {activePrescribeAppt.intakeForm ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">1. Digital Intake Summary (Checked-In Vitals)</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{activePrescribeAppt.intakeForm.completedAt ? new Date(activePrescribeAppt.intakeForm.completedAt).toLocaleTimeString() : ''}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 border border-slate-100 rounded-xl">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold">Triage Symptoms:</span>
                        <span className="text-slate-700 font-medium line-clamp-2">{activePrescribeAppt.intakeForm.symptoms || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold">Allergies Identified:</span>
                        <span className="text-[#E63946] font-bold">{activePrescribeAppt.intakeForm.allergies || "None Reported"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold">Blood Pressure:</span>
                        <span className="text-slate-800 font-mono font-bold">{activePrescribeAppt.intakeForm.vitals?.bp || "N/A mm Hg"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold">Heart Rate / Pulse:</span>
                        <span className="text-slate-800 font-mono font-bold">
                          {activePrescribeAppt.intakeForm.vitals?.pulse ? `${activePrescribeAppt.intakeForm.vitals.pulse} bpm` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs flex items-center space-x-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>No digital health intake form was completed yet. Front desk can trigger form dispatch.</span>
                  </div>
                )}

                {/* SMART DRUG TEMPLATES CLICKS */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">2. Quick Rx Pre-fills (Clinical Templates)</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyClinicalTemplate('reflux')}
                      className="px-2.5 py-1 bg-[#005A9C]/10 text-[#005A9C] text-[10px] font-bold rounded-lg hover:bg-slate-100 flex items-center space-x-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Acid Gastro Reflux Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyClinicalTemplate('pharyngitis')}
                      className="px-2.5 py-1 bg-[#005A9C]/10 text-[#005A9C] text-[10px] font-bold rounded-lg hover:bg-slate-100 flex items-center space-x-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Strep Pharyngitis (Streptococcus)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyClinicalTemplate('hypertension')}
                      className="px-2.5 py-1 bg-[#005A9C]/10 text-[#005A9C] text-[10px] font-bold rounded-lg hover:bg-slate-100 flex items-center space-x-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Systolic Hypertension Refills</span>
                    </button>
                  </div>
                </div>

                {/* Prescription Pad Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700" htmlFor="rx-clinical-notes">3. Physician Consultation & Advice Notes</label>
                  <textarea
                    id="rx-clinical-notes"
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C]"
                    placeholder="Provide lifestyle counselings, dietary alterations, next clinical controls scheduled advice..."
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                  />
                </div>

                {/* Drugs inputs Grid */}
                <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200 rounded-2xl">
                  <span className="text-xs font-bold text-slate-700 block">4. Prescribed Medications Catalog</span>
                  
                  {/* Active List */}
                  {medsList.length > 0 ? (
                    <div className="space-y-1.5 mb-3" id="active-prescribed-drugs">
                      {medsList.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 border border-slate-100 rounded-lg">
                          <div>
                            <strong className="text-slate-800">{med.name}</strong> - <span>{med.dosage}</span>
                            <span className="text-slate-400 text-[10px] block">{med.frequency} · {med.duration}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="p-1 text-[#E63946] hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mb-2">No medications appended yet. Add one below.</p>
                  )}

                  {/* Add Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">a. Drug Name</span>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin"
                        className="w-full bg-white border border-slate-200 p-1.5 text-xs rounded-lg"
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">b. Dosage</span>
                      <input
                        type="text"
                        placeholder="e.g. 500mg capsule"
                        className="w-full bg-white border border-slate-200 p-1.5 text-xs rounded-lg"
                        value={newMedDosage}
                        onChange={(e) => setNewMedDosage(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">c. Frequency</span>
                      <input
                        type="text"
                        placeholder="e.g. 3x daily"
                        className="w-full bg-white border border-slate-200 p-1.5 text-xs rounded-lg"
                        value={newMedFreq}
                        onChange={(e) => setNewMedFreq(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">d. Duration</span>
                      <input
                        type="text"
                        placeholder="e.g. 10 days"
                        className="w-full bg-white border border-slate-200 p-1.5 text-xs rounded-lg animate-fade-in"
                        value={newMedDur}
                        onChange={(e) => setNewMedDur(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="w-full py-1.5 border border-[#005A9C]/30 text-[#005A9C] text-xs font-semibold rounded-lg hover:bg-[#005A9C]/5"
                  >
                    + Append Drug Row to prescription
                  </button>
                </div>

                {/* Channels select and dispatch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="font-bold text-slate-700">Dispatch Channels:</span>
                    {['Email', 'SMS', 'WhatsApp'].map(channel => (
                      <label key={channel} className="inline-flex items-center space-x-1.5 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channels.includes(channel as any)}
                          onChange={() => {
                            if (channels.includes(channel as any)) {
                              setChannels(channels.filter(c => c !== channel));
                            } else {
                              setChannels([...channels, channel as any]);
                            }
                          }}
                          className="rounded text-[#005A9C] focus:ring-[#005A9C]"
                        />
                        <span>{channel}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={rxSubmitting || (medsList.length === 0 && !prescriptionNotes)}
                    className="py-2.5 px-5 bg-[#00A896] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 hover:bg-opacity-95 shadow-sm disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{rxSubmitting ? 'Dispatching Rx...' : 'Sign & Dispatch Prescription'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs text-center border-2 border-dashed border-slate-100 rounded-3xl p-6">
                <FileText className="h-8 w-8 text-slate-300 mb-2" />
                <p>Select a patient from today's console to write and review clinical prescriptions.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
