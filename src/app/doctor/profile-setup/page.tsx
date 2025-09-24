// src/app/doctor/dashboard/profile-setup/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { authSuccess } from '@/lib/features/auth/authSlice';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

// Interface for the doctor's profile data form
interface DoctorProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  medical_reg_no: string;
  specialization: string;
}

export default function DoctorProfileSetupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, token: reduxToken } = useAppSelector((state) => state.auth);

  const [profileData, setProfileData] = useState<DoctorProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    medical_reg_no: '',
    specialization: '',
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated or not a doctor
    if (!isAuthenticated || !user || user.role !== 'doctor') {
      router.push('/auth/login');
      return;
    }

    if (isFetchingData) {
      const fetchDoctorProfile = async () => {
        setFormError(null);
        try {
          // Fetch combined User and DoctorProfile data
          const { data } = await api.get('/profile/doctor');
          setProfileData(data);

          // Check if key professional info exists to determine profile status
          if (data.medical_reg_no && data.specialization) {
            setHasExistingProfile(true);
            setIsEditMode(false);
          } else {
            setHasExistingProfile(false);
            setIsEditMode(true);
            setFormError('Please complete your professional profile to continue.');
          }
        } catch (err: any) {
          console.error('DoctorProfileSetup: Failed to fetch profile data:', err);
          // Pre-fill with basic user data from Redux state if the profile doesn't exist yet
          setProfileData(prev => ({
              ...prev,
              first_name: user.firstName || '',
              last_name: user.lastName || '',
              email: user.email || '',
              phone_number: user.phoneNumber || ''
          }));
          setHasExistingProfile(false);
          setIsEditMode(true);
        } finally {
          setIsFetchingData(false);
        }
      };
      fetchDoctorProfile();
    }
  }, [isAuthenticated, user, router, isFetchingData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      // Create an object with only the professional details to send
      const professionalData = {
        medical_reg_no: profileData.medical_reg_no,
        specialization: profileData.specialization,
      };

      // Send only the professional details to the backend
      const response = await api.put('/profile/doctor', professionalData);
      
      // Update the global user state in Redux with the complete user object from the response
      dispatch(authSuccess({
        user: response.data.user,
        token: reduxToken || localStorage.getItem('token') || ''
      }));

      router.push('/doctor/dashboard');

    } catch (err: any) {
      console.error('DoctorProfileSetup: Failed to save profile:', err);
      const errorMessage = err.response?.data?.error || 'Failed to save profile. Please check your inputs.';
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show a loading indicator while fetching the profile
  if (isFetchingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700 text-lg font-inter">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 font-inter">
      <nav className="fixed top-0 left-0 right-0 z-50 py-3 px-6 md:px-10 flex justify-between items-center glassmorphic-navbar">
        <div className="flex items-center">
          <Image src="/images/Fettle Universe.png" alt="Fettlemed Logo" width={32} height={32} className="rounded-full" />
          <span className="ml-2 text-xl font-bold text-gray-800">Fettlemed</span>
        </div>
        <div>
          <Link href="/doctor/dashboard" passHref>
            <Button variant="outline" size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md mt-16">
        <Card className="w-full text-center p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">
            {hasExistingProfile ? 'Update Your Profile' : 'Set Up Your Profile'}
          </h2>

          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}

          <form onSubmit={handleSubmit} className="text-left space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="first_name"
                label="First Name"
                type="text"
                value={profileData.first_name}
                onChange={handleChange}
                placeholder="John"
                required
                disabled // Personal details are not editable here
              />
              <Input
                id="last_name"
                label="Last Name"
                type="text"
                value={profileData.last_name}
                onChange={handleChange}
                placeholder="Doe"
                required
                disabled // Personal details are not editable here
              />
            </div>
             <Input
                id="email"
                label="Email Address"
                type="email"
                value={profileData.email}
                placeholder="your.email@example.com"
                disabled // Email is the login identifier and should not be editable
                readOnly 
              />
            <Input
              id="phone_number"
              label="Phone Number"
              type="tel"
              value={profileData.phone_number}
              onChange={handleChange}
              placeholder="e.g., +91 98765 43210"
              required
              disabled // Personal details are not editable here
            />
             <Input
              id="medical_reg_no"
              label="Medical Registration No."
              type="text"
              value={profileData.medical_reg_no}
              onChange={handleChange}
              placeholder="Your registration number"
              required
              disabled={!isEditMode && hasExistingProfile} // Only editable when creating or in edit mode
            />
             <Input
              id="specialization"
              label="Specialization"
              type="text"
              value={profileData.specialization}
              onChange={handleChange}
              placeholder="e.g., Cardiology, Pediatrics"
              required
              disabled={!isEditMode && hasExistingProfile} // Only editable when creating or in edit mode
            />

            <div className="pt-2">
                {!hasExistingProfile || isEditMode ? (
                  <Button type="submit" variant="primary" size="lg" shine className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (hasExistingProfile ? 'Update Profile' : 'Save Profile')}
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setIsEditMode(true)} variant="secondary" size="lg" shine className="w-full">
                    Edit Professional Details
                  </Button>
                )}
            </div>
            
            <p className="text-gray-600 text-xs text-center pt-2">
              {hasExistingProfile ? 'Your professional profile is up to date.' : 'Please complete your profile to access all features.'}
            </p>
          </form>
        </Card>
      </main>

      <footer className="w-full py-3 text-center text-gray-600 text-xs">
        &copy; {new Date().getFullYear()} Fettlemed. All rights reserved.
      </footer>
    </div>
  );
}

