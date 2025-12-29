'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Check, Building2 } from 'lucide-react'; // Added Building2 icon
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/ui/DatePicker';

// Helper for date formatting
const toYYYYMMDD = (date: Date) => {
    return date.toISOString().split('T')[0];
};

interface ClinicOption {
    id: number;
    name: string;
}

interface RegisterDoctorModalProps {
    clinicId?: number; // Made optional as we might select it inside
    availableClinics?: ClinicOption[]; // New prop for the dropdown
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
    role: string;
}

export function RegisterDoctorModal({ clinicId, availableClinics, onClose, onDoctorAdded }: RegisterDoctorModalProps) {
    // If clinicId is passed, use it. Otherwise default to the first available clinic.
    const [selectedClinicId, setSelectedClinicId] = useState<number>(
        clinicId && clinicId !== -1 ? clinicId : (availableClinics?.[0]?.id || 0)
    );

    const [formData, setFormData] = useState<NewDoctorPayload>({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        medicalRegNo: '',
        specialization: '',
        address: '',
        startedDate: toYYYYMMDD(new Date()),
        role: 'DOCTOR_VISITING',
    });

    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update selected ID if prop changes (e.g. if user changes context in background)
    useEffect(() => {
        if (clinicId && clinicId !== -1) {
            setSelectedClinicId(clinicId);
        }
    }, [clinicId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSubmitting(true);

        // Validation
        if (!selectedClinicId) {
            setFormError("Please select a clinic.");
            setIsSubmitting(false);
            return;
        }

        try {
            // We include clinic_id in the payload or as a query param depending on your backend
            // Assuming the backend expects it in the body for this context:
            await api.post('/clinic-user/register-doctor', {
                ...formData,
                clinic_id: selectedClinicId, // Explicitly sending the selected ID
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone_number: formData.phoneNumber,
                medical_reg_no: formData.medicalRegNo,
                started_date: formData.startedDate
            });

            if (onDoctorAdded) onDoctorAdded();
            onClose();
        } catch (err: any) {
            console.error(err);
            setFormError(err.response?.data?.message || 'Failed to register doctor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Register New Doctor</h2>
                        <p className="text-sm text-gray-500">Add a doctor to your clinic staff</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto">
                    {formError && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                            <span className="mr-2">⚠️</span>
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Clinic Selection Dropdown (Only visible if list provided) */}
                        {availableClinics && availableClinics.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Assign to Clinic
                                </label>
                                <select
                                    className="w-full bg-white border border-blue-200 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                    value={selectedClinicId}
                                    onChange={(e) => setSelectedClinicId(Number(e.target.value))}
                                >
                                    {availableClinics.map(clinic => (
                                        <option key={clinic.id} value={clinic.id}>
                                            {clinic.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input id="firstName" value={formData.firstName} onChange={handleChange} label="First Name" placeholder="e.g. John" required />
                            <Input id="lastName" value={formData.lastName} onChange={handleChange} label="Last Name" placeholder="e.g. Doe" required />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input id="email" type="email" value={formData.email} onChange={handleChange} label="Email Address" placeholder="doctor@example.com" required />
                            <Input id="phoneNumber" value={formData.phoneNumber} onChange={handleChange} label="Phone Number" placeholder="+91..." required />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input id="medicalRegNo" value={formData.medicalRegNo} onChange={handleChange} label="Medical Reg. No" placeholder="e.g. MCI-12345" required />
                            <Input id="specialization" value={formData.specialization} onChange={handleChange} label="Specialization" placeholder="e.g. Cardiologist" required />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Access Role</label>
                            <select
                                id="role"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--color-primary-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-brand)]"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="DOCTOR_VISITING">Visiting Consultant (Restricted)</option>
                                <option value="DOCTOR_PARTNER">Partner (No Delete Access)</option>
                                <option value="DOCTOR_OWNER">Doctor Owner (Full Access)</option>
                            </select>
                            <p className="text-xs text-gray-500">Determines permission levels.</p>
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
                        
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-4">
                            <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                            <Button type="submit" variant="primary" size="md" disabled={isSubmitting} shine>
                                {isSubmitting ? 'Adding...' : 'Add Doctor'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}