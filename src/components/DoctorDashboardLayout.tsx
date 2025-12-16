'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { logout } from '@/lib/features/auth/authSlice';
import { toggleSidebar } from '@/lib/features/ui/uiSlice';
import { useRouter, usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import ClinicThemeProvider from '@/components/provider/ClinicThemeProvider';
import { 
  Calendar, 
  ClipboardList, 
  Users, 
  Building2, 
  Clock, 
  Receipt, 
  User,
  Menu,
  X,
  ArrowLeft,
  PanelLeftClose,
  PanelRightClose
} from 'lucide-react';
import { RxDashboard } from 'react-icons/rx';

const DoctorDashboardLayout = ({ children, headerText }: { children: React.ReactNode, headerText?: string }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showText, setShowText] = useState(true);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAppSelector((state: any) => state.auth);
  const { sidebarCollapsed } = useAppSelector((state) => state.ui || { sidebarCollapsed: false });

  const doctorName = user?.last_name || 'Doctor';

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  const handleToggleSidebar = () => {
    if (!sidebarCollapsed) {
      setShowText(false);
      dispatch(toggleSidebar());
    } else {
      dispatch(toggleSidebar());
      setTimeout(() => {
        setShowText(true);
      }, 150);
    }
  };

  // Sync showText with sidebarCollapsed on mount
  React.useEffect(() => {
    setShowText(!sidebarCollapsed);
  }, []);
  
  // Determine if we are on the root dashboard page to conditionally hide the "Back" button
  const isDashboardRoot = pathname === '/doctor/dashboard/' || pathname === '/doctor/dashboard';

  const menuItems = [
    { href: '/doctor/dashboard/', label: 'Dashboard', icon: RxDashboard },
    { href: '/doctor/dashboard/appointments', label: 'Appointments', icon: ClipboardList },
    { href: '/doctor/dashboard/patients', label: 'Patients', icon: Users },
    { href: '/doctor/dashboard/clinics', label: 'Clinics', icon: Building2 },
    { href: '/doctor/dashboard/availability', label: 'Availability', icon: Clock },
    { href: '/doctor/dashboard/invoices', label: 'Invoices', icon: Receipt },
    { href: '/doctor/dashboard/profile-setup', label: 'Settings', icon: User },
  ];

  return (
    <ClinicThemeProvider>
      <div className="fixed inset-0 flex flex-col bg-[var(--color-light-background)]">
        {/* Navbar */}
        <nav className="h-16 py-3 px-6 md:px-10 flex justify-between items-center glassmorphic-navbar backdrop-blur-sm flex-shrink-0 z-50">
          <div className="flex items-center">
            <button 
              className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] text-[var(--color-text-dark)]"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <Image src="/images/F.png" alt="Fettlemed Logo" width={30} height={30} className="rounded-sm ml-2 md:ml-0" />
            <span className="ml-2 text-xl text-[var(--color-text-dark)] font-inter">
              <Link href="/doctor/dashboard/" passHref> 
                <span className="text-xl font-medium text-[var(--color-text-dark)] hidden md:inline">ettlemed</span>
              </Link>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-[var(--color-text-dark)] hidden md:inline">Welcome, Dr. {doctorName}!</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        </nav>

        {/* Main content area with sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside 
            className={`
              fixed md:relative h-full
              top-0 left-0 bg-[var(--color-surface)] glassmorphic-card 
              transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
              transition-all duration-300 ease-in-out z-40 py-4
              flex flex-col flex-shrink-0
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
            <div className={`
              flex items-center mb-6 h-10 flex-shrink-0 
              transition-all duration-300 
              ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'}
            `}>
              <button
                className={`
                  hidden md:flex bg-gray-100 hover:bg-gray-200 rounded-md p-1.5 
                  transition-colors flex-shrink-0 items-center justify-center
                  ${!sidebarCollapsed ? 'mr-2' : ''}
                `}
                onClick={handleToggleSidebar}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <PanelRightClose className="h-5 w-5 text-[var(--color-text-dark)]" />
                ) : (
                  <PanelLeftClose className="h-5 w-5 text-[var(--color-text-dark)]" />
                )}
              </button>

              {!sidebarCollapsed && showText && (
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] font-inter animate-fade-in whitespace-nowrap">
                  Doctor's Portal
                </h3>
              )}
            </div>
            
            <nav className="flex flex-col flex-1 overflow-y-auto w-full">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link key={item.href} href={item.href} passHref className="w-full">
                    <Button 
                      variant="sidebar" 
                      className={`
                        w-full transition-all duration-300 flex items-center
                        ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start text-left px-4'}
                        ${isActive ? 'bg-[var(--color-text-dark)]/10 text-[var(--color-text-dark)]' : ''}
                      `}
                      title={sidebarCollapsed ? item.label : ''}
                    >
                      <IconComponent 
                        className={`h-5 w-5 flex-shrink-0 ${!sidebarCollapsed ? 'mr-3' : ''}`} 
                      />
                      {!sidebarCollapsed && showText && (
                        <span className="animate-fade-in whitespace-nowrap">{item.label}</span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Powered by Footer */}
            <div className={`
              mt-auto border-t border-gray-200 py-3 flex-shrink-0 
              transition-all duration-300
              ${sidebarCollapsed ? 'justify-center' : 'px-4'}
            `}>
              {!sidebarCollapsed && showText && (
                <span className="text-xs text-gray-500 font-inter animate-fade-in whitespace-nowrap">
                  Powered by Fettlemed
                </span>
              )}
            </div>
          </aside>
          
          {/* Backdrop for mobile sidebar */}
          {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
          
          {/* Content Area */}
          <main className={`flex-1 p-4 transition-all duration-300 ease-in-out flex flex-col overflow-y-auto`}>
            {!isDashboardRoot && (
              <div className="mb-4">
                <Button 
                  variant="outline"
                  shine
                  onClick={() => router.back()}
                  className="flex items-center text-sm text-[var(--color-text-dark)] hover:text-[var(--color-text-dark)] transition-colors gap-1 group"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform text-[var(--color-text-dark)]" />
                  <span className="text-[var(--color-text-dark)]">Back</span>
                </Button>
              </div>
            )}
            
            {children}
          </main>
        </div>
      </div>
    </ClinicThemeProvider>
  );
};

export default DoctorDashboardLayout;