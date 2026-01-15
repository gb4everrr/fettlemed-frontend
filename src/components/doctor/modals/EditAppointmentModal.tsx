'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import DatePicker from '@/components/ui/DatePicker';
import {
  X, User, FileText, Beaker, Stethoscope, Pill, 
  Activity, Calendar, Clock, MapPin, Loader2, Save, RefreshCw, 
  XCircle, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { Appointment, DoctorVital, VitalsEntry,AvailableSlot  } from '@/types/clinic';
import { getStatusInfo } from '@/lib/utils/appointments';
import { GenerateInvoiceView } from './GenerateInvoiceView';

// IMPORT NEW COMPONENTS
import { ConsultOverviewTab } from '../encounter/ConsultOverviewTab';
import { SoapTab } from '../encounter/SoapTab';
import { OrdersTab } from '../encounter/OrdersTab';
import { MedsTab } from '../encounter/MedsTab';
import { DiagnosisTab } from '../encounter/DiagnosisTab';
import { PatientProfileModal } from './PatientProfileModal';

// --- TYPES ---
type ActiveTab = 'overview' | 'soap' | 'orders' | 'diagnosis' | 'meds';
type ModalView = 'details' | 'invoice';

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

//QuickAction states
const [view, setView] = useState<ModalView>('details');
const [error, setError] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
const [isSaving, setIsSaving] = useState(false);

// Reschedule states
const [isRescheduling, setIsRescheduling] = useState(false);
const [rescheduleDate, setRescheduleDate] = useState<Date | null>(
  new Date(initialAppointment.datetime_start)
);
const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
const [isLoadingSlots, setIsLoadingSlots] = useState(false);

// Cancel confirmation
const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    fetchHeaderVitals();
    fetchSoapNotes();
    fetchOverviewData(); // New: Fetch History & Allergies
    fetchDoctorVitals(); // Load vitals config
    fetchAppointmentVitals(); // Load saved vitals
  }, [appointment.id]);

  useEffect(() => {
  if (isRescheduling && rescheduleDate) {
    fetchAvailableSlots(rescheduleDate);
  }
}, [rescheduleDate, isRescheduling]);

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

  const fetchAvailableSlots = async (date: Date | null) => {
  if (!appointment || !date) return;
  setIsLoadingSlots(true);
  setError(null);
  try {
    // Convert Date to YYYY-MM-DD string for API
    const dateString = date.toISOString().split('T')[0];
    
    const response = await api.get('/appointments/slots', {
      params: {
        clinic_id: clinicId,
        clinic_doctor_id: appointment.clinic_doctor_id,
        date: dateString
      }
    });
    setAvailableSlots(response.data);
    setSelectedSlot(null);
  } catch (err: any) {
    console.error('Failed to fetch slots:', err);
    setError(err.response?.data?.error || 'Failed to load available slots');
    setAvailableSlots([]);
  } finally {
    setIsLoadingSlots(false);
  }
};

const handleReschedule = async () => {
  if (!appointment || !selectedSlot || !rescheduleDate) {
    setError('Please select a date and time slot');
    return;
  }
  setIsSaving(true);
  setError(null);
  setSuccessMessage(null);
  try {
    const originalTime = formatClinicTime(appointment.datetime_start);
    const rescheduleNote = `\n\n[Rescheduled from: ${originalTime}]`;
    const updatedNotes = (appointment.notes || '') + rescheduleNote;

    await api.post('/appointments', {
      clinic_id: clinicId,
      clinic_doctor_id: appointment.clinic_doctor_id,
      clinic_patient_id: appointment.clinic_patient_id,
      datetime_start: selectedSlot.start_time_utc,
      datetime_end: selectedSlot.end_time_utc,
      notes: updatedNotes,
      timezone: 'UTC'
    });

    await api.put(`/appointments/${appointment.id}`, {
      clinic_id: clinicId,
      notes: (appointment.notes || '') + '\n\n[Rescheduled to new time]',
      status: 2
    });

    setSuccessMessage('Appointment rescheduled successfully');
    onRefreshList();
    setTimeout(() => onClose(), 2000);
  } catch (err: any) {
    console.error('Failed to reschedule appointment:', err);
    setError(err.response?.data?.error || 'Failed to reschedule appointment');
    setIsSaving(false);
  }
};

const handleMarkComplete = async () => {
  if (!appointment) return;
  setIsSaving(true);
  setError(null);
  setSuccessMessage(null);
  try {
    await api.put(`/appointments/${appointment.id}`, {
      clinic_id: clinicId,
      status: 3
    });
    setSuccessMessage('Appointment marked as completed');
    setAppointment(prev => ({ ...prev, status: 3 }));
    onRefreshList();
    setTimeout(() => setSuccessMessage(null), 3000);
  } catch (err: any) {
    console.error('Failed to mark appointment as complete:', err);
    setError(err.response?.data?.error || 'Failed to mark as complete');
  } finally {
    setIsSaving(false);
  }
};

