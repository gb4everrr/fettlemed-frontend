'use client';

import React, { useState } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/ui/DatePicker';

interface RegisterDoctorModalProps {
  clinicId: number;
  onClose: () => void;
  onDoctorAdded?: () => void;
}

interface NewDoctorPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  medicalRegNo: string;
  specialization: string;
  startedDate: string;
  address: string;
  role: string; // New Role Field
}

export function RegisterDoctorModal({ clinicId, onClose, onDoctorAdded }: RegisterDoctorModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<NewDoctorPayload>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    medicalRegNo: '',
    specialization: '',
    address: '',
    startedDate: new Date().toISOString().split('T')[0],
    role: 'DOCTOR_VISITING', // Default
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdDoctorId, setCreatedDoctorId] = useState<number | null>(null);

  const toYYYYMMDD = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset*60*1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (formError) setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.phoneNumber.trim()) return 'Phone number is required';
    if (!formData.specialization.trim()) return 'Specialization is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        clinic_id: clinicId,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phoneNumber.trim(),
        medical_reg_no: formData.medicalRegNo.trim(),
        specialization: formData.specialization.trim(),
        started_date: formData.startedDate,
        address: formData.address.trim(),
        role: formData.role, // Pass Role to Backend
      };
      
      const response = await api.post('/clinic-user/clinic-doctor', payload);
      
      setSuccessMessage('Doctor added successfully!');
      setCreatedDoctorId(response.data.id);
      
      if (onDoctorAdded) onDoctorAdded();
      
    } catch (err: any) {
      console.error('Failed to add doctor:', err);
      setFormError(err.response?.data?.message || 'Failed to add doctor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '', lastName: '', email: '', phoneNumber: '',
      medicalRegNo: '', specialization: '', address: '',
      startedDate: new Date().toISOString().split('T')[0],
      role: 'DOCTOR_VISITING'
    });
    setSuccessMessage(null);
    setFormError(null);
    setCreatedDoctorId(null);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Add New Doctor</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="h-6 w-6" /></button>
          </div>
        </div>
        
        <div className="p-6">
          {successMessage ? (
            <div className="text-center py-8">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{successMessage}</h3>
              <div className="flex justify-center space-x-4 mt-6">
                <Button variant="primary" size="md" onClick={() => { if(createdDoctorId) router.push(`/clinic-admin/dashboard/doctors/${createdDoctorId}`); onClose(); }}>Go to Profile</Button>
                <Button variant="ghost" size="md" onClick={resetForm}>Add Another</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">{formError}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="firstName" value={formData.firstName} onChange={handleChange} label="First Name" required />
                <Input id="lastName" value={formData.lastName} onChange={handleChange} label="Last Name" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="email" type="email" value={formData.email} onChange={handleChange} label="Email Address" required />
                <Input id="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange} label="Phone Number" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="medicalRegNo" value={formData.medicalRegNo} onChange={handleChange} label="Medical Reg. No" required />
                <Input id="specialization" value={formData.specialization} onChange={handleChange} label="Specialization" required />
              </div>

              {/* --- NEW ROLE DROPDOWN --- */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Access Level (Role)</label>
                <select 
                    id="role"
                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={formData.role}
                    onChange={handleChange}
                >
                    <option value="DOCTOR_VISITING">Visiting Consultant (Restricted)</option>
                    <option value="DOCTOR_PARTNER">Partner (No Delete Access)</option>
                    <option value="DOCTOR_OWNER">Doctor Owner (Full Access)</option>
                </select>
                <p className="text-xs text-gray-500">Determines what this doctor can see and do in the dashboard.</p>
              </div>

              <Input id="address" value={formData.address} onChange={handleChange} label="Address" />

              <div className="relative">
                <DatePicker 
                    label="Started Date"
                    value={formData.startedDate ? new Date(formData.startedDate) : null}
                    onChange={(date) => setFormData(prev => ({ ...prev, startedDate: toYYYYMMDD(date) }))}
                    placeholder="Select start date"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" size="md" disabled={isSubmitting} shine>{isSubmitting ? 'Adding...' : 'Add Doctor'}</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}