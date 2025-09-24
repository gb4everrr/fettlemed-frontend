// src/app/clinic-admin/dashboard/doctors/add/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { authRequest, authFailure } from '@/lib/features/auth/authSlice';

interface NewDoctorPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  medicalRegNo: string;
  specialization: string;
  startedDate: string;
  address: string;
  clinicId: number;
}

export default function AddDoctorPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<NewDoctorPayload>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    medicalRegNo: '',
    specialization: '',
    address: '',
    startedDate: new Date().toISOString().split('T')[0],
    clinicId: (user?.clinics && user.clinics[0]?.id) || 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle authentication check in useEffect to avoid render-time navigation
  useEffect(() => {
    if (user && user.role !== 'clinic_admin') {
      console.log('User role mismatch, redirecting. User role:', user.role);
      router.push('/auth/login');
    }
  }, [user, router]);

  // Update clinicId when user data changes
  useEffect(() => {
    if (user?.clinics && user.clinics[0]?.id) {
      setFormData(prev => ({ ...prev, clinicId: user.clinics![0].id }));
    }
  }, [user]);

  console.log('Component render - User:', user?.email, 'Role:', user?.role, 'Clinics:', user?.clinics?.length);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    
    // Clear form error when user starts typing
    if (formError) {
      setFormError(null);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.phoneNumber.trim()) return 'Phone number is required';
    if (!formData.medicalRegNo.trim()) return 'Medical registration number is required';
    if (!formData.specialization.trim()) return 'Specialization is required';
    if (!formData.startedDate) return 'Started date is required';
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted, current state:', {
      isSubmitting,
      isLoading,
      clinicId: formData.clinicId,
      userRole: user?.role,
      hasClinic: user?.clinics && user.clinics[0]?.id
    });
    
    // Clear previous errors
    setFormError(null);
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!user?.clinics || !user.clinics[0]?.id) {
      setFormError('No clinic ID found. Please set up your clinic profile first.');
      return;
    }

    setIsSubmitting(true);
    dispatch(authRequest());

    try {
      // Clean the payload - map frontend field names to backend expected names
      const payload = {
        clinic_id: Number(formData.clinicId),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phoneNumber.trim(),
        medical_reg_no: formData.medicalRegNo.trim(),
        specialization: formData.specialization.trim(),
        started_date: formData.startedDate,
        address: formData.address.trim(), // Now using the address from form
      };
      
      console.log('Submitting payload:', payload);
      
      const response = await api.post('/clinic-user/clinic-doctor', payload);
      
      console.log('Doctor added successfully:', response.data);
      
      // Show success message
      alert('Doctor added successfully!');
      
      // Navigate back to doctors list
      router.push('/clinic-admin/dashboard/doctors');
      
    } catch (err: any) {
      console.error('Failed to add doctor:', err);
      console.error('Full error object:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
        request: err.request
      });
      
      let errorMessage = 'Failed to add doctor. Please try again.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Invalid data provided. Please check your inputs.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        router.push('/auth/login');
        return;
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to add doctors.';
      } else if (err.response?.status === 409) {
        errorMessage = 'A doctor with this email or registration number already exists.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please check the server logs for details.';
      } else {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      }
      
      setFormError(errorMessage);
      
      // Only dispatch auth failure for actual auth issues
      if (err.response?.status === 401) {
        dispatch(authFailure(errorMessage));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (!user) {
    return (
      <ClinicDashboardLayout>
        <div className="flex justify-center items-center p-8">
          <p>Loading user data...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  // Show info if wrong role
  if (user.role !== 'clinic_admin') {
    return (
      <ClinicDashboardLayout>
        <div className="flex justify-center items-center p-8">
          <div className="text-center">
            <p>Access denied. Current role: {user.role}</p>
            <p>Expected role: clinic_admin</p>
            <p>Redirecting...</p>
          </div>
        </div>
      </ClinicDashboardLayout>
    );
  }
  
  if (!user.clinics || !user.clinics[0]?.id) {
    return (
      <ClinicDashboardLayout>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Clinic Profile Incomplete</h1>
          <p className="text-gray-600 text-sm">You must set up your clinic profile before adding doctors.</p>
          <div className="mt-6">
            <Link href="/clinic-admin/profile-setup" passHref>
              <Button variant="primary" size="lg" shine>Go to Profile Setup &rarr;</Button>
            </Link>
          </div>
        </div>
      </ClinicDashboardLayout>
    );
  }

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 font-inter">Add New Doctor</h1>
          <Link href="/clinic-admin/dashboard/doctors" passHref>
            <Button variant="outline" size="sm">Back to Doctors</Button>
          </Link>
        </div>
        
        <div className="max-w-xl mx-auto">
          <Card padding="md" className="p-6 md:p-8">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 mb-6">
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  label="First Name"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  label="Last Name"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  label="Email Address"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  label="Phone Number"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  id="specialization"
                  type="text"
                  value={formData.specialization}
                  onChange={handleChange}
                  label="Specialization"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  label="Address (Optional)"
                  disabled={isSubmitting}
                />
                <Input
                  id="medicalRegNo"
                  type="text"
                  value={formData.medicalRegNo}
                  onChange={handleChange}
                  label="Medical Registration Number"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  id="startedDate"
                  type="date"
                  value={formData.startedDate}
                  onChange={handleChange}
                  label="Started Date"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              
              
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                shine 
                className="w-full" 
                disabled={isSubmitting || isLoading}
                onClick={() => console.log('Button clicked, disabled state:', isSubmitting || isLoading)}
              >
              
                {isSubmitting ? 'Adding Doctor...' : 'Add Doctor'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </ClinicDashboardLayout>
  );
}