// src/app/clinic-admin/dashboard/doctors/[id]/edit/page.tsx
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

// Define the interface for the ClinicDoctor object
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

export default function EditDoctorProfilePage() {
    const router = useRouter();
    const params = useParams();
    const doctorId = params.id;
    const { user } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState<Partial<ClinicDoctor>>({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
        medical_reg_no: '',
        specialization: '',
        started_date: '',
        active: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // useEffect hook to fetch the doctor's data on initial component load
    useEffect(() => {
        // Redirect to login if user is not authenticated or not associated with a clinic
        if (!user || !user.clinics || user.clinics.length === 0) {
            router.push('/auth/login');
            return;
        }

        const clinicId = user.clinics[0].id;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch the doctor's details from the API
                const res = await api.get(`/clinic-user/clinic-doctor/${doctorId}`, { 
                    params: { clinic_id: clinicId } 
                });
                
                // Pre-populate the form with the fetched data
                const doctorData = res.data;
                setFormData({
                    ...doctorData,
                    // Format the date for the input field
                    started_date: new Date(doctorData.started_date).toISOString().split('T')[0]
                });
            } catch (err: any) {
                console.error('Failed to fetch doctor data:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load doctor profile for editing.';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [doctorId, user, router]);

    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // Handle checkbox input specifically
        const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));
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
            // Send a PUT request to update the doctor's profile
            await api.put(`/clinic-user/clinic-doctor/${doctorId}`, { ...formData, clinic_id: clinicId });
            setSuccessMessage('Doctor profile updated successfully!');
            // Redirect to the doctor's profile page after a successful update
            router.push(`/clinic-admin/dashboard/doctors/${doctorId}`);
        } catch (err: any) {
            console.error('Failed to update doctor profile:', err);
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
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            Edit Dr. {formData.first_name} {formData.last_name}
                        </h1>
                        <p className="text-gray-600 mt-1">Update the doctor's professional and personal details.</p>
                    </div>
                    {/*<Link href={`/clinic-admin/dashboard/doctors/${doctorId}`}>
                        <Button variant="secondary" size="md">
                            Cancel
                        </Button>
                    </Link>*/}
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
                                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name || ''}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            
                            {/* Last Name */}
                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name || ''}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone_number"
                                    name="phone_number"
                                    value={formData.phone_number || ''}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            {/* Specialization */}
                            <div>
                                <label htmlFor="specialization" className="block text-sm font-medium text-gray-700">Specialization</label>
                                <input
                                    type="text"
                                    id="specialization"
                                    name="specialization"
                                    value={formData.specialization || ''}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            {/* Medical Registration No. */}
                            <div>
                                <label htmlFor="medical_reg_no" className="block text-sm font-medium text-gray-700">Medical Registration No.</label>
                                <input
                                    type="text"
                                    id="medical_reg_no"
                                    name="medical_reg_no"
                                    value={formData.medical_reg_no || ''}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            {/* Started Date */}
                            <div>
                                <label htmlFor="started_date" className="block text-sm font-medium text-gray-700">Started Date</label>
                                <input
                                    type="date"
                                    id="started_date"
                                    name="started_date"
                                    value={formData.started_date || ''}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            {/* Status (Active/Inactive) */}
                            <div className="flex items-center">
                                <input
                                    id="active"
                                    name="active"
                                    type="checkbox"
                                    checked={formData.active || false}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-700">
                                    Active
                                </label>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                id="address"
                                name="address"
                                rows={3}
                                value={formData.address || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        {/* Form Action Buttons */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <Link href={`/clinic-admin/dashboard/doctors/${doctorId}`}>
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
