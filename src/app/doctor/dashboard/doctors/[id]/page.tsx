// src/app/doctor/dashboard/directory/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
    Calendar, 
    Clock, 
    ArrowLeft, 
    Building2,
    Mail,
    Phone,
    MapPin,
    Hash,
    List,
    CalendarDays,
} from 'lucide-react';
import { startOfWeek, endOfWeek, format, addDays, startOfDay, endOfDay } from 'date-fns';

import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// --- CORRECT IMPORTS (Based on your page.tsx) ---
import CalendarView from '@/app/doctor/dashboard/appointments/CalendarView';
import ListView from '@/app/doctor/dashboard/appointments/ListView';

// --- Modals ---
import { EditAppointmentModal } from '@/components/doctor/modals/EditAppointmentModal';
import { EditDoctorModal } from '@/components/doctor/modals/EditDoctorModal';
import { DoctorAvailabilityModal } from '@/components/doctor/modals/DoctorAvailabilityModal';
import { DoctorExceptionsModal } from '@/components/doctor/modals/DoctorExceptionsModal';

import { Appointment } from '@/types/clinic'; 

// --- Interfaces ---
interface ClinicDoctor {
    id: number;
    clinic_id: number;
    global_doctor_id: number | null;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    address: string;
    medical_reg_no: string;
    specialization: string;
    started_date: string;
    active: boolean;
    role?: string;
    registration_status?: 'REGISTERED' | 'PENDING';
}

interface ClinicContext {
    clinic_id: number;
    clinic_name: string;
    role: string;
    timezone?: string;
}

const ALLOWED_ROLES = ['DOCTOR_OWNER', 'DOCTOR_PARTNER', 'OWNER'];

// --- Helpers ---
const getRoleLabel = (role?: string) => {
    switch (role) {
        case 'DOCTOR_OWNER': return 'Owner & Doctor';
        case 'DOCTOR_PARTNER': return 'Partner';
        case 'DOCTOR_VISITING': return 'Visiting Consultant';
        default: return 'Doctor';
    }
};

const getRoleBadgeColor = (role?: string) => {
    switch (role) {
        case 'DOCTOR_OWNER': return 'bg-purple-100 text-purple-800 border border-purple-200';
        case 'DOCTOR_PARTNER': return 'bg-blue-100 text-blue-800 border border-blue-200';
        case 'DOCTOR_VISITING': return 'bg-gray-100 text-gray-800 border border-gray-200';
        default: return 'bg-teal-50 text-teal-700 border border-teal-100';
    }
};

const getStatusBadge = (status?: string) => {
    if (status === 'PENDING') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 uppercase tracking-wide ml-2">
                Pending Registration
            </span>
        );
    }
    return null;
};

