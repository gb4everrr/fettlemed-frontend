// src/app/clinic-admin/dashboard/doctors/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';

// --- Import the new modal ---
import { RegisterDoctorModal } from '@/components/clinic/modals/RegisterDoctorModal';

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
    role?: string;
    registration_status?: 'REGISTERED' | 'PENDING';
}

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
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 uppercase tracking-wide">
                Pending Registration
            </span>
        );
    }
    return null; 
};

type ViewMode = 'grid' | 'list';

export default function MyDoctorsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    // Use 'any' type for state to avoid TS errors if your slice types aren't perfect yet
    const { user } = useAppSelector((state: any) => state.auth);
    
    const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
    const [isFetchingDoctors, setIsFetchingDoctors] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // New state for filters and view
    const [searchQuery, setSearchQuery] = useState('');
    const [specializationFilter, setSpecializationFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // --- NEW: State for modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- WRAPPED FETCH LOGIC ---
    const fetchDoctors = useCallback(async () => {
        if (!user || user.role !== 'clinic_admin') return;

        setIsFetchingDoctors(true);
        setFetchError(null);

        try {
            if (user.clinics && user.clinics.length > 0) {
                const clinicId = user.clinics[0].id;
                const response = await api.get(`/clinic-user/clinic-doctor`, { 
                    params: { clinic_id: clinicId } 
                });
                setDoctors(response.data);
            } else {
                setDoctors([]);
                setFetchError('No clinic is associated with your account. Please set up your clinic profile.');
            }
        } catch (err: any) {
            console.error('Failed to fetch doctors:', err);
            let errorMessage = 'Failed to fetch doctor list.';
            
            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please log in again.';
                router.push('/auth/login');
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view doctors.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            setFetchError(errorMessage);
        } finally {
            setIsFetchingDoctors(false);
        }
    }, [user, router]);

    useEffect(() => {
        if (user) {
            fetchDoctors();
        } else if (!user) {
            console.log('No user found, waiting...');
        } else if (user.role !== 'clinic_admin') {
            router.push('/auth/login');
        }
    }, [user, router, fetchDoctors]);
    
    // Get unique specializations for filter
    const specializations = useMemo(() => {
        const unique = Array.from(new Set(doctors.map(d => d.specialization)));
        return unique.sort();
    }, [doctors]);
    
    // Filter and search logic
    const filteredDoctors = useMemo(() => {
        let filtered = [...doctors];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(doctor => 
                doctor.first_name.toLowerCase().includes(query) ||
                doctor.last_name.toLowerCase().includes(query) ||
                doctor.email.toLowerCase().includes(query) ||
                doctor.specialization.toLowerCase().includes(query) ||
                doctor.medical_reg_no.toLowerCase().includes(query)
            );
        }
        
        if (specializationFilter) {
            filtered = filtered.filter(doctor => doctor.specialization === specializationFilter);
        }
        
        if (statusFilter) {
            const isActive = statusFilter === 'active';
            filtered = filtered.filter(doctor => doctor.active === isActive);
        }
        
        return filtered;
    }, [doctors, searchQuery, specializationFilter, statusFilter]);
    
    // Pagination logic
    const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
    const paginatedDoctors = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredDoctors.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredDoctors, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, specializationFilter, statusFilter]);
    
    if (!user) {
        return (
            <ClinicDashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-gray-700 text-lg font-inter">Loading user data...</p>
                </div>
            </ClinicDashboardLayout>
        );
    }
    
    if (isFetchingDoctors && doctors.length === 0) {
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
                {/* Header Section */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-4xl font-black text-gray-800 font-inter tracking-tight">Doctor Directory</h1>
                        <p className="text-base text-gray-500 font-inter">A comprehensive list of all doctors in the clinic.</p>
                    </div>
                    
                    {/* --- UPDATED: Button triggers modal --- */}
                    <Button 
                        variant="primary" 
                        size="md" 
                        shine 
                        onClick={() => setIsModalOpen(true)}
                    >
                        <span className="mr-2">+</span> Add New Doctor
                    </Button>
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
                            {/* --- UPDATED: Button triggers modal --- */}
                            <Button 
                                variant="secondary" 
                                size="md" 
                                shine 
                                onClick={() => setIsModalOpen(true)}
                            >
                                Add First Doctor
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Search and Filter Section */}
                        <div className="flex flex-wrap items-center gap-4 mb-6">
                            {/* Search Bar */}
                            <div className="flex-1 min-w-[300px]">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by name, specialization, or ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] focus:border-transparent font-inter"
                                    />
                                </div>
                            </div>
                            
                            {/* Filters */}
                            <div className="flex gap-3">
                                <div className="relative">
                                    <select
                                        value={specializationFilter}
                                        onChange={(e) => setSpecializationFilter(e.target.value)}
                                        className="h-12 pl-4 pr-10 bg-white border border-gray-200 rounded-lg text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] focus:border-transparent appearance-none cursor-pointer font-inter"
                                    >
                                        <option value="">All Specializations</option>
                                        {specializations.map(spec => (
                                            <option key={spec} value={spec}>{spec}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="h-12 pl-4 pr-10 bg-white border border-gray-200 rounded-lg text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] focus:border-transparent appearance-none cursor-pointer font-inter"
                                    >
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            {/* View Toggle */}
                            <div className="flex h-12 items-center bg-white border border-gray-200 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex items-center justify-center h-full px-3 rounded-md transition-colors ${
                                        viewMode === 'grid' 
                                            ? 'bg-[var(--color-primary-brand)] text-white' 
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center justify-center h-full px-3 rounded-md transition-colors ${
                                        viewMode === 'list' 
                                            ? 'bg-[var(--color-primary-brand)] text-white' 
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* No Results Message */}
                        {filteredDoctors.length === 0 ? (
                            <Card padding="md" className="text-center">
                                <p className="text-gray-600 font-inter">No doctors found matching your criteria.</p>
                            </Card>
                        ) : (
                            <>
                                {/* Grid View */}
                                {viewMode === 'grid' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {paginatedDoctors.map((doctor) => (
                                            <Link href={`/clinic-admin/dashboard/doctors/${doctor.id}`} key={doctor.id}>
                                                <Card padding="md" className="flex flex-col items-start hover:border-[var(--color-primary-brand)] cursor-pointer transition-colors">
                                                {/* BADGE CONTAINER (Top Right) */}
                                    <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                        {/* Role Badge */}
                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(doctor.role)}`}>
                                            {getRoleLabel(doctor.role)}
                                        </div>
                                        {/* Status Badge */}
                                        {getStatusBadge(doctor.registration_status)}
                                    </div>
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
                                
                                {/* List/Table View */}
                                {viewMode === 'list' && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr className="text-xs text-gray-500 uppercase font-medium">
                                                        <th className="px-6 py-3 text-left font-medium">Doctor</th>
                                                        <th className="px-6 py-3 text-left">Role</th>
                                                        <th className="px-6 py-3 text-left font-medium">Specialization</th>
                                                        <th className="px-6 py-3 text-left font-medium">Contact</th>
                                                        <th className="px-6 py-3 text-left font-medium">Status</th>
                                                        <th className="px-6 py-3 text-center font-medium">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {paginatedDoctors.map((doctor) => (
                                                        <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    <Image 
                                                                        src="/images/Doctor.png" 
                                                                        alt={`${doctor.first_name} ${doctor.last_name}`} 
                                                                        width={40} 
                                                                        height={40} 
                                                                        className="rounded-full object-cover"
                                                                    />
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-800">
                                                                            Dr. {doctor.first_name} {doctor.last_name}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            ID: {doctor.medical_reg_no}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {/* ROLE COLUMN */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1 items-start">
                                                {/* Role Badge */}
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(doctor.role)}`}>
                                                    {getRoleLabel(doctor.role)}
                                                </span>
                                                {/* Status Badge */}
                                                {getStatusBadge(doctor.registration_status)}
                                            </div>
                                        </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                                {doctor.specialization}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-600">{doctor.phone_number}</div>
                                                                <div className="text-xs text-gray-500">{doctor.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    doctor.active 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {doctor.active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Link href={`/clinic-admin/dashboard/doctors/${doctor.id}`}>
                                                                        <Button variant ="ghost" className="text-[var(--color-primary-brand)] hover:text-[var(--color-primary-hover)] font-medium">
                                                                            View
                                                                        </Button>
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Pagination */}
                                <div className="flex flex-wrap justify-between items-center mt-6 gap-4">
                                    <div className="text-sm text-gray-500">
                                        Showing <span className="font-semibold text-gray-800">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                        <span className="font-semibold text-gray-800">
                                            {Math.min(currentPage * itemsPerPage, filteredDoctors.length)}
                                        </span> of{' '}
                                        <span className="font-semibold text-gray-800">{filteredDoctors.length}</span> results
                                    </div>
                                    
                                    <nav className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium ${
                                                        currentPage === pageNum
                                                            ? 'bg-[var(--color-primary-brand)] text-white'
                                                            : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                        
                                        {totalPages > 5 && currentPage < totalPages - 2 && (
                                            <>
                                                <span className="text-gray-500">...</span>
                                                <button
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 text-sm font-medium"
                                                >
                                                    {totalPages}
                                                </button>
                                            </>
                                        )}
                                        
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* --- NEW: Render the Modal --- */}
            {isModalOpen && user?.clinics?.[0]?.id && (
                <RegisterDoctorModal
                    clinicId={user.clinics[0].id}
                    onClose={() => setIsModalOpen(false)}
                    onDoctorAdded={() => {
                        fetchDoctors(); // Refresh the list when a doctor is added
                    }}
                />
            )}
        </ClinicDashboardLayout>
    );
}