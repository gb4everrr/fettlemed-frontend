// src/components/DoctorDashboardLayout.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { logout } from '@/lib/features/auth/authSlice';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

// The layout now accepts an optional headerText prop
const DoctorDashboardLayout = ({ children, headerText }: { children: React.ReactNode, headerText?: string }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/auth/login');
  };
  
  // Use the text passed from the page, or fall back to the user's name from Redux
  const welcomeMessage = headerText || `''`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="fixed top-0 left-0 right-0 z-50 py-3 px-6 md:px-10 flex justify-between items-center glassmorphic-navbar">
        <div className="flex items-center">
          <button 
            className="md:hidden p-2 rounded-md text-gray-700"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          <Image src="/images/Fettle Universe.png" alt="Fettlemed Logo" width={32} height={32} className="rounded-sm ml-2 md:ml-0" />
          <span className="ml-2 text-xl text-gray-800 font-inter">
            <Link href="/doctor/dashboard" passHref> 
              Fettlemed
            </Link>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {/*<span className="text-sm font-medium text-gray-700 hidden md:inline">{welcomeMessage}</span>*/}
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </nav>

      <div className="flex flex-1 pt-16">
        <aside 
          className={`
            fixed md:static top-0 left-0 w-60 bg-white glassmorphic-card 
            transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            transition-transform duration-300 ease-in-out z-40 p-4 pt-8 md:pt-4
            flex flex-col
          `}
        >
          <button 
            className="md:hidden absolute top-4 right-4 p-2 rounded-md text-gray-700"
            onClick={() => setIsSidebarOpen(false)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-gray-800 mb-6 mt-4 font-inter">Doctor's Portal</h3>
          <nav className="flex flex-col space-y-2">
            <Link href="/doctor/dashboard/calendar" passHref>
              <Button variant="ghost" className="w-full justify-start text-left">Schedule</Button>
            </Link>
            <Link href="/doctor/dashboard/appointments" passHref>
              <Button variant="ghost" className="w-full justify-start text-left">My Appointments</Button>
            </Link>
            <Link href="/doctor/dashboard/patients" passHref>
              <Button variant="ghost" className="w-full justify-start text-left">My Patients</Button>
            </Link>
            <Link href="/doctor/dashboard/clinics" passHref>
              <Button variant="ghost" className="w-full justify-start text-left">My Clinics</Button>
            </Link>
            <Link href="/doctor/dashboard/availability" passHref>
              <Button variant="ghost" className="w-full justify-start text-left">My Availability</Button>
            </Link>
            <Link href="/doctor/dashboard/invoices" passHref>
              <Button variant="ghost" className="w-full justify-start text-left">Patient Invoices</Button>
            </Link>
            <Link href="/doctor/dashboard/profile-setup" passHref>
              <Button variant="ghost" className="w-full justify-start text-left text-color-text-secondary">My Profile</Button>
            </Link>
          </nav>
        </aside>
        
        {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
        
        <main className={`flex-1 p-4 transition-all duration-300 ease-in-out`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DoctorDashboardLayout;