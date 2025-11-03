// src/app/clinic-admin/dashboard/appointments/[id]/edit/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
// @ts-ignore
import { useAppSelector } from '@/lib/hooks';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Card from '@/components/ui/Card';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
// @ts-ignore
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

interface Appointment {
  id: number;
  clinic_id: number;
  clinic_patient_id: number;
  clinic_doctor_id: number;
  slot_id: number;
  datetime_start: string;
  datetime_end: string;
  status: number;
  notes: string | null;
  patient?: { id: number; first_name: string; last_name: string };
  doctor?: { id: number; first_name: string; last_name: string };
}

interface AvailableSlot {
  id: number;
  start_time: string;
  end_time: string;
  start_time_utc: string;
  end_time_utc: string;
}

interface DoctorVital {
  id: number;
  clinic_doctor_id: number;
  vital_config_id: number;
  is_required: boolean;
  sort_order: number;
  vitalConfig: {
    id: number;
    vital_name: string;
    data_type: string;
    unit: string;
  };
}

// FIX: Update VitalsEntry to match the response from your new controller
interface VitalsEntry {
  id: number;
  clinic_id: number;
  clinic_patient_id: number;
  entry_date: string;
  entry_time: string;
  recorded_by_admin_id: number;
  appointment_id: number;
  values: Array<{
    id: number;
    vitals_entry_id: number; // Changed from vital_entry_id
    vital_value: string;
    config_id: number; // Added config_id
    config: { // Added nested config object
      vital_name: string;
      unit: string;
    };
  }>;
}

