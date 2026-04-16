'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore
import api from '@/services/api';

export interface PickerPatient {
  id: number;           // ClinicPatient.id  (= clinic_patient_id on appointments)
  firstName: string;
  lastName: string;
  phone?: string;
  clinicName?: string;
}

export interface PickerAppointment {
  id: number;
  datetime_start: string;
  appointment_type?: string;
  status: number;
  clinic_id: number;
  clinic_patient_id: number;
  clinic?: { name: string };
}

export type PickerStep = 1 | 2 | 3;

export const STATUS_LABELS: Record<number, { label: string; className: string }> = {
  0: { label: 'Pending',   className: 'bg-blue-50 text-blue-700 border-blue-100' },
  1: { label: 'Confirmed', className: 'bg-green-50 text-green-700 border-green-100' },
  2: { label: 'Cancelled', className: 'bg-red-50 text-red-600 border-red-100' },
  3: { label: 'Completed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export const formatApptDate = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export function usePatientAppointmentPicker() {
  const [step, setStep]                         = useState<PickerStep>(1);

  // Step 1
  const [patientQuery, setPatientQueryRaw]      = useState('');
  const [allPatients, setAllPatients]           = useState<PickerPatient[]>([]);
  const [filteredPats, setFilteredPats]         = useState<PickerPatient[]>([]);
  const [selectedPatient, setSelectedPatient]   = useState<PickerPatient | null>(null);
  const [patientsLoading, setPatientsLoading]   = useState(false);
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const patientInputRef                         = useRef<HTMLInputElement>(null);

  // Step 2
  const [appointments, setAppointments]         = useState<PickerAppointment[]>([]);
  const [apptsLoading, setApptsLoading]         = useState(false);
  const [selectedAppt, setSelectedAppt]         = useState<PickerAppointment | null>(null);

  const patientDisplayName = selectedPatient
    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim()
    : '';

  // Load patients once
  useEffect(() => {
    setPatientsLoading(true);
    api.get('/doctor/my-patients-details')
      .then((res: any) => setAllPatients(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setPatientsLoading(false));
  }, []);

  // Filter patients as query changes
  useEffect(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q || selectedPatient) {
      setFilteredPats([]);
      setDropdownOpen(false);
      return;
    }
    const digits = q.replace(/\D/g, '');
    const results = allPatients.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const phoneDigits = (p.phone || '').replace(/\D/g, '');
      return fullName.includes(q) || (digits.length >= 3 && phoneDigits.includes(digits));
    }).slice(0, 10);
    setFilteredPats(results);
    setDropdownOpen(results.length > 0);
  }, [patientQuery, allPatients, selectedPatient]);

  const setPatientQuery = (val: string) => {
    if (selectedPatient) setSelectedPatient(null);
    setPatientQueryRaw(val);
  };

  const selectPatient = (p: PickerPatient) => {
    setSelectedPatient(p);
    setPatientQueryRaw(`${p.firstName} ${p.lastName}`);
    setDropdownOpen(false);
  };

  const goToStep2 = () => {
    if (!selectedPatient) return;
    setStep(2);
    setApptsLoading(true);
    api.get('/doctor/my-appointments-details')
      .then((res: any) => {
        const all: PickerAppointment[] = Array.isArray(res.data) ? res.data : [];
        setAppointments(
          all
            .filter(a => a.clinic_patient_id === selectedPatient.id)
            .sort((a, b) =>
              new Date(b.datetime_start).getTime() - new Date(a.datetime_start).getTime()
            )
        );
      })
      .catch(console.error)
      .finally(() => setApptsLoading(false));
  };

  const goToStep3 = (appt: PickerAppointment) => {
    setSelectedAppt(appt);
    setStep(3);
  };

  const goBack = () => {
    if (step === 2) { setStep(1); setAppointments([]); }
    if (step === 3) { setStep(2); setSelectedAppt(null); }
  };

  return {
    // step
    step, setStep,
    // step 1
    patientQuery, setPatientQuery,
    filteredPats, selectedPatient, patientsLoading,
    dropdownOpen, setDropdownOpen,
    patientInputRef, patientDisplayName,
    selectPatient,
    goToStep2,
    // step 2
    appointments, apptsLoading, selectedAppt,
    goToStep3,
    // shared
    goBack,
  };
}