import React, { useState, useMemo } from 'react';
import { Doctor, SystemMode, Appointment } from '../types';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, Video, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';

interface PatientBookingProps {
  doctors: Doctor[];
  systemMode: SystemMode;
  onBookAppointment: (bookingData: {
    doctorId: string;
    patientName: string;
    patientAge: number;
    patientGender: 'Male' | 'Female' | 'Other';
    patientContact: string;
    appointmentDate: string;
    appointmentTime: string;
    telehealthEnabled: boolean;
  }) => Promise<any>;
}

export default function PatientBooking({ doctors, systemMode, onBookAppointment }: PatientBookingProps) {
  const [step, setStep] = useState<number>(1);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [telehealthEnabled, setTelehealthEnabled] = useState<boolean>(false);

  // Patient inputs
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<number>(30);
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientContact, setPatientContact] = useState<string>('');

  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const activeDoctor = useMemo(() => {
    if (systemMode === 'clinic') {
      // Always default to single prime doctor in clinic mode
      return doctors[0];
    }
    return doctors.find(d => d.id === selectedDoctorId) || doctors[0];
  }, [doctors, selectedDoctorId, systemMode]);

  // Extract unique departments
  const departments = useMemo(() => {
    const depts = new Set(doctors.map(d => d.department));
    return ['All', ...Array.from(depts)];
  }, [doctors]);

  // Filtered doctors list for Hospital mode
  const filteredDoctors = useMemo(() => {
    return doctors.filter(d => selectedDept === 'All' || d.department === selectedDept);
  }, [doctors, selectedDept]);

  // Generate future 14 dates for picking
  const availableDates = useMemo(() => {
    const list = [];
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;
      const dayName = weekdays[d.getDay()] as keyof typeof activeDoctor.availability;
      
      // Let's check if the doctor works that day
      const availability = activeDoctor?.availability[dayName];
      const isVacation = activeDoctor?.vacationDates.includes(dateString);
      
      if (availability && availability.enabled && !isVacation) {
        list.push({
          dateString,
          formatted: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          dayName
        });
      }
    }
    return list;
  }, [activeDoctor]);

  // Helper to generate selectable time list from active timeslot
  const selectableTimesList = useMemo(() => {
    if (!selectedDate || !activeDoctor) return [];
    
    const d = new Date(selectedDate);
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = weekdays[d.getDay() + 1] as keyof typeof activeDoctor.availability; // Adjust timezone boundary offset
    const actualDayName = weekdays[new Date(selectedDate + 'T00:00:00').getDay()] as keyof typeof activeDoctor.availability;
    
    const daySchedule = activeDoctor.availability[actualDayName];
    if (!daySchedule || !daySchedule.enabled) return [];

    const slots: string[] = [];
    daySchedule.slots.forEach(slot => {
      // Calculate 30-minute intervals between start and end
      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);
      
      let currMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      while (currMin < endMin) {
        const h = Math.floor(currMin / 60);
        const m = currMin % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = String(m).padStart(2, '0');
        slots.push(`${displayH}:${displayM} ${period}`);
        currMin += 30; // 30-min slots
      }
    });

    return slots;
  }, [selectedDate, activeDoctor]);

  // Handle flow transitions with validation
  const nextStep = () => {
    if (step === 1) {
      if (!selectedDate) {
        setErrorMsg('Please select an appointment date.');
        return;
      }
      setErrorMsg('');
      setStep(2);
    } else if (step === 2) {
      if (!selectedTimeSlot) {
        setErrorMsg('Please select an preferred time slot.');
        return;
      }
      setErrorMsg('');
      setStep(3);
    }
  };

  const prevStep = () => {
    setErrorMsg('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setErrorMsg('Patient name is required.');
      return;
    }
    if (!patientContact.trim()) {
      setErrorMsg('Contact number is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await onBookAppointment({
        doctorId: activeDoctor.id,
        patientName,
        patientAge,
        patientGender,
        patientContact,
        appointmentDate: selectedDate,
        appointmentTime: selectedTimeSlot,
        telehealthEnabled
      });

      if (response && response.success) {
        setBookingSuccess(response.appointment);
      } else {
        setErrorMsg('Could not register booking on the server. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBookingForm = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedTimeSlot('');
    setPatientName('');
    setPatientContact('');
    setBookingSuccess(null);
    setTelehealthEnabled(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-4" id="patient-booking-container">
      {/* Visual Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight" id="booking-heading">
          Schedule Clinical Consultation
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
          {systemMode === 'clinic' 
            ? 'Seamlessly book a priority visit with your practice care physician.'
            : 'Explore hospital departments, browse medical specialities, and secure your slot with a doctor.'}
        </p>
      </div>

      {bookingSuccess ? (
        /* SUCCESS PORTAL SCREEN */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8 max-w-lg mx-auto text-center" id="booking-success-card">
          <div className="w-16 h-16 bg-[#00A896]/10 text-[#00A896] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#00A896]/20">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Appointment Booked!</h2>
          <p className="text-xs text-[#005A9C] font-semibold bg-[#005A9C]/5 py-1 px-3 rounded-full inline-block mt-2">
            Ref: {bookingSuccess.id}
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 my-6 text-left space-y-3">
            <div className="grid grid-cols-3 text-xs">
              <span className="text-slate-400 font-medium col-span-1">Practitioner:</span>
              <span className="text-slate-800 font-semibold col-span-2">{bookingSuccess.doctorName}</span>
            </div>
            <div className="grid grid-cols-3 text-xs">
              <span className="text-slate-400 font-medium col-span-1">Patient:</span>
              <span className="text-slate-800 font-semibold col-span-2">{bookingSuccess.patientName}</span>
            </div>
            <div className="grid grid-cols-3 text-xs">
              <span className="text-slate-400 font-medium col-span-1">DateTime:</span>
              <span className="text-slate-800 font-semibold col-span-2">
                {bookingSuccess.appointmentDate} at {bookingSuccess.appointmentTime}
              </span>
            </div>
            <div className="grid grid-cols-3 text-xs">
              <span className="text-slate-400 font-medium col-span-1">Type:</span>
              <span className="text-slate-800 font-semibold col-span-2 flex items-center space-x-1">
                {bookingSuccess.telehealthEnabled ? (
                  <>
                    <Video className="h-3 w-3 text-[#00A896]" />
                    <span className="text-[#00A896]">Telehealth Video Call</span>
                  </>
                ) : (
                  <span>Standard In-Clinic Consultation</span>
                )}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 text-left mb-6">
            <strong>Omnichannel Dispatch:</strong> Notifications were instantly dispatched to patient's contact via SMS, Email registration, and simulated Meta WhatsApp Business endpoints. Logs are visible in the Admin webhook console.
          </div>

          <button
            onClick={resetBookingForm}
            className="w-full py-3 bg-[#005A9C] text-white text-xs font-semibold rounded-xl hover:bg-opacity-90 active:scale-95 transition-all shadow-sm"
          >
            Book Another Consultation
          </button>
        </div>
      ) : (
        /* STEPPERS MATRIX FORM */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-md overflow-hidden" id="booking-stepper-panel">
          {/* Active Steps Progress Bar */}
          <div className="bg-slate-50 border-b border-secondary/10 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-6 w-full">
              {[
                { number: 1, label: systemMode === 'clinic' ? 'Select Date' : 'Choose Doctor & Date' },
                { number: 2, label: 'Select Preferred Slot' },
                { number: 3, label: 'Patient Identification' }
              ].map((s) => (
                <div key={s.number} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step >= s.number ? 'bg-[#005A9C] text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {s.number}
                  </div>
                  <span className={`text-xs font-semibold ${step === s.number ? 'text-slate-800' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                  {s.number < 3 && <span className="text-slate-300">/</span>}
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center space-x-2 text-rose-800 text-xs">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* STEP 1: SELECT DOCTOR AND DATE */}
            {step === 1 && (
              <div className="space-y-6" id="booking-step-1">
                {systemMode === 'hospital' && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-700 block">1. Select Hospital Medical Specialty</label>
                    <div className="flex flex-wrap gap-1.5" id="hospital-dept-filters">
                      {departments.map(dept => (
                        <button
                          key={dept}
                          onClick={() => {
                            setSelectedDept(dept);
                            // Auto reset doctor if previous doctor is filtered out
                            const isKeep = doctors.find(d => d.id === selectedDoctorId && (dept === 'All' || d.department === dept));
                            if (!isKeep) {
                              const avail = doctors.find(d => dept === 'All' || d.department === dept);
                              if (avail) setSelectedDoctorId(avail.id);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedDept === dept
                              ? 'bg-[#005A9C] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>

                    <label className="text-xs font-bold text-slate-700 block mt-4">2. Select Your Consultant Physician</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="hospital-doctor-directory">
                      {filteredDoctors.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setSelectedDate('');
                            setSelectedTimeSlot('');
                          }}
                          className={`border rounded-2xl p-4 cursor-pointer transition-all flex space-x-3 items-start ${
                            selectedDoctorId === doc.id
                              ? 'border-[#005A9C] bg-[#005A9C]/5 ring-1 ring-[#005A9C]/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <img
                            src={doc.profileImage}
                            alt={doc.name}
                            className="w-12 h-12 rounded-xl object-cover object-center bg-slate-100 whitespace-nowrap"
                          />
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                            <p className="text-[10px] text-[#00A896] font-semibold">{doc.specialty}</p>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{doc.bio}</p>
                            <span className="text-[10px] font-bold text-[#005A9C] mt-2 block">
                              Fees: ${doc.consultingFees}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CLINIC MODE CARD REPRESENTATION */}
                {systemMode === 'clinic' && activeDoctor && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start space-x-4 mb-4">
                    <img
                      src={activeDoctor.profileImage}
                      alt={activeDoctor.name}
                      className="w-16 h-16 rounded-2xl object-cover"
                    />
                    <div className="text-left flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#005A9C] text-white uppercase">Practice Lead</span>
                        <span className="text-xs text-slate-400 font-semibold">{activeDoctor.department}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{activeDoctor.name}</h3>
                      <p className="text-xs text-[#00A896] font-semibold">{activeDoctor.specialty}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{activeDoctor.bio}</p>
                      <span className="text-xs text-slate-800 font-semibold block mt-1.5 text-secondary">
                        Consultation Fee: ${activeDoctor.consultingFees}
                      </span>
                    </div>
                  </div>
                )}

                {/* DATE SELECTOR */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">
                    {systemMode === 'clinic' ? '1. Select Appointment Date' : '3. Select Booking Date'}
                  </label>
                  
                  {availableDates.length === 0 ? (
                    <div className="p-4 bg-slate-100 text-slate-500 rounded-xl text-xs text-center">
                      Our physician has no working slots published for the upcoming 14 days. Please check back.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="available-dates-grid">
                      {availableDates.map(item => (
                        <button
                          key={item.dateString}
                          onClick={() => {
                            setSelectedDate(item.dateString);
                            setSelectedTimeSlot('');
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                            selectedDate === item.dateString
                              ? 'bg-[#005A9C] text-white border-[#005A9C] font-semibold shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-[10px] uppercase opacity-75">{item.dayName}</span>
                          <span className="text-xs font-bold mt-1">{item.formatted}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={nextStep}
                    disabled={!selectedDate}
                    className="flex items-center space-x-1 py-2.5 px-5 bg-[#005A9C] text-white text-xs font-semibold rounded-xl hover:bg-opacity-95 disabled:opacity-50"
                  >
                    <span>Choose Time Slot</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT TIME SLOT */}
            {step === 2 && (
              <div className="space-y-6" id="booking-step-2">
                <div className="flex items-center justify-between text-left">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Selected Physician</span>
                    <span className="text-xs font-bold text-slate-800">{activeDoctor.name} ({activeDoctor.specialty})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Appointment Date</span>
                    <span className="text-xs font-bold text-slate-800">{selectedDate}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">Available Consulting Hours</label>
                  
                  {selectableTimesList.length === 0 ? (
                    <div className="p-4 bg-slate-100 text-slate-500 rounded-xl text-xs text-center">
                      No matching slots available on this day. The doctor may have blocked off vacation hours.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" id="available-slots-grid">
                      {selectableTimesList.map(time => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTimeSlot(time)}
                          className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                            selectedTimeSlot === time
                              ? 'bg-[#00A896] text-white border-[#00A896] font-bold shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 inline mr-1 opacity-75" />
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Telehealth toggle button */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                        <Video className="h-4 w-4 text-[#00A896]" />
                        <span>Optional Telehealth Consultation</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Check this box to convert this appointment to virtual video consult. This automatically provisions a secure Zoom/Jitsi Jitsi link upon validation.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                      <input
                        type="checkbox"
                        checked={telehealthEnabled}
                        onChange={(e) => setTelehealthEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005A9C]"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={prevStep}
                    className="flex items-center space-x-1 py-2 px-4 border border-slate-300 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={nextStep}
                    disabled={!selectedTimeSlot}
                    className="flex items-center space-x-1 py-2.5 px-5 bg-[#005A9C] text-white text-xs font-semibold rounded-xl hover:bg-opacity-95 disabled:opacity-50"
                  >
                    <span>Add Patient Info</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PATIENT INFORMATION */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-6" id="booking-step-3">
                <div className="flex items-center justify-between text-left p-3 bg-secondary/5 rounded-2xl border border-secondary/10">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Practitioner</span>
                    <span className="text-xs font-bold text-slate-800">{activeDoctor.name} ({activeDoctor.specialty})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Appointment Slot</span>
                    <span className="text-xs font-semibold text-slate-800">{selectedDate} @ {selectedTimeSlot}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-bold text-slate-700" htmlFor="booking-patient-name">Patient Full Name*</label>
                    <input
                      id="booking-patient-name"
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C] focus:outline-hidden"
                      placeholder="e.g. Gale Hawthorne"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-bold text-slate-700" htmlFor="booking-patient-phone">Contact Mobile Number*</label>
                    <input
                      id="booking-patient-phone"
                      type="tel"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C] focus:outline-hidden"
                      placeholder="e.g. +1 (555) 019-2831"
                      value={patientContact}
                      onChange={(e) => setPatientContact(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-bold text-slate-700" htmlFor="booking-patient-age">Patient Age</label>
                    <input
                      id="booking-patient-age"
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#005A9C] focus:outline-hidden"
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      min={0}
                      max={120}
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-bold text-slate-700">Gender Identity</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Male', 'Female', 'Other'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setPatientGender(g as any)}
                          className={`py-2 px-2 border rounded-xl text-xs font-medium transition-all text-center ${
                            patientGender === g
                              ? 'bg-[#005A9C] text-white border-[#005A9C]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center space-x-1 py-2 px-4 border border-slate-300 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 py-3 px-6 bg-[#00A896] text-white text-xs font-bold rounded-xl hover:bg-opacity-95 disabled:opacity-50 shadow-sm"
                  >
                    <span>{isSubmitting ? 'Securing Booking...' : 'Process Booking Now'}</span>
                    <CheckCircle className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
