// src/app/clinic-admin/dashboard/appointments/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
import { Plus, Calendar, Edit, Clock, Filter, Move, RefreshCw } from 'lucide-react';
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
  datetime_start_str: string;
  datetime_end_str: string;
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

const formatDateTime = (utcIsoString: string) => {
  if (!utcIsoString) return '';
  
  try {
    const date = new Date(utcIsoString);
    
    if (isNaN(date.getTime())) {
      return utcIsoString;
    }
    
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

const formatDateTimeToTimezone = (utcIsoString: string, timeZone: string = 'Asia/Kolkata') => {
  if (!utcIsoString) return '';
  
  try {
    const date = new Date(utcIsoString);
    
    if (isNaN(date.getTime())) {
      return utcIsoString;
    }
    
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

// Check if appointment was rescheduled
const isRescheduled = (appointment: Appointment) => {
  return appointment.notes?.includes('[Rescheduled from:') || false;
};

// Extract original time from rescheduled note
const getRescheduledFromTime = (appointment: Appointment) => {
  if (!appointment.notes) return null;
  const match = appointment.notes.match(/\[Rescheduled from: (.*?)\]/);
  return match ? match[1] : null;
};

const getActualStatus = (appointment: Appointment) => {
  const now = new Date();
  const startTime = new Date(appointment.datetime_start_str);
  const endTime = new Date(appointment.datetime_end_str);

  if (appointment.status === 2) {
    return { text: 'Cancelled', color: 'bg-red-100 text-red-800', key: 'cancelled' };
  }

  if (appointment.status === 3) {
    return { text: 'Completed', color: 'bg-gray-100 text-gray-800', key: 'completed' };
  }

  if (now < startTime) {
    return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800', key: 'upcoming' };
  } else if (now >= startTime && now <= endTime) {
    return { text: 'In Progress', color: 'bg-yellow-100 text-yellow-800', key: 'inProgress' };
  } else {
    return { text: 'Completed', color: 'bg-gray-100 text-gray-800', key: 'completed' };
  }
};

export default function AppointmentsDashboardPage() {
  const router = useRouter();
  const { user } = useAppSelector((state: any) => state.auth);
  const clinicId = user?.clinics?.[0]?.id;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [clinicTimezone, setClinicTimezone] = useState<string>('Asia/Kolkata');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    clinic_doctor_id: '',
    patient_profile_id: '',
    startDate: '',
    endDate: '',
  });

  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [statusFilters, setStatusFilters] = useState({
    upcoming: true,
    inProgress: true,
    completed: true,
    cancelled: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

    const fetchClinicDetails = async () => {
      try {
        const response = await api.get(`/clinic/${clinicId}`);
        if (response.data.timezone) {
          setClinicTimezone(response.data.timezone);
        }
      } catch (err) {
        console.error('Failed to fetch clinic details:', err);
      }
    };

    fetchDoctors();
    fetchPatients();
    fetchAppointments();
    fetchClinicDetails();
    
  }, [user, router, clinicId, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const toggleStatusFilter = (status: keyof typeof statusFilters) => {
    setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    
    let filtered = appointments;

    if (activeTab === 'active') {
      filtered = appointments.filter(apt => {
        const endTime = new Date(apt.datetime_end_str);
        // Exclude if manually cancelled (status 2) OR manually completed (status 3)
        // Also exclude if appointment end time has passed (auto-completed)
        return endTime >= now && apt.status !== 2 && apt.status !== 3;
      });
    } else if (activeTab === 'completed') {
      filtered = appointments.filter(apt => {
        const endTime = new Date(apt.datetime_end_str);
        // Include if: past end time OR manually cancelled OR manually completed
        return endTime < now || apt.status === 2 || apt.status === 3;
      });
    }

    filtered = filtered.filter(apt => {
      const status = getActualStatus(apt);
      return statusFilters[status.key as keyof typeof statusFilters];
    });

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

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

        <Card className="mb-6 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 gap-4 border-b border-gray-200">
            <nav className="flex space-x-6">
              <button
                onClick={() => setActiveTab('active')}
                className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'active'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'completed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
            </nav>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleStatusFilter('upcoming')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  statusFilters.upcoming
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => toggleStatusFilter('inProgress')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  statusFilters.inProgress
                    ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => toggleStatusFilter('completed')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  statusFilters.completed
                    ? 'bg-gray-100 text-gray-800 border-2 border-gray-500'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => toggleStatusFilter('cancelled')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  statusFilters.cancelled
                    ? 'bg-red-100 text-red-800 border-2 border-red-500'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                }`}
              >
                Cancelled
              </button>
            </div>
          </div>

          <div className="p-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Additional Filters
            </button>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Doctor</label>
                  <select
                    id="doctor-filter"
                    name="clinic_doctor_id"
                    value={filters.clinic_doctor_id}
                    onChange={handleFilterChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Patient</label>
                  <select
                    id="patient-filter"
                    name="patient_profile_id"
                    value={filters.patient_profile_id}
                    onChange={handleFilterChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <Input id="start-date-filter" name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <Input id="end-date-filter" name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card padding="lg" className="shadow-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Clock className="h-6 w-6 mr-2 text-gray-600" />
            {activeTab === 'active' ? 'Active Appointments' : activeTab === 'completed' ? 'Completed Appointments' : 'All Appointments'}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredAppointments.length} total)
            </span>
          </h2>
          {paginatedAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No appointments found.</p>
              <p className="text-sm text-gray-400">Try adjusting your filters or booking a new appointment.</p>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {paginatedAppointments.map((appointment) => {
                  const statusTag = getActualStatus(appointment);
                  const rescheduled = isRescheduled(appointment);
                  const originalTime = getRescheduledFromTime(appointment);
                  
                  return (
                    <li 
                      key={appointment.id} 
                      className="p-5 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusTag.color}`}>
                              {statusTag.text}
                            </span>
                            {rescheduled && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Rescheduled
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <h3 className="text-lg font-bold text-gray-800">Appointment Time</h3>
                            <p className="text-sm text-gray-600">
                              {formatDateTimeToTimezone(appointment.datetime_start_str, clinicTimezone)}
                              <span className="text-xs text-gray-400 ml-2">
                                ({clinicTimezone})
                              </span>
                            </p>
                            <p className="text-xs text-gray-400">
                              Local: {formatDateTime(appointment.datetime_start_str)}
                            </p>
                            {rescheduled && originalTime && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Originally scheduled: {originalTime}
                              </p>
                            )}
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
                          <Button variant="secondary" size="sm" className='flex items-center' onClick={() => router.push(`/clinic-admin/dashboard/appointments/${appointment.id}/edit`)} title="View Appointment">
                            <Edit className="h-4 w-4 mr-2"/>
                            View Appointment
                          </Button>
                          
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </ClinicDashboardLayout>
  );
}