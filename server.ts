import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { AppState, Appointment, Doctor, WebhookLog, SystemSettings, IntakeForm, Prescription } from "./src/types";

// Setup initial state defaults
const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: "doc_1",
    name: "Dr. Sophia Patel",
    specialty: "Cardiologist",
    department: "Cardiology",
    bio: "Board-certified cardiologist with over 12 years of clinical experience. Specializes in cardiovascular health, heart disease prevention, and echocardiography.",
    consultingFees: 150,
    profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
    availability: {
      monday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      tuesday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      wednesday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }] },
      thursday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      friday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] }
    },
    vacationDates: ["2026-07-04", "2026-11-26"]
  },
  {
    id: "doc_2",
    name: "Dr. Marcus Chen",
    specialty: "Pediatrician",
    department: "Pediatrics",
    bio: "Warm, child-friendly practitioner dedicated to developmental health, early immunizations, pediatric nutrition, and chronic asthma care.",
    consultingFees: 120,
    profileImage: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
    availability: {
      monday: { enabled: true, slots: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
      tuesday: { enabled: false, slots: [] },
      wednesday: { enabled: true, slots: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
      thursday: { enabled: true, slots: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }] },
      friday: { enabled: true, slots: [{ start: "08:00", end: "12:00" }] },
      saturday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }] },
      sunday: { enabled: false, slots: [] }
    },
    vacationDates: ["2026-07-10", "2026-07-11", "2026-07-12"]
  },
  {
    id: "doc_3",
    name: "Dr. Sarah Jenkins",
    specialty: "Family Physician",
    department: "General Medicine",
    bio: "Focuses on comprehensive healthcare for patients of all ages. Areas of expertise include disease prevention, chronic illness management, and lifestyle counseling.",
    consultingFees: 90,
    profileImage: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=400",
    availability: {
      monday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      tuesday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      wednesday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      thursday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      friday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] }
    },
    vacationDates: []
  },
  {
    id: "doc_4",
    name: "Dr. Elena Rostova",
    specialty: "Neurologist",
    department: "Neurology",
    bio: "Dedicated neurologist researching and treating complex neurodegenerative diseases, neuromuscular issues, diagnostic EEGs, and chronic headache disorders.",
    consultingFees: 180,
    profileImage: "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&q=80&w=400",
    availability: {
      monday: { enabled: false, slots: [] },
      tuesday: { enabled: true, slots: [{ start: "10:00", end: "13:00" }, { start: "14:00", end: "17:00" }] },
      wednesday: { enabled: false, slots: [] },
      thursday: { enabled: true, slots: [{ start: "10:00", end: "13:00" }, { start: "14:00", end: "17:00" }] },
      friday: { enabled: false, slots: [] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] }
    },
    vacationDates: ["2026-08-01", "2026-08-15"]
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  systemMode: 'hospital',
  reminderBufferMinutes: 30,
  patientTemplate: "Dear [Patient Name], your appointment with [Doctor Name] is confirmed for [Date] at [Time]. Ref ID: [ApptID]. Virtual Video Consulting: [TeleLink]",
  doctorTemplate: "Dr. [Doctor Name], a new appointment has been booked by [Patient Name] on [Date] at [Time]. Telehealth Enabled: [TeleLink]",
  webhookEmailUrl: "https://api.curapulse.io/v1/webhooks/email",
  webhookSmsUrl: "https://api.curapulse.io/v1/webhooks/sms",
  webhookWhatsappUrl: "https://api.curapulse.io/v1/webhooks/whatsapp"
};

