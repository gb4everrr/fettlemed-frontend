// src/app/clinic-admin/profile-setup/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { authRequest, authFailure, authSuccess } from '@/lib/features/auth/authSlice';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';


interface ClinicProfile {
  id?: number;
  name: string;
  address: string;
  email: string;
  phone: string;
}

export default function ClinicProfileSetupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, error: globalError, isAuthenticated, token: reduxToken } = useAppSelector((state) => state.auth); 

  const [clinicData, setClinicData] = useState<ClinicProfile>({
    name: '',
    address: '',
    email: '',
    phone: '',
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingClinic, setHasExistingClinic] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'clinic_admin') {
      router.push('/auth/login');
      return; 
    }

    if (isFetchingData) {
      const fetchClinicData = async () => {
        setFormError(null);
        try {
          // This fetches from backend
          if (user.clinics && user.clinics.length > 0) {
            setClinicData(user.clinics[0]);
            setHasExistingClinic(true);
            setIsEditMode(false);
          } else {
            setHasExistingClinic(false);
            setIsEditMode(true);
            setFormError('Please set up your clinic profile to proceed.');
          }
        } catch (err: any) {
          console.error('ProfileSetupPage: Failed to fetch clinic data (AxiosError):', err);
          if (err.response?.status !== 404) {
            const errorMessage = err.response?.data?.message || 'Failed to load clinic data. Please try again.';
            setFormError(errorMessage);
          }
          setHasExistingClinic(false);
          setIsEditMode(true);
        } finally {
          setIsFetchingData(false);
        }
      };
      fetchClinicData();
    }
  }, [isAuthenticated, user, router, isFetchingData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setClinicData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      let clinicResponse;
      if (!hasExistingClinic) {
        clinicResponse = await api.post('/clinic/register', clinicData);
      } else {
        clinicResponse = await api.put(`/clinic/${clinicData.id}`, clinicData);
      }
      if (user) { 
          // CORRECTED: Dispatch authSuccess with the updated clinics array
          dispatch(authSuccess({ 
              user: { ...user, profileSetupComplete: true, clinics: [clinicResponse.data.clinic] }, 
              token: reduxToken || localStorage.getItem('token') || '' 
          }));
      }
      router.push('/clinic-admin/dashboard');
    } catch (err: any) {
      console.error('ProfileSetupPage: Failed to save clinic data:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save clinic profile. Please check your inputs.';
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingData) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <p className="text-gray-700 text-lg font-inter">Loading clinic profile...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <nav className="fixed top-0 left-0 right-0 z-50 py-3 px-6 md:px-10 flex justify-between items-center glassmorphic-navbar">
        <div className="flex items-center">
          <Image src="/images/Fettle Universe.png" alt="Fettlemed Logo" width={32} height={32} className="rounded-full" />
          <span className="ml-2 text-xl font-bold text-gray-800 font-inter">Fettlemed</span>
        </div>
        <div>
          <Link href="/clinic-admin/dashboard" passHref>
            <Button variant="outline" size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mt-16">
        <Card className="w-full text-center p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-5 font-inter">
            {hasExistingClinic ? 'Update Clinic Profile' : 'Set Up Your Clinic Profile'}
          </h2>
          
          {formError && <p className="text-red-500 text-xs mb-4">{formError}</p>}
          {globalError && <p className="text-red-500 text-xs mb-4">{globalError}</p>}

          <form onSubmit={handleSubmit}>
            <Input
              id="name"
              type="text"
              value={clinicData.name}
              onChange={handleChange}
              placeholder="Clinic Name"
              required
              className="mb-4"
              disabled={!isEditMode}
            />
            <Input
              id="address"
              type="text"
              value={clinicData.address}
              onChange={handleChange}
              placeholder="Clinic Address"
              required
              className="mb-4"
              disabled={!isEditMode}
            />
            <Input
              id="email"
              type="email"
              value={clinicData.email}
              onChange={handleChange}
              placeholder="Clinic Email"
              required
              className="mb-4"
              disabled={!isEditMode}
            />
            <Input
              id="phone"
              type="tel"
              value={clinicData.phone}
              onChange={handleChange}
              placeholder="Clinic Phone Number"
              required
              className="mb-6"
              disabled={!isEditMode}
            />

            {!hasExistingClinic || isEditMode ? (
              <Button type="submit" variant="primary" size="lg" shine className="w-full mb-4" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (hasExistingClinic ? 'Update Profile' : 'Save Profile')}
              </Button>
            ) : (
              <Button type="button" onClick={() => setIsEditMode(true)} variant="secondary" size="lg" shine className="w-full mb-4">
                Edit Profile
              </Button>
            )}
            
            <p className="text-gray-600 text-xs font-inter">
              {hasExistingClinic ? 'Your clinic profile is set up.' : 'Please complete your clinic profile to proceed.'}
            </p>
          </form>
        </Card>
      </main>

      <footer className="w-full py-3 text-center text-gray-600 text-xs font-inter">
        &copy; {new Date().getFullYear()} Fettlemed. All rights reserved.
      </footer>
    </div>
  );
}