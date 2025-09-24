// src/app/clinic-admin/dashboard/patients/[id]/page.tsx
'use client';

import React, { useState, useEffect, use } from 'react'; // Added 'use' import
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Pencil, CalendarPlus } from 'lucide-react';

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

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  
  // Unwrap the params Promise
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [patient, setPatient] = useState<ClinicPatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const fetchPatient = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user.clinics || user.clinics.length === 0) {
          throw new Error('No clinic is associated with your account.');
        }
        
        const clinicId = user.clinics[0].id;
        
        console.log(`Fetching patient ${patientId} for clinic ${clinicId}`);

        // Fetch a single patient's details from the backend
        const response = await api.get(`/clinic-user/clinic-patient/${patientId}`, {
          params: { clinic_id: clinicId },
        });

        console.log('Patient details response:', response.data);
        setPatient(response.data);
      } catch (err: any) {
        console.error('Failed to fetch patient details:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch patient details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [user, router, patientId]);

  // Handle loading and error states
  if (!user || isLoading) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading patient profile...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (error || !patient) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-600 text-lg mb-4">Error: {error || 'Patient not found.'}</p>
          <Link href="/clinic-admin/dashboard/patients" passHref>
            <Button variant="primary" size="md">Back to Patients</Button>
          </Link>
        </div>
      </ClinicDashboardLayout>
    );
  }

  // Helper function to get initials for the Avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };
  
  // Render the patient profile
  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link href="/clinic-admin/dashboard/patients" passHref>
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 font-inter">Patient Profile</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Create Appointment Button */}
            <Link href={`/clinic-admin/dashboard/appointments/create?patientId=${patient.id}`} passHref>
              <Button variant="outline" size="md" className="flex items-center">
                <CalendarPlus className="h-5 w-5 mr-2" />
                Create Appointment
              </Button>
            </Link>
            {/* Edit Patient Details Button */}
            <Link href={`/clinic-admin/dashboard/patients/${patient.id}/edit`} passHref>
              <Button variant="secondary" size="md" className="flex items-center">
                <Pencil className="h-5 w-5 mr-2" />
                Edit Details
              </Button>
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Patient Overview Card (1 whole space) */}
          <Card padding="lg" className="flex items-center p-6 shadow-md">
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-gray-800">{patient.first_name} {patient.last_name}</h2>
              <p className="text-sm text-gray-500">
                Patient Code: <span className="font-medium text-gray-700">{patient.patient_code || 'N/A'}</span>
              </p>
              <p className="text-sm text-gray-500">
                Registered on: <span className="font-medium text-gray-700">{new Date(patient.registered_at).toLocaleDateString()}</span>
              </p>
            </div>
          </Card>
          
          {/* Contact Info and Appointment details (2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="lg" className="shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Contact Information</h3>
              <div className="space-y-4 text-gray-700">
                <div>
                  <p className="font-semibold">Email</p>
                  <p>{patient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold">Phone Number</p>
                  <p>{patient.phone_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold">Address</p>
                  <p>{patient.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold">Emergency Contact</p>
                  <p>{patient.emergency_contact || 'N/A'}</p>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Appointment Details</h3>
              <p className="text-gray-500">Upcoming appointments and a list of past appointments would be displayed here.</p>
            </Card>
          </div>

          {/* Clinic Notes and Vital Details (2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="lg" className="shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Internal Clinic Notes</h3>
              <p className="text-gray-700">{patient.clinic_notes || 'No notes available.'}</p>
            </Card>

            <Card padding="lg" className="shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Vital Details</h3>
              <p className="text-gray-500">A list of recorded vitals and metrics would be displayed here.</p>
            </Card>
          </div>
        </div>
      </div>
    </ClinicDashboardLayout>
  );
}