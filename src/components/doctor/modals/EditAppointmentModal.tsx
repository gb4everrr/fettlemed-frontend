'use client';

import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import DatePicker from '@/components/ui/DatePicker';
import {
  X, User, FileText, Beaker, Stethoscope, Pill,
  Clock, MapPin, Loader2, Save, RefreshCw,
  XCircle, CheckCircle, AlertCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Ban, RotateCcw,
} from 'lucide-react';
import { Appointment, DoctorVital, VitalsEntry, AvailableSlot } from '@/types/clinic';
import { GenerateInvoiceView } from './GenerateInvoiceView';

import { ConsultOverviewTab } from '../encounter/ConsultOverviewTab';
import { SoapTab } from '../encounter/SoapTab';
import { OrdersTab } from '../encounter/OrdersTab';
import { MedsTab } from '../encounter/MedsTab';
import { DiagnosisTab } from '../encounter/DiagnosisTab';
import { PatientProfileModal } from './PatientProfileModal';
import { DoctorNewAppointmentModal } from './DoctorNewAppointmentModal';

type ActiveTab = 'overview' | 'soap' | 'orders' | 'diagnosis' | 'meds';
type ModalView = 'details' | 'invoice';

const TAB_ORDER: ActiveTab[] = ['overview', 'soap', 'orders', 'diagnosis', 'meds'];

const TABS = [
  { id: 'overview'  as ActiveTab, label: 'Consult Overview',       icon: User },
  { id: 'soap'      as ActiveTab, label: 'Clinical Notes (SOAP)',  icon: FileText },
  { id: 'orders'    as ActiveTab, label: 'Orders & Labs',           icon: Beaker },
  { id: 'diagnosis' as ActiveTab, label: 'Diagnosis',               icon: Stethoscope },
  { id: 'meds'      as ActiveTab, label: 'e-Rx & Meds',            icon: Pill },
];

interface EditAppointmentModalProps {
  appointment: Appointment;
  clinicId: number;
  clinicName: string;
  clinicTimezone?: string;
  onClose: () => void;
  onRefreshList: () => void;
  user: any;
  role?: string;
  // For "Reopen" flow — passed from the parent page
  associatedClinics?: any[];
  currentDoctorId?: number;
  currentDoctorName?: string;
  canBookAppointments?: boolean;
}

// ─── Unsaved Changes Dialog ───────────────────────────────────────────────────
const UnsavedChangesDialog = ({
  onSave, onDiscard, onCancel, isSaving
}: {
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-500 mt-0.5">You have changes that haven't been saved yet.</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
          If you leave without saving, your changes will be lost.
        </div>
        <div className="flex flex-col gap-2">
          <Button shine onClick={onSave} disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-var(--color-primary-brand) text-white py-2.5">
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> Save Changes & Continue</>}
          </Button>
          <Button variant="outline" onClick={onDiscard} disabled={isSaving}
            className="w-full border-red-200 text-red-600 hover:bg-red-50 py-2.5">
            Discard Changes
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}
            className="w-full border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Cancelled Banner ─────────────────────────────────────────────────────────
