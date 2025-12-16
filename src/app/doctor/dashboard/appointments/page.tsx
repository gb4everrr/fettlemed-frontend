'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import api from '@/services/api';

// UI Components
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import { Can } from '@/lib/features/auth/Can'; 
import { 
  Calendar as CalendarIcon, 
  Filter, 
  List, 
  CalendarDays, 
  MapPin 
} from 'lucide-react';
import { 
  FaStethoscope, 
  FaNotesMedical, 
  FaExchangeAlt 
} from 'react-icons/fa'; // Matching Icons from Patient View

import ListView from './ListView';
import CalendarView from './CalendarView';
import DatePicker from '@/components/ui/DatePicker';
import { Appointment, ClinicDoctor, ClinicPatient } from '@/types/clinic'; 
import { getWeekDays } from '@/lib/utils/datetime';

// Modal
import { EditAppointmentModal } from '@/components/doctor/modals/EditAppointmentModal'; 

// Helpers
import { getPermissionsForRole } from '@/config/roles'; 
import { setActivePermissions } from '@/lib/features/auth/authSlice';

// --- TYPES ---
interface ClinicContext {
  clinicId: number;
  localDoctorId: number;
  role: string;
  timezone: string;
}

interface ClinicOption {
    id: number;
    name: string;
    active: boolean;
    timezone?: string;
    role: string; // Enforce string
}

// Roles that allow seeing the full clinic schedule
const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

