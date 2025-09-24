// src/app/clinic-admin/dashboard/patients/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { FaUserMd, FaUser } from 'react-icons/fa'; // Importing icons

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

export default function MyPatientsPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [isFetchingPatients, setIsFetchingPatients] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    // Only proceed if user data is available
    if (!user) {
      console.log('No user found, waiting...');
      return;
    }
    
    // Check if the user is a clinic admin
    if (user.role !== 'clinic_admin') {
      console.log('User role mismatch, redirecting. User role:', user.role);
      router.push('/auth/login');
      return;
    }

    const fetchPatients = async () => {
      setIsFetchingPatients(true);
      setFetchError(null);

      try {
        // Assume the user is associated with at least one clinic.
        // We'll use the ID of the first clinic for this view.
        if (user.clinics && user.clinics.length > 0) {
          const clinicId = user.clinics[0].id;
          console.log('Fetching patients for clinic ID:', clinicId);

          // Call the backend API to get patients for the specific clinic
          const response = await api.get(`/clinic-user/clinic-patient`, {
            params: { clinic_id: clinicId },
          });

          console.log('Patients response:', response.data);
          setPatients(response.data);
        } else {
          console.log('No clinics found for user');
          setPatients([]);
          setFetchError('No clinic is associated with your account. Please set up your clinic profile.');
        }
      } catch (err: any) {
        console.error('Failed to fetch patients:', err);
        setFetchError(err.response?.data?.error || 'Failed to fetch patient list.');
      } finally {
        setIsFetchingPatients(false);
      }
    };

    fetchPatients();
  }, [user, router]);

  // Show loading state while waiting for user data
  if (!user) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading user data...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }
  
  // Show error if the user is not a clinic admin
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

  // Show loading state while fetching patients
  if (isFetchingPatients) {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 font-inter">My Patients</h1>
          <Link href="/clinic-admin/dashboard/patients/add" passHref>
            <Button variant="primary" size="md" shine>Add New Patient</Button>
          </Link>
        </div>

        {fetchError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{fetchError}</p>
          </div>
        )}

        {patients.length === 0 && !fetchError ? (
          <Card padding="md" className="text-center">
            <p className="text-gray-600 font-inter text-sm">No patients found for your clinic. Start by adding one!</p>
            <div className="mt-6">
              <Link href="/clinic-admin/dashboard/patients/add" passHref>
                <Button variant="secondary" size="md" shine>Add First Patient</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
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
                      {/* You could add a status indicator here if the patient model had an 'active' flag */}
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
      </div>
    </ClinicDashboardLayout>
  );
}


