// src/app/clinic-admin/dashboard/patients/[id]/edit/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Label } from '@radix-ui/react-label';
import Input from '@/components/ui/Input';

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

export default function EditPatientPage() {
    const router = useRouter();
    const { id: patientId } = useParams() as { id: string };
    const { user } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState<Partial<ClinicPatient>>({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
        emergency_contact: '',
        patient_code: '',
        clinic_notes: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // useEffect hook to fetch the patient's data on initial component load
    useEffect(() => {
        // Redirect to login if user is not authenticated or not a clinic admin
        if (!user || user.role !== 'clinic_admin' || !user.clinics || user.clinics.length === 0) {
            router.push('/auth/login');
            return;
        }

        const clinicId = user.clinics[0].id;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch the patient's details from the API
                const res = await api.get(`/clinic-user/clinic-patient/${patientId}`, { 
                    params: { clinic_id: clinicId } 
                });
                
                // Pre-populate the form with the fetched data
                const patientData = res.data;
                setFormData(patientData);
            } catch (err: any) {
                console.error('Failed to fetch patient data:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load patient profile for editing.';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [patientId, user, router]);

    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        const clinicId = user?.clinics?.[0]?.id;
        if (!clinicId) {
            setError('User is not associated with a clinic.');
            setIsSaving(false);
            return;
        }

        try {
            // Send a PUT request to update the patient's profile
            await api.put(`/clinic-user/clinic-patient/${patientId}`, { ...formData, clinic_id: clinicId });
            setSuccessMessage('Patient profile updated successfully!');
            // Redirect to the patient's profile page after a successful update
            router.push(`/clinic-admin/dashboard/patients/${patientId}`);
        } catch (err: any) {
            console.error('Failed to update patient profile:', err);
            const errorMessage = err.response?.data?.error || 'Failed to update profile. Please try again.';
            setError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    // Render loading spinner while data is being fetched
    if (isLoading) {
        return <ClinicDashboardLayout><LoadingSpinner /></ClinicDashboardLayout>;
    }

    // Render error message if fetching fails
    if (error && !formData.id) {
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
    
    return (
        <ClinicDashboardLayout>
            <div className="p-6 md:p-8 font-inter">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Link href={`/clinic-admin/dashboard/patients/${patientId}`} passHref>
                            <Button variant="ghost" size="sm" className="mr-2">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                Edit {formData.first_name} {formData.last_name}
                            </h1>
                            <p className="text-gray-600 mt-1">Update the patient's personal details and notes.</p>
                        </div>
                    </div>
                </div>

                {/* Main Edit Form Card */}
                <Card padding="lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Success and Error Messages */}
                        {successMessage && (
                            <div className="bg-green-100 text-green-700 p-4 rounded-lg text-sm">
                                {successMessage}
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-100 text-red-700 p-4 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Form Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div>
                                <Label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</Label>
                                <Input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name || ''}
                                    onChange={handleChange}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            
                            {/* Last Name */}
                            <div>
                                <Label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</Label>
                                <Input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name || ''}
                                    onChange={handleChange}
                                    required
                                    className="mt-1"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</Label>
                                <Input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                    className="mt-1"
                                />
                            </div>

                            {/* Phone Number */}
                            <div>
                                <Label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Phone Number</Label>
                                <Input
                                    type="tel"
                                    id="phone_number"
                                    name="phone_number"
                                    value={formData.phone_number || ''}
                                    onChange={handleChange}
                                    required
                                    className="mt-1"
                                />
                            </div>

                            {/* Patient Code */}
                            <div>
                                <Label htmlFor="patient_code" className="block text-sm font-medium text-gray-700">Patient Code</Label>
                                <Input
                                    type="text"
                                    id="patient_code"
                                    name="patient_code"
                                    value={formData.patient_code || ''}
                                    onChange={handleChange}
                                    className="mt-1"
                                />
                            </div>

                            {/* Emergency Contact */}
                            <div>
                                <Label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700">Emergency Contact</Label>
                                <Input
                                    type="text"
                                    id="emergency_contact"
                                    name="emergency_contact"
                                    value={formData.emergency_contact || ''}
                                    onChange={handleChange}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <Label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</Label>
                            <textarea
                                id="address"
                                name="address"
                                rows={3}
                                value={formData.address || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        {/* Clinic Notes */}
                        <div>
                            <Label htmlFor="clinic_notes" className="block text-sm font-medium text-gray-700">Clinic Notes</Label>
                            <textarea
                                id="clinic_notes"
                                name="clinic_notes"
                                rows={4}
                                value={formData.clinic_notes || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        {/* Form Action Buttons */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <Link href={`/clinic-admin/dashboard/patients/${patientId}`} passHref>
                                <Button type="button" variant="secondary" size="md">
                                    Cancel
                                </Button>
                            </Link>
                            <Button 
                                type="submit" 
                                variant="primary" 
                                size="md" 
                                disabled={isSaving}
                                shine
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </ClinicDashboardLayout>
    );
}
