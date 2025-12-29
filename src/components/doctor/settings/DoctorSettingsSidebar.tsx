'use client';

import React from 'react';
import { User, Building, Clock, Activity, Layers, List } from 'lucide-react';

interface DoctorSettingsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DoctorSettingsSidebar: React.FC<DoctorSettingsSidebarProps> = ({ activeTab, setActiveTab }) => {
  
  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium mr-4 transition-all duration-200
        ${activeTab === id 
          ? 'bg-gray-100 text-primary border-l-4 border-var(--color-primary-brand)' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'}
      `}
    >
      <Icon className={`h-5 w-5 ${activeTab === id ? 'text-var(--color-primary-brand)' : 'text-gray-400'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 lg:border-r border-gray-200 lg:min-h-[calc(100vh-12rem)]">
      <nav className="space-y-1 py-2">
        {/* Section 1: Settings & Profile */}
        <div className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider font-inter">
            Settings & Profile
        </div>
        <NavItem id="profile" label="View Profile" icon={User} />

        {/* Section 2: Clinic Management */}
        <div className="px-4 py-3 mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-inter">
            Clinic Management
        </div>
        <NavItem id="clinics" label="View Clinic Info" icon={Building} />
        <NavItem id="availability" label="Manage Availability" icon={Clock} />
         <div className="px-4 py-3 mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-inter">
            Vitals Management
        </div>
        <NavItem id="vitals" label="Vitals Assignment" icon={Activity} />
        <NavItem id="templates" label="Vitals Templtes" icon={Layers} />
        <NavItem id="library" label="Vitals Library" icon={List} />
      </nav>
    </aside>
  );
};