const CancelledBanner = ({ onReopen }: { onReopen: () => void }) => (
  <div className="shrink-0 bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <Ban className="w-5 h-5 text-red-600 shrink-0" />
      <div>
        <p className="text-sm font-bold text-red-700">This appointment has been cancelled</p>
        <p className="text-xs text-red-500 mt-0.5">
          All clinical data is read-only. No edits can be made to a cancelled appointment.
        </p>
      </div>
    </div>
    <Button
      onClick={onReopen}
      shine
      className="shrink-0 flex items-center gap-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg"
    >
      <RotateCcw className="w-4 h-4" />
      Reopen / Book Again
    </Button>
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function EditAppointmentModal({
  appointment: initialAppointment,
  clinicId,
  clinicName,
  clinicTimezone,
  onClose,
  onRefreshList,
  user,
  associatedClinics = [],
  currentDoctorId = 0,
  currentDoctorName = '',
  canBookAppointments = false,
}: EditAppointmentModalProps) {
  // Resolve timezone: prefer explicit prop, then appointment's own clinic, then safe default
  const resolvedTimezone =
    clinicTimezone ||
    (initialAppointment as any).clinic?.timezone ||
    'Asia/Kolkata';

  const [appointment, setAppointment] = useState(initialAppointment);
  const [activeTab, setActiveTab]     = useState<ActiveTab>('overview');
  const [view, setView]               = useState<ModalView>('details');

  // Is this appointment cancelled?
  const isCancelled = appointment.status === 2;

  const [loadingHeader, setLoadingHeader] = useState(false);
  const [headerVitals, setHeaderVitals]   = useState<{name:string,value:string,unit:string}[]>([]);
  const [showProfile, setShowProfile]     = useState(false);

  // Reopen modal state
  const [showReopenModal, setShowReopenModal] = useState(false);

  // SOAP
  const [soapNotes, setSoapNotes] = useState({
    subjective: '', objective: '', provisional_diagnosis: '', observations_private: ''
  });
  const [savingNotes, setSavingNotes] = useState(false);

  // Overview data
  const [history, setHistory]     = useState<any[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  // Vitals
  const [doctorVitals, setDoctorVitals]     = useState<DoctorVital[]>([]);
  const [vitalsValues, setVitalsValues]     = useState<{[k:string]:string}>({});
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);

  // Quick actions / misc
  const [error, setError]             = useState<string|null>(null);
  const [successMessage, setSuccessMessage] = useState<string|null>(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date|null>(new Date(initialAppointment.datetime_start));
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot]   = useState<AvailableSlot|null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Dirty / unsaved guard
  const [isDirty, setIsDirty] = useState(false);
  const [unsavedDialog, setUnsavedDialog] = useState<{show:boolean; pendingAction:(() => void)|null}>({
    show: false, pendingAction: null
  });

  const markDirty = useCallback(() => {
    // Never mark dirty for a cancelled appointment — no edits allowed
    if (!isCancelled) setIsDirty(true);
  }, [isCancelled]);

  const guardedAction = useCallback((action: () => void) => {
    if (isDirty) {
      setUnsavedDialog({ show: true, pendingAction: action });
    } else {
      action();
    }
  }, [isDirty]);

  const saveCurrentTab = async () => {
    if (isCancelled) return; // Safety: never save on cancelled
    if (activeTab === 'soap')     await handleSaveSoapNotes();
    if (activeTab === 'overview') await handleSaveVitals();
    setIsDirty(false);
  };

  const handleUnsavedSave = async () => {
    await saveCurrentTab();
    unsavedDialog.pendingAction?.();
    setUnsavedDialog({ show: false, pendingAction: null });
  };

  const handleUnsavedDiscard = () => {
    setIsDirty(false);
    unsavedDialog.pendingAction?.();
    setUnsavedDialog({ show: false, pendingAction: null });
  };
  const handleUnsavedCancel = () => setUnsavedDialog({ show: false, pendingAction: null });

  const switchTab = useCallback((tab: ActiveTab) => {
    guardedAction(() => setActiveTab(tab));
  }, [guardedAction]);

  const handleClose = useCallback(() => {
    guardedAction(() => onClose());
  }, [guardedAction, onClose]);

  // Next / Back
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);
  const hasNext = currentTabIndex < TAB_ORDER.length - 1;
  const hasBack = currentTabIndex > 0;

  const goNext = async () => {
    if (!hasNext) return;
    if (isDirty && !isCancelled) await saveCurrentTab();
    setActiveTab(TAB_ORDER[currentTabIndex + 1]);
  };

  const goBack = () => {
    if (hasBack) guardedAction(() => setActiveTab(TAB_ORDER[currentTabIndex - 1]));
  };

  // ─── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchHeaderVitals();
    fetchSoapNotes();
    fetchOverviewData();
    fetchDoctorVitals();
    fetchAppointmentVitals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id]);

  useEffect(() => {
    if (isRescheduling && rescheduleDate) fetchAvailableSlots(rescheduleDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleDate, isRescheduling]);

  // ─── API calls ────────────────────────────────────────────────────────────
  const fetchHeaderVitals = async () => {
    setLoadingHeader(true);
    try {
      const res = await api.get(`/vitals/appointment/${appointment.id}`, { params: { clinic_id: clinicId } });
      let entry = res.data?.length > 0 ? res.data[0] : null;
      if (!entry) {
        const hr = await api.get('/clinic-vitals/patient/latest', {
          params: { clinic_id: clinicId, patient_id: appointment.clinic_patient_id }
        });
        entry = hr.data || null;
      }
      setHeaderVitals(entry
        ? entry.values.map((v: any) => ({ name: v.config.vital_name, value: v.vital_value, unit: v.config.unit }))
        : []);
    } catch (err) { console.error("Failed to load header vitals", err); }
    finally { setLoadingHeader(false); }
  };

  const fetchOverviewData = async () => {
    try {
      const pId = appointment.clinic_patient_id;
      if (!pId) return;
      const [histRes, algRes] = await Promise.all([
        api.get(`/clinic-vitals/entry/history/${pId}?clinic_id=${clinicId}`),
        api.get(`/doctor/patient/${pId}/allergies?clinic_id=${clinicId}`)
      ]);
      setHistory(histRes.data || []);
      setAllergies(algRes.data || []);
    } catch (err) { console.error("Failed to load overview data", err); }
  };

  const fetchSoapNotes = async () => {
    try {
      const res = await api.get(`/consultation-notes/${appointment.id}`, { params: { clinic_id: clinicId } });
      if (res.data) {
        setSoapNotes({
          ...res.data,
          subjective:            res.data.subjective            || '',
          objective:             res.data.objective             || '',
          provisional_diagnosis: res.data.provisional_diagnosis || '',
          observations_private:  res.data.observations_private  || '',
        });
      }
    } catch (err) { console.error("Failed to fetch SOAP notes", err); }
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
      if (res.data?.length > 0) {
        const values: any = {};
        res.data[0].values.forEach((v: any) => (values[v.config.vital_name] = v.vital_value));
        setVitalsValues(values);
      }
    } catch (err) { console.error(err); }
  };

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSaveSoapNotes = async () => {
    if (isCancelled) return;
    setSavingNotes(true);
    try {
      await api.post('/consultation-notes', {
        clinic_id: clinicId, appointment_id: appointment.id, ...soapNotes
      });
      setIsDirty(false);
    } catch (err) { console.error(err); }
    finally { setSavingNotes(false); }
  };

  const handleSaveVitals = async () => {
    if (isCancelled) return;
    setIsSavingVitals(true);
    try {
      const values = doctorVitals
        .filter(v => vitalsValues[v.vitalConfig.vital_name])
        .map(v => ({ config_id: v.vital_config_id, vital_value: vitalsValues[v.vitalConfig.vital_name] }));
      await api.post('/vitals/entry/submit', {
        clinic_id: clinicId,
        clinic_patient_id: appointment.clinic_patient_id,
        recorded_by_admin_id: user.id,
        appointment_id: appointment.id,
        values
      });
      setIsDirty(false);
      fetchHeaderVitals();
    } catch (err) { console.error("Vitals save error", err); }
    finally { setIsSavingVitals(false); }
  };

  const activeVitalsProps = {
    doctorVitals,
    vitalsValues,
    setVitalsValues: (vals: any) => { setVitalsValues(vals); markDirty(); },
    onSave: handleSaveVitals,
    isSaving: isSavingVitals,
    isLoading: isLoadingVitals,
    // Pass cancelled state so VitalsEntryCard can disable itself
    isCancelled,
  };

  const fetchAvailableSlots = async (date: Date | null) => {
    if (!date) return;
    setIsLoadingSlots(true); setError(null);
    try {
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: resolvedTimezone }).format(date);
      const res = await api.get('/appointments/slots', {
        params: { clinic_id: clinicId, clinic_doctor_id: appointment.clinic_doctor_id, date: dateStr }
      });
      setAvailableSlots(res.data); setSelectedSlot(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load available slots');
      setAvailableSlots([]);
    } finally { setIsLoadingSlots(false); }
  };

  const handleReschedule = async () => {
    if (!selectedSlot || !rescheduleDate) { setError('Please select a date and time slot'); return; }
    setIsSaving(true); setError(null); setSuccessMessage(null);
    try {
      await api.post('/appointments', {
        clinic_id: clinicId, clinic_doctor_id: appointment.clinic_doctor_id,
        clinic_patient_id: appointment.clinic_patient_id,
        datetime_start: selectedSlot.start_time_utc, datetime_end: selectedSlot.end_time_utc,
        notes: (appointment.notes || '') + `\n\n[Rescheduled from: ${formatClinicTime(appointment.datetime_start)}]`,
        timezone: 'UTC'
      });
      await api.put(`/appointments/${appointment.id}`, {
        clinic_id: clinicId, notes: (appointment.notes || '') + '\n\n[Rescheduled to new time]', status: 2
      });
      setSuccessMessage('Appointment rescheduled successfully');
      onRefreshList();
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reschedule appointment');
      setIsSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    setIsSaving(true); setError(null); setSuccessMessage(null);
    try {
      await api.put(`/appointments/${appointment.id}`, { clinic_id: clinicId, status: 3 });
      setSuccessMessage('Appointment marked as completed');
      setAppointment(prev => ({ ...prev, status: 3 }));
      onRefreshList();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark as complete');
    } finally { setIsSaving(false); }
  };

  const handleCancel = async () => {
    setIsSaving(true); setError(null);
    try {
      await api.delete(`/appointments/${appointment.id}`, { params: { clinic_id: clinicId } });
      setSuccessMessage('Appointment cancelled successfully');
      onRefreshList();
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel appointment');
      setIsSaving(false);
    }
  };

  // Quick actions — all no-ops if cancelled (belt + suspenders; ConsultOverviewTab also hides them)
  const quickActions = isCancelled
    ? { onReschedule: () => {}, onCancel: () => {}, onInvoice: () => {}, onComplete: () => {} }
    : {
        onReschedule: () => setIsRescheduling(true),
        onCancel:     () => setShowCancelConfirm(true),
        onInvoice:    () => setView('invoice'),
        onComplete:   handleMarkComplete,
      };

  const formatClinicTime = (dateString: string | Date) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: resolvedTimezone,
    }).format(new Date(dateString));

  // Tabs that trigger a save on "Next"
  const tabHasSaveOnNext = !isCancelled && (activeTab === 'soap' || activeTab === 'overview');

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">

          {unsavedDialog.show && (
            <UnsavedChangesDialog
              onSave={handleUnsavedSave}
              onDiscard={handleUnsavedDiscard}
              onCancel={handleUnsavedCancel}
              isSaving={savingNotes || isSavingVitals}
            />
          )}

          {view === 'details' ? (
            <>
              {/* ── HEADER ─────────────────────────────────────────────────── */}
              <div className="h-20 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10">
                <div className="flex items-center gap-4">
                  <div onClick={() => setShowProfile(true)}
                    className="h-12 w-12 bg-var(--color-primary-brand) rounded-full flex items-center justify-center font-bold text-var(--color-primary-brand) text-lg shadow-sm cursor-pointer">
                    {appointment.patient?.first_name?.[0] || '?'}{appointment.patient?.last_name?.[0] || '?'}
                  </div>
                  <div onClick={() => setShowProfile(true)} className="cursor-pointer group">
                    <h2 className="font-bold text-lg text-gray-900 leading-tight flex items-center gap-2 group-hover:text-blue-500 transition-colors">
                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                      {/* Cancelled badge in header */}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                          <Ban className="w-3 h-3" /> Cancelled
                        </span>
                      )}
                      {!isCancelled && (
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500">
                          View Profile
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {clinicName}</span>
                      <div className="h-3 w-px bg-gray-300" />
                      <span className="flex items-center gap-1 text-gray-700 font-medium">
                        <Clock className="w-3 h-3"/> {formatClinicTime(appointment.datetime_start)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden lg:flex gap-4 border-r border-gray-200 pr-6">
                    {loadingHeader
                      ? <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Loading Vitals...</span>
                      : headerVitals.length > 0
                        ? headerVitals.slice(0, 5).map((v, i) => (
                            <div key={i} className="flex flex-col items-end">
                              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{v.name}</span>
                              <span className="font-bold text-gray-800 text-sm">
                                {v.value} <span className="text-xs font-normal text-gray-500">{v.unit}</span>
                              </span>
                            </div>
                          ))
                        : <span className="text-xs text-gray-400 italic">No vitals recorded today</span>
                    }
                  </div>

                  {/* Dirty indicator — hidden for cancelled */}
                  {isDirty && !isCancelled && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Unsaved changes
                    </div>
                  )}

                  <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* ── CANCELLED BANNER ───────────────────────────────────────── */}
              {isCancelled && (
                <CancelledBanner onReopen={() => setShowReopenModal(true)} />
              )}

              {/* Error / Success banners */}
              {(error || successMessage) && (
                <div className="px-6 pt-4 shrink-0">
                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2 shrink-0" />
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}
                  {successMessage && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                      <p className="text-green-700">{successMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── BODY ───────────────────────────────────────────────────── */}
              <div className="flex flex-1 overflow-hidden">

                {/* ── SIDEBAR ──────────────────────────────────────────────── */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">

                  {/* Tab nav — scrollable if needed */}
                  <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
                    {TABS.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => switchTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all border ${
                          activeTab === item.id
                            ? 'bg-white text-var(--color-primary-brand) shadow-sm border-gray-200'
                            : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 ${activeTab === item.id ? 'text-var(--color-primary-brand)' : 'text-gray-400'}`} />
                        <span className="flex-1 text-left whitespace-nowrap truncate">{item.label}</span>
                        <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          activeTab === item.id ? 'bg-var(--color-primary-brand) text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </button>
                    ))}
                  </nav>

                  {/* ── NAV FOOTER ─────────────────────────────────────────── */}
                  <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3 space-y-3">

                    {/* Cancelled: show Reopen CTA instead of step nav */}
                    {isCancelled ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                          <Ban className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-xs text-red-600 font-medium">Read-only — appointment cancelled</p>
                        </div>
                        <Button
                          shine
                          onClick={() => setShowReopenModal(true)}
                          className="w-full flex items-center justify-center gap-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold py-2 rounded-lg"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reopen / Book Again
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Progress bar */}
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] text-gray-400">Step {currentTabIndex + 1} of {TAB_ORDER.length}</span>
                          <div className="flex gap-1">
                            {TAB_ORDER.map((_, i) => (
                              <div key={i} className={`h-1.5 w-4 rounded-full transition-colors duration-200 ${
                                i === currentTabIndex ? 'bg-var(--color-primary-brand)' : 'bg-gray-200'
                              }`} />
                            ))}
                          </div>
                        </div>

                        {/* Back / Next */}
                        <div className="flex gap-2">
                          <button
                            onClick={goBack}
                            disabled={!hasBack}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap ${
                              hasBack
                                ? 'border-gray-300 text-gray-600 bg-white hover:shadow-sm hover:border-gray-400'
                                : 'border-gray-100 text-gray-300 cursor-not-allowed bg-white'
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4" /> Back
                          </button>

                          <Button
                            onClick={goNext}
                            disabled={!hasNext || savingNotes || isSavingVitals}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                              hasNext
                                ? 'bg-var(--color-primary-brand) hover:bg-var(--color-primary-brand) text-white shadow-sm'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            {(savingNotes || isSavingVitals) && tabHasSaveOnNext
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <>{isDirty && tabHasSaveOnNext ? 'Save & Next' : 'Next'} <ChevronRight className="w-4 h-4" /></>
                            }
                          </Button>
                        </div>

                        {/* Final step hint */}
                        {!hasNext && (
                          <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            All steps complete
                          </p>
                        )}
                      </>
                    )}
                  </div>

                </div>{/* end sidebar */}

                {/* ── TAB CONTENT ──────────────────────────────────────────── */}
                <div className="flex-1 bg-white overflow-y-auto p-8 relative">
                  {activeTab === 'overview' && (
                    <ConsultOverviewTab
                      appointment={appointment}
                      patient={appointment.patient}
                      history={history}
                      allergies={allergies}
                      vitalsProps={activeVitalsProps}
                      actions={quickActions}
                      isCancelled={isCancelled}
                      onMarkDirty={markDirty}
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
                      isCancelled={isCancelled}
                      onMarkDirty={markDirty}
                    />
                  )}
                  {activeTab === 'orders' && (
                    <OrdersTab
                      appointment={appointment}
                      user={user}
                      clinicId={clinicId}
                      isCancelled={isCancelled}
                    />
                  )}
                  {activeTab === 'diagnosis' && (
                    <DiagnosisTab
                      appointment={appointment}
                      user={user}
                      clinicId={clinicId}
                      isCancelled={isCancelled}
                    />
                  )}
                  {activeTab === 'meds' && (
                    <MedsTab
                      appointment={appointment}
                      user={user}
                      clinicId={clinicId}
                      isCancelled={isCancelled}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <GenerateInvoiceView
              appointment={appointment}
              clinicId={clinicId}
              clinicName={clinicName}
              onSetView={setView}
              onInvoiceGenerated={(invId: any) => {
                setAppointment(prev => ({ ...prev, invoice_id: invId }));
                onRefreshList();
              }}
            />
          )}

          {/* ── Reschedule Modal ─────────────────────────────────────────────── */}
          {isRescheduling && (
            <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2 text-blue-600" /> Reschedule Appointment
                  </h2>
                  <button onClick={() => setIsRescheduling(false)} className="text-gray-500 hover:text-gray-700"><X className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <DatePicker label="Select New Date" value={rescheduleDate} onChange={(d: Date) => setRescheduleDate(d)} placeholder="Choose a date" minDate={new Date()} />
                  {isLoadingSlots ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" /><p className="text-gray-500 text-sm">Loading available slots...</p></div>
                  ) : availableSlots.length === 0 && rescheduleDate ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <AlertCircle className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium">No available slots for this date</p>
                      <p className="text-gray-500 text-sm mt-1">Please select a different date</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Select Time Slot</label>
                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
                        {availableSlots.map(slot => (
                          <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                              selectedSlot?.id === slot.id ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 hover:border-blue-300 text-gray-700'
                            }`}>
                            <Clock className="h-3.5 w-3.5 inline mr-1" />{slot.start_time} - {slot.end_time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedSlot && rescheduleDate && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">New Appointment Time</p>
                        <p className="text-sm text-blue-800 mt-1">
                          {rescheduleDate.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone: resolvedTimezone })} at {selectedSlot.start_time} - {selectedSlot.end_time}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 rounded-b-xl">
                  <Button variant="primary" onClick={handleReschedule} disabled={!selectedSlot || !rescheduleDate || isSaving} className="flex-1 flex items-center justify-center">
                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rescheduling...</> : <><RefreshCw className="h-4 w-4 mr-2" />Confirm Reschedule</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setIsRescheduling(false); setSelectedSlot(null); }} disabled={isSaving} className="px-6">Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Cancel Confirmation ──────────────────────────────────────────── */}
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
                  <p className="text-gray-600 mb-2">Are you sure you want to cancel this appointment?</p>
                  <p className="text-sm text-gray-500 mb-6">This action cannot be undone and the slot will become available for other patients.</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-amber-800"><strong>Patient:</strong> {appointment.patient?.first_name} {appointment.patient?.last_name}</p>
                    <p className="text-sm text-amber-800 mt-1"><strong>Scheduled:</strong> {formatClinicTime(appointment.datetime_start)}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowCancelConfirm(false)} disabled={isSaving} className="flex-1">Keep Appointment</Button>
                    <Button variant="primary" onClick={handleCancel} disabled={isSaving} className="flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center">
                      {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling...</> : <><XCircle className="h-4 w-4 mr-2" />Yes, Cancel</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Patient Profile Modal ────────────────────────────────────────── */}
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

      {/* ── Reopen / Book Again Modal ─────────────────────────────────────────
           Rendered outside the main modal stack so it sits on top cleanly.
           Pre-seeds clinic + doctor + patient via the prefill props we added. */}
      {showReopenModal && (
        <DoctorNewAppointmentModal
          onClose={() => setShowReopenModal(false)}
          onRefreshList={() => { onRefreshList(); setShowReopenModal(false); }}
          selectedClinicId={clinicId}
          associatedClinics={associatedClinics}
          currentDoctorId={currentDoctorId}
          currentDoctorName={currentDoctorName}
          canBookAppointments={canBookAppointments}
          // Pre-fill doctor + patient from the cancelled appointment
          prefillDoctorId={appointment.clinic_doctor_id}
          prefillPatientId={appointment.clinic_patient_id}
          prefillNotes={`[Reopened from cancelled appointment on ${formatClinicTime(appointment.datetime_start)}]`}
        />
      )}
    </>
  );
}