export default function DoctorAppointmentsPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: any) => state.auth);

  // --- 1. STATE MANAGEMENT ---
  const [context, setContext] = useState<ClinicContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  
  // Lists for Dropdowns
  const [associatedClinics, setAssociatedClinics] = useState<ClinicOption[]>([]);
  const [clinicDoctors, setClinicDoctors] = useState<ClinicDoctor[]>([]);
  const [clinicPatients, setClinicPatients] = useState<ClinicPatient[]>([]);

  // Selection State
  const [selectedClinicId, setSelectedClinicId] = useState<number>(-1); // Default to -1 (All)

  // Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // UI State
  const [viewScope, setViewScope] = useState<'my' | 'clinic'>('my');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Filters
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ 
      startDate: '', 
      endDate: '',
      clinic_doctor_id: '',
      clinic_patient_id: '' 
  });
  const [statusFilters, setStatusFilters] = useState({
      upcoming: true,
      inProgress: true,
      completed: true,
      cancelled: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modal State
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Calendar Refs
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [earliestHour, setEarliestHour] = useState<number>(8);
  const [latestHour, setLatestHour] = useState<number>(18);

  // --- 2. BOOTSTRAP LOGIC ---
  useEffect(() => {
    if (!user) return;

    const fetchClinics = async () => {
        try {
            const { data: associations } = await api.get('/doctor/my-clinics-details');
            
            if (associations && associations.length > 0) {
                const options: ClinicOption[] = associations.map((a: any) => ({
                    id: a.clinic.id,
                    name: a.clinic.name,
                    active: a.active,
                    timezone: a.clinic.timezone,
                    role: (a.assigned_role || a.role || 'DOCTOR_VISITING').toUpperCase()
                }));

                setAssociatedClinics(options);

                // Default to "All Clinics" (-1) if multiple exist, else the specific one
                if (options.length > 0) {
                    setSelectedClinicId(-1);
                }
            }
        } catch (err) {
            console.error("Failed to fetch clinic list:", err);
        } finally {
            setLoadingContext(false);
        }
    };
    fetchClinics();
  }, [user]);

  // --- 3. PERMISSION & CONTEXT LOGIC ---
  
  // Determine if the "Clinic View" toggle should be visible
  const canAccessClinicView = useMemo(() => {
      if (selectedClinicId === -1) {
          // "All Clinics": Show toggle if user is Privileged in AT LEAST ONE clinic
          return associatedClinics.some(c => PRIVILEGED_ROLES.includes(c.role));
      } else {
          // "Specific Clinic": Show toggle only if Privileged in THIS clinic
          const current = associatedClinics.find(c => c.id === selectedClinicId);
          return current ? PRIVILEGED_ROLES.includes(current.role) : false;
      }
  }, [selectedClinicId, associatedClinics]);

  // Context Switcher & Permission Hydration
  useEffect(() => {
    // Determine Effective Role for Redux
    let effectiveRole = 'DOCTOR_VISITING';
    let timezone = 'UTC';
    let localDoctorId = 0;

    if (selectedClinicId === -1) {
        // "All Clinics": Grant highest permissions possessed
        if (associatedClinics.some(c => ['OWNER', 'CLINIC_ADMIN'].includes(c.role))) {
            effectiveRole = 'CLINIC_ADMIN';
        } else if (associatedClinics.some(c => ['DOCTOR_OWNER', 'DOCTOR_PARTNER'].includes(c.role))) {
            effectiveRole = 'DOCTOR_PARTNER';
        }
    } else {
        const current = associatedClinics.find(c => c.id === selectedClinicId);
        if (current) {
            effectiveRole = current.role;
            timezone = current.timezone || 'UTC';
        }
    }

    // Hydrate Redux
    const perms = getPermissionsForRole(effectiveRole);
    dispatch(setActivePermissions(perms));

    // Update Context State
    setContext({
        clinicId: selectedClinicId,
        localDoctorId, // Note: ID logic is complex in mixed view, defaults to 0
        role: effectiveRole,
        timezone
    });

    // Safety: Reset scope if switching to restricted context
    if (!canAccessClinicView && viewScope === 'clinic') {
        setViewScope('my');
    }

    // Fetch filters (Doctors/Patients) only for specific clinics
    if (selectedClinicId !== -1) {
        // ... (Existing logic to fetch doctors/patients for dropdowns) ...
        // Keeping it simple for this snippet, reusing your previous logic or can be added back
    }

  }, [selectedClinicId, associatedClinics, dispatch, canAccessClinicView, viewScope]);


  // --- 4. DATA FETCHING (Hybrid Strategy) ---
  const fetchAppointments = async () => {
    if (associatedClinics.length === 0) return;
    
    setIsLoadingData(true);
    let finalData: Appointment[] = [];

    try {
        // A. ALWAYS fetch "My Appointments" (Global Personal Data)
        const myApptsResponse = await api.get('/doctor/my-appointments-details');
        
        // FIX FOR MY VIEW: Inject the current User as the Doctor if missing
        const myAppts = myApptsResponse.data.map((appt: any) => ({
            ...appt,
            // If API doesn't return doctor object, use the logged-in user profile
            doctor: appt.doctor || { 
                id: user.id, 
                first_name: user.first_name, 
                last_name: user.last_name 
            }
        }));

        // B. Handle Scope Logic
        if (viewScope === 'my') {
            // Filter "My Global List" by selected context
            finalData = myAppts.filter((a: Appointment) => 
                selectedClinicId === -1 ? true : a.clinic_id === selectedClinicId
            );
        } 
        else if (viewScope === 'clinic') {
            // --- HYBRID FETCH ---
            const targetClinics = selectedClinicId === -1 
                ? associatedClinics 
                : associatedClinics.filter(c => c.id === selectedClinicId);

            const fetchPromises = targetClinics.map(async (clinic) => {
                const isPrivileged = PRIVILEGED_ROLES.includes(clinic.role);

                if (isPrivileged) {
                    // 1. Has Permission -> Fetch Full Schedule from Admin API
                    try {
                        const res = await api.get('/appointments', { 
                            params: { 
                                clinic_id: clinic.id,
                                startDate: filters.startDate,
                                endDate: filters.endDate
                            } 
                        });
                        
                        // FIX FOR CLINIC VIEW: Inject the Clinic details
                        // The admin API is scoped to a clinic, so it often omits the clinic object.
                        // We manually attach it here so the UI can display it.
                        return res.data.map((appt: any) => ({
                            ...appt,
                            clinic: appt.clinic || {
                                id: clinic.id,
                                name: clinic.name,
                                timezone: clinic.timezone
                            }
                        }));

                    } catch (e) {
                        console.warn(`Schedule fetch failed for ${clinic.name}`, e);
                        return [];
                    }
                } else {
                    // 2. No Permission (Visiting) -> Fallback to My Appointments for this clinic
                    return myAppts.filter((a: Appointment) => a.clinic_id === clinic.id);
                }
            });

            const results = await Promise.all(fetchPromises);
            finalData = results.flat();
        }

        // C. Deduplication & Sorting
        const uniqueMap = new Map();
        finalData.forEach(item => uniqueMap.set(item.id, item));
        const uniqueData = Array.from(uniqueMap.values()) as Appointment[];

        const sorted = uniqueData.sort((a, b) => 
            new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime()
        );

        setAppointments(sorted);

    } catch (error) {
        console.error("Error fetching appointments:", error);
    } finally {
        setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loadingContext) fetchAppointments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingContext, selectedClinicId, viewScope, filters]); 

  // --- 5. CLIENT SIDE FILTERING ---
  const getFilteredAppointments = () => {
    const now = new Date();
    let filtered = appointments;

    // Tab Logic
    if (activeTab === 'active') {
      filtered = filtered.filter(apt => {
        const endTime = new Date(apt.datetime_end);
        return endTime >= now && apt.status !== 2 && apt.status !== 3;
      });
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(apt => {
        const endTime = new Date(apt.datetime_end);
        return endTime < now || apt.status === 2 || apt.status === 3;
      });
    }

    // Status Chip Logic
    filtered = filtered.filter(apt => {
      const isCancelled = apt.status === 2;
      const isCompleted = apt.status === 3; 
      const isUpcoming = new Date(apt.datetime_start) > now && !isCancelled && !isCompleted;
      const isInProgress = new Date(apt.datetime_start) <= now && new Date(apt.datetime_end) >= now && !isCancelled && !isCompleted;

      if (isCancelled && !statusFilters.cancelled) return false;
      if (isUpcoming && !statusFilters.upcoming) return false;
      if (isInProgress && !statusFilters.inProgress) return false;
      if (isCompleted && !statusFilters.completed) return false;
      
      return true;
    });

    // Client-side Doctor/Patient Filter (if filters set)
    if (filters.clinic_patient_id) {
        filtered = filtered.filter((a: any) => String(a.clinic_patient_id) === filters.clinic_patient_id);
    }

    return filtered;
  };

  const filteredList = getFilteredAppointments();
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  // --- HANDLERS ---
  const handleAppointmentClick = (appt: Appointment) => {
      setSelectedAppointment(appt);
      setIsEditModalOpen(true);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  const toggleStatusFilter = (key: keyof typeof statusFilters) => {
      setStatusFilters(prev => ({...prev, [key]: !prev[key]}));
  };

  // --- RENDER ---
  if (loadingContext) {
      return <DoctorDashboardLayout><div className="h-screen flex items-center justify-center text-gray-500">Loading Clinics...</div></DoctorDashboardLayout>;
  }

  const weekDays = getWeekDays(currentWeek);
  
  // Resolve current display name
  const currentContextName = selectedClinicId === -1 
      ? "All Associated Clinics" 
      : associatedClinics.find(c => c.id === selectedClinicId)?.name || "Unknown Clinic";

  return (
    <DoctorDashboardLayout>
      <div className="p-6 md:p-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center mb-2">
                <CalendarIcon className="h-8 w-8 mr-2 text-gray-600" />
                Appointments
            </h1>
            <p className="text-sm text-gray-500 font-inter ml-10">
                Viewing schedule for <span className="font-semibold text-(--color-primary-brand)">{currentContextName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             
            {/* 1. CLINIC SELECTOR */}
            {associatedClinics.length > 0 && (
                <div className="relative min-w-[200px]">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select 
                        className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-9 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm h-10"
                        value={selectedClinicId}
                        onChange={(e) => {
                            setSelectedClinicId(Number(e.target.value));
                            setViewScope('my'); // Reset to My View on switch
                        }}
                    >
                        <option value={-1}>All Clinics</option>
                        <option disabled>──────────</option>
                        {associatedClinics.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <FaExchangeAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs" />
                </div>
            )}

             {/* 2. VIEW SCOPE TOGGLE (RBAC GATED) */}
             {canAccessClinicView && (
               <Can perform="view_all_schedule"> 
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 h-10 shadow-sm">
                  <button
                    onClick={() => setViewScope('my')}
                    className={`flex items-center px-3 h-full rounded-md text-sm font-medium transition-all gap-2 ${
                      viewScope === 'my' 
                      ? 'bg-(--color-primary-brand) text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <FaStethoscope /> My View
                  </button>
                  <button
                    onClick={() => setViewScope('clinic')}
                    className={`flex items-center px-3 h-full rounded-md text-sm font-medium transition-all gap-2 ${
                      viewScope === 'clinic' 
                      ? 'bg-(--color-primary-brand) text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <FaNotesMedical /> Clinic View
                  </button>
                </div>
               </Can>
             )}

            {/* 3. VIEW MODE TOGGLE */}
            <div className="flex h-10 items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <button 
                  onClick={() => setViewMode('list')} 
                  className={`flex items-center justify-center h-full px-3 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-(--color-primary-brand) text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                  <List className="h-4 w-4" />
              </button>
              <button 
                  onClick={() => setViewMode('calendar')} 
                  className={`flex items-center justify-center h-full px-3 rounded-md transition-colors ${
                      viewMode === 'calendar' ? 'bg-(--color-primary-brand) text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                  <CalendarDays className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* FILTERS CARD */}
        <Card className="shadow-md mb-6 relative z-10">
           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border-b border-gray-200 gap-4">
                <nav className="flex space-x-6">
                  <button onClick={() => setActiveTab('active')} className={`pb-2 border-b-2 font-medium text-sm ${activeTab === 'active' ? 'border-(--color-primary-brand) text-(--color-primary-brand)' : 'border-transparent text-gray-500'}`}>Active</button>
                  <button onClick={() => setActiveTab('all')} className={`pb-2 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-(--color-primary-brand) text-(--color-primary-brand)' : 'border-transparent text-gray-500'}`}>All</button>
                  <button onClick={() => setActiveTab('completed')} className={`pb-2 border-b-2 font-medium text-sm ${activeTab === 'completed' ? 'border-(--color-primary-brand) text-(--color-primary-brand)' : 'border-transparent text-gray-500'}`}>History</button>
                </nav>
                
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => toggleStatusFilter('upcoming')} className={`px-3 py-1 rounded-full text-xs font-semibold ${statusFilters.upcoming ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>Upcoming</button>
                    <button onClick={() => toggleStatusFilter('inProgress')} className={`px-3 py-1 rounded-full text-xs font-semibold ${statusFilters.inProgress ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>In Progress</button>
                    <button onClick={() => toggleStatusFilter('completed')} className={`px-3 py-1 rounded-full text-xs font-semibold ${statusFilters.completed ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>Completed</button>
                    <button onClick={() => toggleStatusFilter('cancelled')} className={`px-3 py-1 rounded-full text-xs font-semibold ${statusFilters.cancelled ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>Cancelled</button>
                </div>
           </div>

           <div className="p-4">
                <button onClick={() => setShowFilters(!showFilters)} className="flex items-center text-sm text-gray-600 font-medium mb-4">
                    <Filter className="h-4 w-4 mr-2" /> {showFilters ? 'Hide Filters' : 'Show Advanced Filters'}
                </button>
                
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Only show Doctor filter if looking at a specific clinic's full view */}
                        {viewScope === 'clinic' && selectedClinicId !== -1 && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Doctor</label>
                                <select 
                                    name="clinic_doctor_id" 
                                    value={filters.clinic_doctor_id} 
                                    onChange={handleFilterChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                                >
                                    <option value="">All Doctors</option>
                                    {clinicDoctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.first_name} {doc.last_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Patient</label>
                            <select 
                                name="clinic_patient_id" 
                                value={filters.clinic_patient_id} 
                                onChange={handleFilterChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-(--color-primary-brand) focus:ring-(--color-primary-brand) p-2 text-sm"
                            >
                                <option value="">All Patients</option>
                                {clinicPatients.map(p => (
                                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                ))}
                            </select>
                        </div>
                        <DatePicker
                            label="Start Date"
                            value={filters.startDate ? new Date(filters.startDate) : null}
                            onChange={(d) => setFilters(prev => ({...prev, startDate: d.toISOString().split('T')[0]}))}
                        />
                        <DatePicker
                            label="End Date"
                            value={filters.endDate ? new Date(filters.endDate) : null}
                            onChange={(d) => setFilters(prev => ({...prev, endDate: d.toISOString().split('T')[0]}))}
                        />
                    </div>
                )}
           </div>
        </Card>

        {/* CONTENT */}
        <div className="relative z-0">
            {isLoadingData ? (
                <div className="p-12 text-center text-gray-500">Loading schedule...</div>
            ) : filteredList.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No appointments found matching your criteria.</p>
                </div>
            ) : viewMode === 'list' ? (
                <ListView
                    appointments={paginatedList}
                    totalAppointments={filteredList.length}
                    clinicTimezone={context?.timezone || 'UTC'}
                    activeTab={activeTab}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    onAppointmentClick={handleAppointmentClick}
                    onPageChange={setCurrentPage}
                />
            ) : (
                <CalendarView
                    appointments={filteredList}
                    weekDays={weekDays}
                    earliestHour={earliestHour}
                    latestHour={latestHour}
                    clinicTimezone={context?.timezone || 'UTC'}
                    calendarRef={calendarRef}
                    onAppointmentClick={handleAppointmentClick}
                    onNavigateWeek={(d) => setCurrentWeek(prev => {
                        const n = new Date(prev); n.setDate(prev.getDate() + (d === "next" ? 7 : -7)); return n;
                    })}
                    onGoToToday={() => setCurrentWeek(new Date())}
                    onExpandEarlier={() => setEarliestHour(h => Math.max(0, h - 1))}
                    onExpandLater={() => setLatestHour(h => Math.min(24, h + 1))}
                />
            )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedAppointment && context && (
        <EditAppointmentModal
            appointment={selectedAppointment}
            onClose={() => {
                setIsEditModalOpen(false);
                setSelectedAppointment(null);
            }}
            onRefreshList={fetchAppointments}
            
            // Dynamic resolution for "All Clinics" Mode:
            // Pass the specific appointment's clinic ID, not the generic -1
            clinicId={context.clinicId === -1 ? ((selectedAppointment as any).clinic_id) : context.clinicId}
            
            clinicName={
                associatedClinics.find(c => 
                    c.id === (context.clinicId === -1 ? (selectedAppointment as any).clinic_id : context.clinicId)
                )?.name || 'Medical Clinic'
            }
            
            clinicTimezone={context.timezone}
            user={user}
            role={context.role}
        />
      )}
    </DoctorDashboardLayout>
  );
}