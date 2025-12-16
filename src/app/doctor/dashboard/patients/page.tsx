'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { 
  FaUser, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClinicMedical, 
  FaExchangeAlt,
  FaStethoscope,
  FaNotesMedical,
  FaPlus // Import Plus Icon
} from 'react-icons/fa';

import api from '@/services/api';
import { getPermissionsForRole } from '@/config/roles'; 
import { setActivePermissions } from '@/lib/features/auth/authSlice'; 

import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Can } from '@/lib/features/auth/Can'; 

// --- Import New Modal ---
import { DoctorRegisterPatientModal } from '@/components/doctor/modals/DoctorRegisterPatientModal';

// --- Interfaces ---
interface PatientDetails {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    clinicName: string;
    clinicId: number;
    completedAppointments: number | string;
    hasUpcomingAppointment: boolean;
    source: 'doctor_personal' | 'clinic_registry';
    patientCode?: string;
}

interface ClinicContext {
    clinic_id: number;
    clinic_name: string;
    role: string;
    doctor_id: number;
}

type ViewMode = 'grid' | 'list';
type ViewScope = 'my' | 'clinic';

const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

export default function MyPatientsPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    
    // --- Context State ---
    const [clinics, setClinics] = useState<ClinicContext[]>([]);
    const [activeClinicId, setActiveClinicId] = useState<number>(-1); // -1 = All Clinics
    const [isBooting, setIsBooting] = useState(true);

    // --- Data State ---
    const [patients, setPatients] = useState<PatientDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Filter & View State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [viewScope, setViewScope] = useState<ViewScope>('my');
    
    // --- Modal State ---
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // =================================================================================
    // 1. BOOT PHASE
    // =================================================================================
    useEffect(() => {
        const bootContext = async () => {
            try {
                const { data } = await api.get('/doctor/my-clinics-details');
                
                const contextList: ClinicContext[] = data.map((item: any) => {
                    const rawRole = item.assigned_role || item.role || 'DOCTOR_VISITING';
                    return {
                        clinic_id: item.clinic.id,
                        clinic_name: item.clinic.name,
                        role: rawRole.toUpperCase(), 
                        doctor_id: item.id
                    };
                });

                setClinics(contextList);
                if (contextList.length > 0) setActiveClinicId(-1);

            } catch (err) {
                console.error("Context Boot Error:", err);
                setError("Failed to load clinic context.");
            } finally {
                setIsBooting(false);
            }
        };

        bootContext();
    }, [dispatch]);

    // =================================================================================
    // 2. PERMISSION HYDRATION
    // =================================================================================
    const canAccessClinicView = useMemo(() => {
        if (activeClinicId === -1) {
            return clinics.some(c => PRIVILEGED_ROLES.includes(c.role));
        } else {
            const current = clinics.find(c => c.clinic_id === activeClinicId);
            return current ? PRIVILEGED_ROLES.includes(current.role) : false;
        }
    }, [activeClinicId, clinics]);

    // Determine if user can register patients (Has at least one privileged role)
    const canRegisterPatients = useMemo(() => {
        return clinics.some(c => PRIVILEGED_ROLES.includes(c.role));
    }, [clinics]);

    useEffect(() => {
        if (isBooting || clinics.length === 0) return;

        let effectiveRole = 'DOCTOR_VISITING';
        if (activeClinicId === -1) {
            if (clinics.some(c => ['OWNER', 'CLINIC_ADMIN'].includes(c.role))) {
                effectiveRole = 'CLINIC_ADMIN';
            } else if (clinics.some(c => ['DOCTOR_OWNER', 'DOCTOR_PARTNER'].includes(c.role))) {
                effectiveRole = 'DOCTOR_PARTNER';
            }
        } else {
            const current = clinics.find(c => c.clinic_id === activeClinicId);
            if (current) effectiveRole = current.role;
        }

        const perms = getPermissionsForRole(effectiveRole);
        dispatch(setActivePermissions(perms));
        
        if (!canAccessClinicView && viewScope === 'clinic') {
            setViewScope('my');
        }

    }, [activeClinicId, clinics, isBooting, dispatch, canAccessClinicView, viewScope]);


    // =================================================================================
    // 3. HYBRID DATA FETCHING
    // =================================================================================
    const fetchPatients = useCallback(async () => {
        if (clinics.length === 0) return;
        
        setIsLoading(true);
        setError(null);
        let accumulatedPatients: PatientDetails[] = [];

        try {
            const myPatientsResponse = await api.get('/doctor/my-patients-details');
            
            const myPatients: PatientDetails[] = myPatientsResponse.data.map((p: any) => ({
                id: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                email: p.email,
                phone: p.phone,
                clinicName: p.clinicName,
                clinicId: p.clinicId || clinics.find(c => c.clinic_name === p.clinicName)?.clinic_id || 0,
                completedAppointments: p.completedAppointments,
                hasUpcomingAppointment: p.hasUpcomingAppointment,
                source: 'doctor_personal',
                patientCode: p.patientCode || 'N/A'
            }));

            if (viewScope === 'my') {
                accumulatedPatients = myPatients.filter(p => 
                    activeClinicId === -1 ? true : p.clinicId === activeClinicId
                );
            } else if (viewScope === 'clinic') {
                const targetClinics = activeClinicId === -1 
                    ? clinics 
                    : clinics.filter(c => c.clinic_id === activeClinicId);

                const fetchPromises = targetClinics.map(async (clinic) => {
                    const hasRegistryAccess = PRIVILEGED_ROLES.includes(clinic.role);
                    if (hasRegistryAccess) {
                        try {
                            const res = await api.get('/clinic-user/clinic-patient', {
                                params: { clinic_id: clinic.clinic_id }
                            });
                            return res.data.map((p: any) => ({
                                id: p.id,
                                firstName: p.first_name,
                                lastName: p.last_name,
                                email: p.email,
                                phone: p.phone_number,
                                clinicName: clinic.clinic_name,
                                clinicId: clinic.clinic_id,
                                completedAppointments: '-',
                                hasUpcomingAppointment: false,
                                source: 'clinic_registry',
                                patientCode: p.patient_code
                            }));
                        } catch (e) {
                            return [];
                        }
                    } else {
                        return myPatients.filter(p => p.clinicId === clinic.clinic_id);
                    }
                });

                const results = await Promise.all(fetchPromises);
                accumulatedPatients = results.flat();
            }

            const uniquePatients = Array.from(new Map(accumulatedPatients.map(item => [item.id, item])).values());
            setPatients(uniquePatients);

        } catch (err) {
            console.error("Fetch error:", err);
            setError("Unable to load patient data.");
        } finally {
            setIsLoading(false);
        }
    }, [activeClinicId, viewScope, clinics]);

    useEffect(() => {
        if (!isBooting) {
            fetchPatients();
        }
    }, [isBooting, fetchPatients]);


    // =================================================================================
    // 4. FILTERING & PAGINATION
    // =================================================================================
    const filteredPatients = useMemo(() => {
        return patients.filter(patient => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
                return (
                    fullName.includes(query) || 
                    patient.email?.toLowerCase().includes(query) || 
                    patient.phone?.toLowerCase().includes(query) ||
                    (patient.patientCode && patient.patientCode.toLowerCase().includes(query))
                );
            }
            return true;
        });
    }, [patients, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeClinicId, viewScope]);

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    
    const paginatedPatients = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPatients, currentPage, itemsPerPage]);


    // =================================================================================
    // 5. RENDER
    // =================================================================================

    if (isBooting) {
        return (
            <DoctorDashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-gray-500 animate-pulse">Loading Clinic Context...</p>
                </div>
            </DoctorDashboardLayout>
        );
    }

    const currentContextName = activeClinicId === -1 
        ? "All Associated Clinics" 
        : clinics.find(c => c.clinic_id === activeClinicId)?.clinic_name || "Unknown Clinic";

    return (
        <DoctorDashboardLayout>
            <div className="p-6 md:p-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-800 font-inter tracking-tight">
                            {viewScope === 'my' ? 'My Patients' : 'Clinic Registry'}
                        </h1>
                        <p className="text-base text-gray-500 font-inter mt-1">
                            Viewing data for <span className="font-semibold text-[var(--color-primary-brand)]">{currentContextName}</span>
                        </p>
                    </div>

                    {/* CONTEXT SELECTOR & REGISTER BUTTON */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Register Button - Only if permissions allow */}
                        {canRegisterPatients && (
                            <Button 
                                variant="primary" 
                                size="md" 
                                className="flex items-center justify-center gap-2"
                                onClick={() => setIsRegisterModalOpen(true)}
                                shine
                            >
                                <FaPlus className="text-sm" /> Register Patient
                            </Button>
                        )}

                        <div className="relative min-w-[220px]">
                            <select
                                value={activeClinicId}
                                onChange={(e) => {
                                    setActiveClinicId(Number(e.target.value));
                                    setViewScope('my');
                                }}
                                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-3 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] font-medium"
                            >
                                <option value={-1}>All Clinics</option>
                                <option disabled>──────────</option>
                                {clinics.map(c => (
                                    <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>
                                ))}
                            </select>
                            <FaExchangeAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* --- TOOLBAR --- */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, email, or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)]"
                            />
                        </div>
                    </div>

                    {/* SCOPE TOGGLE */}
                    {canAccessClinicView && (
                        <Can perform="view_all_schedule">
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 h-12 shadow-sm">
                                <button
                                    onClick={() => setViewScope('my')}
                                    className={`px-4 h-full rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                        viewScope === 'my' 
                                        ? 'bg-[var(--color-primary-brand)] text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    <FaStethoscope /> My View
                                </button>
                                <button
                                    onClick={() => setViewScope('clinic')}
                                    className={`px-4 h-full rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                        viewScope === 'clinic' 
                                        ? 'bg-[var(--color-primary-brand)] text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    <FaNotesMedical /> Clinic View
                                </button>
                            </div>
                        </Can>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex h-12 items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        <button onClick={() => setViewMode('grid')} className={`flex items-center justify-center h-full px-3 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-primary-brand)] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`flex items-center justify-center h-full px-3 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--color-primary-brand)] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                    </div>
                </div>

                {/* --- CONTENT --- */}
                {isLoading ? (
                    <Card padding="lg" className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary-brand)]"></div>
                    </Card>
                ) : filteredPatients.length === 0 ? (
                    <Card padding="md" className="text-center py-16">
                        <p className="text-gray-600 font-inter text-lg">No patients found.</p>
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your search or switching views.</p>
                    </Card>
                ) : (
                    <>
                        {/* GRID VIEW */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedPatients.map((patient, idx) => (
                                    <Card 
                                        key={`${patient.id}-${patient.clinicId}-${idx}`}
                                        padding="md" 
                                        className="flex flex-col h-full hover:border-[var(--color-primary-brand)] cursor-pointer transition-colors relative"
                                        onClick={() => router.push(`/doctor/dashboard/patients/${patient.id}`)}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${patient.source === 'doctor_personal' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                                <FaUser className="text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{patient.firstName} {patient.lastName}</h3>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <FaClinicMedical /> {patient.clinicName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-1 flex-grow">
                                            {patient.patientCode && <p className="text-xs text-gray-500 font-mono">ID: {patient.patientCode}</p>}
                                            {patient.email && <p className="text-sm text-gray-600 truncate">{patient.email}</p>}
                                            {patient.phone && <p className="text-sm text-gray-600">{patient.phone}</p>}
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                                            {patient.source === 'clinic_registry' ? (
                                                 <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">Registry</span>
                                            ) : (
                                                <span className="text-gray-500">
                                                    Visits: <span className="font-semibold text-gray-800">{patient.completedAppointments}</span>
                                                </span>
                                            )}
                                            <span className="text-[var(--color-primary-brand)] font-medium">View &rarr;</span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {viewMode === 'list' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr className="text-xs text-gray-500 uppercase font-medium">
                                                <th className="px-6 py-3 text-left font-medium">Patient</th>
                                                <th className="px-6 py-3 text-left font-medium">Code/ID</th>
                                                <th className="px-6 py-3 text-left font-medium">Contact</th>
                                                <th className="px-6 py-3 text-left font-medium">Clinic</th>
                                                <th className="px-6 py-3 text-center font-medium">Appts</th>
                                                <th className="px-6 py-3 text-center font-medium">Status</th>
                                                <th className="px-6 py-3 text-center font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {paginatedPatients.map((patient, idx) => (
                                                <tr 
                                                    key={`${patient.id}-${patient.clinicId}-${idx}`}
                                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                    onClick={() => router.push(`/doctor/dashboard/patients/${patient.id}`)}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${patient.source === 'doctor_personal' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                                                <FaUser />
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {patient.firstName} {patient.lastName}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                                        {patient.patientCode || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-600">{patient.email || '-'}</div>
                                                        <div className="text-xs text-gray-500">{patient.phone || '-'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {patient.clinicName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-800">
                                                        {patient.completedAppointments}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {patient.hasUpcomingAppointment ? (
                                                            <div className="flex justify-center"><FaCheckCircle className="text-green-500 text-lg" title="Upcoming Appointment" /></div>
                                                        ) : (
                                                            <div className="flex justify-center"><FaTimesCircle className="text-gray-300 text-lg" /></div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <Button variant="ghost" size="sm" className="text-[var(--color-primary-brand)]">View</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* PAGINATION UI */}
                        <div className="flex flex-wrap justify-between items-center mt-6 gap-4">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-semibold text-gray-800">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                <span className="font-semibold text-gray-800">
                                    {Math.min(currentPage * itemsPerPage, filteredPatients.length)}
                                </span> of{' '}
                                <span className="font-semibold text-gray-800">{filteredPatients.length}</span> results
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
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </>
                )}
            </div>

            {/* --- REGISTER PATIENT MODAL --- */}
            {isRegisterModalOpen && (
                <DoctorRegisterPatientModal
                    clinics={clinics}
                    onClose={() => setIsRegisterModalOpen(false)}
                    onPatientAdded={() => {
                        fetchPatients(); // Refresh list
                    }}
                    preselectedClinicId={activeClinicId}
                />
            )}
        </DoctorDashboardLayout>
    );
}