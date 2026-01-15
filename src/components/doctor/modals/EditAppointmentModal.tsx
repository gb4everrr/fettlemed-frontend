'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
import {
  X, User, FileText, Beaker, Stethoscope, Pill, 
  Activity, Calendar, Clock, MapPin, Loader2, Save
} from 'lucide-react';
import { Appointment, DoctorVital, VitalsEntry } from '@/types/clinic';

// IMPORT NEW COMPONENTS
import { ConsultOverviewTab } from '../encounter/ConsultOverviewTab';
import { SoapTab } from '../encounter/SoapTab';
import { OrdersTab } from '../encounter/OrdersTab';
import { MedsTab } from '../encounter/MedsTab';
import { DiagnosisTab } from '../encounter/DiagnosisTab';
import { PatientProfileModal } from './PatientProfileModal';

// --- TYPES ---
type ActiveTab = 'overview' | 'soap' | 'orders' | 'diagnosis' | 'meds';

interface EditAppointmentModalProps {
  appointment: Appointment;
  clinicId: number;
  clinicName: string;
  clinicTimezone?: string; 
  onClose: () => void;
  onRefreshList: () => void;
  user: any;
  role?: string;           
}

export default function EditAppointmentModal({
  appointment: initialAppointment, 
  clinicId, 
  clinicName, 
  onClose, 
  onRefreshList, 
  user
}: EditAppointmentModalProps) {

  // --- STATE ---
  const [appointment, setAppointment] = useState(initialAppointment);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [headerVitals, setHeaderVitals] = useState<{name: string, value: string, unit: string}[]>([]);

  // Profile Modal State
  const [showProfile, setShowProfile] = useState(false);

  // SOAP State
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', observations_private: '' });
  const [savingNotes, setSavingNotes] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Extra Data for Overview
  const [history, setHistory] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  
  // Vitals State
  const [doctorVitals, setDoctorVitals] = useState<DoctorVital[]>([]);
  const [vitalsValues, setVitalsValues] = useState<{ [key: string]: string }>({});
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    fetchHeaderVitals();
    fetchSoapNotes();
    fetchOverviewData(); // New: Fetch History & Allergies
    fetchDoctorVitals(); // Load vitals config
    fetchAppointmentVitals(); // Load saved vitals
  }, [appointment.id]);

  // --- API CALLS ---

 const fetchHeaderVitals = async () => {
  setLoadingHeader(true);
  try {
    // 1. Try to get vitals for THIS appointment (Priority)
    let res = await api.get(`/vitals/appointment/${appointment.id}`, { 
      params: { clinic_id: clinicId } 
    });

    let entry = null;
    let dateLabel = "Today";

    if (res.data && res.data.length > 0) {
       entry = res.data[0];
    } else {
       // 2. Fallback: Get LATEST vitals from history
       const historyRes = await api.get(`/clinic-vitals/patient/latest`, {
         params: { clinic_id: clinicId, patient_id: appointment.clinic_patient_id }
       });
       if (historyRes.data) {
          entry = historyRes.data;
          dateLabel = new Date(entry.created_at).toLocaleDateString(); // Show date of recording
       }
    }

    if (entry) {
      const formatted = entry.values.map((v: any) => ({
         name: v.config.vital_name,
         value: v.vital_value,
         unit: v.config.unit
      }));
      // We can also store the date label if you want to display it in the header
      setHeaderVitals(formatted); 
      // (Optional: You might want to add a state for 'vitalsDate' to show "Recorded: Oct 12" in the UI)
    } else {
      setHeaderVitals([]);
    }

  } catch (err) {
    console.error("Failed to load header vitals", err);
  } finally {
    setLoadingHeader(false);
  }
};

  const fetchOverviewData = async () => {
    try {
        const pId = appointment.clinic_patient_id;
        if(!pId) return;

        // Fetch History & Allergies in parallel
        const [histRes, algRes] = await Promise.all([
            api.get(`/clinic-vitals/entry/history/${pId}?clinic_id=${clinicId}`),
            api.get(`/doctor/patient/${pId}/allergies?clinic_id=${clinicId}`)
        ]);

        setHistory(histRes.data || []);
        // Assuming allergies endpoint returns array of strings, or object with array
        setAllergies(algRes.data || []);
    } catch(err) {
        console.error("Failed to load overview data", err);
    }
  };

