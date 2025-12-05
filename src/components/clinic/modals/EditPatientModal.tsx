'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Check, Save } from 'lucide-react';

// Define interface based on what the API expects/returns
interface PatientData {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  emergency_contact: string | null;
  patient_code: string | null;
  date_of_birth?: string | null; // Placeholder for future backend update
  gender?: string | null;        // Placeholder for future backend update
}

interface EditPatientModalProps {
  patient: PatientData;
  clinicId: number;
  onClose: () => void;
  onPatientUpdated: () => void;
}

export function EditPatientModal({ patient, clinicId, onClose, onPatientUpdated }: EditPatientModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    emergency_contact: '',
    patient_code: '',
    // Add these when backend is ready
    // date_of_birth: '',
    // gender: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form data
  useEffect(() => {
    if (patient) {
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        email: patient.email || '',
        phone_number: patient.phone_number || '',
        address: patient.address || '',
        emergency_contact: patient.emergency_contact || '',
        patient_code: patient.patient_code || '',
      });
    }
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.put(`/clinic-user/clinic-patient/${patient.id}`, {
        ...formData,
        clinic_id: clinicId,
      });
      
      onPatientUpdated();
      onClose();
    } catch (err: any) {
      console.error('Update failed', err);
      setError(err.response?.data?.error || 'Failed to update patient');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Edit Patient Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="first_name" label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
              <Input id="last_name" label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input id="patient_code" label="Patient Code" name="patient_code" value={formData.patient_code} onChange={handleChange} />
               <Input id="phone_number" label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleChange} required />
            </div>

            <Input id="email" label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
            <Input id="address" label="Address" name="address" value={formData.address} onChange={handleChange} />
            <Input id="emergency_contact" label="Emergency Contact" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} />
            
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isLoading} shine>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}