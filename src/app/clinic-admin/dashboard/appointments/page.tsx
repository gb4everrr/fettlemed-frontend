// src/app/clinic-admin/dashboard/appointments/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useAppSelector } from '@/lib/hooks';

import api from '@/services/api';

import Card from '@/components/ui/Card';

import Button from '@/components/ui/Button';

import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import DatePicker from '@/components/ui/DatePicker';

import Input from '@/components/ui/Input';
import {
  Plus,
  Calendar,
  Filter,
  List,
  CalendarDays,
  UserPlus,
} from 'lucide-react';

// --- Local Component Imports ---
import ListView from './ListView';
import CalendarView from './CalendarView';
import { EditAppointmentModal } from '@/components/clinic/modals/EditAppointmentModal';
import { NewAppointmentModal } from '@/components/clinic/modals/NewAppointmentModal';
import { WalkInModal } from '@/components/clinic/modals/WalkInModal';

// --- Type Imports ---
import {
  Appointment,
  ClinicDoctor,
  ClinicPatient,
  ModalType,
} from '@/types/clinic';

// --- Util Imports ---
import { getWeekDays } from '@/lib/utils/datetime';
import { doctorColor } from '@/lib/utils/appointments';

// --- MAIN PAGE COMPONENT ---
export default function AppointmentsDashboardPage() {
  const router = useRouter();
  const { user } = useAppSelector((state: any) => state.auth);
  const clinicId = user?.clinics?.[0]?.id;

  // --- Page State ---
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

  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('all');
  const [statusFilters, setStatusFilters] = useState({
    upcoming: true,
    inProgress: true,
    completed: true,
    cancelled: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekDays = getWeekDays(currentWeek);

  const [earliestHour, setEarliestHour] = useState<number>(8);
  const [latestHour, setLatestHour] = useState<number>(18);

  const calendarRef = useRef<HTMLDivElement | null>(null);

  // --- Modal State ---
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Encapsulated fetch logic
  const fetchAppointmentsData = async () => {
    //if (!activeModal) setIsLoading(true);
    setFetchError(null);
    try {
      const response = await api.get(`/appointments`, {
        params: { ...filters, clinic_id: clinicId }
      });
      const sortedAppointments = response.data.sort((a: Appointment, b: Appointment) => {
        return new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime();
      });
      setAppointments(sortedAppointments);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      setFetchError(err.response?.data?.error || 'Failed to fetch appointments.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Main data fetch
  useEffect(() => {
    if (!user || user.role !== 'clinic_admin' || !clinicId) {
      router.push('/auth/login');
      return;
    }

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
        // CHANGE THIS LINE: Pass clinic_id in params object
        const response = await api.get(`/clinic/${clinicId}`, { 
          params: { clinic_id: clinicId } 
        });
        
        if (response.data.timezone) setClinicTimezone(response.data.timezone);
        console.log(clinicId);
      } catch (err) {
        console.error('Failed to fetch clinic details:', err, clinicId);
      }
    };

    fetchDoctors();
    fetchPatients(); 
    fetchAppointmentsData();
    fetchClinicDetails();

  }, [user, router, clinicId, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilters]);

  // Page filter logic
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDateFilterChange = (key: 'startDate' | 'endDate', date: Date) => {
    // Convert Date object to YYYY-MM-DD string for the filter state
    // Using offset to ensure we get the correct local date string
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    const dateStr = adjustedDate.toISOString().split('T')[0];
    
    setFilters(prev => ({ ...prev, [key]: dateStr }));
  };

  const toggleStatusFilter = (status: keyof typeof statusFilters) => {
    setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    let filtered = appointments;

    if (activeTab === 'active') {
      filtered = appointments.filter(apt => {
        const endTime = new Date(apt.datetime_end);
        return endTime >= now && apt.status !== 2 && apt.status !== 3;
      });
    } else if (activeTab === 'completed') {
      filtered = appointments.filter(apt => {
        const endTime = new Date(apt.datetime_end);
        return endTime < now || apt.status === 2 || apt.status === 3;
      });
    }

    filtered = filtered.filter(apt => {
      const status = ((): any => {
        const now = new Date();
        const s = new Date(apt.datetime_start);
        const e = new Date(apt.datetime_end);
        if (apt.status === 2) return { key: 'cancelled' };
        if (apt.status === 3) return { key: 'completed' };
        if (now < s) return { key: 'upcoming' };
        if (now >= s && now <= e) return { key: 'inProgress' };
        return { key: 'completed' };
      })();
      return statusFilters[status.key as keyof typeof statusFilters];
    });

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(apt => new Date(apt.datetime_start) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23,59,59,999);
      filtered = filtered.filter(apt => new Date(apt.datetime_start) <= end);
    }
    if (filters.clinic_doctor_id) {
      filtered = filtered.filter(apt => String(apt.clinic_doctor_id) === String(filters.clinic_doctor_id));
    }
    if (filters.patient_profile_id) {
      filtered = filtered.filter(apt => String(apt.clinic_patient_id) === String(filters.patient_profile_id));
    }

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  // Calendar layout helpers
  const getAppointmentsForDay = (day: Date) => {
    return filteredAppointments.filter(apt => {
      const aptDate = new Date(apt.datetime_start);
      return aptDate.toDateString() === day.toDateString();
    });
  };

  const expandEarlier = () => setEarliestHour(prev => Math.max(0, prev - 1));
  const expandLater = () => setLatestHour(prev => Math.min(24, prev + 1));

  useEffect(() => {
    if (filteredAppointments.length === 0) return;
    const starts = filteredAppointments.map(a => new Date(a.datetime_start));
    const ends = filteredAppointments.map(a => new Date(a.datetime_end));
    const minHour = Math.min(...starts.map(d => d.getHours()));
    const maxHour = Math.max(...ends.map(d => d.getHours()));
    if (minHour < earliestHour) setEarliestHour(Math.max(0, minHour));
    if (maxHour >= latestHour) setLatestHour(Math.min(24, maxHour + 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAppointments]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
      return newDate;
    });
  };

  const today = new Date();
  const todaysAppointments = getAppointmentsForDay(today).sort((a,b) => new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime());

  // --- Modal Handlers ---
  const closeModal = () => {
      setActiveModal(null);
      setSelectedAppointment(null);
  };
  
  const handleAppointmentClick = (appointment: Appointment) => {
      setSelectedAppointment(appointment);
      setActiveModal('editAppointment');
  };
  // --- End Modal Handlers ---

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
      <div className="p-6 md:p-8">
        {/* Header Layout */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
            <Calendar className="h-8 w-8 mr-2 text-gray-600" />
            Appointments Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('list')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                <List className="h-4 w-4 mr-1" />
                List
              </button>
              <button onClick={() => setViewMode('calendar')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                <CalendarDays className="h-4 w-4 mr-1" />
                Calendar
              </button>
            </div>
            {/* Filters Toggle */}
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium p-2 rounded-lg hover:bg-gray-100">
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            {/* Action Buttons */}
            <Button shine variant="primary" size="md" className="flex items-center" onClick={() => setActiveModal('newAppointment')}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
            <Button shine variant="secondary" size="md" className="flex items-center" onClick={() => setActiveModal('walkin')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Walk-In
            </Button>
            
          </div>
        </div>
        
        {/* Main Grid Layout (Calendar + Sidebar) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2 flex flex-col gap-6">
            <Card className="shadow-md overflow-visible relative z-0">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 gap-4 border-b border-gray-200">
                <nav className="flex space-x-6">
                  <button onClick={() => setActiveTab('all')} className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    All
                  </button>
                  <button onClick={() => setActiveTab('active')} className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Active
                  </button>
                  <button onClick={() => setActiveTab('completed')} className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Completed
                  </button>
                  
                </nav>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => toggleStatusFilter('upcoming')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusFilters.upcoming ? 'bg-blue-100 text-blue-800 border-2 border-blue-500' : 'bg-gray-100 text-gray-400 border-2 border-gray-300'}`}>
                    Upcoming
                  </button>
                  <button onClick={() => toggleStatusFilter('inProgress')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusFilters.inProgress ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' : 'bg-gray-100 text-gray-400 border-2 border-gray-300'}`}>
                    In Progress
                  </button>
                  <button onClick={() => toggleStatusFilter('completed')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusFilters.completed ? 'bg-gray-100 text-gray-800 border-2 border-gray-500' : 'bg-gray-100 text-gray-400 border-2 border-gray-300'}`}>
                    Completed
                  </button>
                  <button onClick={() => toggleStatusFilter('cancelled')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusFilters.cancelled ? 'bg-red-100 text-red-800 border-2 border-red-500' : 'bg-gray-100 text-gray-400 border-2 border-gray-300'}`}>
                    Cancelled
                  </button>
                </div>
              </div>
              
              {showFilters && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Doctor</label>
                      <select id="doctor-filter" name="clinic_doctor_id" value={filters.clinic_doctor_id} onChange={handleFilterChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm">
                        <option value="">All Doctors</option>
                        {doctors.map(doctor => (
                          <option key={doctor.id} value={doctor.id}>{doctor.first_name} {doctor.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Patient</label>
                      <select id="patient-filter" name="patient_profile_id" value={filters.patient_profile_id} onChange={handleFilterChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm">
                        <option value="">All Patients</option>
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>
                        ))}
                      </select>
                    </div>
                    {/* --- UPDATED: Start Date Filter with DatePicker --- */}
                    <div className="relative z-30">
                      <DatePicker
                        label="Start Date"
                        value={filters.startDate ? new Date(filters.startDate) : null}
                        onChange={(date) => handleDateFilterChange('startDate', date)}
                        placeholder="Select start date"
                      />
                    </div>

                    {/* --- UPDATED: End Date Filter with DatePicker --- */}
                    <div className="relative z-30">
                      <DatePicker
                        label="End Date"
                        value={filters.endDate ? new Date(filters.endDate) : null}
                        onChange={(date) => handleDateFilterChange('endDate', date)}
                        placeholder="Select end date"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>
<div className="relative z-0">
            {/* List View / Calendar View */}
            {viewMode === 'list' ? (
              <ListView
                appointments={paginatedAppointments}
                totalAppointments={filteredAppointments.length}
                clinicTimezone={clinicTimezone}
                activeTab={activeTab}
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                onAppointmentClick={handleAppointmentClick}
                onPageChange={setCurrentPage}
              />
            ) : (
              <CalendarView
                appointments={filteredAppointments}
                weekDays={weekDays}
                earliestHour={earliestHour}
                latestHour={latestHour}
                clinicTimezone={clinicTimezone}
                calendarRef={calendarRef}
                onAppointmentClick={handleAppointmentClick}
                onNavigateWeek={navigateWeek}
                onGoToToday={() => setCurrentWeek(new Date())}
                onExpandEarlier={expandEarlier}
                onExpandLater={expandLater}
              />
            )}
          </div>
          </div>
          {/* Sidebar Column (Today's List) */}
          <div className="hidden xl:flex xl:flex-col gap-6">
            <Card padding="lg" className="shadow-lg">
              <h2 className="text-lg font-bold mb-4">
                Today's List - {today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </h2>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {todaysAppointments.length > 0 ? (
                  todaysAppointments.map(apt => {
                    const start = new Date(apt.datetime_start);
                    const statusIcon = ((): React.ReactNode => {
                      const now = new Date();
                      const s = new Date(apt.datetime_start);
                      const e = new Date(apt.datetime_end);
                      if (apt.status === 2) return <span className="text-xs font-medium text-red-600">Cancelled</span>;
                      if (apt.status === 3) return <span className="text-xs font-medium text-gray-600">Completed</span>;
                      if (now >= s && now <= e) return <span className="text-xs font-medium text-blue-600 animate-pulse">In Progress</span>;
                      if (now < s) return <span className="text-xs font-medium text-gray-500">Upcoming</span>;
                      return <span className="text-xs font-medium text-gray-600">Done</span>;
                    })();
                    
                    return (
                      <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                           onClick={() => handleAppointmentClick(apt)}>
                        <div className="w-12 text-center flex-shrink-0">
                          <p className="font-bold">{start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                          <p className="text-xs text-gray-400">{start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).split(' ')[1]}</p>
                        </div>
                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: doctorColor(apt.clinic_doctor_id ?? apt.doctor?.id).border }}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                          <p className="text-sm text-gray-600 truncate">Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}</p>
                        </div>
                        <div className="flex-shrink-0">{statusIcon}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No appointments for today.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* --- MODALS --- */}

      {activeModal === 'newAppointment' && (
        <NewAppointmentModal
          onClose={closeModal}
          onRefreshList={fetchAppointmentsData}
          clinicId={clinicId}
          clinicTimezone={clinicTimezone}
          doctors={doctors}
          patients={patients}
        />
      )}

      {activeModal === 'walkin' && (
        <WalkInModal
          onClose={closeModal}
          onRefreshList={fetchAppointmentsData}
          clinicId={clinicId}
          clinicTimezone={clinicTimezone}
          doctors={doctors}
        />
      )}
      
      {activeModal === 'editAppointment' && selectedAppointment && (
        <EditAppointmentModal
          appointment={selectedAppointment}
          onClose={closeModal}
          onRefreshList={fetchAppointmentsData}
          clinicId={clinicId}
          clinicTimezone={clinicTimezone}
          user={user}
        />
      )}
      {/* --- End Modals --- */}

    </ClinicDashboardLayout>
  );
}