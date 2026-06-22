export type SystemMode = 'clinic' | 'hospital';

export type UserRole = 'patient' | 'doctor' | 'receptionist';

export type AppointmentStatus = 'Confirmed' | 'Arrived' | 'Completed' | 'Cancelled';

export interface TimeSlot {
  start: string; // e.g. "09:00"
  end: string;   // e.g. "13:00"
}

export interface AvailabilityDay {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface DoctorAvailability {
  monday: AvailabilityDay;
  tuesday: AvailabilityDay;
  wednesday: AvailabilityDay;
  thursday: AvailabilityDay;
  friday: AvailabilityDay;
  saturday: AvailabilityDay;
  sunday: AvailabilityDay;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  bio: string;
  consultingFees: number;
  profileImage: string;
  availability: DoctorAvailability;
  vacationDates: string[]; // e.g. ["2026-07-04", "2026-07-05"]
}

export interface VitalSigns {
  bp?: string;     // e.g. "120/80"
  pulse?: number;  // e.g. 72
}

export interface IntakeForm {
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  symptoms: string;
  allergies: string;
  vitals?: VitalSigns;
  completedAt?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  notes: string;
  medications: Medication[];
  createdAt?: string;
  sentAt?: string;
  sentChannels?: ('Email' | 'SMS' | 'WhatsApp')[];
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  patientContact: string;
  appointmentDate: string; // e.g. "2026-06-25"
  appointmentTime: string; // e.g. "10:30 AM"
  status: AppointmentStatus;
  telehealthEnabled: boolean;
  telehealthLink?: string;
  intakeForm?: IntakeForm;
  prescription?: Prescription;
  createdTime: string;
  reminderSent: boolean;
  reminderSentTime?: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  channel: 'Email' | 'SMS' | 'WhatsApp';
  recipient: string;
  content: string;
  payload: string;
  endpoint: string;
  status: 'Delivered' | 'Pending' | 'Failed';
}

export interface SystemSettings {
  systemMode: SystemMode;
  reminderBufferMinutes: number; // e.g. 30, 60, 120, 1440
  patientTemplate: string;
  doctorTemplate: string;
  webhookEmailUrl: string;
  webhookSmsUrl: string;
  webhookWhatsappUrl: string;
}

export interface AppState {
  doctors: Doctor[];
  appointments: Appointment[];
  settings: SystemSettings;
  webhookLogs: WebhookLog[];
}
