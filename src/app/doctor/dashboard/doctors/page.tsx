// src/app/doctor/dashboard/directory/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUserMd, 
  FaSearch, 
  FaEnvelope, 
  FaPhone,
  FaList,
  FaThLarge,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaEye // Added Eye Icon
} from 'react-icons/fa';
import { Building2 } from 'lucide-react';

import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button'; 
import { RegisterDoctorModal } from '@/components/doctor/modals/RegisterDoctorModal'; 

// --- Interfaces ---
interface ClinicDoctor {
    id: number;
    clinic_id: number;
    clinic_name?: string; 
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
}

// Roles allowed to view the directory
const ALLOWED_ROLES = ['DOCTOR_OWNER', 'DOCTOR_PARTNER', 'OWNER'];

type ViewMode = 'grid' | 'list';

export default function DoctorDirectoryPage() {
    const router = useRouter();
    
    // --- Context State ---
    const [clinics, setClinics] = useState<ClinicContext[]>([]);
    const [activeClinicId, setActiveClinicId] = useState<number>(-1); // -1 = All Clinics
    const [isBooting, setIsBooting] = useState(true);

    // --- Data State ---
    const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to force reload

    // --- Filter & View State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [specializationFilter, setSpecializationFilter] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list'); 

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);

    // =================================================================================
    // 1. BOOT PHASE: Load Clinics & Filter by Role
    // =================================================================================
    useEffect(() => {
        const bootContext = async () => {
            try {
                const { data } = await api.get('/doctor/my-clinics-details');
                
                // Filter: Only allow clinics where user is OWNER or PARTNER
                const eligibleClinics: ClinicContext[] = data
                    .map((item: any) => ({
                        clinic_id: item.clinic.id,
                        clinic_name: item.clinic.name,
                        role: (item.assigned_role || item.role || '').toUpperCase()
                    }))
                    .filter((c: ClinicContext) => ALLOWED_ROLES.includes(c.role));

                setClinics(eligibleClinics);
                
                // Default to "All Clinics" (-1) if options exist
                if (eligibleClinics.length > 0) {
                    setActiveClinicId(-1);
                }

            } catch (err) {
                console.error("Context Boot Error:", err);
                setError("Failed to load clinic permissions.");
            } finally {
                setIsBooting(false);
            }
        };

        bootContext();
    }, []);

    // =================================================================================
    // 2. FETCH DOCTORS
    // =================================================================================
    useEffect(() => {
        const fetchDoctors = async () => {
            if (isBooting) return;
            if (clinics.length === 0) return;

            setIsFetching(true);
            setError(null);
            
            try {
                let allDoctors: ClinicDoctor[] = [];

                if (activeClinicId === -1) {
                    // Aggregate from all eligible clinics
                    const promises = clinics.map(async (clinic) => {
                        try {
                            const res = await api.get(`/clinic-user/clinic-doctor`, { 
                                params: { clinic_id: clinic.clinic_id } 
                            });
                            return res.data.map((d: any) => ({ ...d, clinic_name: clinic.clinic_name }));
                        } catch (e) {
                            return [];
                        }
                    });

                    const results = await Promise.all(promises);
                    allDoctors = results.flat();

                } else {
                    // Fetch specific clinic
                    const selectedClinic = clinics.find(c => c.clinic_id === activeClinicId);
                    const response = await api.get(`/clinic-user/clinic-doctor`, { 
                        params: { clinic_id: activeClinicId } 
                    });
                    
                    allDoctors = response.data.map((d: any) => ({
                        ...d, 
                        clinic_name: selectedClinic?.clinic_name 
                    }));
                }

                setDoctors(allDoctors);
                setCurrentPage(1); // Reset pagination

            } catch (err: any) {
                console.error('Failed to fetch doctors:', err);
                setError(err.response?.data?.message || 'Failed to load directory.');
            } finally {
                setIsFetching(false);
            }
        };

        fetchDoctors();
    }, [activeClinicId, clinics, isBooting, refreshTrigger]);

    // =================================================================================
    // 3. FILTERING & PAGINATION
    // =================================================================================
    const specializations = useMemo(() => {
        const unique = Array.from(new Set(doctors.map(d => d.specialization)));
        return unique.sort();
    }, [doctors]);

    const filteredDoctors = useMemo(() => {
        let filtered = [...doctors];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(doctor => 
                doctor.first_name.toLowerCase().includes(query) ||
                doctor.last_name.toLowerCase().includes(query) ||
                doctor.specialization.toLowerCase().includes(query) ||
                doctor.medical_reg_no.toLowerCase().includes(query)
            );
        }
        
        if (specializationFilter) {
            filtered = filtered.filter(doctor => doctor.specialization === specializationFilter);
        }
        
        return filtered;
    }, [doctors, searchQuery, specializationFilter]);

    const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
    const paginatedDoctors = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredDoctors.slice(start, start + itemsPerPage);
    }, [filteredDoctors, currentPage, itemsPerPage]);

    // =================================================================================
    // 4. UI HELPERS (Badges & Labels)
    // =================================================================================
    const getRoleBadgeColor = (role?: string) => {
        switch (role) {
            case 'DOCTOR_OWNER': return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'DOCTOR_PARTNER': return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'DOCTOR_VISITING': return 'bg-gray-100 text-gray-800 border border-gray-200';
            default: return 'bg-teal-50 text-teal-700 border border-teal-100';
        }
    };

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'DOCTOR_OWNER': return 'Owner & Doctor';
            case 'DOCTOR_PARTNER': return 'Partner';
            case 'DOCTOR_VISITING': return 'Visiting Consultant';
            default: return 'Doctor';
        }
    };

    // --- NEW: View Profile Handler ---
    const handleViewProfile = (doctor: ClinicDoctor) => {
        // We pass the clinic_id so the details page knows which context to load
        router.push(`/doctor/dashboard/doctors/${doctor.id}?clinic_id=${doctor.clinic_id}`);
    };

    // =================================================================================
    // 5. RENDER
    // =================================================================================
    if (isBooting) {
        return (
            <DoctorDashboardLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary-brand)] mb-4"></div>
                    <p className="text-gray-500 animate-pulse">Checking permissions...</p>
                </div>
            </DoctorDashboardLayout>
        );
    }

    if (clinics.length === 0) {
        return (
            <DoctorDashboardLayout>
                <div>
                    <Card padding="lg" className="text-center border-dashed border-2 border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaUserMd className="w-8 h-8 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h2>
                        <p className="text-gray-500 mb-6">
                            The Doctor Directory is only available to <b>Partners</b> and <b>Owners</b>.
                            <br/>You do not appear to have these permissions for any active clinics.
                        </p>
                    </Card>
                </div>
            </DoctorDashboardLayout>
        );
    }

    return (
        <DoctorDashboardLayout>
            <div className="p-4 md:p-6  flex flex-col h-full">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Doctor Directory</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage and view doctors across your clinics</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Add Button */}
                        <Button 
                            variant="primary" 
                            size="md" 
                            shine 
                            onClick={() => setIsModalOpen(true)}
                        >
                            <span className="mr-2">+</span> Add New Doctor
                        </Button>

                        {/* Clinic Dropdown */}
                        <div className="w-full md:w-64 relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={activeClinicId}
                                onChange={(e) => setActiveClinicId(Number(e.target.value))}
                                className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-[var(--color-primary-brand)] focus:border-[var(--color-primary-brand)] appearance-none cursor-pointer shadow-sm"
                            >
                                <option value={-1}>All Clinics</option>
                                {clinics.map(clinic => (
                                    <option key={clinic.clinic_id} value={clinic.clinic_id}>
                                        {clinic.clinic_name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- FILTERS & VIEW TOGGLE --- */}
                <Card className="mb-6 sticky top-0 z-10 shadow-sm border-gray-100">
                    <div className="p-4 flex flex-col lg:flex-row gap-4 justify-between items-center">
                        <div className="flex-1 w-full flex flex-col md:flex-row gap-3">
                            {/* Search */}
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search doctor by name..."
                                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] focus:border-transparent"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                />
                            </div>

                            {/* Specialization Filter */}
                            <div className="relative min-w-[200px]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaFilter className="text-gray-400 text-xs" />
                                </div>
                                <select
                                    className="pl-8 pr-8 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] appearance-none bg-white cursor-pointer"
                                    value={specializationFilter}
                                    onChange={(e) => { setSpecializationFilter(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="">All Specializations</option>
                                    {specializations.map((spec) => (
                                        <option key={spec} value={spec}>{spec}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${
                                    viewMode === 'list' 
                                        ? 'bg-white text-[var(--color-primary-brand)] shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="List View"
                            >
                                <FaList />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${
                                    viewMode === 'grid' 
                                        ? 'bg-white text-[var(--color-primary-brand)] shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="Grid View"
                            >
                                <FaThLarge />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* --- CONTENT --- */}
                {isFetching ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading directory...</p>
                    </div>
                ) : error ? (
                    <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center">
                        <p className="font-medium">{error}</p>
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                        <FaUserMd className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No doctors found.</p>
                        {(searchQuery || specializationFilter) && (
                            <button 
                                onClick={() => { setSearchQuery(''); setSpecializationFilter(''); }}
                                className="mt-2 text-[var(--color-primary-brand)] text-sm hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* VIEW: GRID */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
                                {paginatedDoctors.map((doctor, idx) => (
                                    <Card key={`${doctor.id}-${idx}`} className="hover:shadow-lg transition-all duration-300 border border-gray-100 group flex flex-col h-full">
                                        <div className="p-5 flex-1">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                                        {doctor.first_name[0]}{doctor.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 group-hover:text-[var(--color-primary-brand)] transition-colors">
                                                            Dr. {doctor.first_name} {doctor.last_name}
                                                        </h3>
                                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">
                                                            {doctor.specialization}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wide ${getRoleBadgeColor(doctor.role)}`}>
                                                    {getRoleLabel(doctor.role)}
                                                </span>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                 {/* Clinic Name (Only if 'All Clinics' is selected) */}
                                                {activeClinicId === -1 && doctor.clinic_name && (
                                                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                        <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                        <span className="font-medium text-blue-900 truncate">{doctor.clinic_name}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                    <FaEnvelope className="text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{doctor.email}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                    <FaPhone className="text-gray-400 flex-shrink-0" />
                                                    <span>{doctor.phone_number}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- Added View Button for Grid --- */}
                                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl mt-auto">
                                            <Button 
                                                variant="outline" 
                                                className="w-full justify-center group"
                                                onClick={() => handleViewProfile(doctor)}
                                            >
                                                View Profile
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* VIEW: LIST */}
                        {viewMode === 'list' && (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                                                {activeClinicId === -1 && (
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                                                )}
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {paginatedDoctors.map((doctor, idx) => (
                                                <tr key={`${doctor.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-[var(--color-primary-brand)] font-bold">
                                                                    {doctor.first_name[0]}{doctor.last_name[0]}
                                                                </div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">Dr. {doctor.first_name} {doctor.last_name}</div>
                                                                <div className="text-xs text-gray-500">Reg: {doctor.medical_reg_no}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">
                                                            {doctor.specialization}
                                                        </span>
                                                    </td>
                                                    {activeClinicId === -1 && (
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {doctor.clinic_name}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{doctor.email}</div>
                                                        <div className="text-sm text-gray-500">{doctor.phone_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            doctor.active 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {doctor.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wide ${getRoleBadgeColor(doctor.role)}`}>
                                                            {getRoleLabel(doctor.role)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button 
                                                            onClick={() => handleViewProfile(doctor)}
                                                            className="text-[var(--color-primary-brand)] hover:text-blue-900 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                                                            title="View Profile"
                                                        >
                                                            <FaEye />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* --- PAGINATION (Smart) --- */}
                        {totalPages > 1 && (
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
                                        <FaChevronLeft className="w-3 h-3" />
                                    </button>
                                    
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium ${
                                                    currentPage === pageNum ? 'bg-[var(--color-primary-brand)] text-white' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    
                                    {totalPages > 5 && currentPage < totalPages - 2 && (
                                        <>
                                            <span className="text-gray-500">...</span>
                                            <button onClick={() => setCurrentPage(totalPages)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 text-sm font-medium">{totalPages}</button>
                                        </>
                                    )}
                                    
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FaChevronRight className="w-3 h-3" />
                                    </button>
                                </nav>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- REGISTER DOCTOR MODAL --- */}
            {isModalOpen && (
                <RegisterDoctorModal
                    // If we are in "All Clinics" mode (-1), don't force a clinic ID, let the dropdown decide
                    clinicId={activeClinicId === -1 ? undefined : activeClinicId}
                    
                    // Pass the list of clinics for the dropdown
                    availableClinics={clinics.map(c => ({
                        id: c.clinic_id,
                        name: c.clinic_name
                    }))}
                    
                    onClose={() => setIsModalOpen(false)}
                    onDoctorAdded={() => {
                        setRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}
        </DoctorDashboardLayout>
    );
}