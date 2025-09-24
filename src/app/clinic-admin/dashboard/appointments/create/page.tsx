// src/app/clinic-admin/dashboard/appointments/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, User, Clock, Check, ChevronLeft } from 'lucide-react';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import { Label } from '@radix-ui/react-label';

// Interfaces
interface ClinicDoctor {
  id: number;
  first_name: string;
  last_name: string;
}

interface ClinicPatient {
  id: number;
  first_name: string;
  last_name: string;
}

interface AvailableSlot {
  id: number;
  start_time: string;
  end_time: string;
}

interface DisplaySlot {
  parent_slot_id: number;
  display_start_time: string;
  display_end_time: string;
  key: string;
}

// Helper to get days of a month
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Helper to generate 1-hour time slots from a larger time block
const generateHourlySlots = (rawSlots: AvailableSlot[]) => {
  const newSlots: DisplaySlot[] = [];
  rawSlots.forEach(slot => {
    // Assuming start_time and end_time are in 'HH:mm:ss' format
    const [startHour, startMinute] = slot.start_time.split(':').map(Number);
    const [endHour, endMinute] = slot.end_time.split(':').map(Number);
    
    let currentHour = startHour;

    while (currentHour < endHour || (currentHour === endHour && startMinute < endMinute)) {
      const displayStart = `${String(currentHour).padStart(2, '0')}:00`;
      const displayEnd = `${String(currentHour + 1).padStart(2, '0')}:00`;
      
      newSlots.push({
        parent_slot_id: slot.id,
        display_start_time: displayStart,
        display_end_time: displayEnd,
        key: `${slot.id}-${displayStart}`,
      });

      currentHour++;
    }
  });
  return newSlots;
};

