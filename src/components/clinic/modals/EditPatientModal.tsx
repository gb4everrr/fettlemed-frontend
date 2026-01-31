// src/components/clinic/modals/EditPatientModal.tsx
'use client';

import React, { useState } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
// @ts-ignore
import DatePicker from '@/components/ui/DatePicker'; // <--- Import DatePicker
import { Label } from '@radix-ui/react-label';
import { X, Save } from 'lucide-react';

interface PatientData {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  emergency_contact: string | null;
  patient_code: string | null;
  dob?: string | null;
  gender?: string | null;
}

interface EditPatientModalProps {
  patient: PatientData;
  clinicId: number;
  onClose: () => void;
  onPatientUpdated: () => void;
}

export function EditPatientModal({ patient, clinicId, onClose, onPatientUpdated }: EditPatientModalProps) {
  
  const [formData, setFormData] = useState({
    first_name: patient.first_name || '',
    last_name: patient.last_name || '',
    email: patient.email || '',
    phone_number: patient.phone_number || '',
    address: patient.address || '',
    emergency_contact: patient.emergency_contact || '',
    patient_code: patient.patient_code || '',
    // Parse initial DOB safely
    dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '', 
    gender: patient.gender || 'Male',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper to ensure YYYY-MM-DD format (Local time)
  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setFormData(prev => ({ ...prev, dob: `${year}-${month}-${day}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.put(`/clinic-user/clinic-patient/${patient.id}`, {
        ...formData,
        clinic_id: clinicId
      });
      
      onPatientUpdated();
      onClose();
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.response?.data?.error || 'Failed to update patient details');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black-20 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center">
             <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                <Save className="h-5 w-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-800">Edit Patient</h2>
                <p className="text-sm text-gray-500">Update personal information</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input id="first_name" label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
              <Input id="last_name" label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
            </div>
            
            {/* DOB & GENDER */}
            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                   <DatePicker 
                     label="Date of Birth"
                     value={formData.dob ? new Date(formData.dob) : null}
                     onChange={handleDateChange}
                     placeholder="Select DOB"
                     maxDate={new Date()}
                   />
                </div>
                <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Gender</Label>
                    <select 
                        name="gender"
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white h-[42px]"
                        value={formData.gender}
                        onChange={handleChange}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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