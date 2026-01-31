'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
import { Label } from '@radix-ui/react-label';
import { X, ChevronLeft, UserPlus, Search, Plus, Clock } from 'lucide-react';
import { ClinicDoctor, ClinicPatient } from '@/types/clinic';
// @ts-ignore
import DatePicker from '@/components/ui/DatePicker';

interface WalkInModalProps {
  onClose: () => void;
  onRefreshList: () => void;
  clinicId: number;
  clinicTimezone: string;
  doctors: ClinicDoctor[];
}

export function WalkInModal({
  onClose,
  onRefreshList,
  clinicId,
  clinicTimezone,
  doctors
}: WalkInModalProps) {

  const [isModalLoading, setIsModalLoading] = useState(false);
  const [walkInStep, setWalkInStep] = useState<'patient' | 'details'>('patient');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClinicPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<ClinicPatient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  // New Patient Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState<Date | null>(null);

  // Consultation Details State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [modalNotes, setModalNotes] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  // --- FILTER: AVAILABLE DOCTORS (Strict) ---
  const availableDoctors = doctors.filter(doc => {
    const d = doc as any;
    
    // 1. Must be marked available today
    if (!d.is_available_today) return false;

    // 2. Check Shift Definition
    const shiftStart = d.start_time || d.schedule_start; 
    const shiftEnd = d.end_time || d.schedule_end; 

    // FIX: If no shift times defined, DO NOT SHOW the doctor
    if (!shiftStart || !shiftEnd) return false;

    // 3. Strict Time Window Check
    try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: clinicTimezone,
          hour12: false,
          hour: 'numeric',
          minute: 'numeric'
        });
        
        const formattedNow = timeFormatter.format(now);
        const [currentHour, currentMinute] = formattedNow.split(':').map(Number);
        
        const [startHour, startMinute] = shiftStart.split(':').map(Number);
        const [endHour, endMinute] = shiftEnd.split(':').map(Number);

        const currentTotal = (currentHour * 60) + currentMinute;
        const startTotal = (startHour * 60) + startMinute;
        const endTotal = (endHour * 60) + endMinute;

        // If current time is NOT within the start-end window, hide doctor
        if (currentTotal < startTotal || currentTotal > endTotal) {
            return false;
        }

    } catch (err) {
        console.error("Time calc error for Dr.", d.last_name, err);
        return false; // Hide on error to be safe
    }

    return true;
  });

  // Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        try {
          const response = await api.get(`/clinic-user/clinic-patient`, {
            params: { clinic_id: clinicId, query: searchTerm }
          });
          setSearchResults(response.data);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, clinicId]);

  const handlePatientSelect = (patient: ClinicPatient) => {
    setSelectedPatient(patient);
    if (availableDoctors.length > 0) {
       setSelectedDoctorId(String(availableDoctors[0].id));
    }
    setWalkInStep('details');
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: email,
        address: address,
        gender: gender,
        dob: dob ? dob.toLocaleDateString('en-CA') : '',
        clinic_id: clinicId
      };
      
      const response = await api.post('/clinic-user/clinic-patient', payload);
      setSelectedPatient(response.data);
      setShowNewPatientForm(false);
      if (availableDoctors.length > 0) setSelectedDoctorId(String(availableDoctors[0].id));
      setWalkInStep('details');
    } catch (error) {
      console.error("Failed to create patient", error);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!selectedPatient || !selectedDoctorId) return;
    
    setIsModalLoading(true);
    try {
      const now = new Date();
      
      const payload = {
        clinic_id: clinicId,
        clinic_doctor_id: parseInt(selectedDoctorId),
        clinic_patient_id: selectedPatient.id,
        slot_id: null,
        datetime_start: now.toISOString(),
        datetime_end: new Date(now.getTime() + 15*60000).toISOString(),
        notes: modalNotes,
        appointment_type: isEmergency ? 3 : 1, // 3=Emergency, 1=Walk-in
        status: 1, // Waiting
        arrival_time: now.toISOString()
      };

      await api.post('/appointments', payload);
      onRefreshList();
      onClose();
    } catch (error) {
      console.error("Failed to add to queue", error);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Helper to format "09:00:00" -> "9:00 AM"
  const formatTimeDisplay = (timeStr: string) => {
      if (!timeStr) return '';
      const [h, m] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(h), parseInt(m));
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
          <div>
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary-brand" />
                Walk-In Registration
             </h2>
             <p className="text-sm text-gray-500 mt-1">Add a patient directly to today's queue</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {walkInStep === 'patient' && !showNewPatientForm && (
             <div className="space-y-6">
                 <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Find Patient</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-brand/20 focus:border-primary-brand outline-none transition-shadow text-lg"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                 </div>

                 <div className="min-h-[200px]">
                    {isSearching ? (
                        <div className="text-center py-8 text-gray-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                        <ul className="space-y-2">
                            {searchResults.map(p => (
                                <li 
                                    key={p.id} 
                                    className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer flex justify-between items-center transition-colors"
                                    onClick={() => handlePatientSelect(p)}
                                >
                                    <div>
                                        <div className="font-semibold text-gray-800">{p.first_name} {p.last_name}</div>
                                        <div className="text-sm text-gray-500">{p.phone_number} • {p.gender}</div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-blue-600">Select</Button>
                                </li>
                            ))}
                        </ul>
                    ) : searchTerm.length > 2 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-3">No patient found.</p>
                            <Button variant="outline" onClick={() => setShowNewPatientForm(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Create New Patient
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                            <Search className="h-10 w-10 mb-2 opacity-50" />
                            <p>Search for a patient to begin</p>
                        </div>
                    )}
                 </div>
                 
                 <div className="pt-4 border-t flex justify-end">
                    <Button variant="ghost" onClick={() => setShowNewPatientForm(true)}>+ New Patient</Button>
                 </div>
             </div>
          )}

          {showNewPatientForm && (
             <form onSubmit={handleCreatePatient} className="space-y-4">
                 <div className="flex items-center mb-4">
                    <button type="button" onClick={() => setShowNewPatientForm(false)} className="mr-3 hover:bg-gray-100 p-1 rounded">
                        <ChevronLeft className="h-5 w-5 text-gray-500"/>
                    </button>
                    <h3 className="font-semibold text-lg">New Patient Details</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Input id="fname" label="First Name" required value={firstName} onChange={(e: any) => setFirstName(e.target.value)} />
                    <Input id="lname" label="Last Name" required value={lastName} onChange={(e: any) => setLastName(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Input id="phone" label="Phone" required value={phone} onChange={(e: any) => setPhone(e.target.value)} />
                    <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">Date of Birth <span className="text-red-500">*</span></Label>
                        <div className="relative z-50">
                            <DatePicker 
                                value={dob} 
                                onChange={(date) => setDob(date)}
                                placeholder="Select DOB"
                            />
                        </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Input id="email" label="Email (Optional)" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                     <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">Gender</Label>
                        <select className="w-full border-gray-300 rounded-md shadow-sm p-2" value={gender} onChange={(e) => setGender(e.target.value)}>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                     </div>
                 </div>
                 <div className="pt-4 border-t flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setShowNewPatientForm(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={isModalLoading}>Create & Continue</Button>
                 </div>
             </form>
          )}

          {walkInStep === 'details' && selectedPatient && (
             <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                    <div>
                        <span className="text-xs text-blue-600 font-bold uppercase tracking-wide">Patient</span>
                        <div className="font-bold text-blue-900 text-lg">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setWalkInStep('patient')} className="text-blue-600 hover:text-blue-800">Change</Button>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Assign Doctor</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {availableDoctors.map(doc => {
                                const d = doc as any;
                                const startTime = formatTimeDisplay(d.start_time || d.schedule_start);
                                const endTime = formatTimeDisplay(d.end_time || d.schedule_end);
                                const scheduleText = startTime && endTime ? `${startTime} - ${endTime}` : 'Available Today';

                                return (
                                    <div 
                                        key={doc.id}
                                        onClick={() => setSelectedDoctorId(String(doc.id))}
                                        className={`
                                            cursor-pointer p-3 rounded-lg border flex flex-col gap-1 transition-all
                                            ${String(selectedDoctorId) === String(doc.id) 
                                                ? 'border-primary-brand bg-primary-light/10 ring-1 ring-primary-brand' 
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${String(selectedDoctorId) === String(doc.id) ? 'bg-primary-brand' : 'bg-green-500'}`} />
                                            <span className="font-medium text-gray-800">Dr. {doc.last_name}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 pl-5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {scheduleText}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {availableDoctors.length === 0 && (
                                <div className="col-span-2 text-center text-red-800 py-4 bg-red-50 rounded-lg border border-red-100 text-sm">
                                    <p className="font-semibold">No doctors available right now.</p>
                                    <p className="text-xs mt-1">Please check doctor schedules or try again later.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Notes</Label>
                        <textarea 
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-brand focus:border-primary-brand p-3" 
                            rows={2} 
                            placeholder="Reason for visit..."
                            value={modalNotes}
                            onChange={(e) => setModalNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                             <input 
                                type="checkbox" 
                                id="emergency-toggle"
                                className="peer sr-only"
                                checked={isEmergency}
                                onChange={(e) => setIsEmergency(e.target.checked)}
                             />
                             <label htmlFor="emergency-toggle" className="block h-6 overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer peer-checked:bg-red-800 transition-colors"></label>
                             <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
                        </div>
                        <Label htmlFor="emergency-toggle" className="font-bold text-red-800 cursor-pointer select-none">Mark as Emergency</Label>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t mt-4">
                    <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button 
                        variant="primary" 
                        shine
                        className="flex-[2] py-3 text-base shadow-lg shadow-primary-brand/20"
                        onClick={handleAddToQueue} 
                        disabled={isModalLoading || !selectedDoctorId}
                    >
                        {isModalLoading ? 'Processing...' : 'Check In Patient'}
                    </Button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}