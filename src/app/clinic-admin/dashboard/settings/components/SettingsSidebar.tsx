// src/app/clinic-admin/dashboard/settings/components/SettingsSidebar.tsx
'use client';

import React from 'react';
import { Building, Palette, Activity, UserCog, Layers } from 'lucide-react';

interface SettingsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeTab, setActiveTab }) => {
  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium mr-4 transition-all duration-200
        ${activeTab === id 
          ? 'bg-gray-100 text-primary border-l-4 border-primary' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'}
      `}
    >
      <Icon className={`h-5 w-5 ${activeTab === id ? 'text-primary' : 'text-gray-400'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 lg:border-r border-gray-200 lg:min-h-[calc(100vh-12rem)]">
      <nav className="space-y-1 py-2">
        <div className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider font-inter">
          Organization
        </div>
        <NavItem id="general" label="Clinic Profile" icon={Building} />
        <NavItem id="branding" label="Branding" icon={Palette} />
        
        <div className="mt-6 px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider font-inter">
          Clinical Config
        </div>
        <NavItem id="vitals_lib" label="Vitals Library" icon={Activity} />
        <NavItem id="vital_templates" label="Vital Templates" icon={Layers} />
        <NavItem id="vitals_assign" label="Doctor Vitals" icon={UserCog} />
      </nav>
    </aside>
  );
};