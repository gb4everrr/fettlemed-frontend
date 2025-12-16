// src/components/doctor/modals/DoctorRegisterPatientModal.tsx
'use client';

import React, { useState } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Check, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClinicOption {
  clinic_id: number;
  clinic_name: string;
  role: string;
}

interface DoctorRegisterPatientModalProps {
  clinics: ClinicOption[];
  onClose: () => void;
  onPatientAdded: () => void;
  preselectedClinicId?: number; // Optional: if doctor is already viewing a specific clinic context
}

export function DoctorRegisterPatientModal({ 
  clinics, 
  onClose, 
  onPatientAdded,
  preselectedClinicId 
}: DoctorRegisterPatientModalProps) {
  const router = useRouter(); 
  
  // State for the selected clinic (defaults to preselected if valid, otherwise empty)
  const [selectedClinicId, setSelectedClinicId] = useState<number | string>(
    preselectedClinicId && preselectedClinicId !== -1 ? preselectedClinicId : ''
  );

  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    emergency_contact: '',
    patient_code: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdItemId, setCreatedItemId] = useState<number | null>(null);

  const resetForm = () => {
    setPatientForm({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      emergency_contact: '',
      patient_code: '',
    });
    setSuccessMessage(null);
    setErrorMessage(null);
    setCreatedItemId(null);
    // We keep the selected clinic ID as is for convenience
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClinicId) {
        setErrorMessage("Please select a clinic to register the patient with.");
        return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await api.post('/clinic-user/clinic-patient', {
        ...patientForm,
        clinic_id: Number(selectedClinicId), // Use the selected clinic
      });
      
      setSuccessMessage('Patient registered successfully!');
      setCreatedItemId(response.data.id);
      
      if (onPatientAdded) {
        onPatientAdded(); 
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || 'Failed to register patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToProfile = () => {
    if (createdItemId) {
      router.push(`/doctor/dashboard/patients/${createdItemId}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Register New Patient</h2>
                <p className="text-sm text-gray-500 mt-1">Add a patient to your clinic registry</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm hover:bg-gray-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {successMessage ? (
            <div className="text-center py-8">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Check className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{successMessage}</h3>
              <p className="text-gray-600 mb-6">The patient has been added to the clinic registry.</p>
              
              <div className="flex justify-center space-x-4">
                <Button variant="primary" size="md" onClick={handleGoToProfile}>
                  View Patient Profile
                </Button>
                <Button variant="ghost" size="md" onClick={resetForm}>
                  Register Another
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePatientSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center">
                    {errorMessage}
                </div>
              )}

              {/* Clinic Selection Dropdown */}
              <div className="bg-var(--color-primary-brand) p-4 rounded-lg ">
                <label htmlFor="clinic-select" className="block text-sm font-semibold text-var(--color-primary-brand) mb-2 flex items-center">
                    <Building className="h-4 w-4 mr-2" /> Select Clinic Registry <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                    id="clinic-select"
                    value={selectedClinicId}
                    onChange={(e) => setSelectedClinicId(e.target.value)}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5"
                >
                    <option value="" disabled>Choose a Clinic</option>
                    {clinics.map((clinic) => (
                        <option key={clinic.clinic_id} value={clinic.clinic_id}>
                            {clinic.clinic_name} ({clinic.role.replace('_', ' ')})
                        </option>
                    ))}
                </select>
                <p className="text-xs text-var(--color-primary-brand) mt-2">
                    The patient will be registered permanently to this clinic.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  id="first_name"
                  label="First Name"
                  
                  value={patientForm.first_name}
                  onChange={(e) => setPatientForm({...patientForm, first_name: e.target.value})}
                  required
                />
                <Input
                  id="last_name"
                  label="Last Name"
                  
                  value={patientForm.last_name}
                  onChange={(e) => setPatientForm({...patientForm, last_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                    id="phone_number"
                    label="Phone Number"
                    
                    type="tel"
                    value={patientForm.phone_number}
                    onChange={(e) => setPatientForm({...patientForm, phone_number: e.target.value})}
                    required
                />
                <Input
                    id="email"
                    label="Email Address"
                    
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <Input
                    id="patient_code"
                    label="Patient Code / ID (Optional)"
                    
                    value={patientForm.patient_code}
                    onChange={(e) => setPatientForm({...patientForm, patient_code: e.target.value})}
                />
                 <Input
                    id="emergency_contact"
                    label="Emergency Contact"
                    
                    value={patientForm.emergency_contact}
                    onChange={(e) => setPatientForm({...patientForm, emergency_contact: e.target.value})}
                />
              </div>
              
              <Input
                id="address"
                label="Full Address"
                
                value={patientForm.address}
                onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
              />
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
                <Button type="button" variant="ghost" size="md" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={isLoading} shine>
                  {isLoading ? 'Registering...' : 'Register Patient'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}