const formatDateTime = (utcIsoString: string, timeZone: string = 'Asia/Kolkata') => {
  if (!utcIsoString) return '';

  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;

    return date.toLocaleString(undefined, {
      timeZone: timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return utcIsoString;
  }
};

const getStatusInfo = (appointmentStatus: number) => {
  switch (appointmentStatus) {
    case 0:
      return { text: 'Pending', color: 'bg-blue-100 text-blue-800', icon: Clock };
    case 1:
      return { text: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 2:
      return { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle };
    case 3:
      return { text: 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle };
    default:
      return { text: 'Unknown', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
  }
};

export default function EditAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.id as string;

  const { user } = useAppSelector((state: any) => state.auth);
  const clinicId = user?.clinics?.[0]?.id;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [clinicTimezone, setClinicTimezone] = useState<string>('Asia/Kolkata');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit states
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reschedule states
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Cancel confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Vitals states
  const [doctorVitals, setDoctorVitals] = useState<DoctorVital[]>([]);
  const [vitalsEntry, setVitalsEntry] = useState<VitalsEntry | null>(null);
  const [vitalsValues, setVitalsValues] = useState<{ [key: string]: string }>({});
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  
  // --- NEW STATE ---
  // Tracks which vital name is currently being edited in the table
  const [editingVitalName, setEditingVitalName] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'clinic_admin' || !clinicId) {
      router.push('/auth/login');
      return;
    }

    fetchAppointment();
    fetchClinicDetails();
  }, [appointmentId, clinicId, user, router]);

  useEffect(() => {
    if (appointment && appointment.status !== 2) {
      fetchDoctorVitals();
      fetchAppointmentVitals();
    }
  }, [appointment]);

  const fetchAppointment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/appointments`, {
        params: { clinic_id: clinicId }
      });

      const appt = response.data.find((a: Appointment) => a.id === parseInt(appointmentId));

      if (!appt) {
        setError('Appointment not found');
        return;
      }

      setAppointment(appt);
      setNotes(appt.notes || '');

      const appointmentDate = new Date(appt.datetime_start);
      setRescheduleDate(appointmentDate.toISOString().split('T')[0]);
    } catch (err: any) {
      console.error('Failed to fetch appointment:', err);
      setError(err.response?.data?.error || 'Failed to load appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClinicDetails = async () => {
    try {
      const response = await api.get(`/clinic/${clinicId}`);
      if (response.data.timezone) setClinicTimezone(response.data.timezone);
    } catch (err) {
      console.error('Failed to fetch clinic details:', err);
    }
  };

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
      const response = await api.get(`/vitals/appointment/${appointmentId}`, {
        params: { clinic_id: clinicId }
      });
      if (response.data && response.data.length > 0) {
        const entry = response.data[0];
        setVitalsEntry(entry);
        // FIX: Read values from the new response structure
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

  useEffect(() => {
    if (isRescheduling && rescheduleDate) {
      fetchAvailableSlots(rescheduleDate);
    }
  }, [rescheduleDate, isRescheduling]);

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
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAppointment();
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
      const originalTime = formatDateTime(appointment.datetime_start, clinicTimezone);
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
      setTimeout(() => router.push('/clinic-admin/dashboard/appointments'), 2000);
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
      setTimeout(() => router.push('/clinic-admin/dashboard/appointments'), 2000);
    } catch (err: any) {
      console.error('Failed to mark appointment as complete:', err);
      setError(err.response?.data?.error || 'Failed to mark as complete');
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    setIsSaving(true);
    try {
      await api.delete(`/appointments/${appointment.id}`, { params: { clinic_id: clinicId } });
      setSuccessMessage('Appointment cancelled successfully');
      setTimeout(() => router.push('/clinic-admin/dashboard/appointments'), 2000);
    } catch (err: any) {
      console.error('Failed to cancel appointment:', err);
      setError(err.response?.data?.error || 'Failed to cancel appointment');
      setIsSaving(false);
    }
  };

  const handleSaveVitals = async () => {
    if (!appointment) return;

    // validate required
    const requiredVitals = doctorVitals.filter((v) => v.is_required);
    const missingRequired = requiredVitals.filter(
      (v) => !vitalsValues[v.vitalConfig.vital_name] || vitalsValues[v.vitalConfig.vital_name].trim() === ''
    );

    if (missingRequired.length > 0) {
      setError(`Please fill in required vitals: ${missingRequired.map((v) => v.vitalConfig.vital_name).join(', ')}`);
      return;
    }
    
    // Stop editing any fields
    setEditingVitalName(null);

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

  if (isLoading) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg">Loading appointment...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (!appointment) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <p className="text-red-600 text-lg mb-4">Appointment not found</p>
          <Button onClick={() => router.push('/clinic-admin/dashboard/appointments')}>
            Back to Appointments
          </Button>
        </div>
      </ClinicDashboardLayout>
    );
  }

  const statusInfo = getStatusInfo(appointment.status);
  const StatusIcon = statusInfo.icon;

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Calendar className="h-8 w-8 mr-2 text-gray-600" />
            Edit Appointment
          </h1>
          <Button variant="ghost" onClick={() => router.push('/clinic-admin/dashboard/appointments')}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        {error && (
          <Card className="mb-4 bg-red-50 border-red-200">
            <div className="flex items-center p-4">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </Card>
        )}
        {successMessage && (
          <Card className="mb-4 bg-green-50 border-green-200">
            <div className="flex items-center p-4">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{successMessage}</p>
            </div>
          </Card>
        )}

        {/* Main grid: TL Details | TR Vitals
                         BL Actions | BR Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TOP LEFT - Appointment Details */}
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
                  <p className="text-gray-800 font-medium">{formatDateTime(appointment.datetime_start, clinicTimezone)}</p>
                  <p className="text-xs text-gray-500 mt-1">Timezone: {clinicTimezone}</p>
                </div>

                <div>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <User className="h-4 w-4 mr-2" />
                    <span className="font-medium">Patient</span>
                  </div>
                  <p className="text-gray-800 font-medium">{appointment.patient?.first_name} {appointment.patient?.last_name}</p>

                  <div className="flex items-center text-sm text-gray-500 mt-3 mb-2">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    <span className="font-medium">Doctor</span>
                  </div>
                  <p className="text-gray-800 font-medium">{appointment.doctor?.first_name} {appointment.doctor?.last_name}</p>

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

          {/* TOP RIGHT - Patient Vitals --- START OF UI CHANGE --- */}
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
                  {/* NEW TABLE STRUCTURE */}
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {doctorVitals.map((vital) => (
                          <tr key={vital.id}>
                            {/* Vital Name Cell */}
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                              {vital.vitalConfig.vital_name}
                              {vital.is_required && <span className="text-red-500 ml-1">*</span>}
                              {vital.vitalConfig.unit && (
                                <span className="text-gray-500 text-xs ml-1">({vital.vitalConfig.unit})</span>
                              )}
                            </td>
                            
                            {/* Vital Value Cell (Conditional) */}
                            <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                              {editingVitalName === vital.vitalConfig.vital_name ? (
                                // EDITING MODE
                                <Input
                                  id={`vital-${vital.id}`}
                                  type={vital.vitalConfig.data_type === 'number' ? 'number' : 'text'}
                                  value={vitalsValues[vital.vitalConfig.vital_name] || ''}
                                  onChange={(e) => handleVitalChange(vital.vitalConfig.vital_name, e.target.value)}
                                  onBlur={() => setEditingVitalName(null)} // Click away to stop editing
                                  placeholder={`Enter ${vital.vitalConfig.vital_name.toLowerCase()}`}
                                  className="w-full"
                                  autoFocus // Automatically focus the input
                                />
                              ) : (
                                // VIEW MODE
                                <div
                                  onClick={() => {
                                    if (appointment.status !== 2 && appointment.status !== 3) {
                                      setEditingVitalName(vital.vitalConfig.vital_name);
                                    }
                                  }}
                                  className={`min-h-[38px] p-2 -m-2 rounded-md flex items-center ${
                                    (appointment.status !== 2 && appointment.status !== 3)
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

                  {/* Save Button (remains the same) */}
                  {(appointment.status !== 2 && appointment.status !== 3) && (
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
          {/* --- END OF UI CHANGE --- */}


          {/* BOTTOM LEFT - Actions (or Reschedule form) */}
          <Card className="shadow-lg h-full">
            <div className="p-6">
              {appointment.status === 2 || appointment.status === 3 ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    This appointment is {appointment.status === 2 ? 'cancelled' : 'completed'} and cannot be modified.
                  </p>
                  <Button variant="secondary" onClick={() => router.push('/clinic-admin/dashboard/appointments')}>
                    Back to Appointments
                  </Button>
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
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select New Date</label>
                      <Input
                        id="reschedule-date"
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    {/* Slots */}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Time Slot</label>
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
                      <Button variant="ghost" onClick={() => { setIsRescheduling(false); setSelectedSlot(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Actions</h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setIsRescheduling(true)}
                      className="flex items-center justify-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reschedule
                    </Button>

                    <Button
                      variant="primary"
                      onClick={handleMarkComplete}
                      disabled={isSaving}
                      className="flex items-center justify-center bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isSaving ? 'Marking...' : 'Mark as Complete'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                      className="flex items-center justify-center text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Appointment
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* BOTTOM RIGHT - Appointment Notes */}
          <Card className="shadow-lg h-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Appointment Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                placeholder="Add any notes about this appointment..."
                // Disable notes if appointment is cancelled or completed
                disabled={appointment.status === 2 || appointment.status === 3}
              />
              {(appointment.status !== 2 && appointment.status !== 3) && (
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
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
                  <h3 className="text-xl font-bold text-gray-800">Cancel Appointment?</h3>
                </div>

                <p className="text-gray-600 mb-6">
                  Are you sure you want to cancel this appointment? This action cannot be undone.
                  The time slot will be freed for other bookings.
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
                  <Button variant="ghost" onClick={() => setShowCancelConfirm(false)} disabled={isSaving} className="flex-1">
                    Keep Appointment
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ClinicDashboardLayout>
  );
}