export default function DoctorDetailsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const doctorId = Number(params.id);
    const contextClinicId = searchParams.get('clinic_id') ? Number(searchParams.get('clinic_id')) : null;

    // --- Core Data State ---
    const [doctor, setDoctor] = useState<ClinicDoctor | null>(null);
    const [clinicInfo, setClinicInfo] = useState<ClinicContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'appointments'>('profile'); 

    // --- Appointment State ---
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    
    // Calendar specific state
    const [weekDays, setWeekDays] = useState<Date[]>([]);
    const calendarRef = useRef<HTMLDivElement>(null);

    // List specific state (Pagination & Tabs)
    const [listTab, setListTab] = useState<'active' | 'completed' | 'all'>('active');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalAppointments, setTotalAppointments] = useState(0);
    const ITEMS_PER_PAGE = 10;

    // --- Modals State ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

     const [earliestHour, setEarliestHour] = useState<number>(8);
    const [latestHour, setLatestHour] = useState<number>(18);

    // =================================================================================
    // 1. FETCH DOCTOR DETAILS & PERMISSIONS
    // =================================================================================
    const fetchDoctorDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!contextClinicId) {
                throw new Error("Missing clinic context. Please access this page from the directory.");
            }

            // 1. Fetch Doctor Details
            const doctorRes = await api.get(`/clinic-user/clinic-doctor/${doctorId}`, {
                params: { clinic_id: contextClinicId }
            });
            const doctorData: ClinicDoctor = doctorRes.data;

            // 2. Fetch My Clinics (to verify role and get clinic name/timezone)
            const clinicsRes = await api.get('/doctor/my-clinics-details');
            const myClinics: ClinicContext[] = clinicsRes.data.map((item: any) => ({
                clinic_id: item.clinic.id,
                clinic_name: item.clinic.name,
                // CHANGED: Default to UTC instead of Asia/Kolkata
                timezone: item.clinic.timezone || 'UTC',
                role: (item.assigned_role || item.role || '').toUpperCase()
            }));

            // 3. Verify Permission Locally
            const currentClinic = myClinics.find(c => c.clinic_id === contextClinicId);

            if (!currentClinic || !ALLOWED_ROLES.includes(currentClinic.role)) {
                throw new Error("You do not have permission to manage doctors in this clinic.");
            }

            setDoctor(doctorData);
            setClinicInfo(currentClinic);

        } catch (err: any) {
            console.error("Fetch Error:", err);
            if (err.response?.status === 404) {
                setError("Doctor not found. Please check if the ID is correct.");
            } else if (err.response?.status === 403) {
                setError("You are not authorized to view this profile.");
            } else {
                setError(err.message || "Failed to load doctor details.");
            }
        } finally {
            setLoading(false);
        }
    };

    // =================================================================================
    // 2. FETCH APPOINTMENTS
    // =================================================================================
    // Calculate week days whenever currentDate changes
    useEffect(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
        setWeekDays(days);
    }, [currentDate]);

    const fetchDoctorAppointments = async () => {
        if (!contextClinicId || !doctorId || !clinicInfo) return;

        try {
            setLoadingAppointments(true);
            
            // Logic Split: Calendar vs List
            if (viewMode === 'calendar') {
                const startStr = format(weekDays[0] || startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const endStr = format(weekDays[6] || endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                
                // CORRECT API ENDPOINT from your page.tsx
                const response = await api.get('/appointments', {
                    params: {
                        clinic_id: contextClinicId,
                        doctor_id: doctorId, 
                        startDate: startStr, // camelCase as per your file
                        endDate: endStr      // camelCase as per your file
                    }
                });

                // Helper: Inject clinic info if missing (Common issue with Admin APIs)
                const safeData = response.data.map((appt: any) => ({
                    ...appt,
                    clinic: appt.clinic || {
                        id: contextClinicId,
                        name: clinicInfo.clinic_name,
                        timezone: clinicInfo.timezone
                    }
                }));

                setAppointments(safeData);
            } else {
                // List View (Paginated)
                // Using standard admin endpoint with pagination parameters
                const response = await api.get('/appointments', { 
                    params: {
                        clinic_id: contextClinicId,
                        doctor_id: doctorId,
                        page: page,
                        limit: ITEMS_PER_PAGE,
                        status_category: listTab // 'active' | 'completed' | 'all'
                    }
                });
                
                // Handling paginated response structure
                if (response.data.data) {
                    setAppointments(response.data.data);
                    setTotalAppointments(response.data.total || 0);
                    setTotalPages(response.data.last_page || 1);
                } else {
                    setAppointments(response.data); // Fallback
                }
            }
            
        } catch (error) {
            console.error("Failed to fetch appointments", error);
            setAppointments([]); 
        } finally {
            setLoadingAppointments(false);
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (doctorId && contextClinicId) {
            fetchDoctorDetails();
        }
    }, [doctorId, contextClinicId]);

    useEffect(() => {
        if (activeTab === 'appointments' && !loading && contextClinicId && weekDays.length > 0) {
            fetchDoctorAppointments();
        }
    }, [activeTab, currentDate, viewMode, listTab, page, weekDays, contextClinicId, doctorId]);


    // =================================================================================
    // 3. HANDLERS
    // =================================================================================
    const handleAppointmentClick = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setIsAppointmentModalOpen(true);
    };

    const handleNavigateWeek = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => addDays(prev, direction === 'prev' ? -7 : 7));
    };

    const handleGoToToday = () => {
        setCurrentDate(new Date());
    };

    // =================================================================================
    // 4. RENDER
    // =================================================================================
    
    if (loading) {
        return (
            <DoctorDashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <LoadingSpinner />
                </div>
            </DoctorDashboardLayout>
        );
    }

    if (error || !doctor || !clinicInfo) {
        return (
            <DoctorDashboardLayout>
                <div className="p-8 max-w-2xl mx-auto mt-10 text-center">
                    <Card padding="lg" className="border-red-100 bg-red-50">
                        <div className="text-red-500 text-xl font-bold mb-2">Access Denied</div>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Button variant="outline" onClick={() => router.back()}>
                            Go Back
                        </Button>
                    </Card>
                </div>
            </DoctorDashboardLayout>
        );
    }

    return (
        <DoctorDashboardLayout>
            <div className="p-6 md:p-8 font-inter">

                {/* --- Header Section --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden relative border-2 border-white shadow-sm">
                            <Image src="/images/Doctor.png" alt="Dr" fill className="object-cover" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                Dr. {doctor.first_name} {doctor.last_name}
                            </h1>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded border border-blue-100 font-semibold">
                                    {doctor.specialization}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${getRoleBadgeColor(doctor.role)}`}>
                                    {getRoleLabel(doctor.role)}
                                </span>
                                {getStatusBadge(doctor.registration_status)}
                                <span className="text-xs text-gray-500 flex items-center gap-1 ml-2 border-l pl-2 border-gray-300">
                                    <Building2 className="w-3 h-3" /> {clinicInfo.clinic_name}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" shine size="md" onClick={() => setIsAvailabilityModalOpen(true)}>
                            Manage Availability
                        </Button>
                        <Button variant="secondary" shine size="md" onClick={() => setIsExceptionsModalOpen(true)}>
                            Exceptions
                        </Button>
                        <Button variant="primary" size="md" shine onClick={() => setIsEditModalOpen(true)}>
                            Edit Profile
                        </Button>
                    </div>
                </div>

                {/* --- Tabs --- */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button 
                        onClick={() => setActiveTab('profile')} 
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Profile Details
                    </button>
                    <button 
                        onClick={() => setActiveTab('appointments')} 
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'appointments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Appointments
                    </button>
                </div>

                {/* --- Content: Profile Tab --- */}
                {activeTab === 'profile' && (
                    <Card padding="lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                    <Mail className="w-3 h-3" /> Email
                                </label>
                                <p className="font-medium text-gray-900">{doctor.email}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                    <Phone className="w-3 h-3" /> Phone
                                </label>
                                <p className="font-medium text-gray-900">{doctor.phone_number}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                    <Hash className="w-3 h-3" /> Medical Reg. No
                                </label>
                                <p className="font-medium text-gray-900">{doctor.medical_reg_no}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Started Date</label>
                                <p className="font-medium text-gray-900">{new Date(doctor.started_date).toLocaleDateString()}</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                    <MapPin className="w-3 h-3" /> Address
                                </label>
                                <p className="font-medium text-gray-900">{doctor.address || 'N/A'}</p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* --- Content: Appointments Tab --- */}
                {activeTab === 'appointments' && (
                     <Card className="min-h-[600px] flex flex-col p-0 overflow-hidden">
                        {/* Appointment Toolbar */}
                        <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-200 bg-gray-50 gap-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex">
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                            viewMode === 'calendar' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <CalendarDays className="w-4 h-4" />
                                        Weekly
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                            viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <List className="w-4 h-4" />
                                        List
                                    </button>
                                </div>
                                
                                {viewMode === 'calendar' && (
                                    <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 px-2 py-1">
                                        <button onClick={() => handleNavigateWeek('prev')} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                                            ←
                                        </button>
                                        <span className="mx-3 text-sm font-medium text-gray-700 min-w-[140px] text-center">
                                            {weekDays.length > 0 && 
                                                `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`
                                            }
                                        </span>
                                        <button onClick={() => handleNavigateWeek('next')} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                                            →
                                        </button>
                                    </div>
                                )}

                                {viewMode === 'list' && (
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex">
                                        {(['active', 'completed', 'all'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => { setListTab(tab); setPage(1); }}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                                                    listTab === tab ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Appointment Views */}
                        <div className="flex-1 overflow-auto bg-white relative">
                            {loadingAppointments ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                                    <LoadingSpinner />
                                </div>
                            ) : (
                                <>
                                    {viewMode === 'calendar' ? (
                                        <div className="h-full min-w-[800px]">
                                            <CalendarView 
                                                appointments={appointments}
                                                weekDays={weekDays}
                                                earliestHour={earliestHour}
                                                latestHour={latestHour}
                                                // CHANGED: Force UTC fallback
                                                clinicTimezone={clinicInfo.timezone || 'UTC'}
                                                calendarRef={calendarRef}
                                                onAppointmentClick={handleAppointmentClick}
                                                onNavigateWeek={handleNavigateWeek}
                                                onGoToToday={handleGoToToday}
                                                onExpandEarlier={() => setEarliestHour(h => Math.max(0, h - 1))}
                                                onExpandLater={() => setLatestHour(h => Math.min(24, h + 1))}
                                            />
                                        </div>
                                    ) : (
                                        <ListView 
                                            appointments={appointments}
                                            totalAppointments={totalAppointments}
                                            // CHANGED: Force UTC fallback
                                            clinicTimezone={clinicInfo.timezone || 'UTC'}
                                            activeTab={listTab}
                                            currentPage={page}
                                            totalPages={totalPages}
                                            itemsPerPage={ITEMS_PER_PAGE}
                                            onAppointmentClick={handleAppointmentClick}
                                            onPageChange={setPage}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* --- Modals --- */}
            {isEditModalOpen && doctor && contextClinicId && (
                <EditDoctorModal 
                    doctor={doctor} 
                    onClose={() => setIsEditModalOpen(false)} 
                    onDoctorUpdated={fetchDoctorDetails} 
                />
            )}

            {isAvailabilityModalOpen && doctor && contextClinicId && (
                <DoctorAvailabilityModal
                    doctorId={doctorId}
                    clinicId={contextClinicId}
                    doctorName={`${doctor.first_name} ${doctor.last_name}`}
                    onClose={() => setIsAvailabilityModalOpen(false)}
                />
            )}

            {isExceptionsModalOpen && doctor && contextClinicId && (
                <DoctorExceptionsModal
                    doctorId={doctorId}
                    clinicId={contextClinicId}
                    doctorName={`${doctor.first_name} ${doctor.last_name}`}
                    onClose={() => setIsExceptionsModalOpen(false)}
                />
            )}

            {isAppointmentModalOpen && selectedAppointment && clinicInfo && contextClinicId && (
                <EditAppointmentModal 
                    appointment={selectedAppointment}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    onRefreshList={fetchDoctorAppointments}
                    clinicId={contextClinicId!} 
                    clinicName={clinicInfo.clinic_name} 
                    // CHANGED: Force UTC fallback
                    clinicTimezone={clinicInfo.timezone || 'UTC'}
                    user={{ role: clinicInfo.role }}
                    role={clinicInfo.role} // Explicitly passed as per your page.tsx pattern
                />
            )}

        </DoctorDashboardLayout>
    );
}