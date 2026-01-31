// src/components/clinic/modals/RegisterPatientModal.tsx
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
import { X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Label } from '@radix-ui/react-label';

interface RegisterPatientModalProps {
  clinicId: number;
  onClose: () => void;
  onPatientAdded?: () => void;
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
    dob: '',         
    gender: 'Male',  
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdItemId, setCreatedItemId] = useState<number | null>(null);

  // Helper to ensure YYYY-MM-DD format (Local time)
  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setPatientForm({ ...patientForm, dob: `${year}-${month}-${day}` });
  };

  const resetForm = () => {
    setPatientForm({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      emergency_contact: '',
      patient_code: '',
      dob: '',         
      gender: 'Male', 
    });
    setSuccessMessage(null);
    setErrorMessage(null);
    setCreatedItemId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = { ...patientForm, clinic_id: clinicId };
      const response = await api.post('/clinic-user/clinic-patient', payload);
      
      setSuccessMessage('Patient registered successfully!');
      setCreatedItemId(response.data.id);
      if (onPatientAdded) onPatientAdded();
      
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(err.response?.data?.error || 'Failed to register patient.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black-20 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Register New Patient</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {successMessage ? (
            <div className="text-center py-8">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{successMessage}</h3>
              <div className="flex justify-center space-x-3 mt-6">
                 <Button variant="primary" onClick={() => { if(createdItemId) router.push(`/clinic-admin/dashboard/patients/${createdItemId}`); onClose(); }}>
                    View Profile
                 </Button>
                 <Button variant="ghost" onClick={resetForm}>Add Another</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input id="first_name" label="First Name" value={patientForm.first_name} onChange={(e: any) => setPatientForm({...patientForm, first_name: e.target.value})} required />
                <Input id="last_name" label="Last Name" value={patientForm.last_name} onChange={(e: any) => setPatientForm({...patientForm, last_name: e.target.value})} required />
              </div>

              {/* DOB & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                   <DatePicker 
                     label="Date of Birth"
                     value={patientForm.dob ? new Date(patientForm.dob) : null}
                     onChange={handleDateChange}
                     placeholder="Select DOB"
                     maxDate={new Date()} // Prevent future dates
                   />
                   <input type="hidden" required value={patientForm.dob} /> {/* Hidden input for HTML5 validation logic if needed */}
                </div>
                <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Gender</Label>
                    <select 
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white h-[42px]" // Matching height
                        value={patientForm.gender}
                        onChange={(e) => setPatientForm({...patientForm, gender: e.target.value})}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input id="phone_number" label="Phone Number" type="tel" value={patientForm.phone_number} onChange={(e: any) => setPatientForm({...patientForm, phone_number: e.target.value})} required />
                <Input id="email" label="Email" type="email" value={patientForm.email} onChange={(e: any) => setPatientForm({...patientForm, email: e.target.value})} />
              </div>
              
              <Input id="address" label="Address" value={patientForm.address} onChange={(e: any) => setPatientForm({...patientForm, address: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <Input id="emergency_contact" label="Emergency Contact" value={patientForm.emergency_contact} onChange={(e: any) => setPatientForm({...patientForm, emergency_contact: e.target.value})} />
                <Input id="patient_code" label="Patient Code (Optional)" value={patientForm.patient_code} onChange={(e: any) => setPatientForm({...patientForm, patient_code: e.target.value})} />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
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