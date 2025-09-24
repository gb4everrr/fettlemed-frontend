// src/app/clinic-admin/dashboard/vitals/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ArrowLeft, Move, List, Settings } from 'lucide-react';
import { Label } from '@radix-ui/react-label';
import Input from '@/components/ui/Input';
import Link from 'next/link';

interface ClinicDoctor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  specialization: string;
}

// Updated interface - removed clinic_doctor_id as it's not part of the library
interface ClinicVitalConfig {
  id: number;
  clinic_id: number;
  vital_name: string;
  data_type: string;
  unit: string;
  is_active: boolean;
  is_required: boolean; // This is default requirement, can be overridden per doctor
}

export default function VitalsConfigurationPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [vitals, setVitals] = useState<ClinicVitalConfig[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [isFetchingVitals, setIsFetchingVitals] = useState(true);
  const [isFetchingDoctors, setIsFetchingDoctors] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    vital_name: '',
    data_type: 'number',
    unit: '',
    is_required: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'clinic_admin') {
      router.push('/auth/login');
      return;
    }
    fetchDoctors();
    fetchVitals();
  }, [user, router]);

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

  const fetchVitals = async () => {
    setIsFetchingVitals(true);
    setFetchError(null);
    try {
      if (!user?.clinics || user.clinics.length === 0) {
        setFetchError('No clinic is associated with your account.');
        return;
      }
      const clinicId = user.clinics[0].id;
      
      const response = await api.get(`/clinic-vitals/library/all`, {
        params: { clinic_id: clinicId },
      });
      
      setVitals(response.data);

    } catch (err: any) {
      console.error('Failed to fetch vitals:', err);
      setFetchError(err.response?.data?.error || 'Failed to fetch vital configurations.');
    } finally {
      setIsFetchingVitals(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormState(prev => ({ ...prev, [name]: newValue }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    const clinicId = user?.clinics?.[0]?.id;
    
    if (!clinicId) {
      setFormError('Clinic information is not available.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formState,
      clinic_id: clinicId,
    };

    try {
      if (isEditing) {
        await api.put(`/clinic-vitals/library/update/${isEditing}`, payload);
        setSuccessMessage('Vital configuration updated successfully!');
      } else {
        await api.post('/clinic-vitals/library/create', payload);
        setSuccessMessage('Vital configuration added to library successfully!');
      }
      setFormState({ vital_name: '', data_type: 'number', unit: '', is_required: false });
      setIsEditing(null);
      fetchVitals();
    } catch (err: any) {
      console.error('Failed to save vital config:', err);
      setFormError(err.response?.data?.error || 'Failed to save vital configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (vital: ClinicVitalConfig) => {
    setFormState({
      vital_name: vital.vital_name,
      data_type: vital.data_type,
      unit: vital.unit,
      is_required: vital.is_required,
    });
    setIsEditing(vital.id);
  };

  const handleDelete = async (vitalId: number) => {
    if (!window.confirm('Are you sure you want to delete this vital from the library? This will also remove all doctor assignments for this vital.')) {
      return;
    }
    setFormError(null);
    setSuccessMessage(null);
    try {
      const clinicId = user?.clinics?.[0]?.id;
      if (!clinicId) {
        setFormError('Clinic information is missing.');
        return;
      }
      await api.delete(`/clinic-vitals/library/delete/${vitalId}`, {
        params: { clinic_id: clinicId },
      });
      setSuccessMessage('Vital configuration removed from library successfully!');
      fetchVitals();
    } catch (err: any) {
      console.error('Failed to delete vital config:', err);
      setFormError(err.response?.data?.error || 'Failed to delete vital configuration.');
    }
  };

  const handleAssignVitals = () => {
    router.push('/clinic-admin/dashboard/vitals/doctor-vitals');
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setFormState({ vital_name: '', data_type: 'number', unit: '', is_required: false });
    setFormError(null);
  };

  if (!user || isFetchingVitals || isFetchingDoctors) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading vital configurations...</p>
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

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
            <List className="h-8 w-8 mr-2 text-gray-600" />
            Vital Library Management
          </h1>
          <Button variant="primary" size="md" onClick={handleAssignVitals} className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Manage Doctor Assignments
          </Button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700 text-sm">
            <strong>Step 1:</strong> Create your clinic's vital library here. 
            <strong> Step 2:</strong> Use "Manage Doctor Assignments" to assign vitals to specific doctors.
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}
        {formError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{formError}</p>
          </div>
        )}

        {/* Vital Configuration Management */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add/Edit Form */}
          <Card padding="lg" className="md:col-span-1 shadow-lg h-fit">
            <h2 className="text-2xl font-bold mb-4">
              {isEditing ? 'Edit Vital' : 'Add to Library'}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                
                <Input
                  id="vital_name"
                  name="vital_name"
                  type="text"
                  value={formState.vital_name}
                  onChange={handleFormChange}
                  required
                  className="mt-1"
                  label="Vital Name"
                />
              </div>
              <div>
                <Label htmlFor="data_type" className="text-gray-700">Data Type</Label>
                <select
                  id="data_type"
                  name="data_type"
                  value={formState.data_type}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                >
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              <div>
                
                <Input
                  id="unit"
                  name="unit"
                  type="text"
                  value={formState.unit}
                  onChange={handleFormChange}
                  className="mt-1"
                  label="Unit"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="is_required"
                  name="is_required"
                  type="checkbox"
                  checked={formState.is_required}
                  onChange={handleFormChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="is_required" className="text-gray-700">
                  Required by Default
                </Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" variant="primary" size="md" disabled={isSubmitting} shine className="flex-1">
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Add to Library')}
                </Button>
                {isEditing && (
                  <Button type="button" variant="ghost" size="md" onClick={cancelEdit} className="flex-1">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* List of Configured Vitals */}
          <Card padding="lg" className="md:col-span-2 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Clinic Vital Library</h2>
              <div className="text-sm text-gray-500">
                {vitals.length} vital{vitals.length !== 1 ? 's' : ''} in library
              </div>
            </div>
            {vitals.length === 0 ? (
              <div className="text-center py-8">
                <List className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No vitals in your library yet</p>
                <p className="text-sm text-gray-400">Add vitals using the form to get started</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {vitals.map((vital) => (
                  <li key={vital.id} className="p-4 bg-gray-50 rounded-md flex items-center justify-between shadow-sm hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {vital.vital_name} 
                        {vital.unit && <span className="text-gray-600"> ({vital.unit})</span>}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-500">
                          Type: <span className="font-medium">{vital.data_type}</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          Required: <span className="font-medium">{vital.is_required ? 'Yes' : 'No'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(vital)} title="Edit vital">
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(vital.id)} title="Remove from library">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </ClinicDashboardLayout>
  );
}