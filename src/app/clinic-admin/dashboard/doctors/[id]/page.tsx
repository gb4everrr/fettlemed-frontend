// src/app/clinic-admin/dashboard/doctors/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
}

interface DoctorAvailability {
    id: number;
    // UPDATED: Change this to match the backend
    clinic_doctor_id: number;
    clinic_id: number;
    weekday: string;
    start_time: string;
    end_time: string;
    active: boolean;
}

interface AvailabilityException {
    id: number;
    // UPDATED: Change this to match the backend
    clinic_doctor_id: number;
    clinic_id: number;
    date: string;
    is_available: boolean;
    note?: string;
}

type AppointmentStatusKey = 0 | 1 | 2;

interface Appointment {
    id: number;
    clinic_id: number;
    patient_profile_id: number;
    clinic_doctor_id: number;
    slot_id: number;
    datetime_start: string;
    datetime_end: string;
    status: AppointmentStatusKey;
    invoice_no?: number;
    notes?: string;
    patient_name?: string;
    patient_phone?: string;
    invoice_total_amount?: number;
    invoice_status?: 'paid' | 'unpaid' | 'overdue';
}

interface ClinicPatient {
    id: number;
    clinic_id: number;
    global_patient_id: number | null;
    first_name: string;
    last_name: string;
    phone_number: string;
    email?: string;
}

const appointmentStatusMap: Record<AppointmentStatusKey, string> = {
  0: 'Pending',
  1: 'Confirmed',
  2: 'Cancelled',
};

