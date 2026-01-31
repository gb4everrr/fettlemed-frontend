// src/app/clinic-admin/dashboard/appointments/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import {
  Plus,
  Calendar,
  LayoutGrid,
  CheckSquare,
  Clock,
  List,
  CalendarDays,
  UserPlus,
  MoreHorizontal,
  ListCheck,
  FolderClock,
  CalendarCheck,
  CalendarArrowUp,
  CalendarFold
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

// --- HELPER: Get Date Object shifted to Clinic Timezone ---
const getClinicDateString = (date: Date | string, timeZone: string) => {
  return new Date(date).toLocaleDateString('en-CA', { timeZone }); // Returns YYYY-MM-DD
};

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

  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all' | 'queue'>('queue');
  
  // Secondary filters for the "Active" tab
  const [statusFilters, setStatusFilters] = useState({
    upcoming: true,
    inProgress: true,
    completed: true,
    cancelled: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekDays = getWeekDays(currentWeek);

  const [earliestHour, setEarliestHour] = useState<number>(8);
  const [latestHour, setLatestHour] = useState<number>(18);

  const calendarRef = useRef<HTMLDivElement | null>(null);

  // --- Modal State ---
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleCheckIn = async (appointmentId: number) => {
    try {
      await api.put(`/appointments/${appointmentId}/check-in`, { 
        clinic_id: clinicId 
      });
      fetchAppointmentsData(); 
    } catch (error) {
      console.error("Failed to check in patient:", error);
    }
  };

  // Encapsulated fetch logic
  const fetchAppointmentsData = async () => {
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
        const response = await api.get(`/clinic/${clinicId}`, { 
          params: { clinic_id: clinicId } 
        });
        if (response.data?.timezone) {
          setClinicTimezone(response.data.timezone);
        }
      } catch (err) {
        console.error("Failed to fetch clinic details", err);
      }
    };

    fetchDoctors();
    fetchPatients();
    fetchClinicDetails();
    fetchAppointmentsData();
  }, [user, clinicId]);

  // Handle Tab Switching
  const handleTabChange = (tab: 'active' | 'completed' | 'all' | 'queue') => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === 'queue') setViewMode('list');
  };

  const handleDateFilterChange = (key: 'startDate' | 'endDate', date: Date) => {
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

    // --- TAB LOGIC ---
    if (activeTab === 'queue') {
       const clinicTodayStr = getClinicDateString(new Date(), clinicTimezone);
       filtered = appointments.filter(apt => {
          const apptDate = getClinicDateString(apt.datetime_start, clinicTimezone);
          const isToday = apptDate === clinicTodayStr;
          const isNotDone = apt.status !== 2 && apt.status !== 3; 
          return isToday && isNotDone;
       });
    } else if (activeTab === 'active') {
        filtered = filtered.filter(apt => {
            const start = new Date(apt.datetime_start);
            const end = new Date(apt.datetime_end);
            
            const status = (() => {
              if (apt.status === 2) return { key: 'cancelled' };
              if (apt.status === 3) return { key: 'completed' };
              if (now < start) return { key: 'upcoming' };
              if (now >= start && now <= end) return { key: 'inProgress' };
              return { key: 'completed' }; // Fallback
            })();

            return statusFilters[status.key as keyof typeof statusFilters];
        });
    } else if (activeTab === 'completed') {
        filtered = filtered.filter(apt => apt.status === 3);
    }

    // --- COMMON FILTERS ---
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(apt => new Date(apt.datetime_start) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23,59,59,999);
      filtered = filtered.filter(apt => new Date(apt.datetime_start) <= end);
    }

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();
  
  // Get Today's Appointments for the sidebar (regardless of tab)
  const todaysAppointments = appointments.filter(apt => {
    const clinicTodayStr = getClinicDateString(new Date(), clinicTimezone);
    const apptDate = getClinicDateString(apt.datetime_start, clinicTimezone);
    return apptDate === clinicTodayStr;
  });

  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const closeModal = () => {
    setActiveModal(null);
    setSelectedAppointment(null);
  };

  if (isLoading) {
    return (
      <ClinicDashboardLayout>
         <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500 text-lg font-inter">Loading appointments...</p>
         </div>
      </ClinicDashboardLayout>
    );
  }

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8 space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
            <Calendar className="h-8 w-8 mr-2 text-gray-600" />
            Appointments Dashboard
          </h1>
          
          <div className="flex gap-3">
             <Button variant="outline" onClick={() => setActiveModal('walkin')} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Walk-In
             </Button>
             <Button variant="primary" onClick={() => setActiveModal('newAppointment')} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> New Appointment
             </Button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center space-x-2 border-b border-gray-200 w-full overflow-x-auto">
            <button
                onClick={() => handleTabChange('queue')}
                className={`
                    flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all duration-200 text-sm whitespace-nowrap
                    ${activeTab === 'queue' 
                        ? 'border-primary-brand text-primary-brand bg-primary-light/10' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                `}
            >
                <ListCheck className="h-4 w-4" />
                <span>Live Queue</span>
                <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${activeTab === 'queue' ? 'bg-primary-brand text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Today
                </span>
            </button>

            <button
                onClick={() => handleTabChange('active')}
                className={`
                    flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all duration-200 text-sm whitespace-nowrap
                    ${activeTab === 'active' 
                        ? 'border-gray-800 text-gray-900' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                `}
            >
                <CalendarArrowUp className="h-4 w-4" />
                <span>Active</span>
            </button>

            <button
                onClick={() => handleTabChange('completed')}
                className={`
                    flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all duration-200 text-sm whitespace-nowrap
                    ${activeTab === 'completed' 
                        ? 'border-gray-800 text-gray-900' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                `}
            >
                <CalendarCheck className="h-4 w-4" />
                <span>Completed</span>
            </button>

            <button
                onClick={() => handleTabChange('all')}
                className={`
                    flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all duration-200 text-sm whitespace-nowrap
                    ${activeTab === 'all' 
                        ? 'border-gray-800 text-gray-900' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                `}
            >
                <CalendarFold className="h-4 w-4" />
                <span>All</span>
            </button>
        </div>

        {/* SUB-FILTERS (Toolbar) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 p-2 rounded-xl">
                {/* VIEW MODE */}
                <div className="flex bg-gray-200/50 rounded-lg p-1">
                <button 
                    onClick={() => setViewMode('list')} 
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List className="h-4 w-4 mr-1" /> List
                </button>
                <button 
                    onClick={() => setViewMode('calendar')} 
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CalendarDays className="h-4 w-4 mr-1" /> Calendar
                </button>
            </div>

            {/* CONDITIONAL SUB-FILTERS (Only for Active Tab) */}
            {activeTab === 'active' && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => toggleStatusFilter('upcoming')} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${statusFilters.upcoming ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}>Upcoming</button>
                    <button onClick={() => toggleStatusFilter('inProgress')} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${statusFilters.inProgress ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200'}`}>In Progress</button>
                    <button onClick={() => toggleStatusFilter('cancelled')} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${statusFilters.cancelled ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200'}`}>Cancelled</button>
                </div>
            )}
            
            {/* DATE FILTERS (For History) */}
            {(activeTab === 'all' || activeTab === 'completed') && (
     <div className="flex gap-2 items-center">
         <div className="w-36">
             <DatePicker 
                value={filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null} 
                onChange={(date) => handleDateFilterChange('startDate', date)}
                placeholder="Start Date"
             />
         </div>
         <span className="text-gray-400 self-center">-</span>
         <div className="w-36">
             <DatePicker 
                value={filters.endDate ? new Date(filters.endDate + 'T00:00:00') : null} 
                onChange={(date) => handleDateFilterChange('endDate', date)}
                placeholder="End Date"
             />
         </div>
     </div>
)}
        </div>

        {/* MAIN LAYOUT: 2 COLUMNS (Left Main, Right Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 ">
            
            {/* LEFT: MAIN LIST / CALENDAR */}
            <div className="lg:col-span-8">
                {viewMode === 'list' ? (
                    <ListView 
                        appointments={paginatedAppointments}
                        doctors={doctors}
                        totalAppointments={filteredAppointments.length}
                        clinicTimezone={clinicTimezone}
                        activeTab={activeTab}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        onAppointmentClick={setSelectedAppointment}
                        onPageChange={setCurrentPage}
                        onCheckIn={handleCheckIn}
                    />
                ) : (
                    <CalendarView 
                        appointments={filteredAppointments}
                        weekDays={weekDays}
                        earliestHour={earliestHour}
                        latestHour={latestHour}
                        clinicTimezone={clinicTimezone}
                        calendarRef={calendarRef}
                        onAppointmentClick={setSelectedAppointment}
                        onNavigateWeek={(dir) => {
                            const days = dir === 'prev' ? -7 : 7;
                            setCurrentWeek(new Date(currentWeek.setDate(currentWeek.getDate() + days)));
                        }}
                        onGoToToday={() => setCurrentWeek(new Date())}
                        onExpandEarlier={() => setEarliestHour(Math.max(0, earliestHour - 1))}
                        onExpandLater={() => setLatestHour(Math.min(24, latestHour + 1))}
                    />
                )}
            </div>

            {/* RIGHT: TODAY'S SCHEDULE SIDEBAR */}
           
                 <Card className=" lg:col-span-4 space-y-4h-full max-h-[800px] overflow-hidden flex flex-col border-gray-200 shadow-sm rounded-xl">
                     <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-xl">
                         <h3 className="font-bold text-gray-800 flex items-center gap-2 rounded-xl">
                             <CalendarDays className="h-4 w-4 text-primary-brand" />
                             Today's Schedule
                         </h3>
                         <span className="text-xs font-semibold bg-white border px-2 py-1 rounded-full text-gray-500">
                             {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}
                         </span>
                     </div>
                     
                     <div className="p-0 overflow-y-auto flex-1 custom-scrollbar rounded-xl">
                         {todaysAppointments.length === 0 ? (
                             <div className="p-8 text-center text-gray-500">
                                 <p>No appointments today.</p>
                             </div>
                         ) : (
                             <div className="divide-y divide-gray-100">
                                 {todaysAppointments.map(app => {
                                     const startTime = new Date(app.datetime_start).toLocaleTimeString('en-US', { timeZone: clinicTimezone, hour: 'numeric', minute:'2-digit' });
                                     const isCompleted = app.status === 3;
                                     const isCancelled = app.status === 2;
                                     
                                     return (
                                         <div key={app.id} className="p-3 hover:bg-gray-50 flex gap-3 items-center group cursor-pointer" onClick={() => setSelectedAppointment(app)}>
                                             <div className={`
                                                 w-16 text-center text-xs font-bold py-1 rounded 
                                                 ${isCompleted ? 'bg-green-100 text-green-700' : isCancelled ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
                                             `}>
                                                 {startTime}
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                 <div className="text-sm font-semibold text-gray-800 truncate">
                                                     {app.patient?.first_name} {app.patient?.last_name}
                                                 </div>
                                                 <div className="text-xs text-gray-500 truncate">
                                                     Dr. {app.doctor?.last_name}
                                                 </div>
                                             </div>
                                             <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 px-2">
                                                 <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                             </Button>
                                         </div>
                                     )
                                 })}
                             </div>
                         )}
                     </div>
                     
                     <div className="p-3 bg-gray-50 border-t border-gray-100 text-center rounded-xl mt-10">
                         <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab('queue')}>
                            View Full Queue
                         </Button>
                     </div>
                 </Card>
            

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
        
        {/* Simple details modal if clicking item in list without edit permission */}
        {!activeModal && selectedAppointment && (
            <EditAppointmentModal
                appointment={selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                onRefreshList={fetchAppointmentsData}
                clinicId={clinicId}
                clinicTimezone={clinicTimezone}
                user={user}
            />
        )}

      </div>
    </ClinicDashboardLayout>
  );
}