const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: "APT-8921",
    doctorId: "doc_1",
    doctorName: "Dr. Sophia Patel",
    patientName: "Gale Hawthorne",
    patientAge: 28,
    patientGender: "Male",
    patientContact: "+1 (555) 019-2831",
    appointmentDate: "2026-06-25",
    appointmentTime: "10:00 AM",
    status: "Confirmed",
    telehealthEnabled: true,
    telehealthLink: "https://meet.jit.si/CuraPulse-doc_1-APT-8921",
    createdTime: "2026-06-21T09:15:00.000Z",
    reminderSent: false
  },
  {
    id: "APT-4512",
    doctorId: "doc_2",
    doctorName: "Dr. Marcus Chen",
    patientName: "Primrose Everdeen",
    patientAge: 12,
    patientGender: "Female",
    patientContact: "+1 (555) 732-9011",
    appointmentDate: "2026-06-22",
    appointmentTime: "11:30 AM",
    status: "Arrived",
    telehealthEnabled: false,
    intakeForm: {
      fullName: "Primrose Everdeen",
      age: 12,
      gender: "Female",
      contactNumber: "+1 (555) 732-9011",
      symptoms: "Mild throat irritation, periodic dry cough, slight fatigue.",
      allergies: "Penicillin, seasonal pollen",
      vitals: {
        bp: "110/70",
        pulse: 78
      },
      completedAt: "2026-06-22T09:45:00.000Z"
    },
    createdTime: "2026-06-20T14:20:00.000Z",
    reminderSent: true,
    reminderSentTime: "2026-06-22T11:00:00.000Z"
  },
  {
    id: "APT-1124",
    doctorId: "doc_3",
    doctorName: "Dr. Sarah Jenkins",
    patientName: "Peeta Mellark",
    patientAge: 32,
    patientGender: "Male",
    patientContact: "+1 (555) 482-1100",
    appointmentDate: "2026-06-21",
    appointmentTime: "03:00 PM",
    status: "Completed",
    telehealthEnabled: false,
    intakeForm: {
      fullName: "Peeta Mellark",
      age: 32,
      gender: "Male",
      contactNumber: "+1 (555) 482-1100",
      symptoms: "Routine annual checkup, requests prescription refill for mild physical joint soreness.",
      allergies: "None reported",
      vitals: {
        bp: "122/81",
        pulse: 65
      },
      completedAt: "2026-06-21T14:40:00.000Z"
    },
    prescription: {
      notes: "Therapeutic joint mobility stretching exercises. Refrain from heavy lifting. Hydrate frequently.",
      medications: [
        { name: "Coflex Therapeutic Balm", dosage: "Apply topically", frequency: "Twice daily", duration: "7 days" },
        { name: "Ibuprofen 400mg", dosage: "1 tablet after meals", frequency: "As needed", duration: "5 days" }
      ],
      createdAt: "2026-06-21T15:25:00.000Z",
      sentAt: "2026-06-21T15:26:00.000Z",
      sentChannels: ["Email", "WhatsApp"]
    },
    createdTime: "2026-06-19T10:00:00.000Z",
    reminderSent: true,
    reminderSentTime: "2026-06-21T14:30:00.000Z"
  }
];

const STATE_FILE = path.join(process.cwd(), "curapulse_state.json");

// Load state from file or create defaults
function loadAppState(): AppState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      // Ensure all fields exist
      return {
        doctors: parsed.doctors || DEFAULT_DOCTORS,
        appointments: parsed.appointments || DEFAULT_APPOINTMENTS,
        settings: parsed.settings || DEFAULT_SETTINGS,
        webhookLogs: parsed.webhookLogs || []
      };
    }
  } catch (err) {
    console.error("Failed to read CuraPulse state file. Falling back to defaults.", err);
  }

  const defaultState: AppState = {
    doctors: DEFAULT_DOCTORS,
    appointments: DEFAULT_APPOINTMENTS,
    settings: DEFAULT_SETTINGS,
    webhookLogs: []
  };
  saveAppState(defaultState);
  return defaultState;
}

// Save state to file
function saveAppState(state: AppState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write CuraPulse state file", err);
  }
}

// Replace template placeholders with real details
function formatMessage(template: string, appt: Appointment, doc: Doctor): string {
  let msg = template;
  msg = msg.replace(/\[Patient Name\]/gi, appt.patientName);
  msg = msg.replace(/\[Doctor Name\]/gi, doc.name);
  msg = msg.replace(/\[Date\]/gi, appt.appointmentDate);
  msg = msg.replace(/\[Time\]/gi, appt.appointmentTime);
  msg = msg.replace(/\[ApptID\]/gi, appt.id);
  
  const telehealthLink = appt.telehealthEnabled 
    ? appt.telehealthLink || `https://meet.jit.si/CuraPulse-${appt.doctorId}-${appt.id}` 
    : "N/A (In-Clinic)";
  msg = msg.replace(/\[TeleLink\]/gi, telehealthLink);
  return msg;
}

