'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Check } from 'lucide-react';

interface EditDoctorModalProps {
  doctor: any; // Using dynamic type based on your context, strictly strictly typed in real app
  onClose: () => void;
  onDoctorUpdated: () => void;
}

export function EditDoctorModal({ doctor, onClose, onDoctorUpdated }: EditDoctorModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    medical_reg_no: '',
    specialization: '',
    started_date: '',
    active: false,
    role: 'DOCTOR_VISITING'
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (doctor) {
      setFormData({
        first_name: doctor.first_name || '',
        last_name: doctor.last_name || '',
        email: doctor.email || '',
        phone_number: doctor.phone_number || '',
        address: doctor.address || '',
        medical_reg_no: doctor.medical_reg_no || '',
        specialization: doctor.specialization || '',
        started_date: doctor.started_date ? new Date(doctor.started_date).toISOString().split('T')[0] : '',
        active: doctor.active || false,
        role: doctor.role || 'DOCTOR_VISITING'
      });
    }
  }, [doctor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    // @ts-ignore
    const newValue = type === 'checkbox' ? e.target.checked : value;
    setFormData((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await api.put(`/clinic-user/clinic-doctor/${doctor.id}`, { 
        ...formData, 
        clinic_id: doctor.clinic_id 
      });
      setSuccessMessage('Doctor profile updated successfully!');
      setTimeout(() => {
        onDoctorUpdated();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update doctor:', err);
      setFormError(err.response?.data?.message || 'Failed to update doctor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Edit Doctor Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="h-6 w-6" /></button>
        </div>
        
        <div className="p-6">
          {successMessage ? (
            <div className="text-center py-8">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800">{successMessage}</h3>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">{formError}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="first_name" value={formData.first_name} onChange={handleChange} label="First Name" required />
                <Input id="last_name" value={formData.last_name} onChange={handleChange} label="Last Name" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="email" type="email" value={formData.email} onChange={handleChange} label="Email Address" required />
                <Input id="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} label="Phone Number" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="medical_reg_no" value={formData.medical_reg_no} onChange={handleChange} label="Medical Reg. No" required />
                <Input id="specialization" value={formData.specialization} onChange={handleChange} label="Specialization" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="text-sm font-medium text-gray-700 mb-1 block">Started Date</label>
                   <input type="date" id="started_date" value={formData.started_date} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Access Level</label>
                    <select id="role" className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.role} onChange={handleChange}>
                        <option value="DOCTOR_VISITING">Visiting Consultant</option>
                        <option value="DOCTOR_PARTNER">Partner</option>
                        <option value="DOCTOR_OWNER">Doctor Owner</option>
                    </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                <textarea id="address" rows={2} value={formData.address} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>

              <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <input type="checkbox" id="active" checked={formData.active} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded border-gray-300" />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">Doctor account is active</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" size="md" disabled={isSubmitting} shine>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}