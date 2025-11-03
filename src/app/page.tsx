'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { authRequest, authSuccess, authFailure } from '@/lib/features/auth/authSlice';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

type FormView = 'home' | 'login' | 'register-clinic' | 'register-doctor';

export default function HomePage() {
  const [currentView, setCurrentView] = useState<FormView>('home');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  // Login state
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  // Reset form when view changes
  useEffect(() => {
    setLoginEmail('');
    setLoginPassword('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    dispatch(authFailure(null));
  }, [currentView, dispatch]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(authRequest());

    try {
      const response = await api.post('/auth/login', { 
        email: loginEmail, 
        password: loginPassword 
      });
      const { token, user } = response.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }

      dispatch(authSuccess({ user, token }));

      if (user.role === 'clinic_admin') {
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      dispatch(authFailure('Passwords do not match.'));
      return;
    }

    const role = currentView === 'register-clinic' ? 'clinic_admin' : 'doctor';
    dispatch(authRequest());

    try {
      const response = await api.post('/auth/register', {
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      
      {/* LEFT SIDE (HERO & GRADIENT) */}
      <div className="flex flex-col justify-center text-left lg:w-1/2 p-12 lg:p-24 gradient-bg-blur text-white relative">
        
        {/* Logo */}
        <div className="flex items-center mb-8">
          <Image 
            src="/images/Fettle Universe.png" 
            alt="Fettlemed Logo" 
            width={40} 
            height={40} 
            className="rounded-full" 
          />
          <span className="ml-3 text-2xl font-bold font-inter">FettleMed</span>
        </div>

        {/* Hero Text */}
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 font-inter leading-tight">
          Unifying Healthcare for a <span className="text-blue-300">Healthier India</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-200 max-w-xl font-inter mb-10">
          Fettlemed seamlessly connects patients, doctors, and clinics on a single, secure platform,
          streamlining healthcare management and improving access to quality care.
        </p>

        {/* Centered Login Button - Only show when on home view */}
        {currentView === 'home' && (
          <div className="flex justify-center w-full">
            <Button 
              variant="secondary" 
              shine 
              size="lg"
              onClick={() => setCurrentView('login')}
            >
              Log In
            </Button>
          </div>
        )}
      </div>

      {/* RIGHT SIDE (DYNAMIC CONTENT) */}
      <div className="lg:w-1/2 bg-white flex flex-col items-center justify-center p-12">
        
        {/* HOME VIEW - Cards */}
        {currentView === 'home' && (
          <>
            <h2 className="text-3xl font-bold text-gray-800 mb-10 font-inter">
              Get Started with FettleMed
            </h2>

            <div className="flex flex-col lg:flex-row gap-10 justify-center items-center">
              
              {/* Clinic Card */}
              <div className="minimal-card hover-reveal text-center text-gray-700 flex-1">
                <div className="card-content">
                  <h2 className="text-2xl font-semibold mb-4">Clinic Management</h2>
                  <p className="text-base text-gray-600 mb-4">
                    Empower your clinic with efficient scheduling, patient records, and administrative tools.
                  </p>
                </div>
                <div className="card-hidden">
                  <p className="text-sm text-gray-500 mb-4">Register as Clinic</p>
                  <Button 
                    variant="primary" 
                    shine 
                    size="sm" 
                    className="px-4 py-1"
                    onClick={() => setCurrentView('register-clinic')}
                  >
                    Register
                  </Button>
                </div>
              </div>

              {/* Doctor Card */}
              <div className="minimal-card hover-reveal text-center text-gray-700 flex-1">
                <div className="card-content">
                  <h2 className="text-2xl font-semibold mb-4">Doctor Portal</h2>
                  <p className="text-base text-gray-600 mb-4">
                    Manage appointments, access patient history, and collaborate effortlessly.
                  </p>
                </div>
                <div className="card-hidden">
                  <p className="text-sm text-gray-500 mb-4">Register as Doctor</p>
                  <Button 
                    variant="primary" 
                    shine 
                    size="sm" 
                    className="px-4 py-1"
                    onClick={() => setCurrentView('register-doctor')}
                  >
                    Register
                  </Button>
                </div>
              </div>

            </div>
          </>
        )}

        {/* LOGIN VIEW */}
        {currentView === 'login' && (
          <div className="w-full max-w-md">
            <button
              onClick={() => setCurrentView('home')}
              className="mb-4 text-gray-600 hover:text-gray-800 flex items-center text-sm"
            >
              ← Back
            </button>
            
            <Card className="w-full text-center p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-5 font-inter">Welcome Back!</h2>
              <form onSubmit={handleLoginSubmit}>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  label="Email Address"
                  required
                  className="mb-4"
                />
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  label="Password"
                  required
                  className="mb-6"
                />

                {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  shine 
                  className="w-full mb-4" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging In...' : 'Login'}
                </Button>
                
                <p className="text-gray-600 text-xs font-inter">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setCurrentView('home')}
                    className="text-blue-600 hover:underline"
                  >
                    Register here
                  </button>
                </p>
              </form>
            </Card>
          </div>
        )}

        {/* REGISTER CLINIC VIEW */}
        {currentView === 'register-clinic' && (
          <div className="w-full max-w-md">
            <button
              onClick={() => setCurrentView('home')}
              className="mb-4 text-gray-600 hover:text-gray-800 flex items-center text-sm"
            >
              ← Back
            </button>
            
            <Card className="w-full text-center p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-5 font-inter">
                Register as Clinic Admin
              </h2>
              <form onSubmit={handleRegisterSubmit}>
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

                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  shine 
                  className="w-full mb-4" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </Button>
                
                <p className="text-gray-600 text-xs font-inter">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setCurrentView('login')}
                    className="text-blue-600 hover:underline"
                  >
                    Login here
                  </button>
                </p>
              </form>
            </Card>
          </div>
        )}

        {/* REGISTER DOCTOR VIEW */}
        {currentView === 'register-doctor' && (
          <div className="w-full max-w-md">
            <button
              onClick={() => setCurrentView('home')}
              className="mb-4 text-gray-600 hover:text-gray-800 flex items-center text-sm"
            >
              ← Back
            </button>
            
            <Card className="w-full text-center p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-5 font-inter">
                Register as Doctor
              </h2>
              <form onSubmit={handleRegisterSubmit}>
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

                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  shine 
                  className="w-full mb-4" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </Button>
                
                <p className="text-gray-600 text-xs font-inter">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setCurrentView('login')}
                    className="text-blue-600 hover:underline"
                  >
                    Login here
                  </button>
                </p>
              </form>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}