'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { SettingsSidebar } from './components/SettingsSidebar';
import { GeneralSettings } from './components/GeneralSettings';
import { BrandingSettings } from './components/BrandingSettings'; 
import { VitalsLibrary } from './components/VitalsLibrary';     
import { VitalsAssignment } from './components/VitalsAssignment';
// 1. IMPORT THE NEW COMPONENT
import { VitalTemplates } from './components/VitalTemplates'; 

export default function SettingsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('general');

  if (!user) return <div className="p-8">Loading settings...</div>;

  return (
    <ClinicDashboardLayout>
      <div className="min-h-screen p-6 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-gray-800 font-inter tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">Manage clinic profile, branding, and configurations.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="flex-1 min-w-0">
             {activeTab === 'general' && <GeneralSettings user={user} dispatch={dispatch} />}
             {activeTab === 'branding' && <BrandingSettings />}
             
             {activeTab === 'vitals_lib' && user.clinics?.[0] && (
               <VitalsLibrary clinicId={user.clinics[0].id} />
             )}
             
             {/* 2. ADD THIS BLOCK TO RENDER THE TEMPLATES VIEW */}
             {activeTab === 'vital_templates' && user.clinics?.[0] && (
               <VitalTemplates clinicId={user.clinics[0].id} />
             )}

             {activeTab === 'vitals_assign' && user.clinics?.[0] && (
               <VitalsAssignment clinicId={user.clinics[0].id} />
             )}
          </main>
        </div>
      </div>
    </ClinicDashboardLayout>
  );
}