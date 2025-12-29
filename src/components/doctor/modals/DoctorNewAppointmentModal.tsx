// src/components/doctor/modals/NewAppointmentModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
import { Label } from '@radix-ui/react-label';
import { X, Check, ChevronLeft, MapPin } from 'lucide-react';
import { 
  ClinicDoctor, 
  ClinicPatient, 
  AvailableSlot, 
  DisplaySlot 
} from '@/types/clinic';
import { getDaysInMonth } from '@/lib/utils/datetime';
import { generateHourlySlots } from '@/lib/utils/appointments';

interface ClinicOption {
  id: number;
  name: string;
  timezone?: string;
  active?: boolean;
  role?: string;
}

interface NewAppointmentModalProps {
  onClose: () => void;
  onRefreshList: () => void;
  
  // Context from parent page
  selectedClinicId: number; // -1 for "All Clinics"
  viewScope: 'my' | 'clinic';
  associatedClinics: ClinicOption[];
  
  // Current user info
  currentDoctorId: number;
  currentDoctorName: string;
  
  // Permission flag
  canBookAppointments: boolean;
}

const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

export function DoctorNewAppointmentModal({
  onClose,
  onRefreshList,
  selectedClinicId,
  viewScope,
  associatedClinics,
  currentDoctorId,
  currentDoctorName,
  canBookAppointments
}: NewAppointmentModalProps) {

  // Filter out clinics where user doesn't have booking permissions
  const bookableClinics = associatedClinics.filter(clinic => 
    PRIVILEGED_ROLES.includes(clinic.role?.toUpperCase() || 'DOCTOR_VISITING')
  );

  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalSuccessMessage, setModalSuccessMessage] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  // Clinic Selection - Always allow selection from available clinics
  const [modalSelectedClinicId, setModalSelectedClinicId] = useState<number>(
    bookableClinics[0]?.id || -1
  );

  // Core Form State
  const [modalSelectedDoctorId, setModalSelectedDoctorId] = useState('');
  const [modalSelectedPatientId, setModalSelectedPatientId] = useState('');
  const [modalSelectedDate, setModalSelectedDate] = useState<Date | null>(null);
  const [modalAvailableSlots, setModalAvailableSlots] = useState<AvailableSlot[]>([]);
  const [modalDisplaySlots, setModalDisplaySlots] = useState<DisplaySlot[]>([]);
  const [modalSelectedDisplaySlot, setModalSelectedDisplaySlot] = useState<DisplaySlot | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  
  // Calendar State
  const [modalCurrentMonth, setModalCurrentMonth] = useState(new Date().getMonth());
  const [modalCurrentYear, setModalCurrentYear] = useState(new Date().getFullYear());
  
  // Search State
  const [modalDoctorSearchText, setModalDoctorSearchText] = useState('');
  const [modalPatientSearchText, setModalPatientSearchText] = useState('');

  // Data Lists - fetched internally
  const [fetchedDoctors, setFetchedDoctors] = useState<ClinicDoctor[]>([]);
  const [fetchedPatients, setFetchedPatients] = useState<ClinicPatient[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const clinicDoctors = fetchedDoctors;
  const clinicPatients = fetchedPatients;

  // Derived Values
  const currentClinic = associatedClinics.find(c => c.id === modalSelectedClinicId);
  const clinicTimezone = currentClinic?.timezone || 'UTC';
  const showClinicSelector = bookableClinics.length > 1;
  const showDoctorSelector = viewScope === 'clinic';
  const isMyView = viewScope === 'my';

  // Check if modal should even be shown
  if (!canBookAppointments && selectedClinicId !== -1) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Book Appointments</h3>
            <p className="text-sm text-gray-500 mb-4">
              You do not have permission to book appointments at this clinic. Only clinic administrators and partners can create appointments.
            </p>
            <Button variant="primary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  if (bookableClinics.length === 0) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <MapPin className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Clinics Available</h3>
            <p className="text-sm text-gray-500 mb-4">
              You don't have permission to book appointments at any of your associated clinics. Please contact your clinic administrator for access.
            </p>
            <Button variant="primary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  // Reset internal state for "Book Another"
  const resetForm = () => {
    setModalSuccessMessage(null);
    setModalErrorMessage(null);
    setModalSelectedDoctorId('');
    setModalSelectedPatientId('');
    setModalSelectedDate(null);
    setModalSelectedDisplaySlot(null);
    setModalNotes('');
    setModalAvailableSlots([]);
    setModalDisplaySlots([]);
    setModalCurrentMonth(new Date().getMonth());
    setModalCurrentYear(new Date().getFullYear());
    setModalDoctorSearchText('');
    setModalPatientSearchText('');
  };

  // Fetch Doctors and Patients when clinic changes
  useEffect(() => {
    if (modalSelectedClinicId === -1) {
      setFetchedDoctors([]);
      setFetchedPatients([]);
      return;
    }

    const fetchClinicData = async () => {
      setIsFetchingData(true);
      setModalErrorMessage(null);
      
      try {
        const doctorsResponse = await api.get('/clinic-user/clinic-doctor', {
          params: { clinic_id: modalSelectedClinicId }
        });
        setFetchedDoctors(doctorsResponse.data || []);

        const patientsResponse = await api.get('/clinic-user/clinic-patient', {
          params: { clinic_id: modalSelectedClinicId }
        });
        setFetchedPatients(patientsResponse.data || []);
        
      } catch (err: any) {
        console.error('Failed to fetch clinic data:', err);
        
        if (err.response?.status === 403 || err.response?.status === 401) {
          setModalErrorMessage('You do not have permission to book appointments at this clinic.');
        } else {
          setModalErrorMessage('Unable to load doctors and patients for this clinic.');
        }
        
        setFetchedDoctors([]);
        setFetchedPatients([]);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchClinicData();
  }, [modalSelectedClinicId]);

  // Auto-set doctor in "My View"
  useEffect(() => {
    if (isMyView && currentDoctorId) {
      setModalSelectedDoctorId(String(currentDoctorId));
    }
  }, [isMyView, currentDoctorId]);

  // Reset doctor selection when clinic changes
  useEffect(() => {
    if (!isMyView) {
      setModalSelectedDoctorId('');
    }
    setModalSelectedDisplaySlot(null);
  }, [modalSelectedClinicId, isMyView]);

  // Fetch Available Slots
  useEffect(() => {
    const fetchModalAvailableSlots = async () => {
      if (!modalSelectedDoctorId || !modalSelectedDate || modalSelectedClinicId === -1) {
        setModalAvailableSlots([]);
        return;
      }
      
      try {
        const year = modalSelectedDate.getFullYear();
        const month = String(modalSelectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(modalSelectedDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        const response = await api.get('/appointments/slots', {
          params: { 
            clinic_id: modalSelectedClinicId, 
            clinic_doctor_id: modalSelectedDoctorId, 
            date: formattedDate 
          },
        });
        setModalAvailableSlots(response.data);
      } catch (err) {
        console.error('Failed to fetch modal slots:', err);
        setModalErrorMessage('Failed to load available slots');
      }
    };
    
    fetchModalAvailableSlots();
  }, [modalSelectedDoctorId, modalSelectedDate, modalSelectedClinicId]);

  // Generate Display Slots
  useEffect(() => {
    if (modalAvailableSlots.length > 0) {
      setModalDisplaySlots(generateHourlySlots(modalAvailableSlots));
    } else {
      setModalDisplaySlots([]);
    }
  }, [modalAvailableSlots]);

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalLoading(true);
    setModalErrorMessage(null);

    const patientIdForAppt = parseInt(modalSelectedPatientId);
    
    if (!modalSelectedDoctorId || !patientIdForAppt || !modalSelectedDisplaySlot || !modalSelectedDate || modalSelectedClinicId === -1) {
      setModalErrorMessage('Please fill in all required fields');
      setIsModalLoading(false);
      return;
    }
    
    try {
      const year = modalSelectedDate.getFullYear();
      const month = String(modalSelectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(modalSelectedDate.getDate()).padStart(2, '0');
      const [startHour, startMinute] = modalSelectedDisplaySlot.display_start_time.split(':').map(Number);
      const [endHour, endMinute] = modalSelectedDisplaySlot.display_end_time.split(':').map(Number);
      const clinicDatetimeStart = `${year}-${month}-${day} ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
      const clinicDatetimeEnd = `${year}-${month}-${day} ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
      
      await api.post('/appointments', {
        clinic_doctor_id: parseInt(modalSelectedDoctorId),
        clinic_patient_id: patientIdForAppt,
        clinic_id: modalSelectedClinicId,
        datetime_start: clinicDatetimeStart,
        datetime_end: clinicDatetimeEnd,
        timezone: clinicTimezone,
        notes: modalNotes || null,
      });
      
      setModalSuccessMessage('Appointment booked successfully!');
      onRefreshList();
    } catch (err: any) {
      setModalErrorMessage(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setIsModalLoading(false);
    }
  };

  const daysInModalMonth = getDaysInMonth(modalCurrentYear, modalCurrentMonth);
  const filteredModalDoctors = clinicDoctors.filter(doctor => 
    `${doctor.first_name} ${doctor.last_name}`.toLowerCase().includes(modalDoctorSearchText.toLowerCase())
  );
  const filteredModalPatients = clinicPatients.filter(patient => 
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(modalPatientSearchText.toLowerCase())
  );
  
  const todayForCalendar = new Date();
  todayForCalendar.setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Book New Appointment</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {modalSuccessMessage ? (
            <div className="text-center py-8">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{modalSuccessMessage}</h3>
              <div className="flex justify-center space-x-4 mt-6">
                <Button variant="primary" size="md" onClick={onClose}>Done</Button>
                <Button variant="ghost" size="md" onClick={resetForm}>Book Another</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAppointmentSubmit} className="space-y-6">
              {modalErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {modalErrorMessage}
                </div>
              )}

              {/* Clinic Selector - Always visible if multiple bookable clinics */}
              {showClinicSelector && (
                <div className="pb-4 border-b border-gray-200">
                  <Label htmlFor="clinic-selector" className="font-semibold text-gray-700 mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Select Clinic
                  </Label>
                  <select
                    id="clinic-selector"
                    value={modalSelectedClinicId}
                    onChange={(e) => setModalSelectedClinicId(Number(e.target.value))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                    required
                    disabled={isFetchingData}
                  >
                    <option value={-1}>-- Select a Clinic --</option>
                    {bookableClinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                  {isFetchingData && (
                    <p className="text-xs text-blue-600 mt-1">Loading clinic data...</p>
                  )}
                </div>
              )}

              {/* Show clinic name if only one bookable clinic */}
              {!showClinicSelector && bookableClinics.length === 1 && (
                <div className="pb-4 border-b border-gray-200">
                  <Label className="font-semibold text-gray-700 mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Clinic
                  </Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900">{bookableClinics[0].name}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Doctor Selection (Clinic View only) */}
                {showDoctorSelector && (
                  <div>
                    <Label htmlFor="doctor-search-modal" className="font-semibold text-gray-700 mb-2">
                      1. Select Doctor
                    </Label>
                    <div className="relative">
                      <Input
                        id="doctor-search-modal"
                        type="text"
                        placeholder="Search doctors..."
                        value={modalDoctorSearchText}
                        onChange={(e) => setModalDoctorSearchText(e.target.value)}
                        className="mb-2"
                      />
                      <select
                        value={modalSelectedDoctorId}
                        onChange={(e) => {
                          setModalSelectedDoctorId(e.target.value);
                          setModalSelectedDisplaySlot(null);
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        required
                      >
                        <option value="">-- Select a Doctor --</option>
                        {filteredModalDoctors.map(doctor => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.first_name} {doctor.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Doctor Display (My View) */}
                {isMyView && (
                  <div>
                    <Label className="font-semibold text-gray-700 mb-2">1. Doctor</Label>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm font-medium text-blue-900">{currentDoctorName}</p>
                      <p className="text-xs text-blue-600">Booking for yourself</p>
                    </div>
                  </div>
                )}

                {/* Patient Selection */}
                <div>
                  <Label htmlFor="patient-search-modal" className="font-semibold text-gray-700 mb-2">
                    {showDoctorSelector ? '2' : '1'}. Select Patient
                  </Label>
                  <div className="relative">
                    <Input
                      id="patient-search-modal"
                      type="text"
                      placeholder="Search patients..."
                      value={modalPatientSearchText}
                      onChange={(e) => setModalPatientSearchText(e.target.value)}
                      className="mb-2"
                    />
                    <select
                      value={modalSelectedPatientId}
                      onChange={(e) => setModalSelectedPatientId(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                      required
                      disabled={modalSelectedClinicId === -1}
                    >
                      <option value="">-- Select a Patient --</option>
                      {filteredModalPatients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date and Time Selection */}
              <div>
                <Label className="font-semibold text-gray-700 mb-2">
                  {showDoctorSelector ? '3' : '2'}. Select Date and Time Slot
                </Label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (modalCurrentMonth === 0) {
                          setModalCurrentMonth(11);
                          setModalCurrentYear(modalCurrentYear - 1);
                        } else {
                          setModalCurrentMonth(modalCurrentMonth - 1);
                        }
                      }}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h3 className="font-medium">
                      {new Date(modalCurrentYear, modalCurrentMonth).toLocaleString('default', { month: 'long' })} {modalCurrentYear}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (modalCurrentMonth === 11) {
                          setModalCurrentMonth(0);
                          setModalCurrentYear(modalCurrentYear + 1);
                        } else {
                          setModalCurrentMonth(modalCurrentMonth + 1);
                        }
                      }}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <ChevronLeft className="h-4 w-4 transform rotate-180" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-2">
                    {Array.from({ length: daysInModalMonth[0]?.getDay() ?? 0 }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {daysInModalMonth.map(day => {
                      const isPast = day < todayForCalendar;
                      return (
                        <Button
                          key={day.toISOString()}
                          type="button"
                          variant={day.toDateString() === modalSelectedDate?.toDateString() ? 'primary' : 'ghost'}
                          onClick={() => {
                            setModalSelectedDate(day);
                            setModalSelectedDisplaySlot(null);
                          }}
                          className={`w-full h-10 flex items-center justify-center rounded-lg ${
                            isPast ? 'text-gray-400 line-through opacity-70 cursor-not-allowed' : ''
                          }`}
                          disabled={isPast}
                        >
                          {day.getDate()}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Slots Display */}
                {modalSelectedDoctorId && modalSelectedDate && modalSelectedClinicId !== -1 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Available Slots</h3>
                    {modalDisplaySlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {modalDisplaySlots.map((slot) => (
                          <Button
                            key={slot.key}
                            type="button"
                            onClick={() => setModalSelectedDisplaySlot(slot)}
                            variant={modalSelectedDisplaySlot?.key === slot.key ? 'primary' : 'outline'}
                            className="w-full"
                          >
                            <span className="truncate">
                              {slot.display_start_time} - {slot.display_end_time}
                            </span>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No slots available for this date. Please choose another date.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes-modal" className="font-semibold text-gray-700 mb-2">
                  {showDoctorSelector ? '4' : '3'}. Add Notes (Optional)
                </Label>
                <textarea
                  id="notes-modal"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Add any specific notes for this appointment..."
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="ghost" size="md" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isModalLoading || !modalSelectedDisplaySlot || !modalSelectedPatientId || modalSelectedClinicId === -1}
                >
                  {isModalLoading ? 'Booking...' : 'Book Appointment'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}