// Simulated Omnichannel trigger function
function triggerOmnichannelWebhooks(appt: Appointment, state: AppState, scenario: 'booking' | 'reminder' | 'prescription' | 'intake'): WebhookLog[] {
  const doc = state.doctors.find(d => d.id === appt.doctorId) || {
    id: appt.doctorId,
    name: appt.doctorName,
    specialty: "General Medicine",
    department: "General Medicine",
    bio: "",
    consultingFees: 80,
    profileImage: "",
    availability: DEFAULT_DOCTORS[2].availability,
    vacationDates: []
  } as Doctor;

  const logs: WebhookLog[] = [];
  const timestamp = new Date().toISOString();
  
  let patientMsg = "";
  let doctorMsg = "";

  if (scenario === 'booking') {
    patientMsg = formatMessage(state.settings.patientTemplate, appt, doc);
    doctorMsg = formatMessage(state.settings.doctorTemplate, appt, doc);
  } else if (scenario === 'reminder') {
    patientMsg = `Reminder: Dear ${appt.patientName}, your upcoming session with ${doc.name} starts in ${state.settings.reminderBufferMinutes} minutes! Date: ${appt.appointmentDate} at ${appt.appointmentTime}. Link: ${appt.telehealthEnabled ? appt.telehealthLink : 'N/A'}`;
    doctorMsg = `Schedule Reminder: Dr. ${doc.name}, your session with Patient ${appt.patientName} is scheduled in ${state.settings.reminderBufferMinutes} minutes (${appt.appointmentTime}).`;
  } else if (scenario === 'prescription') {
    const rx = appt.prescription;
    const medsList = rx ? rx.medications.map(m => `- ${m.name} (${m.dosage}): ${m.frequency} for ${m.duration}`).join('\n') : '';
    patientMsg = `Medical Prescription ref ${appt.id}:\nDr. ${doc.name} has prescribed medications for you:\n${medsList}\nNotes: ${rx?.notes || 'N/A'}`;
    doctorMsg = `Prescripton dispatched successfully to ${appt.patientName} for session ref ${appt.id}.`;
  } else if (scenario === 'intake') {
    patientMsg = `CuraPulse Digital Intake: Hi ${appt.patientName}, please complete your clinical intake secure form here: ${process.env.APP_URL || 'http://localhost:3000'}/intake?apptId=${appt.id}`;
    doctorMsg = `System: Patient ${appt.patientName} was checked in. Intake link generated.`;
  }

  const modes: ('Email' | 'SMS' | 'WhatsApp')[] = ['Email', 'SMS', 'WhatsApp'];
  modes.forEach(mode => {
    let endpoint = "";
    let recipient = "";
    let content = "";
    
    if (mode === 'Email') {
      endpoint = state.settings.webhookEmailUrl;
      recipient = `${appt.patientName.toLowerCase().replace(/\s+/g, '')}@example.com`;
      content = `[EMAIL TO ${recipient}]\nSubject: CuraPulse Notification (${appt.id})\n\n${patientMsg}`;
    } else if (mode === 'SMS') {
      endpoint = state.settings.webhookSmsUrl;
      recipient = appt.patientContact;
      content = `[SMS TO ${recipient}]\n${patientMsg.substring(0, 160)}`;
    } else {
      endpoint = state.settings.webhookWhatsappUrl;
      recipient = appt.patientContact;
      content = `[WHATSAPP TO ${recipient}]\n📲 *CuraPulse Healthcare*\n${patientMsg}`;
    }

    const patientLog: WebhookLog = {
      id: "LOG-" + Math.floor(100000 + Math.random() * 900000),
      timestamp,
      channel: mode,
      recipient,
      content,
      endpoint,
      payload: JSON.stringify({
        event: `appointment_${scenario}`,
        receiver: "patient",
        appointmentId: appt.id,
        recipient,
        message: patientMsg,
        timestamp
      }, null, 2),
      status: 'Delivered'
    };
    logs.push(patientLog);

    // Also trigger Doctor Channel for Email
    if (mode === 'Email' && scenario !== 'intake') {
      const docEmail = `dr.${doc.name.toLowerCase().replace(/\s+/g, '').replace('dr.', '')}@curapulse.io`;
      const docLog: WebhookLog = {
        id: "LOG-" + Math.floor(100000 + Math.random() * 900000),
        timestamp,
        channel: 'Email',
        recipient: docEmail,
        content: `[EMAIL TO DOCTOR]\nSubject: Medical Update Alert (${appt.id})\n\n${doctorMsg}`,
        endpoint,
        payload: JSON.stringify({
          event: `appointment_${scenario}`,
          receiver: "doctor",
          appointmentId: appt.id,
          recipient: docEmail,
          message: doctorMsg,
          timestamp
        }, null, 2),
        status: 'Delivered'
      };
      logs.push(docLog);
    }
  });

  return logs;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // GET State
  app.get("/api/state", (req, res) => {
    const state = loadAppState();
    res.json(state);
  });

  // POST Settings
  app.post("/api/settings", (req, res) => {
    const state = loadAppState();
    state.settings = { ...state.settings, ...req.body };
    saveAppState(state);
    res.json({ success: true, settings: state.settings });
  });

  // POST Create Appointment
  app.post("/api/appointments", (req, res) => {
    const state = loadAppState();
    const { doctorId, patientName, patientAge, patientGender, patientContact, appointmentDate, appointmentTime, telehealthEnabled } = req.body;
    
    if (!doctorId || !patientName || !patientContact || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const doc = state.doctors.find(d => d.id === doctorId);
    if (!doc) {
      return res.status(400).json({ error: "Doctor not found" });
    }

    const apptId = "APT-" + Math.floor(1000 + Math.random() * 9000);
    const telehealthLink = telehealthEnabled ? `https://meet.jit.si/CuraPulse-${doctorId}-${apptId}` : undefined;

    const newAppt: Appointment = {
      id: apptId,
      doctorId,
      doctorName: doc.name,
      patientName,
      patientAge: Number(patientAge) || 30,
      patientGender: patientGender || 'Other',
      patientContact,
      appointmentDate,
      appointmentTime,
      status: "Confirmed",
      telehealthEnabled: !!telehealthEnabled,
      telehealthLink,
      createdTime: new Date().toISOString(),
      reminderSent: false
    };

    state.appointments.unshift(newAppt);

    // Call simulated webhooks
    const logs = triggerOmnichannelWebhooks(newAppt, state, 'booking');
    state.webhookLogs = [...logs, ...state.webhookLogs].slice(0, 500); // limit to 500 logs max

    saveAppState(state);
    res.json({ success: true, appointment: newAppt, logsCreated: logs.length });
  });

  // POST Update Appointment Status
  app.post("/api/appointments/:id/status", (req, res) => {
    const state = loadAppState();
    const { id } = req.params;
    const { status } = req.body;

    const appt = state.appointments.find(a => a.id === id);
    if (!appt) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    appt.status = status;

    if (status === 'Arrived') {
      // Trigger intake mock notification
      const logs = triggerOmnichannelWebhooks(appt, state, 'intake');
      state.webhookLogs = [...logs, ...state.webhookLogs].slice(0, 500);
    }

    saveAppState(state);
    res.json({ success: true, appointment: appt });
  });

  // POST Mark Arrived (Specific route highlighting patient arriving)
  app.post("/api/appointments/:id/arrive", (req, res) => {
    const state = loadAppState();
    const { id } = req.params;

    const appt = state.appointments.find(a => a.id === id);
    if (!appt) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    appt.status = "Arrived";
    
    // Check if intake form skeleton exists, initialize if not
    if (!appt.intakeForm) {
      appt.intakeForm = {
        fullName: appt.patientName,
        age: appt.patientAge,
        gender: appt.patientGender,
        contactNumber: appt.patientContact,
        symptoms: "",
        allergies: "",
        vitals: { bp: "", pulse: undefined }
      };
    }

    const logs = triggerOmnichannelWebhooks(appt, state, 'intake');
    state.webhookLogs = [...logs, ...state.webhookLogs].slice(0, 500);

    saveAppState(state);
    res.json({ success: true, appointment: appt, link: `/intake?apptId=${appt.id}` });
  });

  // POST Submit Clinical Digital Intake
  app.post("/api/appointments/:id/intake", (req, res) => {
    const state = loadAppState();
    const { id } = req.params;
    const intakeData: IntakeForm = req.body;

    const appt = state.appointments.find(a => a.id === id);
    if (!appt) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    appt.intakeForm = {
      ...intakeData,
      completedAt: new Date().toISOString()
    };
    
    // Ensure status is at least Arrived
    if (appt.status === 'Confirmed') {
      appt.status = 'Arrived';
    }

    saveAppState(state);
    res.json({ success: true, appointment: appt });
  });

  // POST Write Prescription
  app.post("/api/appointments/:id/prescription", (req, res) => {
    const state = loadAppState();
    const { id } = req.params;
    const { notes, medications, sentChannels } = req.body;

    const appt = state.appointments.find(a => a.id === id);
    if (!appt) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    appt.prescription = {
      notes,
      medications,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      sentChannels: sentChannels || ["Email", "WhatsApp"]
    };

    appt.status = "Completed";

    const logs = triggerOmnichannelWebhooks(appt, state, 'prescription');
    state.webhookLogs = [...logs, ...state.webhookLogs].slice(0, 500);

    saveAppState(state);
    res.json({ success: true, appointment: appt, logsCreated: logs.length });
  });

  // POST Update Doctor Self-Service Profile & Availability Matrix
  app.post("/api/doctors/:id", (req, res) => {
    const state = loadAppState();
    const { id } = req.params;
    const { name, specialty, bio, consultingFees, availability, vacationDates, profileImage } = req.body;

    const docIndex = state.doctors.findIndex(d => d.id === id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    state.doctors[docIndex] = {
      ...state.doctors[docIndex],
      ...(name && { name }),
      ...(specialty && { specialty }),
      ...(bio && { bio }),
      ...(consultingFees !== undefined && { consultingFees: Number(consultingFees) }),
      ...(availability && { availability }),
      ...(vacationDates && { vacationDates }),
      ...(profileImage && { profileImage })
    };

    // Update doctorName in future appointments too
    state.appointments.forEach(appt => {
      if (appt.doctorId === id) {
        appt.doctorName = state.doctors[docIndex].name;
      }
    });

    saveAppState(state);
    res.json({ success: true, doctor: state.doctors[docIndex] });
  });

  // POST Trigger Scheduler Reminder Cron Job
  // This simulates checking the state scheduler and firing outbound webhooks for upcoming appointments
  app.post("/api/reminders/trigger", (req, res) => {
    const state = loadAppState();
    const { forceAll } = req.body; // option to force trigger emails/notifications for demo purposes
    
    let triggerCount = 0;
    const newLogs: WebhookLog[] = [];
    const now = new Date().toISOString();

    state.appointments.forEach(appt => {
      // For demo trigger: if forcing, or if upcoming and reminderNotSent
      if (forceAll || (!appt.reminderSent && appt.status === 'Confirmed')) {
        appt.reminderSent = true;
        appt.reminderSentTime = now;
        triggerCount++;
        const logs = triggerOmnichannelWebhooks(appt, state, 'reminder');
        newLogs.push(...logs);
      }
    });

    if (triggerCount > 0) {
      state.webhookLogs = [...newLogs, ...state.webhookLogs].slice(0, 500);
      saveAppState(state);
    }

    res.json({
      success: true,
      processedAppointments: state.appointments.length,
      triggeredToday: triggerCount,
      logsCreated: newLogs.length
    });
  });

  // serve Vite dev server or production assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CuraPulse Full-Stack Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
