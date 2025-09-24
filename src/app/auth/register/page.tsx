// src/app/auth/register/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { authRequest, authSuccess, authFailure } from '@/lib/features/auth/authSlice';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function RegisterPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [role, setRole] = useState<'doctor' | 'clinic_admin' | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'doctor' || roleParam === 'clinic_admin') {
      setRole(roleParam);
    } else {
      setRole('clinic_admin'); 
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      dispatch(authFailure('Passwords do not match.'));
      return;
    }

    if (!role) {
      dispatch(authFailure('Please select a role to register.'));
      return;
    }

    dispatch(authRequest());

    try {
      // CORRECTED: Remove /api from the path
      const response = await api.post('/auth/register', { // Changed from '/api/auth/register'
        email,
        password,
        role,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);

      dispatch(authSuccess({ user, token }));

      if (user.role === 'doctor') {
        router.push('/doctor/profile-setup');
      } else if (user.role === 'clinic_admin') {
        router.push('/clinic-admin/profile-setup');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      dispatch(authFailure(errorMessage));
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <nav className="fixed top-0 left-0 right-0 z-50 py-3 px-6 md:px-10 flex justify-between items-center glassmorphic-navbar">
          <div className="flex items-center">
            <Image src="/images/Fettle Universe.png" alt="Fettlemed Logo" width={32} height={32} className="rounded-full" />
            <span className="ml-2 text-xl font-bold text-gray-800 font-inter">Fettlemed</span>
          </div>
          <div>
            <Link href="/" passHref>
              <Button variant="outline" size="sm">Back to Home</Button>
            </Link>
          </div>
        </nav>
        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mt-16">
          <Card className="w-full text-center p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 font-inter">Register As:</h2>
            <div className="flex flex-col space-y-4">
              <Button onClick={() => router.push('/auth/register?role=clinic_admin')} variant="primary" size="lg" shine>
                Clinic Admin
              </Button>
              <Button onClick={() => router.push('/auth/register?role=doctor')} variant="secondary" size="lg" shine>
                Doctor
              </Button>
            </div>
            <p className="text-gray-600 text-xs font-inter mt-6">
              Already have an account?{' '}
              <Link href="/auth/login" passHref>
                <Button variant="outline" size="sm">Login here</Button>
              </Link>
            </p>
          </Card>
        </main>
        <footer className="w-full py-3 text-center text-gray-600 text-xs font-inter">
          &copy; {new Date().getFullYear()} Fettlemed. All rights reserved.
        </footer>
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
          <Link href="/" passHref>
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mt-16">
        <Card className="w-full text-center p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-5 font-inter">Register as {role === 'clinic_admin' ? 'Clinic Admin' : 'Doctor'}</h2>
          <form onSubmit={handleSubmit}>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              label="First Name"
              required
              className="mb-4"
            />
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              label="Last Name"
              required
              className="mb-4"
            />
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              label="Phone Number"
              required
              className="mb-4"
            />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              label="Email Address"
              required
              className="mb-4"
            />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Create a password"
              required
              className="mb-4"
            />
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              label="Confirm your password"
              required
              className="mb-6"
            />

            {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

            <Button type="submit" variant="primary" size="lg" shine className="w-full mb-4" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
            <p className="text-gray-600 text-xs font-inter">
              Already have an account?{' '}
              <Link href="/auth/login" passHref>
                <Button variant="outline" size="sm">Login here</Button>
              </Link>
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