'use client';

import React, { useState, useEffect, DragEvent } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { Settings, User, List, Search, ArrowLeft, ArrowRight, Save, X, MoveVertical } from 'lucide-react';
import { Label } from '@radix-ui/react-label';
import Input from '@/components/ui/Input';
import Link from 'next/link';

// Interface for a Clinic Doctor
interface ClinicDoctor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  specialization: string;
}

// Interface for a Vital Configuration from the clinic library
interface ClinicVitalConfig {
  id: number;
  clinic_id: number;
  vital_name: string;
  data_type: string;
  unit: string;
  is_active: boolean;
  is_required: boolean;
  // This is used for the drag-and-drop state
  // This property will be populated by the backend to indicate if a vital is assigned.
  assignments?: {
    vital_config_id: number;
    is_required: boolean;
    sort_order: number;
  }[];
}

// Interface for a vital that is assigned to a doctor
interface DoctorVitalAssignment {
  vital_config_id: number;
  is_required: boolean;
  vitalConfig: ClinicVitalConfig; // Include the full vital config for display
  sort_order: number;
}

export default function DoctorVitalAssignmentPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [vitalsLibrary, setVitalsLibrary] = useState<ClinicVitalConfig[]>([]);
  const [assignedVitals, setAssignedVitals] = useState<DoctorVitalAssignment[]>([]);

  const [selectedDoctor, setSelectedDoctor] = useState<ClinicDoctor | null>(null);
  const [searchDoctor, setSearchDoctor] = useState('');
  const [searchVital, setSearchVital] = useState('');

  const [isFetchingDoctors, setIsFetchingDoctors] = useState(true);
  const [isFetchingVitals, setIsFetchingVitals] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not an admin
    if (!user || user.role !== 'clinic_admin') {
      router.push('/auth/login');
      return;
    }
    // Fetch initial data
    fetchDoctors();
  }, [user, router]);

  // Fetch vitals for the selected doctor when a doctor is chosen
  useEffect(() => {
    if (selectedDoctor) {
      fetchVitalsForDoctor(selectedDoctor.id);
    } else {
      setVitalsLibrary([]);
      setAssignedVitals([]);
    }
  }, [selectedDoctor]);


  // Fetches all doctors for the current clinic
  const fetchDoctors = async () => {
    setIsFetchingDoctors(true);
    try {
      if (!user?.clinics || user.clinics.length === 0) {
        setFetchError('No clinic is associated with your account.');
        return;
      }
      const clinicId = user.clinics[0].id;
      const response = await api.get(`/clinic-user/clinic-doctor`, {
        params: { clinic_id: clinicId },
      });
      setDoctors(response.data);
    } catch (err: any) {
      console.error('Failed to fetch doctors:', err);
      setFetchError(err.response?.data?.error || 'Failed to fetch doctors list.');
    } finally {
      setIsFetchingDoctors(false);
    }
  };

  // Fetches all vitals from the library and the ones assigned to the doctor
  const fetchVitalsForDoctor = async (clinicDoctorId: number) => {
    setIsFetchingVitals(true);
    setFetchError(null);
    try {
      const clinicId = user?.clinics?.[0]?.id;
      if (!clinicId) {
        setFetchError('Clinic information is not available.');
        setIsFetchingVitals(false);
        return;
      }

      const response = await api.get('/clinic-vitals/assignment-manager', {
        params: { clinic_id: clinicId, clinic_doctor_id: clinicDoctorId },
      });
      const allVitals: ClinicVitalConfig[] = response.data;
      
      // Separate the vitals into assigned and unassigned lists.
      const assigned: DoctorVitalAssignment[] = [];
      const unassigned: ClinicVitalConfig[] = [];
      
      allVitals.forEach(vital => {
        if (vital.assignments && vital.assignments.length > 0) {
          // This vital is assigned to the doctor
          assigned.push({
            vital_config_id: vital.id,
            is_required: vital.assignments[0].is_required,
            vitalConfig: vital,
            sort_order: vital.assignments[0].sort_order
          });
        } else {
          // This vital is not assigned
          unassigned.push(vital);
        }
      });
      
      // Sort the assigned vitals by their sort_order
      assigned.sort((a, b) => a.sort_order - b.sort_order);

      setAssignedVitals(assigned);
      setVitalsLibrary(unassigned);
    } catch (err: any) {
      console.error('Failed to fetch vital assignments:', err);
      setFetchError(err.response?.data?.error || 'Failed to fetch vital configurations.');
    } finally {
      setIsFetchingVitals(false);
    }
  };


  // Handles the final save action
  const handleSaveAssignments = async () => {
    if (!selectedDoctor) {
      setFetchError('Please select a doctor first.');
      return;
    }
    
    setIsSaving(true);
    setSuccessMessage(null);
    setFetchError(null);

    try {
      const clinicId = user?.clinics?.[0]?.id;
      if (!clinicId) {
        setFetchError('Clinic information is not available.');
        setIsSaving(false);
        return;
      }

      const payload = {
        clinic_id: clinicId,
        clinic_doctor_id: selectedDoctor.id,
        vital_assignments: assignedVitals.map((vital, index) => ({
          vital_config_id: vital.vital_config_id,
          is_required: vital.is_required,
          sort_order: index, // Update sort_order based on current list order
        })),
      };

      await api.post('/clinic-vitals/doctor-assignments/assign', payload);
      setSuccessMessage('Vital assignments saved successfully!');

    } catch (err: any) {
      console.error('Failed to save assignments:', err);
      setFetchError(err.response?.data?.error || 'Failed to save vital assignments.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDoctors = doctors.filter(doctor => 
    `${doctor.first_name} ${doctor.last_name}`.toLowerCase().includes(searchDoctor.toLowerCase())
  );
  
  const filteredVitals = vitalsLibrary.filter(vital => 
    vital.vital_name.toLowerCase().includes(searchVital.toLowerCase())
  );

  const handleVitalDragStart = (e: DragEvent, vital: ClinicVitalConfig) => {
    e.dataTransfer.setData("vitalId", vital.id.toString());
  };
  
  const handleVitalDragEnd = (e: DragEvent) => {
    e.dataTransfer.clearData();
  };

  const handleAssignedDragStart = (e: DragEvent, vitalId: number) => {
    e.dataTransfer.setData("vitalId", vitalId.toString());
  };

  const handleDropOnAssigned = (e: DragEvent) => {
    e.preventDefault();
    const vitalId = e.dataTransfer.getData("vitalId");
    if (!vitalId) return;

    // Find the vital in the available library list
    const vital = vitalsLibrary.find(v => v.id === parseInt(vitalId));
    if (vital) {
      // Add it to the assigned list
      const newAssignedVital: DoctorVitalAssignment = {
        vital_config_id: vital.id,
        is_required: vital.is_required,
        vitalConfig: vital,
        sort_order: assignedVitals.length,
      };
      setAssignedVitals(prev => [...prev, newAssignedVital]);
      // Remove it from the available library list
      setVitalsLibrary(prev => prev.filter(v => v.id !== vital.id));
    }
  };

  const handleDropOnLibrary = (e: DragEvent) => {
    e.preventDefault();
    const vitalId = e.dataTransfer.getData("vitalId");
    if (!vitalId) return;

    // Find the vital in the assigned list
    const vitalToRemove = assignedVitals.find(v => v.vital_config_id === parseInt(vitalId));
    if (vitalToRemove) {
      // Add it back to the available library list
      setVitalsLibrary(prev => [...prev, vitalToRemove.vitalConfig]);
      // Remove it from the assigned list
      setAssignedVitals(prev => prev.filter(v => v.vital_config_id !== parseInt(vitalId)));
    }
  };

  // Reorder assigned vitals using drag and drop
  const handleAssignedDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    const vitalId = e.dataTransfer.getData("vitalId");
    const vitalToMove = assignedVitals.find(v => v.vital_config_id === parseInt(vitalId));
    if (vitalToMove) {
      const newAssigned = assignedVitals.filter(v => v.vital_config_id !== parseInt(vitalId));
      newAssigned.splice(targetIndex, 0, vitalToMove);
      setAssignedVitals(newAssigned);
    }
  };

  const handleVitalRemove = (vitalId: number) => {
    const vitalToRemove = assignedVitals.find(v => v.vital_config_id === vitalId);
    if (vitalToRemove) {
      // Add back to library
      setVitalsLibrary(prev => [...prev, vitalToRemove.vitalConfig]);
      // Remove from assigned
      setAssignedVitals(prev => prev.filter(v => v.vital_config_id !== vitalId));
    }
  };

  const handleRequiredToggle = (vitalId: number) => {
    setAssignedVitals(prev => 
      prev.map(vital => 
        vital.vital_config_id === vitalId 
          ? { ...vital, is_required: !vital.is_required } 
          : vital
      )
    );
  };
  
  // Conditional rendering for loading and errors
  if (!user || isFetchingDoctors) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading doctors...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (fetchError) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-600 text-lg mb-4">Error: {fetchError}</p>
          <Link href="/clinic-admin/dashboard" passHref>
            <Button variant="primary" size="md">Go to Dashboard</Button>
          </Link>
        </div>
      </ClinicDashboardLayout>
    );
  }

  const renderDoctorSelection = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
          <User className="h-8 w-8 mr-2 text-gray-600" />
          Assign Vitals to Doctors
        </h1>
        <Link href="/clinic-admin/dashboard/vitals" passHref>
          <Button variant="ghost" size="md" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>
      </div>
      
      <Card padding="lg" className="shadow-lg min-h-[500px]">
        <h2 className="text-2xl font-bold mb-4">Select a Doctor</h2>
        <div className="relative mb-4">
          <div className="relative flex items-center">
            <Input
              id= "search-doctor"
              type="text"
              label="Search doctors..."
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
              className="pr-10 w-full"
              icon={<Search className="h-4 w-4" />}
            />
            
          </div>
        </div>
        <ul className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No doctors found.</p>
            </div>
          ) : (
            filteredDoctors.map(doctor => (
              <li 
                key={doctor.id} 
                className="p-3 bg-gray-50 rounded-md shadow-sm flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setSelectedDoctor(doctor)}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{doctor.first_name} {doctor.last_name}</p>
                  <p className="text-sm text-gray-500">{doctor.specialization}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </li>
            ))
          )}
        </ul>
      </Card>
    </>
  );

  const renderAssignmentView = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => setSelectedDoctor(null)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-800 font-inter">
            Assignments for {selectedDoctor?.first_name} {selectedDoctor?.last_name}
          </h1>
        </div>
        <Button variant="primary" size="md" onClick={handleSaveAssignments} disabled={isSaving} shine className="flex items-center">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Assignments'}
        </Button>
      </div>

      {isFetchingVitals && (
        <div className="min-h-[500px] flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading vitals...</p>
        </div>
      )}
      
      {!isFetchingVitals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assigned Vitals List */}
          <Card padding="lg" className="shadow-lg min-h-[500px]">
            <h3 className="text-2xl font-bold mb-4">Assigned Vitals</h3>
            <div 
              className="p-4 border-2 border-dashed border-gray-300 rounded-md h-full min-h-[300px] bg-gray-50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnAssigned}
            >
              {assignedVitals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Drag and drop vitals here to assign them.</p>
                  <p className="text-sm mt-2">(Reorder by dragging within this box)</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {assignedVitals.map((vital, index) => (
                    <li 
                      key={vital.vital_config_id} 
                      className="p-3 bg-white rounded-md shadow-sm flex items-center justify-between cursor-move hover:bg-blue-50 transition-colors"
                      draggable
                      onDragStart={(e) => handleAssignedDragStart(e, vital.vital_config_id)}
                      onDragOver={(e) => {
                          e.preventDefault();
                          // Handle reordering logic here, for now, just prevent default
                      }}
                      onDrop={(e) => handleAssignedDrop(e, index)}
                    >
                      <MoveVertical className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {vital.vitalConfig.vital_name}
                          {vital.vitalConfig.unit && <span className="text-gray-600"> ({vital.vitalConfig.unit})</span>}
                        </p>
                        <span className="text-sm text-gray-500 mt-1">
                          {vital.vitalConfig.data_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vital.is_required}
                            onChange={() => handleRequiredToggle(vital.vital_config_id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 select-none">Required</span>
                        </label>
                        <Button variant="ghost" size="sm" onClick={() => handleVitalRemove(vital.vital_config_id)} title="Remove assignment">
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Vitals Library */}
          <Card padding="lg" className="shadow-lg min-h-[500px]">
            <h3 className="text-2xl font-bold mb-4">Vital Library</h3>
            <div className="relative mb-4">
              <div className="relative flex items-center">
                <Input
                  id="search-vital"
                  type="text"
                  label="Search vitals..."
                  value={searchVital}
                  onChange={(e) => setSearchVital(e.target.value)}
                  className="pr-10 w-full"
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>
            
            {/* Available Vitals List */}
            <div 
              className="p-4 border-2 border-dashed border-gray-300 rounded-md min-h-[300px] bg-white transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnLibrary}
            >
              {vitalsLibrary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No vitals available to assign.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredVitals.map(vital => (
                    <li 
                      key={vital.id} 
                      className="p-3 bg-gray-50 rounded-md shadow-sm flex items-center justify-between cursor-grab hover:bg-gray-100 transition-colors"
                      draggable
                      onDragStart={(e) => handleVitalDragStart(e, vital)}
                      onDragEnd={handleVitalDragEnd}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {vital.vital_name}
                          {vital.unit && <span className="text-gray-600"> ({vital.unit})</span>}
                        </p>
                        <span className="text-sm text-gray-500 mt-1">
                          {vital.data_type}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8">
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}
        {fetchError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{fetchError}</p>
          </div>
        )}
        
        {selectedDoctor ? renderAssignmentView() : renderDoctorSelection()}
      </div>
    </ClinicDashboardLayout>
  );
}