export default function BookAppointmentPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const clinicId = user?.clinics?.[0]?.id;

  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [displaySlots, setDisplaySlots] = useState<DisplaySlot[]>([]);
  
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDisplaySlot, setSelectedDisplaySlot] = useState<DisplaySlot | null>(null);
  const [notes, setNotes] = useState('');

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter text state for search functionality
  const [doctorSearchText, setDoctorSearchText] = useState('');
  const [patientSearchText, setPatientSearchText] = useState('');

  // Fetch doctors and patients on component load
  useEffect(() => {
    if (!user || user.role !== 'clinic_admin' || !clinicId) {
      router.push('/auth/login');
      return;
    }
    
    const fetchData = async () => {
      try {
        // Fetch doctors
        const doctorsRes = await api.get(`/clinic-user/clinic-doctor`, {
          params: { clinic_id: clinicId },
        });
        setDoctors(doctorsRes.data);

        // Fetch patients
        const patientsRes = await api.get(`/clinic-user/clinic-patient`, {
          params: { clinic_id: clinicId },
        });
        setPatients(patientsRes.data);
      } catch (err: any) {
        setFetchError(err.response?.data?.error || 'Failed to fetch initial data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, router, clinicId]);

  // Fetch available slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      const fetchSlots = async () => {
        setIsLoading(true);
        setAvailableSlots([]);
        setSelectedDisplaySlot(null);
        try {
          const getFormattedDateForAPI = (localDate: Date) => {
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Then use it:
const formattedDate = getFormattedDateForAPI(selectedDate);
          const response = await api.get(`/appointments/slots`, {
            params: { clinic_id: clinicId, clinic_doctor_id: selectedDoctorId, date: formattedDate },
          });
          setAvailableSlots(response.data);
        } catch (err: any) {
          console.error('Failed to fetch available slots:', err);
          setFetchError(err.response?.data?.error || 'Failed to fetch available slots.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchSlots();
    }
  }, [selectedDoctorId, selectedDate, clinicId]);

  // Generate display slots whenever availableSlots changes
  useEffect(() => {
    if (availableSlots.length > 0) {
      setDisplaySlots(generateHourlySlots(availableSlots));
    } else {
      setDisplaySlots([]);
    }
  }, [availableSlots]);

// Function to handle booking - FIXED VERSION
const handleBookAppointment = async () => {
  if (!selectedDoctorId || !selectedPatientId || !selectedDisplaySlot || !selectedDate) {
    setFetchError('Please select a doctor, patient, date, and available slot.');
    return;
  }

  setIsBooking(true);
  setFetchError(null);

  try {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth(); // Keep 0-based for Date constructor
    const day = selectedDate.getDate();
    
    // Parse the time slots (assuming they're in "HH:mm" format)
    const [startHour, startMinute] = selectedDisplaySlot.display_start_time.split(':').map(Number);
    const [endHour, endMinute] = selectedDisplaySlot.display_end_time.split(':').map(Number);
    
    // OPTION 1: Send in clinic timezone format (recommended)
    const monthFormatted = String(selectedDate.getMonth() + 1).padStart(2, '0'); // 1-based for string formatting
    const dayFormatted = String(day).padStart(2, '0');
    
    const clinicDatetimeStart = `${year}-${monthFormatted}-${dayFormatted} ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
    const clinicDatetimeEnd = `${year}-${monthFormatted}-${dayFormatted} ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
    
    console.log('Booking appointment:', {
      selectedDate: selectedDate.toString(),
      clinicDatetimeStart,
      clinicDatetimeEnd,
      timezone: 'Asia/Kolkata' // or clinicTimezone if you fetch it
    });

    const response = await api.post('/appointments', {
      clinic_doctor_id: parseInt(selectedDoctorId),
      clinic_patient_id: parseInt(selectedPatientId),
      clinic_id: clinicId,
      datetime_start: clinicDatetimeStart,
      datetime_end: clinicDatetimeEnd,
      timezone: 'Asia/Kolkata', // Send the clinic timezone
      notes: notes || null,
    });

    console.log('Appointment booked successfully:', response.data);
    router.push('/clinic-admin/dashboard/appointments');
    
  } catch (err: any) {
    console.error('Failed to book appointment:', err);
    console.error('Error details:', err.response?.data);
    setFetchError(err.response?.data?.error || err.message || 'Failed to book appointment.');
  } finally {
    setIsBooking(false);
  }
};

// ALTERNATIVE: If you want to stick with UTC conversion (less reliable)
const handleBookAppointmentAlternative = async () => {
  if (!selectedDoctorId || !selectedPatientId || !selectedDisplaySlot || !selectedDate) {
    setFetchError('Please select a doctor, patient, date, and available slot.');
    return;
  }

  setIsBooking(true);
  setFetchError(null);

  try {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth(); // 0-based for Date constructor
    const day = selectedDate.getDate();
    
    const [startHour, startMinute] = selectedDisplaySlot.display_start_time.split(':').map(Number);
    const [endHour, endMinute] = selectedDisplaySlot.display_end_time.split(':').map(Number);
    
    // FIXED: Use 0-based month for Date constructor
    const localStart = new Date(year, month, day, startHour, startMinute);
    const localEnd = new Date(year, month, day, endHour, endMinute);
    
    // Convert to UTC ISO strings
    const utcStart = localStart.toISOString();
    const utcEnd = localEnd.toISOString();
    
    console.log('UTC conversion:', {
      localStart: localStart.toString(),
      localEnd: localEnd.toString(),
      utcStart,
      utcEnd,
      browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    const response = await api.post('/appointments', {
      clinic_doctor_id: parseInt(selectedDoctorId),
      clinic_patient_id: parseInt(selectedPatientId),
      clinic_id: clinicId,
      datetime_start: utcStart,
      datetime_end: utcEnd,
      notes: notes || null,
    });

    console.log('Appointment booked successfully:', response.data);
    router.push('/clinic-admin/dashboard/appointments');
    
  } catch (err: any) {
    console.error('Failed to book appointment:', err);
    setFetchError(err.response?.data?.error || err.message || 'Failed to book appointment.');
  } finally {
    setIsBooking(false);
  }
};

  // Filtered lists for search functionality
  const filteredDoctors = doctors.filter(doctor => 
    `${doctor.first_name} ${doctor.last_name}`.toLowerCase().includes(doctorSearchText.toLowerCase())
  );
  const filteredPatients = patients.filter(patient => 
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(patientSearchText.toLowerCase())
  );

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex items-center mb-6">
          <Link href="/clinic-admin/dashboard/appointments">
            <Button variant="ghost" size="md" className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
            <Plus className="h-8 w-8 mr-2 text-gray-600" />
            Book New Appointment
          </h1>
        </div>

        <Card padding="lg" className="shadow-lg">
          {fetchError && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
              {fetchError}
            </div>
          )}
          {isLoading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Select Doctor */}
              <div>
                <Label htmlFor="doctor-search" className="font-semibold text-gray-700 mb-2">1. Select Doctor</Label>
                <div className="relative">
                  <Input
                    id="doctor-search"
                    type="text"
                    placeholder="Search doctors..."
                    value={doctorSearchText}
                    onChange={(e) => setDoctorSearchText(e.target.value)}
                    className="mb-2"
                  />
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  >
                    <option value="">-- Select a Doctor --</option>
                    {filteredDoctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Select Patient */}
              <div>
                <Label htmlFor="patient-search" className="font-semibold text-gray-700 mb-2">2. Select Patient</Label>
                <div className="relative">
                  <Input
                    id="patient-search"
                    type="text"
                    placeholder="Search patients..."
                    value={patientSearchText}
                    onChange={(e) => setPatientSearchText(e.target.value)}
                    className="mb-2"
                  />
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  >
                    <option value="">-- Select a Patient --</option>
                    {filteredPatients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Step 3: Select Date and Slot */}
              <div>
                <Label className="font-semibold text-gray-700 mb-2">3. Select Date and Time Slot</Label>
                
                {/* Calendar Grid for Date Selection */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <Button 
                      variant="ghost" 
                      size="md" 
                      onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11);
                          setCurrentYear(currentYear - 1);
                        } else {
                          setCurrentMonth(currentMonth - 1);
                        }
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-medium">
                      {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} {currentYear}
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="md" 
                      onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0);
                          setCurrentYear(currentYear + 1);
                        } else {
                          setCurrentMonth(currentMonth + 1);
                        }
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 transform rotate-180" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-2">
                    {Array.from({ length: daysInMonth[0]?.getDay() ?? 0 }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {daysInMonth.map(day => (
                      <Button
                        key={day.toISOString()}
                        variant={day.toDateString() === selectedDate?.toDateString() ? 'primary' : 'ghost'}
                        onClick={() => setSelectedDate(day)}
                        className="w-full h-10 flex items-center justify-center rounded-lg"
                      >
                        {day.getDate()}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedDoctorId && selectedDate && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Available Slots</h3>
                    {displaySlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {displaySlots.map((slot) => (
                          <Button
                            key={slot.key}
                            onClick={() => setSelectedDisplaySlot(slot)}
                            variant={selectedDisplaySlot?.key === slot.key ? 'primary' : 'outline'}
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

              {/* Step 4: Additional Notes */}
              <div>
                <Label htmlFor="notes" className="font-semibold text-gray-700 mb-2">4. Add Notes (Optional)</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any specific notes for this appointment..."
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 mt-1"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleBookAppointment} 
                  disabled={isBooking || !selectedDisplaySlot}
                  variant="primary"
                  size="lg"
                  className="flex items-center"
                >
                  {isBooking ? 'Booking...' : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Book Appointment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </ClinicDashboardLayout>
  );
}
