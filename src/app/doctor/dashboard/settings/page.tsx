'use client';

import React, { useState, useEffect } from 'react';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import { DoctorSettingsSidebar } from '@/components/doctor/settings/DoctorSettingsSidebar';
import api from '@/services/api';

// Import Content Components
import { ProfileSettings } from '@/components/doctor/settings/ProfileSettings';
import { MyClinicsContent } from '@/components/doctor/settings/MyClinicsContent';
import { AvailabilityContent } from '@/components/doctor/settings/AvailabilityContent';
import { DoctorVitalsSettings } from '@/components/doctor/settings/DoctorVitalsSettings';
import { VitalTemplates } from '@/components/doctor/settings/VitalTemplates';
import { VitalsLibrary } from '@/components/doctor/settings/VitalsLibrary';
import Card from '@/components/ui/Card';
import { ChevronDown, AlertCircle } from 'lucide-react';

const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

interface ClinicContext {
  id: number;
  name: string;
  role: string;
  clinicDoctorId: number;
}

export default function DoctorSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [clinics, setClinics] = useState<ClinicContext[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicContext | null>(null);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);

  // Fetch clinics on mount
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const { data } = await api.get('/doctor/my-clinics-details');
        const rawList = Array.isArray(data) ? data : (data?.data || []);
        
        const list = rawList.map((item: any) => ({
          id: item.clinic?.id,
          name: item.clinic?.name,
          role: (item.assigned_role || item.role || 'DOCTOR_VISITING').toUpperCase(),
          clinicDoctorId: item.id
        }));
        
        setClinics(list);
        if (list.length > 0) setSelectedClinic(list[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingClinics(false);
      }
    };
    fetchClinics();
  }, []);

  // Check if current clinic has privileged role
  const isPrivileged = selectedClinic && PRIVILEGED_ROLES.includes(selectedClinic.role);
  
  // Tabs that require clinic context and privileged access
  const clinicContextTabs = [ 'templates', 'library'];
  const needsClinicContext = clinicContextTabs.includes(activeTab);

  // Render clinic selector for tabs that need it
  const renderClinicSelector = () => {
    if (!needsClinicContext) return null;
    
    if (isLoadingClinics) {
      return (
        <Card className="p-4 mb-4">
          <div className="text-center text-gray-500">Loading clinics...</div>
        </Card>
      );
    }

    if (!selectedClinic) {
      return (
        <Card className="p-12 text-center bg-gray-50 mb-4">
          <div className="max-w-md mx-auto">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-gray-900 font-bold text-lg">No Clinics Found</h3>
            <p className="text-gray-600 text-sm mt-2">You are not associated with any clinics yet.</p>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-bold text-gray-700 flex-shrink-0">
            Clinic Context:
          </label>
          <div className="relative sm:w-80">
            <select
              value={selectedClinic.id}
              onChange={(e) => {
                const c = clinics.find(x => x.id === Number(e.target.value));
                if(c) setSelectedClinic(c);
              }}
              className="w-full appearance-none bg-white border-2 border-gray-200 text-gray-800 font-semibold py-2 px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md font-semibold border border-gray-200">
            {selectedClinic.role.replace('_', ' ')}
          </span>
        </div>
      </Card>
    );
  };

  // Render permission denied message
  const renderPermissionDenied = (tabName: string) => (
    <Card className="p-12 text-center bg-gray-50">
      <div className="max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-gray-900 font-bold text-lg">Insufficient Permissions</h3>
        <p className="text-gray-600 text-sm mt-2">
          You need Owner or Partner permissions in this clinic to manage {tabName}.
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Current role: <span className="font-semibold">{selectedClinic?.role.replace('_', ' ')}</span>
        </p>
      </div>
    </Card>
  );

  return (
    <DoctorDashboardLayout headerText="Settings">
      <div className="min-h-screen p-6 md:p-8">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-black text-gray-800 font-inter tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your profile, clinic preferences, and availability.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <DoctorSettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Clinic Selector - shows for tabs that need it */}
            {renderClinicSelector()}

            {/* Tab Content */}
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'clinics' && <MyClinicsContent />} 
            {activeTab === 'availability' && <AvailabilityContent />}
            
            {activeTab === 'vitals' && (
              selectedClinic ? (
                <DoctorVitalsSettings />
              ) : (
                !isLoadingClinics && <div>No clinic context available</div>
              )
            )}
            
            {activeTab === 'templates' && (
              selectedClinic ? (
                isPrivileged ? (
                  <VitalTemplates clinicId={selectedClinic.id} />
                ) : (
                  renderPermissionDenied('templates')
                )
              ) : (
                !isLoadingClinics && <div>No clinic context available</div>
              )
            )}
            
            {activeTab === 'library' && (
              selectedClinic ? (
                isPrivileged ? (
                  <VitalsLibrary clinicId={selectedClinic.id} />
                ) : (
                  renderPermissionDenied('the vitals library')
                )
              ) : (
                !isLoadingClinics && <div>No clinic context available</div>
              )
            )}
          </main>
        </div>
      </div>
    </DoctorDashboardLayout>
  );
}