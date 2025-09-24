// src/app/clinic-admin/dashboard/patients/add/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { Label } from '@radix-ui/react-label';
import Input from '@/components/ui/Input';
import { ArrowLeft, UserPlus } from 'lucide-react';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  emergency_contact: string;
  patient_code: string;
}

export default function AddPatientPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    emergency_contact: '',
    patient_code: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for user and admin role on page load
    if (!user) {
      router.push('/auth/login');
    } else if (user.role !== 'clinic_admin') {
      setErrorMessage('You do not have permission to access this page.');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Get clinic_id from the first clinic associated with the user
    const clinic_id = user?.clinics?.[0]?.id;

    if (!clinic_id) {
      setErrorMessage('User is not associated with any clinic.');
      setIsLoading(false);
      return;
    }

    try {
      // API call to create a new patient
      await api.post('/clinic-user/clinic-patient', {
        ...formData,
        clinic_id,
      });

      setSuccessMessage('Patient added successfully!');
      // Optionally clear the form or redirect
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
        emergency_contact: '',
        patient_code: '',
      });
    } catch (err: any) {
      console.error('Failed to add patient:', err);
      setErrorMessage(err.response?.data?.error || 'Failed to add patient.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading user data...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (user.role !== 'clinic_admin') {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600">Access denied. Current role: {user.role}</p>
          </div>
        </div>
      </ClinicDashboardLayout>
    );
  }

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex items-center mb-6">
          <Link href="/clinic-admin/dashboard/patients" passHref>
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
            <UserPlus className="h-8 w-8 mr-2 text-[var(--color-primary-brand)]" />
            Add New Patient
          </h1>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{errorMessage}</p>
          </div>
        )}

        <Card padding="lg" className="w-full max-w-2xl mx-auto shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="mt-1"
                  label = "First Name"
                />
              </div>
              <div>
                
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="mt-1"
                  label = "Last Name"
                />
              </div>
            </div>
            <div>
              
              <Input
                id="patient_code"
                name="patient_code"
                type="text"
                value={formData.patient_code}
                onChange={handleChange}
                className="mt-1"
                label = "Patient Code"
              />
            </div>
            <div>
              
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1"
                label = "Email"
              />
            </div>
            <div>
              
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="mt-1"
                label = "Phone Number"
              />
            </div>
            <div>
              
              <Input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                className="mt-1"
                label = "Address"
              />
            </div>
            <div>
             
              <Input
                id="emergency_contact"
                name="emergency_contact"
                type="text"
                value={formData.emergency_contact}
                onChange={handleChange}
                className="mt-1"
                label = "Emergency Contact"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" disabled={isLoading} shine>
                {isLoading ? 'Adding Patient...' : 'Add Patient'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </ClinicDashboardLayout>
  );
}

// NOTE: This component assumes that the following components and libraries are available:
// - `useAppSelector` for Redux state management.
// - `api` service for API calls.
// - `<Card>`, `<Button>`, and `<ClinicDashboardLayout>` for the UI.
// - `@radix-ui/react-label` and `@/components/ui/input` for form elements.
// - `lucide-react` for icons.