const getStatusColor = (status: AppointmentStatusKey): string => {
  switch (status) {
    case 0: return 'text-yellow-600 bg-yellow-100';
    case 1: return 'text-green-600 bg-green-100';
    case 2: return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export default function DoctorProfilePage() {
    const router = useRouter();
    const params = useParams();
    const doctorId = params.id;
    const { user } = useAppSelector((state) => state.auth);

    const [doctor, setDoctor] = useState<ClinicDoctor | null>(null);
    const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
    const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<ClinicPatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'appointments'>('profile');

    useEffect(() => {
        if (!user || !user.clinics || user.clinics.length === 0) {
            router.push('/auth/login');
            return;
        }

        const clinicId = user.clinics[0].id;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const doctorRes = await api.get(`/clinic-user/clinic-doctor/${doctorId}`, { 
                    params: { clinic_id: clinicId } 
                });
                setDoctor(doctorRes.data);

                // UPDATED: Use clinic_doctor_id instead of clinic_doctor_id
                const availabilityRes = await api.get('/availability/availability', { 
                    params: { 
                        clinic_doctor_id: doctorId, 
                        clinic_id: clinicId 
                    } 
                });
                setAvailability(availabilityRes.data);

                // UPDATED: Use clinic_doctor_id instead of clinic_doctor_id
                const exceptionsRes = await api.get('/availability/exception', { 
                    params: { 
                        clinic_doctor_id: doctorId, 
                        clinic_id: clinicId 
                    } 
                });
                setExceptions(exceptionsRes.data);

                const appointmentsRes = await api.get('/appointments', { 
                    params: { 
                        clinic_doctor_id: doctorId,
                        clinic_id: clinicId
                    } 
                });

                const patientsRes = await api.get('/clinic-user/clinic-patient', {
                    params: { clinic_id: clinicId }
                });
                setPatients(patientsRes.data);

                const appointmentsWithDetails = appointmentsRes.data.map((appt: any) => {
                    const patient = patientsRes.data.find((p: ClinicPatient) => 
                        p.id === appt.patient_profile_id
                    );
                    
                    return {
                        ...appt,
                        patient_name: patient ? `${patient.first_name} ${patient.last_name}` : `Patient ID: ${appt.patient_profile_id}`,
                        patient_phone: patient?.phone_number || 'N/A',
                        invoice_total_amount: appt.invoice_no ? 150.00 : undefined,
                        invoice_status: appt.invoice_no ? 'unpaid' as const : undefined,
                    };
                });

                setAppointments(appointmentsWithDetails);

            } catch (err: any) {
                console.error('Failed to fetch doctor data:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load doctor profile. Please try again.';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [doctorId, user, router]);

    const formatTime = (timeString: string) => {
        try {
            const time = new Date(`1970-01-01T${timeString}`);
            return time.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        } catch {
            return timeString;
        }
    };

    const sortedAvailability = [...availability].sort((a, b) => {
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return weekdays.indexOf(a.weekday) - weekdays.indexOf(b.weekday);
    });

    const sortedAppointments = [...appointments].sort((a, b) => 
        new Date(b.datetime_start).getTime() - new Date(a.datetime_start).getTime()
    );

    if (isLoading) {
        return <ClinicDashboardLayout><LoadingSpinner /></ClinicDashboardLayout>;
    }

    if (error) {
        return (
            <ClinicDashboardLayout>
                <div className="text-center p-8">
                    <div className="text-red-600 mb-4">{error}</div>
                    <Button 
                        variant="secondary" 
                        onClick={() => router.back()}
                    >
                        Go Back
                    </Button>
                </div>
            </ClinicDashboardLayout>
        );
    }

    if (!doctor) {
        return (
            <ClinicDashboardLayout>
                <div className="text-center p-8 text-gray-600">
                    Doctor not found.
                    <div className="mt-4">
                        <Button 
                            variant="secondary" 
                            onClick={() => router.back()}
                        >
                            Go Back
                        </Button>
                    </div>
                </div>
            </ClinicDashboardLayout>
        );
    }

    return (
        <ClinicDashboardLayout>
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 font-inter">
                            Dr. {doctor.first_name} {doctor.last_name}
                        </h1>
                        <p className="text-gray-600 mt-1">{doctor.specialization}</p>
                    </div>
                    <div className="flex space-x-4">
                        <Link href={`/clinic-admin/dashboard/doctors/${doctor.id}/availability-calendar`}>
                            <Button variant="secondary" size="md">Manage Availability</Button>
                        </Link>
                        <Link href={`/clinic-admin/dashboard/doctors/${doctor.id}/edit`}>
                            <Button variant="primary" size="md" shine>Edit Profile</Button>
                        </Link>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-6">
                    {[
                        { key: 'profile', label: 'Profile Details' },
                        { key: 'appointments', label: `Appointments (${appointments.length})` }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'profile' && (
                    <Card padding="lg">
                        <h2 className="text-xl font-semibold mb-6">Profile Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                                <p className="text-gray-900">{doctor.first_name} {doctor.last_name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Specialization</label>
                                <p className="text-gray-900">{doctor.specialization}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                                <p className="text-gray-900">{doctor.email}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                                <p className="text-gray-900">{doctor.phone_number}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Medical Registration No.</label>
                                <p className="text-gray-900">{doctor.medical_reg_no}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Started Date</label>
                                <p className="text-gray-900">{new Date(doctor.started_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    doctor.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {doctor.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            {doctor.address && (
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                                    <p className="text-gray-900">{doctor.address}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === 'appointments' && (
                    <Card padding="lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Appointments</h2>
                            <Link href={`/clinic-admin/dashboard/appointments/new?doctor_id=${doctor.id}`}>
                                <Button variant="primary" size="sm">Book Appointment</Button>
                            </Link>
                        </div>
                        {sortedAppointments.length > 0 ? (
                            <div className="space-y-4">
                                {sortedAppointments.map(appt => (
                                    <div key={appt.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h3 className="font-medium text-gray-900">{appt.patient_name}</h3>
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appt.status)}`}>
                                                        {appointmentStatusMap[appt.status]}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                                                    <div>
                                                        <span className="font-medium">Date & Time:</span>
                                                        <br />
                                                        {new Date(appt.datetime_start).toLocaleString()}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Patient Phone:</span>
                                                        <br />
                                                        {appt.patient_phone}
                                                    </div>
                                                    {appt.invoice_no && (
                                                        <div>
                                                            <span className="font-medium">Invoice:</span>
                                                            <br />
                                                            #{appt.invoice_no} - ${appt.invoice_total_amount}
                                                        </div>
                                                    )}
                                                </div>
                                                {appt.notes && (
                                                    <div className="mt-2 text-sm text-gray-600">
                                                        <span className="font-medium">Notes:</span> {appt.notes}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <Link href={`/clinic-admin/dashboard/appointments/${appt.id}`}>
                                                    <Button variant="secondary" size="sm">View Details</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>No appointments found for this doctor.</p>
                                <p className="text-sm mt-1">Book the first appointment to get started.</p>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </ClinicDashboardLayout>
    );
}