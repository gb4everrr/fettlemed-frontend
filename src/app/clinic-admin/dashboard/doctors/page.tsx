// src/app/clinic-admin/dashboard/doctors/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';

// Updated interface to match the actual database structure
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

export default function MyDoctorsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { user, isLoading, error: globalError } = useAppSelector((state) => state.auth);
    
    const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
    const [isFetchingDoctors, setIsFetchingDoctors] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        console.log('User in doctors page:', user?.email, 'Role:', user?.role, 'Clinics:', user?.clinics?.length);
        
        if (!user) {
            console.log('No user found, waiting...');
            return;
        }
        
        if (user.role !== 'clinic_admin') {
            console.log('User role mismatch, redirecting. User role:', user.role);
            router.push('/auth/login');
            return;
        }

        const fetchDoctors = async () => {
            setIsFetchingDoctors(true);
            setFetchError(null);

            try {
                // Check for clinics array and use the ID of the first clinic
                if (user.clinics && user.clinics.length > 0) {
                    const clinicId = user.clinics[0].id;
                    console.log('Fetching doctors for clinic ID:', clinicId);
                    
                    // Fixed: Use clinic_id parameter name that backend expects
                    const response = await api.get(`/clinic-user/clinic-doctor`, { 
                        params: { clinic_id: clinicId } 
                    });
                    
                    console.log('Doctors response:', response.data);
                    setDoctors(response.data);
                } else {
                    console.log('No clinics found for user');
                    setDoctors([]);
                    setFetchError('No clinic is associated with your account. Please set up your clinic profile.');
                }
            } catch (err: any) {
                console.error('Failed to fetch doctors:', err);
                console.error('Error response:', err.response?.data);
                console.error('Error status:', err.response?.status);
                
                let errorMessage = 'Failed to fetch doctor list.';
                
                if (err.response?.status === 401) {
                    errorMessage = 'Authentication failed. Please log in again.';
                    router.push('/auth/login');
                    return;
                } else if (err.response?.status === 403) {
                    errorMessage = 'You do not have permission to view doctors.';
                } else if (err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                }
                
                setFetchError(errorMessage);
            } finally {
                setIsFetchingDoctors(false);
            }
        };

        fetchDoctors();
    }, [user, router]);
    
    // Show loading while waiting for user data
    if (!user) {
        return (
            <ClinicDashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-gray-700 text-lg font-inter">Loading user data...</p>
                </div>
            </ClinicDashboardLayout>
        );
    }
    
    // Show error if wrong role
    if (user.role !== 'clinic_admin') {
        return (
            <ClinicDashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-600">Access denied. Current role: {user.role}</p>
                        <p className="text-gray-600">Expected role: clinic_admin</p>
                    </div>
                </div>
            </ClinicDashboardLayout>
        );
    }
    
    if (isFetchingDoctors) {
        return (
            <ClinicDashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-gray-700 text-lg font-inter">Loading doctors list...</p>
                </div>
            </ClinicDashboardLayout>
        );
    }
    
    return (
        <ClinicDashboardLayout>
            <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 font-inter">My Doctors</h1>
                    <Link href="/clinic-admin/dashboard/doctors/add" passHref>
                        <Button variant="primary" size="md" shine>Add New Doctor</Button>
                    </Link>
                </div>
                
                
                
                {fetchError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600 text-sm">{fetchError}</p>
                    </div>
                )}
                
                {doctors.length === 0 && !fetchError ? (
                    <Card padding="md" className="text-center">
                        <p className="text-gray-600 font-inter text-sm">No doctors found for your clinic. Start by adding one!</p>
                        <div className="mt-6">
                            <Link href="/clinic-admin/dashboard/doctors/add" passHref>
                                <Button variant="secondary" size="md" shine>Add First Doctor</Button>
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {doctors.map((doctor) => (
                            <Link href={`/clinic-admin/dashboard/doctors/${doctor.id}`} key={doctor.id}>
                                <Card padding="md" className="flex flex-col items-start hover:border-[var(--color-primary-brand)] cursor-pointer transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <Image src="/images/Doctor.png" alt="Doctor Icon" width={40} height={40} className="rounded-full" />
                                        <div>
                                            <h3 className="text-lg font-bold">{doctor.first_name} {doctor.last_name}</h3>
                                            <p className="text-sm text-gray-600">{doctor.specialization}</p>
                                            <p className="text-xs text-gray-500">Reg: {doctor.medical_reg_no}</p>
                                            <p className="text-xs text-gray-500">{doctor.email}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 w-full">
                                        <p className="text-xs text-gray-500 mb-2">
                                            Started: {new Date(doctor.started_date).toLocaleDateString()}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs px-2 py-1 rounded ${doctor.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {doctor.active ? 'Active' : 'Inactive'}
                                            </span>
                                            <Button variant="ghost" size="sm" className="text-left">View Details &rarr;</Button>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </ClinicDashboardLayout>
    );
}