const handleCancel = async () => {
  if (!appointment) return;
  setIsSaving(true);
  setError(null);
  try {
    await api.delete(`/appointments/${appointment.id}`, { 
      params: { clinic_id: clinicId } 
    });
    setSuccessMessage('Appointment cancelled successfully');
    onRefreshList();
    setTimeout(() => onClose(), 2000);
  } catch (err: any) {
    console.error('Failed to cancel appointment:', err);
    setError(err.response?.data?.error || 'Failed to cancel appointment');
    setIsSaving(false);
  }
};

const quickActions = {
  onReschedule: () => setIsRescheduling(true),
  onCancel: () => setShowCancelConfirm(true),
  onInvoice: () => setView('invoice'),
  onComplete: handleMarkComplete
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
// Replace the entire return statement with this:
return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
      
      {view === 'details' ? (
        <>
          {/* HEADER */}
          <div className="h-20 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10">
            {/* ... existing header code ... */}
            <div className="flex items-center gap-4">
              <div onClick={() => setShowProfile(true)} className="h-12 w-12 bg-var(--color-primary-brand) rounded-full flex items-center justify-center font-bold text-var(--color-primary-brand) text-lg shadow-sm">
                {appointment.patient?.first_name?.[0] || '?'}{appointment.patient?.last_name?.[0] || '?'}
              </div>
              <div onClick={() => setShowProfile(true)} className="cursor-pointer group">
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

          {/* Error and Success Messages */}
          {(error || successMessage) && (
            <div className="px-6 pt-4">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-green-700">{successMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* BODY */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col py-4 shrink-0">
              {/* ... existing sidebar nav ... */}
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
              {/* ... existing tab content ... */}
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
            </div>
          </div>
        </>
      ) : (
        // INVOICE VIEW
        <GenerateInvoiceView
          appointment={appointment}
          clinicId={clinicId}
          clinicName={clinicName} 
          onSetView={setView} 
          onInvoiceGenerated={(invId) => {
            setAppointment(prev => ({...prev, invoice_id: invId}));
            onRefreshList();
          }}
        />
      )}

 {/* Reschedule Modal */}
{isRescheduling && (
  <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 text-blue-600" />
            Reschedule Appointment
          </h2>
          <button 
            onClick={() => setIsRescheduling(false)} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <DatePicker
          label="Select New Date"
          value={rescheduleDate}
          onChange={(date) => setRescheduleDate(date)}
          placeholder="Choose a date"
          minDate={new Date()}
        />
        
        {isLoadingSlots ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
            <p className="text-gray-500 text-sm">Loading available slots...</p>
          </div>
        ) : availableSlots.length === 0 && rescheduleDate ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">No available slots for this date</p>
            <p className="text-gray-500 text-sm mt-1">Please select a different date</p>
          </div>
        ) : availableSlots.length > 0 ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Time Slot
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {availableSlots.map((slot) => (
                <button 
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    selectedSlot?.id === slot.id 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  {slot.start_time} - {slot.end_time}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        
        {selectedSlot && rescheduleDate && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">New Appointment Time</p>
                <p className="text-sm text-blue-800 mt-1">
                  {rescheduleDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} at {selectedSlot.start_time} - {selectedSlot.end_time}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 rounded-b-xl">
        <Button 
          variant="primary" 
          onClick={handleReschedule} 
          disabled={!selectedSlot || !rescheduleDate || isSaving} 
          className="flex-1 flex items-center justify-center"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Rescheduling...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Confirm Reschedule
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => { 
            setIsRescheduling(false); 
            setSelectedSlot(null); 
          }}
          disabled={isSaving}
          className="px-6"
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}

    {/* Cancel Confirmation Modal */}
{showCancelConfirm && (
  <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Cancel Appointment?</h3>
        </div>
        
        <p className="text-gray-600 mb-2">
          Are you sure you want to cancel this appointment?
        </p>
        <p className="text-sm text-gray-500 mb-6">
          This action cannot be undone and the appointment slot will become available for other patients.
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Patient:</strong> {appointment.patient?.first_name} {appointment.patient?.last_name}
          </p>
          <p className="text-sm text-amber-800 mt-1">
            <strong>Scheduled:</strong> {formatClinicTime(appointment.datetime_start)}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowCancelConfirm(false)} 
            disabled={isSaving} 
            className="flex-1"
          >
            Keep Appointment
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCancel} 
            disabled={isSaving} 
            className="flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Yes, Cancel
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Patient Profile Modal */}
      {showProfile && (
        <PatientProfileModal 
          patientId={appointment.clinic_patient_id}
          clinicId={clinicId}
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  </div>
);
}