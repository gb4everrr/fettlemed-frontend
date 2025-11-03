'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { logout } from '@/lib/features/auth/authSlice';
import { toggleSidebar } from '@/lib/features/ui/uiSlice';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Activity, 
  Settings, 
  Receipt, 
  Building2,
  ChevronLeft,
  Menu,
  X
} from 'lucide-react';

const ClinicDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showText, setShowText] = useState(true);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const { sidebarCollapsed } = useAppSelector((state) => state.ui || { sidebarCollapsed: false });

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  const handleToggleSidebar = () => {
    if (!sidebarCollapsed) {
      // Collapsing: hide text immediately
      setShowText(false);
      dispatch(toggleSidebar());
    } else {
      // Expanding: dispatch first, then show text after delay
      dispatch(toggleSidebar());
      setTimeout(() => {
        setShowText(true);
      }, 150); // Reduced delay for smoother experience
    }
  };

  // Sync showText with sidebarCollapsed on mount
  React.useEffect(() => {
    setShowText(!sidebarCollapsed);
  }, []);

  const menuItems = [
    { href: '/clinic-admin/dashboard/doctors', label: 'My Doctors', icon: UserCheck },
    { href: '/clinic-admin/dashboard/patients', label: 'My Patients', icon: Users },
    { href: '/clinic-admin/dashboard/appointments', label: 'My Appointments', icon: Calendar },
    { href: '/clinic-admin/dashboard/vitals', label: 'Vitals Configuration', icon: Activity },
    { href: '/clinic-admin/dashboard/services', label: 'Service Configuration', icon: Settings },
    { href: '/clinic-admin/dashboard/invoices', label: 'Invoice Management', icon: Receipt },
    { href: '/clinic-admin/profile-setup', label: 'Clinic Profile', icon: Building2 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-light-background)]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 py-3 px-6 md:px-10 flex justify-between items-center glassmorphic-navbar">
        <div className="flex items-center">
          <button 
            className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] text-[var(--color-text-dark)]"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <Image src="/images/Fettle Universe.png" alt="Fettlemed Logo" width={32} height={32} className="rounded-sm ml-2 md:ml-0" />
          <span className="ml-2 text-xl text-[var(--color-text-dark)] font-inter">
            <Link href="/clinic-admin/dashboard/" passHref> 
              Fettlemed
            </Link>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-[var(--color-text-dark)] hidden md:inline">Welcome, {user?.firstName || 'Admin'}!</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </nav>

      {/* Main content area with sidebar */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside 
          className={`
            fixed md:static top-0 left-0 bg-[var(--color-surface)] glassmorphic-card 
            transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            transition-all duration-300 ease-in-out z-40 py-4 pt-20 md:pt-4
            flex flex-col relative
            ${sidebarCollapsed ? 'w-16' : 'w-60'}
          `}
        >
          {/* Mobile Close Button */}
          <button 
            className="md:hidden absolute top-4 right-4 p-2 rounded-md text-[var(--color-text-dark)] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)]"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Header section with collapse button */}
          <div className={`flex items-center mb-6 transition-all duration-300 ${sidebarCollapsed ? 'justify-center px-0' : 'px-4'}`}>
            {/* Desktop Collapse Button - only when expanded */}
            {!sidebarCollapsed && (
              <button
                className="hidden md:flex mr-2 bg-transparent hover:bg-gray-100 rounded-md p-1.5 transition-colors flex-shrink-0"
                onClick={handleToggleSidebar}
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-5 w-5 text-[var(--color-text-secondary)]" />
              </button>
            )}

            {/* Desktop Expand Button - only when collapsed */}
            {sidebarCollapsed && (
              <button
                className="hidden md:flex bg-transparent hover:bg-gray-100 rounded-md p-1.5 transition-colors"
                onClick={handleToggleSidebar}
                title="Expand sidebar"
              >
                <Menu className="h-5 w-5 text-[var(--color-text-secondary)]" />
              </button>
            )}

            {/* Header text - fade in after animation */}
            {!sidebarCollapsed && showText && (
              <h3 className="text-lg font-semibold text-[var(--color-text-dark)] font-inter animate-fade-in">
                Clinic Admin Portal
              </h3>
            )}
          </div>
          
          <nav className="flex flex-col flex-1 overflow-y-auto w-full">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link key={item.href} href={item.href} passHref className="w-full">
                  <Button 
                    variant="sidebar" 
                    className={`w-full transition-all duration-300 ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start text-left px-4'}`}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    {sidebarCollapsed ? (
                      <IconComponent className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      showText && <span className="animate-fade-in whitespace-nowrap">{item.label}</span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>
        
        {/* Backdrop for mobile sidebar */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
        
        {/* Content Area */}
        <main className={`flex-1 p-4 transition-all duration-300 ease-in-out`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClinicDashboardLayout;