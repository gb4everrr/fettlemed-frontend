// src/app/clinic-admin/dashboard/appointments/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
// These imports are placeholders for your actual project components and services.
// @ts-ignore
import { useAppSelector } from '@/lib/hooks';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Card from '@/components/ui/Card';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
// @ts-ignore
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Edit, Clock, Filter, Move } from 'lucide-react';
// @ts-ignore
import Input from '@/components/ui/Input';
// @ts-ignore
import Link from 'next/link';

interface Appointment {
  id: number;
  clinic_id: number;
  patient_profile_id: number;
  clinic_doctor_id: number;
  slot_id: number;
  datetime_start_str: string; // UTC string from backend
  datetime_end_str: string;   // UTC string from backend
  status: number;
  notes: string | null;
  patient?: { first_name: string; last_name: string; };
  doctor?: { first_name: string; last_name: string; };
}

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

// FIXED: Proper datetime formatting function
const formatDateTime = (utcIsoString: string) => {
  if (!utcIsoString) return '';
  
  try {
    // The backend now sends proper ISO strings, so we can parse directly
    const date = new Date(utcIsoString);
    
    if (isNaN(date.getTime())) {
      return utcIsoString; // Fallback to original string if parsing fails
    }
    
    // This will automatically convert to user's local timezone
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return utcIsoString;
  }
};

// Alternative: Format to specific timezone (if you want clinic timezone instead of user's local)
const formatDateTimeToTimezone = (utcIsoString: string, timeZone: string = 'Asia/Kolkata') => {
  if (!utcIsoString) return '';
  
  try {
    const date = new Date(utcIsoString);
    
    if (isNaN(date.getTime())) {
      return utcIsoString;
    }
    
    // Format to specific timezone
    return date.toLocaleString(undefined, {
      timeZone: timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting datetime to timezone:', error);
    return utcIsoString;
  }
};

const getStatusTag = (status: number) => {
  switch (status) {
    case 0: return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    case 1: return { text: 'Confirmed', color: 'bg-green-100 text-green-800' };
    case 2: return { text: 'Cancelled', color: 'bg-red-100 text-red-800' };
    case 3: return { text: 'Completed', color: 'bg-gray-100 text-gray-800' };
    default: return { text: 'Unknown', color: 'bg-yellow-100 text-yellow-800' };
  }
};

export default function AppointmentsDashboardPage() {
  const router = useRouter();
  const { user } = useAppSelector((state: any) => state.auth);
  const clinicId = user?.clinics?.[0]?.id;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  
  // Add clinic timezone state if you want to display in clinic's timezone
  const [clinicTimezone, setClinicTimezone] = useState<string>('Asia/Kolkata');

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    clinic_doctor_id: '',
    patient_profile_id: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'clinic_admin' || !clinicId) {
      if(router) router.push('/auth/login');
      return;
    }

    const fetchAppointments = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await api.get(`/appointments`, {
          params: { ...filters, clinic_id: clinicId },
        });

        // FIXED: Sort using proper Date objects from ISO strings
        const sortedAppointments = response.data.sort((a: Appointment, b: Appointment) => {
          return new Date(a.datetime_start_str).getTime() - new Date(b.datetime_start_str).getTime();
        });

        setAppointments(sortedAppointments);
      } catch (err: any) {
        console.error('Failed to fetch appointments:', err);
        setFetchError(err.response?.data?.error || 'Failed to fetch appointments.');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchDoctors = async () => {
      try {
        const response = await api.get(`/clinic-user/clinic-doctor`, { params: { clinic_id: clinicId } });
        setDoctors(response.data);
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      }
    };

    const fetchPatients = async () => {
      try {
        const response = await api.get(`/clinic-user/clinic-patient`, { params: { clinic_id: clinicId } });
        setPatients(response.data);
      } catch (err) {
        console.error('Failed to fetch patients:', err);
      }
    };

    // Optional: Fetch clinic timezone
    const fetchClinicDetails = async () => {
      try {
        const response = await api.get(`/clinic/${clinicId}`);
        if (response.data.timezone) {
          setClinicTimezone(response.data.timezone);
        }
      } catch (err) {
        console.error('Failed to fetch clinic details:', err);
        // Keep default timezone
      }
    };

    fetchDoctors();
    fetchPatients();
    fetchAppointments();
    fetchClinicDetails();
    
  }, [user, router, clinicId, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  if (!user || isLoading) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading appointments...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (fetchError) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-600 text-lg mb-4">Error: {fetchError}</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8 ">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
            <Calendar className="h-8 w-8 mr-2 text-gray-600" />
            Appointments Dashboard
          </h1>
          <Link href="/clinic-admin/dashboard/appointments/create" passHref>
            <Button variant="primary" size="md" className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Book New Appointment
            </Button>
          </Link>
        </div>

        <Card className="mb-6 p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
            <Filter className="h-5 w-5 mr-2" /> Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <select
                id="doctor-filter"
                name="clinic_doctor_id"
                value={filters.clinic_doctor_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              >
                <option value="">All Doctors</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.first_name} {doctor.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                id="patient-filter"
                name="patient_profile_id"
                value={filters.patient_profile_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              >
                <option value="">All Patients</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Input id="start-date-filter" name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
            </div>
            <div>
              <Input id="end-date-filter" name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
            </div>
          </div>
        </Card>

        <Card padding="lg" className="shadow-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Clock className="h-6 w-6 mr-2 text-gray-600" />
            All Appointments
          </h2>
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No appointments found.</p>
              <p className="text-sm text-gray-400">Try adjusting your filters or booking a new appointment.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {appointments.map((appointment) => {
                const statusTag = getStatusTag(appointment.status);
                return (
                  <li key={appointment.id} className="p-5 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusTag.color}`}>
                          {statusTag.text}
                        </span>
                        <div className="mt-2">
                          <h3 className="text-lg font-bold text-gray-800">Appointment Time</h3>
                          <p className="text-sm text-gray-600">
                            {/* Use clinic timezone or user's local timezone */}
                            {formatDateTimeToTimezone(appointment.datetime_start_str, clinicTimezone)}
                            <span className="text-xs text-gray-400 ml-2">
                              ({clinicTimezone})
                            </span>
                          </p>
                          {/* Optional: Show in user's local timezone too */}
                          <p className="text-xs text-gray-400">
                            Local: {formatDateTime(appointment.datetime_start_str)}
                          </p>
                        </div>
                        {appointment.patient && (
                          <p className="text-sm text-gray-500 mt-2">
                            <span className="font-semibold">Patient:</span> {appointment.patient.first_name} {appointment.patient.last_name}
                          </p>
                        )}
                        {appointment.doctor && (
                          <p className="text-sm text-gray-500">
                            <span className="font-semibold">Doctor:</span> {appointment.doctor.first_name} {appointment.doctor.last_name}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/clinic-admin/dashboard/appointments/${appointment.id}/edit`)} title="Edit Appointment">
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => console.log(`Reschedule appointment ${appointment.id}`)} title="Reschedule">
                          <Move className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </ClinicDashboardLayout>
  );
}