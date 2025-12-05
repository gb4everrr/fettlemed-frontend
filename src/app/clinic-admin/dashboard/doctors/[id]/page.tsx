// src/app/clinic-admin/dashboard/doctors/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Calendar, Clock, List, CalendarDays, Filter } from 'lucide-react';

// --- Imports for Appointment Logic ---
import CalendarView from '@/app/clinic-admin/dashboard/appointments/CalendarView';
import ListView from '@/app/clinic-admin/dashboard/appointments/ListView';
import { getWeekDays } from '@/lib/utils/datetime';
import { Appointment } from '@/types/clinic';

// --- Modal Imports ---
import { EditDoctorModal } from '@/components/clinic/modals/EditDoctorModal';
import { DoctorAvailabilityModal } from '@/components/clinic/modals/DoctorAvailabilityModal';
import { DoctorExceptionsModal } from '@/components/clinic/modals/DoctorExceptionsModal';
import { EditAppointmentModal } from '@/components/clinic/modals/EditAppointmentModal'; // Import added

// Types
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

// Helpers for Badges
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

export default function DoctorProfilePage() {
    const router = useRouter();
    const params = useParams();
    const doctorId = parseInt(params.id as string);
    const { user } = useAppSelector((state: any) => state.auth);

    // --- Core Data State ---
    const [doctor, setDoctor] = useState<ClinicDoctor | null>(null);
    const [clinicTimezone, setClinicTimezone] = useState('UTC');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'appointments'>('profile');

    // --- Modal State ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);
    
    // --- Appointment Modal State (NEW) ---
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // --- Appointments Tab State ---
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const weekDays = getWeekDays(currentWeek);
    const [earliestHour, setEarliestHour] = useState<number>(8);
    const [latestHour, setLatestHour] = useState<number>(18);
    const calendarRef = useRef<HTMLDivElement | null>(null);
    
    // Pagination & Filters
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [apptFilterStatus, setApptFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

    // Fetch Doctor Details
    const fetchDoctorDetails = async () => {
        if (!user?.clinics?.[0]?.id) return;
        const clinicId = user.clinics[0].id;
        try {
            const res = await api.get(`/clinic-user/clinic-doctor/${doctorId}`, { 
                params: { clinic_id: clinicId } 
            });
            setDoctor(res.data);
            
            // Get Clinic Timezone
            const clinicRes = await api.get(`/clinic/${clinicId}`, { 
                params: { clinic_id: clinicId } 
            });
            if (clinicRes.data.timezone) setClinicTimezone(clinicRes.data.timezone);

        } catch (err) {
            console.error('Failed to load doctor', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Appointments (Filtered by THIS doctor)
    const fetchDoctorAppointments = async () => {
        if (!user?.clinics?.[0]?.id) return;
        const clinicId = user.clinics[0].id;
        try {
            const res = await api.get('/appointments', {
                params: {
                    clinic_id: clinicId,
                    clinic_doctor_id: doctorId // Strict filter
                }
            });
            setAppointments(res.data);
        } catch (err) {
            console.error('Failed to fetch appointments', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDoctorDetails();
            fetchDoctorAppointments();
        }
    }, [user, doctorId]);

    // --- Filter Logic for Appointments ---
    const getFilteredAppointments = () => {
        const now = new Date();
        let filtered = appointments;

        if (apptFilterStatus === 'active') {
            filtered = appointments.filter(apt => {
                const endTime = new Date(apt.datetime_end);
                return endTime >= now && apt.status !== 2 && apt.status !== 3;
            });
        } else if (apptFilterStatus === 'completed') {
            filtered = appointments.filter(apt => {
                const endTime = new Date(apt.datetime_end);
                return endTime < now || apt.status === 2 || apt.status === 3;
            });
        }
        return filtered.sort((a,b) => new Date(b.datetime_start).getTime() - new Date(a.datetime_start).getTime());
    };

    const filteredAppointments = getFilteredAppointments();
    const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

    const navigateWeek = (direction: "prev" | "next") => {
        setCurrentWeek(prev => {
            const n = new Date(prev);
            n.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
            return n;
        });
    };

    // --- HANDLER: Open Appointment Modal ---
    const handleAppointmentClick = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsAppointmentModalOpen(true);
    };

    if (isLoading) return <ClinicDashboardLayout><LoadingSpinner /></ClinicDashboardLayout>;
    if (!doctor) return <ClinicDashboardLayout><div className="p-8">Doctor not found.</div></ClinicDashboardLayout>;

    return (
        <ClinicDashboardLayout>
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
                                {/* Updated Badges */}
                                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${getRoleBadgeColor(doctor.role)}`}>
                                    {getRoleLabel(doctor.role)}
                                </span>
                                {getStatusBadge(doctor.registration_status)}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" size="md" onClick={() => setIsAvailabilityModalOpen(true)}>
                            Manage Availability
                        </Button>
                        <Button variant="secondary" size="md" onClick={() => setIsExceptionsModalOpen(true)}>
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
                        Appointments ({appointments.length})
                    </button>
                </div>

                {/* --- Content: Profile Tab --- */}
                {activeTab === 'profile' && (
                    <Card padding="lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><p className="font-medium text-gray-900">{doctor.email}</p></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><p className="font-medium text-gray-900">{doctor.phone_number}</p></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Medical Reg. No</label><p className="font-medium text-gray-900">{doctor.medical_reg_no}</p></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Started Date</label><p className="font-medium text-gray-900">{new Date(doctor.started_date).toLocaleDateString()}</p></div>
                            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Address</label><p className="font-medium text-gray-900">{doctor.address || 'N/A'}</p></div>
                        </div>
                    </Card>
                )}

                {/* --- Content: Appointments Tab --- */}
                {activeTab === 'appointments' && (
                    <div className="flex flex-col gap-6">
                        {/* Toolbar */}
                        <Card padding="sm" className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button onClick={() => setViewMode('list')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                    <List className="h-4 w-4 mr-1" /> List
                                </button>
                                <button onClick={() => setViewMode('calendar')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                                    <CalendarDays className="h-4 w-4 mr-1" /> Calendar
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <select 
                                    className="border border-gray-300 rounded-md text-sm p-1.5"
                                    value={apptFilterStatus}
                                    onChange={(e) => { setApptFilterStatus(e.target.value as any); setCurrentPage(1); }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </Card>

                        {/* View Components */}
                        {viewMode === 'list' ? (
                            <ListView
                                appointments={paginatedAppointments}
                                totalAppointments={filteredAppointments.length}
                                clinicTimezone={clinicTimezone}
                                activeTab={apptFilterStatus}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                itemsPerPage={itemsPerPage}
                                onAppointmentClick={handleAppointmentClick} // Connected
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
                                onAppointmentClick={handleAppointmentClick} // Connected
                                onNavigateWeek={navigateWeek}
                                onGoToToday={() => setCurrentWeek(new Date())}
                                onExpandEarlier={() => setEarliestHour(h => Math.max(0, h - 1))}
                                onExpandLater={() => setLatestHour(h => Math.min(24, h + 1))}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* --- Modals --- */}
            
            {isEditModalOpen && (
                <EditDoctorModal 
                    doctor={doctor} 
                    onClose={() => setIsEditModalOpen(false)} 
                    onDoctorUpdated={fetchDoctorDetails} 
                />
            )}

            {isAvailabilityModalOpen && (
                <DoctorAvailabilityModal
                    doctorId={doctorId}
                    clinicId={user.clinics[0].id}
                    doctorName={`${doctor.first_name} ${doctor.last_name}`}
                    onClose={() => setIsAvailabilityModalOpen(false)}
                />
            )}

            {isExceptionsModalOpen && (
                <DoctorExceptionsModal
                    doctorId={doctorId}
                    clinicId={user.clinics[0].id}
                    doctorName={`${doctor.first_name} ${doctor.last_name}`}
                    onClose={() => setIsExceptionsModalOpen(false)}
                />
            )}

            {/* --- Appointment Edit Modal (NEW) --- */}
            {isAppointmentModalOpen && selectedAppointment && (
                <EditAppointmentModal 
                    appointment={selectedAppointment}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    onRefreshList={fetchDoctorAppointments}
                    clinicId={user.clinics[0].id}
                    clinicTimezone={clinicTimezone}
                    user={user}
                />
            )}

        </ClinicDashboardLayout>
    );
}