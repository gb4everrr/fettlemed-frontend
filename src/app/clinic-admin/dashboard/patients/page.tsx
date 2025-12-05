// src/app/clinic-admin/dashboard/patients/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { FaUser } from 'react-icons/fa';

// --- Import the modal component ---
import { RegisterPatientModal } from '@/components/clinic/modals/RegisterPatientModal';

// Define the interface for a ClinicPatient
interface ClinicPatient {
  id: number;
  clinic_id: number;
  global_patient_id: number | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  emergency_contact: string | null;
  patient_code: string | null;
  clinic_notes: string | null;
  registered_at: string;
}

type ViewMode = 'grid' | 'list';

export default function MyPatientsPage() {
  const router = useRouter();
  const { user } = useAppSelector((state:any) => state.auth);

  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [isFetchingPatients, setIsFetchingPatients] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // State for filters and view
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // --- NEW: State for modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- UPDATED: Wrapped fetch logic in useCallback ---
  // This lets us pass it to the modal for refreshing
  const fetchPatients = useCallback(async () => {
    // Only proceed if user data is available
    if (!user || user.role !== 'clinic_admin') {
      return;
    }

    setIsFetchingPatients(true);
    setFetchError(null);

    try {
      if (user.clinics && user.clinics.length > 0) {
        const clinicId = user.clinics[0].id;
        const response = await api.get(`/clinic-user/clinic-patient`, {
          params: { clinic_id: clinicId },
        });
        setPatients(response.data);
      } else {
        setPatients([]);
        setFetchError('No clinic is associated with your account.');
      }
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
      setFetchError(err.response?.data?.error || 'Failed to fetch patient list.');
    } finally {
      setIsFetchingPatients(false);
    }
  }, [user]); // Dependency on user

  useEffect(() => {
    if (user) {
      fetchPatients();
    } else if (!user) {
      console.log('No user found, waiting...');
    } else if (user.role !== 'clinic_admin') {
      console.log('User role mismatch, redirecting. User role:', user.role);
      router.push('/auth/login');
    }
  }, [user, router, fetchPatients]);
  
  // Filter and search logic
  const filteredPatients = useMemo(() => {
    let filtered = [...patients];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(patient => 
        patient.first_name.toLowerCase().includes(query) ||
        patient.last_name.toLowerCase().includes(query) ||
        patient.email?.toLowerCase().includes(query) ||
        patient.phone_number?.toLowerCase().includes(query) ||
        patient.patient_code?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [patients, searchQuery]);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Loading state while waiting for user data
  if (!user) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading user data...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }
  
  // Show loading state while fetching patients
  if (isFetchingPatients && patients.length === 0) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading patient list...</p>
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
            <h1 className="text-4xl font-black text-gray-800 font-inter tracking-tight">Patient Directory</h1>
            <p className="text-base text-gray-500 font-inter">A comprehensive list of all patients in the clinic.</p>
          </div>
          {/* --- UPDATED: Button now opens modal --- */}
          <Button 
            variant="primary" 
            size="md" 
            shine
            onClick={() => setIsModalOpen(true)}
          >
            <span className="mr-2">+</span> Add New Patient
          </Button>
        </div>

        {fetchError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{fetchError}</p>
          </div>
        )}

        {patients.length === 0 && !fetchError && !isFetchingPatients ? (
          <Card padding="md" className="text-center">
            <p className="text-gray-600 font-inter text-sm">No patients found for your clinic. Start by adding one!</p>
            <div className="mt-6">
              {/* --- UPDATED: Button now opens modal --- */}
              <Button 
                variant="secondary" 
                size="md" 
                shine
                onClick={() => setIsModalOpen(true)}
              >
                Add First Patient
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Search and View Toggle Section */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {/* ... (search and toggle UI unchanged) ... */}
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or patient code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] focus:border-transparent font-inter"
                  />
                </div>
              </div>
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
            {filteredPatients.length === 0 ? (
              <Card padding="md" className="text-center">
                <p className="text-gray-600 font-inter">No patients found matching your criteria.</p>
              </Card>
            ) : (
              <>
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedPatients.map((patient) => (
                      <Link href={`/clinic-admin/dashboard/patients/${patient.id}`} key={patient.id} passHref>
                        <Card padding="md" className="flex flex-col items-start hover:border-[var(--color-primary-brand)] cursor-pointer transition-colors">
                          <div className="flex items-center space-x-4">
                            <FaUser className="text-4xl text-gray-500" />
                            <div>
                              <h3 className="text-lg font-bold">{patient.first_name} {patient.last_name}</h3>
                              <p className="text-sm text-gray-600">Patient Code: {patient.patient_code || 'N/A'}</p>
                              {patient.email && <p className="text-xs text-gray-500">{patient.email}</p>}
                              {patient.phone_number && <p className="text-xs text-gray-500">{patient.phone_number}</p>}
                            </div>
                          </div>
                          <div className="mt-4 w-full">
                            <p className="text-xs text-gray-500 mb-2">
                              Registered: {new Date(patient.registered_at).toLocaleDateString()}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                Active
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
                            <th className="px-6 py-3 text-left font-medium">Patient</th>
                            <th className="px-6 py-3 text-left font-medium">Patient Code</th>
                            <th className="px-6 py-3 text-left font-medium">Email</th>
                            <th className="px-6 py-3 text-left font-medium">Contact</th>
                            <th className="px-6 py-3 text-left font-medium">Registered</th>
                            <th className="px-6 py-3 text-center font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedPatients.map((patient) => (
                            <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <FaUser className="text-xl text-gray-500" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-800">
                                      {patient.first_name} {patient.last_name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ID: {patient.patient_code || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {patient.patient_code || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-600">
                                  {patient.email || 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-600">
                                  {patient.phone_number || 'N/A'}
                                </div>
                                {patient.emergency_contact && (
                                  <div className="text-xs text-gray-500">
                                    Emergency: {patient.emergency_contact}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {new Date(patient.registered_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center justify-center gap-2">
                                  <Link href={`/clinic-admin/dashboard/patients/${patient.id}`}>
                                    <Button variant="ghost" className="text-[var(--color-primary-brand)] hover:text-[var(--color-primary-hover)] font-medium">
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

      {/* --- NEW: Render the modal --- */}
      {isModalOpen && user?.clinics?.[0]?.id && (
        <RegisterPatientModal
          clinicId={user.clinics[0].id}
          onClose={() => setIsModalOpen(false)}
          onPatientAdded={() => {
            fetchPatients(); // This refreshes the list in the background
          }}
        />
      )}
    </ClinicDashboardLayout>
  );
}