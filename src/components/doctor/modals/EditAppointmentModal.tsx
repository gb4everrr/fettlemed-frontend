'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Card from '@/components/ui/Card';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
import {
  Calendar,
  Clock,
  RefreshCw,
  X,
  User,
  Stethoscope,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  MapPin,
  Loader2
} from 'lucide-react';
import { 
  Appointment, 
  AvailableSlot, 
  DoctorVital, 
  VitalsEntry 
} from '@/types/clinic';
import { getStatusInfo } from '@/lib/utils/appointments';

import { GenerateInvoiceView } from './GenerateInvoiceView'; 

type ModalView = 'details' | 'invoice';

// UTC Formatter
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

export function EditAppointmentModal({
  appointment: initialAppointment,
  onClose,
  onRefreshList,
  clinicId,
  clinicName, 
  clinicTimezone, // We ignore this now in favor of UTC
  user,
  role
}: {
  appointment: Appointment;
  onClose: () => void;
  onRefreshList: () => void;
  clinicId: number;
  clinicName: string; 
  clinicTimezone: string;
  user: any;
  role?: string;
}) {
  const [appointment, setAppointment] = useState<Appointment>(initialAppointment);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [view, setView] = useState<ModalView>('details');

  const [notes, setNotes] = useState(initialAppointment.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date(initialAppointment.datetime_start).toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [doctorVitals, setDoctorVitals] = useState<DoctorVital[]>([]);
  const [vitalsEntry, setVitalsEntry] = useState<VitalsEntry | null>(null);
  const [vitalsValues, setVitalsValues] = useState<{ [key: string]: string }>({});
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  
  const displayDoctorName = appointment.doctor 
    ? `${appointment.doctor.first_name} ${appointment.doctor.last_name}`
    : (appointment.clinic_doctor_id === user.id 
        ? `${user.first_name} ${user.last_name}` 
        : 'Unknown Doctor');

  const displayPatientName = appointment.patient
    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
    : 'Unknown Patient';

  const [editingVitalName, setEditingVitalName] = useState<string | null>(null);

  useEffect(() => {
    setView('details');
    setError(null);
    setSuccessMessage(null);
    setAppointment(initialAppointment); 
    setNotes(initialAppointment.notes || '');
  }, [initialAppointment]); 

  useEffect(() => {
    if (appointment.status !== 2) {
      fetchDoctorVitals();
      fetchAppointmentVitals();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id]);
  
  useEffect(() => {
    if (isRescheduling && rescheduleDate) {
      fetchAvailableSlots(rescheduleDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleDate, isRescheduling]);

  const fetchDoctorVitals = async () => {
    if (!appointment) return;
    setIsLoadingVitals(true);
    try {
      const response = await api.get(`/vitals/doctor-assignments/${appointment.clinic_doctor_id}`, {
        params: { clinic_id: clinicId }
      });
      setDoctorVitals(response.data);
    } catch (err) {
      console.error('Failed to fetch doctor vitals:', err);
    } finally {
      setIsLoadingVitals(false);
    }
  };

  const fetchAppointmentVitals = async () => {
    if (!appointment) return;
    try {
      const response = await api.get(`/vitals/appointment/${appointment.id}`, {
        params: { clinic_id: clinicId }
      });
      if (response.data && response.data.length > 0) {
        const entry = response.data[0];
        setVitalsEntry(entry);
        const values: { [key: string]: string } = {};
        entry.values.forEach((v: any) => (values[v.config.vital_name] = v.vital_value));
        setVitalsValues(values);
      }
    } catch (err) {
      console.error('Failed to fetch appointment vitals:', err);
    }
  };

  const fetchAvailableSlots = async (date: string) => {
    if (!appointment || !date) return;
    setIsLoadingSlots(true);
    setError(null);
    try {
      const response = await api.get('/appointments/slots', {
        params: {
          clinic_id: clinicId,
          clinic_doctor_id: appointment.clinic_doctor_id,
          date: date
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

  const handleUpdateNotes = async () => {
    if (!appointment) return;
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.put(`/appointments/${appointment.id}`, {
        clinic_id: clinicId,
        notes: notes
      });
      setSuccessMessage('Notes updated successfully');
      setAppointment(prev => ({ ...prev!, notes: notes }));
      onRefreshList();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to update appointment:', err);
      setError(err.response?.data?.error || 'Failed to update notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !selectedSlot) {
      setError('Please select a time slot');
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const originalTime = formatClinicTime(appointment.datetime_start);
      const rescheduleNote = `\n\n[Rescheduled from: ${originalTime}]`;
      const updatedNotes = (notes || '') + rescheduleNote;

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
    try {
      await api.put(`/appointments/${appointment.id}`, {
        clinic_id: clinicId,
        status: 3
      });
      setSuccessMessage('Appointment marked as completed');
      setAppointment(prev => ({ ...prev!, status: 3 }));
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
    try {
      await api.delete(`/appointments/${appointment.id}`, { params: { clinic_id: clinicId } });
      setSuccessMessage('Appointment cancelled successfully');
      onRefreshList();
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error('Failed to cancel appointment:', err);
      setError(err.response?.data?.error || 'Failed to cancel appointment');
      setIsSaving(false);
    }
  };

  const handleSaveVitals = async () => {
    
    if (!appointment) return;
    setEditingVitalName(null);

    const requiredVitals = doctorVitals.filter((v) => v.is_required);
    const missingRequired = requiredVitals.filter(
      (v) => !vitalsValues[v.vitalConfig.vital_name] || vitalsValues[v.vitalConfig.vital_name].trim() === ''
    );
    if (missingRequired.length > 0) {
      setError(`Please fill in required vitals: ${missingRequired.map((v) => v.vitalConfig.vital_name).join(', ')}`);
      return;
    }
    
    setIsSavingVitals(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const values = doctorVitals
        .filter((v) => vitalsValues[v.vitalConfig.vital_name] && vitalsValues[v.vitalConfig.vital_name].trim() !== '')
        .map((v) => ({
          config_id: v.vital_config_id,
          vital_value: vitalsValues[v.vitalConfig.vital_name]
        }));

      if (values.length === 0) {
        setError('Please enter at least one vital value');
        setIsSavingVitals(false);
        return;
      }

      await api.post('/vitals/entry/submit', {
        clinic_id: clinicId,
        clinic_patient_id: appointment.clinic_patient_id,
        recorded_by_admin_id: user.id,
        appointment_id: appointment.id,
        values: values
      });

      setSuccessMessage('Vitals saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAppointmentVitals();
    } catch (err: any) {
      console.error('Failed to save vitals:', err);
      setError(err.response?.data?.error || 'Failed to save vitals');
    } finally {
      setIsSavingVitals(false);
    }
  };

  const handleVitalChange = (vitalName: string, value: string) => {
    setVitalsValues((prev) => ({ ...prev, [vitalName]: value }));
  };

  const statusInfo = getStatusInfo(appointment.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose} >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                {view === 'details' ? (
                  <><Calendar className="h-6 w-6 mr-2 text-gray-600" /> Appointment Details</>
                ) : (
                  <><FileText className="h-6 w-6 mr-2 text-blue-600" /> {appointment.invoice_id ? 'View/Edit' : 'Generate'} Invoice</>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1 ml-8 flex items-center">
                <MapPin className="h-3 w-3 mr-1" /> {clinicName}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {view === 'details' ? (
  // --- VIEW 1: APPOINTMENT DETAILS ---
  <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
    {error && (
      <Card className="mb-4 bg-red-50 border-red-200">
        <div className="flex items-center p-4"><AlertCircle className="h-5 w-5 text-red-500 mr-2" /><p className="text-red-700">{error}</p></div>
      </Card>
    )}
    {successMessage && (
      <Card className="mb-4 bg-green-50 border-green-200">
        <div className="flex items-center p-4"><CheckCircle className="h-5 w-5 text-green-500 mr-2" /><p className="text-green-700">{successMessage}</p></div>
      </Card>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CARD 1: APPOINTMENT DETAILS */}
      <Card className="shadow-lg h-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Appointment Details</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
              <StatusIcon className="h-4 w-4 mr-1" />
              {statusInfo.text}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Clock className="h-4 w-4 mr-2" />
                <span className="font-medium">Date & Time</span>
              </div>
              <p className="text-gray-800 font-medium">{formatClinicTime(appointment.datetime_start)}</p>
            </div>
            
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <User className="h-4 w-4 mr-2" />
                <span className="font-medium">Patient</span>
              </div>
              <p className="text-gray-800 font-medium">{displayPatientName}</p>
              
              <div className="flex items-center text-sm text-gray-500 mt-3 mb-2">
                <Stethoscope className="h-4 w-4 mr-2" />
                <span className="font-medium">Doctor</span>
              </div>
              <p className="text-gray-800 font-medium">{displayDoctorName}</p>
              
              <div className="flex items-center text-sm text-gray-500 mt-3 mb-2">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="font-medium">Appointment ID</span>
              </div>
              <p className="text-gray-800 font-medium">#{appointment.id}</p>
            </div>
          </div>
          
          {appointment.notes && appointment.notes.includes('[Rescheduled from:') && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <RefreshCw className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Rescheduled Appointment</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {appointment.notes.match(/\[Rescheduled from: (.*?)\]/)?.[1] || 'Previously rescheduled'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* CARD 2: PATIENT VITALS */}
      <Card className="shadow-lg h-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Activity className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-800">Patient Vitals</h2>
          </div>
          
          {isLoadingVitals ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">Loading vitals...</p>
            </div>
          ) : doctorVitals.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">No vitals configured for this doctor</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {doctorVitals.map((vital) => (
                      <tr key={vital.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                          {vital.vitalConfig.vital_name}
                          {vital.is_required && <span className="text-red-500 ml-1">*</span>}
                          {vital.vitalConfig.unit && (
                            <span className="text-gray-500 text-xs ml-1">({vital.vitalConfig.unit})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                          {editingVitalName === vital.vitalConfig.vital_name ? (
                            <Input 
                              id={`vital-${vital.id}`}
                              type={vital.vitalConfig.data_type === 'number' ? 'number' : 'text'}
                              value={vitalsValues[vital.vitalConfig.vital_name] || ''}
                              onChange={(e: any) => handleVitalChange(vital.vitalConfig.vital_name, e.target.value)}
                              onBlur={() => setEditingVitalName(null)}
                              placeholder={`Enter ${vital.vitalConfig.vital_name.toLowerCase()}`}
                              className="w-full"
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => { 
                                if (appointment.status !== 2) { 
                                  setEditingVitalName(vital.vitalConfig.vital_name); 
                                } 
                              }}
                              className={`min-h-[38px] p-2 -m-2 rounded-md flex items-center ${
                                (appointment.status !== 2) 
                                  ? 'cursor-pointer hover:bg-gray-100' 
                                  : 'cursor-not-allowed'
                              }`}
                            >
                              {vitalsValues[vital.vitalConfig.vital_name] || (
                                <span className="text-gray-400">Click to add...</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {(appointment.status !== 2) && (
                <Button 
                  variant="primary" 
                  onClick={handleSaveVitals} 
                  disabled={isSavingVitals} 
                  className="w-full flex items-center justify-center mt-4"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingVitals ? 'Saving...' : vitalsEntry ? 'Update Vitals' : 'Save Vitals'}
                </Button>
              )}
              
              {vitalsEntry && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700">
                    <strong>Last recorded:</strong> {vitalsEntry.entry_date} at {vitalsEntry.entry_time}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* CARD 3: ACTIONS */}
      <Card className="shadow-lg h-full">
        <div className="p-6">
          {appointment.status === 2 ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">This appointment is cancelled and cannot be modified.</p>
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
          ) : isRescheduling ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Reschedule Appointment</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsRescheduling(false)}>
                  Cancel
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Date
                  </label>
                  <Input 
                    id="reschedule-date"
                    type="date" 
                    value={rescheduleDate} 
                    onChange={(e: any) => setRescheduleDate(e.target.value)} 
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                {isLoadingSlots ? (
                  <div className="text-center py-6">
                    <Clock className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">Loading available slots...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No available slots for this date</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Time Slot
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <button 
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2 rounded-lg border-2 transition-all text-sm ${
                            selectedSlot?.id === slot.id 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                          type="button"
                        >
                          {slot.start_time} - {slot.end_time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedSlot && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>New appointment time:</strong> {rescheduleDate} at {selectedSlot.start_time} - {selectedSlot.end_time}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button 
                    variant="primary" 
                    onClick={handleReschedule} 
                    disabled={!selectedSlot || isSaving} 
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {isSaving ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => { 
                      setIsRescheduling(false); 
                      setSelectedSlot(null); 
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Actions</h2>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-center">
                
                {/* Show invoice button ONLY if status is 3 (completed) */}
                {appointment.status === 3 && (
                  <Button 
                    variant="primary" 
                    onClick={() => setView('invoice')} 
                    className="flex items-center justify-center" 
                    shine
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {appointment.invoice_id ? 'View/Edit Invoice' : 'Generate Invoice'}
                  </Button>
                )}
                
                {appointment.status !== 3 && (
                  <Button 
                    variant="secondary" 
                    onClick={() => setIsRescheduling(true)} 
                    className="flex items-center justify-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                )}
                
                {appointment.status !== 3 && (
                  <Button 
                    variant="primary" 
                    onClick={handleMarkComplete} 
                    disabled={isSaving} 
                    className="flex items-center justify-center bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isSaving ? 'Marking...' : 'Mark as Complete'}
                  </Button>
                )}
                
                {appointment.status !== 3 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCancelConfirm(true)} 
                    className="flex items-center justify-center text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Appointment
                  </Button>
                )}
                
                {appointment.status === 3 && (
                  <p className="text-sm flex items-center justify-center text-gray-500 p-2">
                    Appointment is completed.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* CARD 4: APPOINTMENT NOTES */}
      <Card className="shadow-lg h-full">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Appointment Notes</h2>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            rows={6} 
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" 
            placeholder="Add any notes about this appointment..." 
            disabled={appointment.status === 2}
          />
          {(appointment.status !== 2) && (
            <div className="flex gap-3 mt-4">
              <Button variant="primary" onClick={handleUpdateNotes} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Notes'}
              </Button>
              <Button variant="ghost" onClick={() => { setNotes(appointment.notes || ''); }}>
                Reset
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>

    {/* Cancel Confirmation Modal */}
    {showCancelConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <Card className="max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
              <h3 className="text-xl font-bold text-gray-800">Cancel Appointment?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="primary" 
                onClick={handleCancel} 
                disabled={isSaving} 
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isSaving ? 'Cancelling...' : 'Yes, Cancel Appointment'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowCancelConfirm(false)} 
                disabled={isSaving} 
                className="flex-1"
              >
                Keep Appointment
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )}
  </div>
) : (
          // --- VIEW 2: INVOICE GENERATOR ---
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
      </div>
    </div>
  );
}