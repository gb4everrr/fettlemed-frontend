// src/app/auth/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { authRequest, authSuccess, authFailure } from '@/lib/features/auth/authSlice';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(authFailure(null)); // This resets isLoading and clears any error
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(authRequest());

    try {
      const response = await api.post('/auth/login', { email, password }); 
      const { token, user } = response.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }

      dispatch(authSuccess({ user, token }));

      if (user.role === 'clinic_admin') {
        // CORRECTED: Check for existence of user.clinics array
        if (user.clinics && user.clinics.length > 0) {
          router.push('/clinic-admin/dashboard');
        } else {
          router.push('/clinic-admin/profile-setup'); 
        }
      } else if (user.role === 'doctor') {
        if (user.profileSetupComplete) {
          router.push('/doctor/dashboard');
        } else {
          router.push('/doctor/profile-setup');
        }
      } else {
        router.push('/');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      dispatch(authFailure(errorMessage));
    }
  };

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
          <h2 className="text-2xl font-bold text-gray-800 mb-5 font-inter">Welcome Back!</h2>
          <form onSubmit={handleSubmit}>
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
              label="Password"
              required
              className="mb-6"
            />

            {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

            <Button type="submit" variant="primary" size="lg" shine className="w-full mb-4" disabled={isLoading}>
              {isLoading ? 'Logging In...' : 'Login'}
            </Button>
            <p className="text-gray-600 text-xs font-inter">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" passHref>
                <Button variant="outline" size="sm">Register here</Button>
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