const fetchSoapNotes = async () => {
  setLoadingNotes(true);
  try {
    const res = await api.get(`/consultation-notes/${appointment.id}`, { 
        params: { clinic_id: clinicId } 
    });

    if (res.data) {
      // FIX: Spread '...res.data' first to keep 'permissions', 'id', 'created_at'
      setSoapNotes({
          ...res.data, 
          subjective: res.data.subjective || '',
          objective: res.data.objective || '',
          observations_private: res.data.observations_private || ''
      });
    }
  } catch (err) {
    console.error("Failed to fetch SOAP notes", err);
  } finally {
    setLoadingNotes(false);
  }
};

  const fetchDoctorVitals = async () => {
    setIsLoadingVitals(true);
    try {
      const res = await api.get(`/vitals/doctor-assignments/${appointment.clinic_doctor_id}`, { params: { clinic_id: clinicId } });
      setDoctorVitals(res.data || []);
    } catch (err) { console.error(err); } 
    finally { setIsLoadingVitals(false); }
  };

  const fetchAppointmentVitals = async () => {
    try {
      const res = await api.get(`/vitals/appointment/${appointment.id}`, { params: { clinic_id: clinicId } });
      if (res.data && res.data.length > 0) {
        const values: any = {};
        res.data[0].values.forEach((v: any) => (values[v.config.vital_name] = v.vital_value));
        setVitalsValues(values);
      }
    } catch (err) { console.error(err); }
  };

  // --- HANDLERS ---
  const handleSaveSoapNotes = async () => {
    setSavingNotes(true);
    try {
      await api.post('/consultation-notes', { clinic_id: clinicId, appointment_id: appointment.id, ...soapNotes });
      // You can add a toast/notification call here
    } catch (err) { console.error(err); } 
    finally { setSavingNotes(false); }
  };

  const handleSaveVitals = async () => {
    setIsSavingVitals(true);
    try {
      const values = doctorVitals
        .filter((v) => vitalsValues[v.vitalConfig.vital_name])
        .map((v) => ({ config_id: v.vital_config_id, vital_value: vitalsValues[v.vitalConfig.vital_name] }));
      
      await api.post('/vitals/entry/submit', {
        clinic_id: clinicId,
        clinic_patient_id: appointment.clinic_patient_id,
        recorded_by_admin_id: user.id,
        appointment_id: appointment.id,
        values: values
      });
      fetchHeaderVitals(); // Refresh header
    } catch (err) { console.error("Vitals save error", err); } 
    finally { setIsSavingVitals(false); }
  };

  const activeVitalsProps = {
      doctorVitals,
      vitalsValues,
      setVitalsValues,
      onSave: handleSaveVitals,
      isSaving: isSavingVitals,
      isLoading: isLoadingVitals
  };

  const quickActions = {
      onReschedule: () => alert("Reschedule Modal Trigger"), // We'll verify this logic later
      onCancel: () => alert("Cancel Modal Trigger"),
      onInvoice: () => alert("Switch to Invoice View"),
      onComplete: () => alert("Complete Appointment Logic")
  };

  // --- HELPERS ---
  const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) : '--:--';
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '--';

  const formatClinicTime = (dateString: string | Date) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC', // FORCE UTC
  }).format(date);
};

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* HEADER */}
        <div className="h-20 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10">
            <div  className="flex items-center gap-4">
                <div  onClick={() => setShowProfile(true)} className="h-12 w-12 bg-var(--color-primary-brand) rounded-full flex items-center justify-center font-bold text-var(--color-primary-brand) text-lg shadow-sm">
                    {appointment.patient?.first_name?.[0] || '?'}{appointment.patient?.last_name?.[0] || '?'}
                </div>
                <div 
                   onClick={() => setShowProfile(true)}
                   className="cursor-pointer group"
                >
                    <h2 className="font-bold text-lg text-gray-900 leading-tight flex items-center gap-2 group-hover:text-blue-500 transition-colors">
                        {appointment.patient?.first_name} {appointment.patient?.last_name}
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500">
                           View Profile
                        </span>
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {clinicName}</span>
                        <div className="h-3 w-px bg-gray-300"></div>
                        <span className="flex items-center gap-1 text-gray-700 font-medium"><Clock className="w-3 h-3"/> {formatClinicTime(appointment.datetime_start)}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden lg:flex gap-4 border-r border-gray-200 pr-6">
                    {loadingHeader ? (
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Loading Vitals...</span>
                    ) : headerVitals.length > 0 ? (
                        headerVitals.slice(0, 5).map((v, i) => (
                            <div key={i} className="flex flex-col items-end">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{v.name}</span>
                                <span className="font-bold text-gray-800 text-sm">
                                    {v.value} <span className="text-xs font-normal text-gray-500">{v.unit}</span>
                                </span>
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">No vitals recorded today</span>
                    )}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-600">
                    <X className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col py-4 shrink-0">
                <nav className="space-y-1 px-2">
                    {[
                        { id: 'overview', label: 'Consult Overview', icon: User },
                        { id: 'soap', label: 'Clinical Notes (SOAP)', icon: FileText },
                        { id: 'orders', label: 'Orders & Labs', icon: Beaker },
                        { id: 'diagnosis', label: 'Diagnosis & Problems', icon: Stethoscope },
                        { id: 'meds', label: 'e-Rx & Meds', icon: Pill },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as ActiveTab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                                activeTab === item.id 
                                ? 'bg-white text-var(--color-primary-brand) shadow-sm border border-gray-200' 
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-var(--color-primary-brand)' : 'text-gray-400'}`} />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 bg-white overflow-y-auto p-8 relative">
                {activeTab === 'overview' && (
                    <ConsultOverviewTab 
                        appointment={appointment}
                        patient={appointment.patient}
                        history={history}
                        allergies={allergies}
                        vitalsProps={activeVitalsProps}
                        actions={quickActions}
                    />
                )}

                {activeTab === 'soap' && (
    <SoapTab 
        appointment={appointment}
        soapNotes={soapNotes}
        setSoapNotes={setSoapNotes}
        onSave={handleSaveSoapNotes}
        isSaving={savingNotes}
        user={user}
        clinicId={clinicId}
    />
)}
{activeTab === 'orders' && (
                    <OrdersTab 
                        appointment={appointment}
                        user={user}
                        clinicId={clinicId}
                    />
                )}
                {activeTab === 'meds' && (
    <MedsTab appointment={appointment} user={user} clinicId={clinicId} />
)}
{activeTab === 'diagnosis' && (
                    <DiagnosisTab 
                        appointment={appointment}
                        user={user}
                        clinicId={clinicId}
                    />
                )}

                {[''].includes(activeTab) && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2"/>
                        <p>Module Loading...</p>
                    </div>
                )}
            </div>
        </div>

       {showProfile && (
    <PatientProfileModal 
        patientId={appointment.clinic_patient_id} // Force String here to be safe
        clinicId={clinicId}
        user={user}
        onClose={() => setShowProfile(false)}
    />
)}
      </div>
    </div>
  );
}