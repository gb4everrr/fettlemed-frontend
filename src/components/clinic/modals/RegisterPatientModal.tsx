// src/components/clinic/modals/RegisterPatientModal.tsx
'use client';

import React, { useState } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Import useRouter

interface RegisterPatientModalProps {
  clinicId: number;
  onClose: () => void;
  onPatientAdded?: () => void; // <-- 1. MAKE THIS PROP OPTIONAL
}

export function RegisterPatientModal({ clinicId, onClose, onPatientAdded }: RegisterPatientModalProps) {
  const router = useRouter(); 
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
    // ... (rest of function unchanged)
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
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await api.post('/clinic-user/clinic-patient', {
        ...patientForm,
        clinic_id: clinicId,
      });
      
      setSuccessMessage('Patient registered successfully!');
      setCreatedItemId(response.data.id);
      
      // --- 2. CHECK IF THE PROP EXISTS BEFORE CALLING ---
      if (onPatientAdded) {
        onPatientAdded(); // Refresh the list in the background
      }

    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to register patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToProfile = () => {
    // ... (rest of function unchanged)
    if (createdItemId) {
      router.push(`/clinic-admin/dashboard/patients/${createdItemId}`);
      onClose(); // Close the modal after navigating
    }
  };

  return (
    // ... (rest of JSX is unchanged) ...
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Add New Patient</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {successMessage ? (
            <div className="text-center py-8">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{successMessage}</h3>
              <div className="flex justify-center space-x-4 mt-6">
                <Button variant="primary" size="md" onClick={handleGoToProfile}>
                  Go to Profile
                </Button>
                <Button variant="ghost" size="md" onClick={resetForm}>
                  Add Another
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePatientSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="first_name"
                  label="First Name"
                  name="first_name"
                  value={patientForm.first_name}
                  onChange={(e) => setPatientForm({...patientForm, first_name: e.target.value})}
                  required
                />
                <Input
                  id="last_name"
                  label="Last Name"
                  name="last_name"
                  value={patientForm.last_name}
                  onChange={(e) => setPatientForm({...patientForm, last_name: e.target.value})}
                  required
                />
              </div>
              
              <Input
                id="patient_code"
                label="Patient Code"
                name="patient_code"
                value={patientForm.patient_code}
                onChange={(e) => setPatientForm({...patientForm, patient_code: e.target.value})}
              />
              
              <Input
                id="email"
                label="Email (Optional)"
                name="email"
                type="email"
                value={patientForm.email}
                onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
              />
              
              <Input
                id="phone_number"
                label="Phone Number"
                name="phone_number"
                type="tel"
                value={patientForm.phone_number}
                onChange={(e) => setPatientForm({...patientForm, phone_number: e.target.value})}
                required
              />
              
              <Input
                id="address"
                label="Address"
                name="address"
                value={patientForm.address}
                onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
              />
              
              <Input
                id="emergency_contact"
                label="Emergency Contact"
                name="emergency_contact"
                value={patientForm.emergency_contact}
                onChange={(e) => setPatientForm({...patientForm, emergency_contact: e.target.value})}
              />
              
              <div className="flex justify-end space-x-3 pt-4">
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