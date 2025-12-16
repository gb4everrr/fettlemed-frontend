// src/types/clinic.ts
import { LucideIcon } from 'lucide-react';

export interface Appointment {
  id: number;
  clinic_id: number;
  clinic_patient_id: number;
  clinic_doctor_id: number;
  slot_id: number;
  datetime_start: string;
  datetime_end: string;
  status: number;
  notes: string | null;
  patient?: { id: number; first_name: string; last_name: string };
  doctor?: { id: number; first_name: string; last_name: string };
  invoice_id?: number | null; 
  clinic?: any;
}

export interface ClinicDoctor {
  id: number;
  first_name: string;
  last_name: string;
}

export interface ClinicPatient {
  id: number;
  first_name: string;
  last_name: string;
  global_patient_id?: number | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  allergies?: string[];
  chronic_conditions?: string[];
}

export interface AvailableSlot {
  id: number;
  start_time: string;
  end_time: string;
  start_time_utc?: string;
  end_time_utc?: string;
}

export interface DisplaySlot {
  parent_slot_id: number;
  display_start_time: string;
  display_end_time: string;
  key: string;
}

export type ModalType = 'walkin' | 'newAppointment' | 'editAppointment' | null;

export interface DoctorVital {
  id: number;
  clinic_doctor_id: number;
  vital_config_id: number;
  is_required: boolean;
  sort_order: number;
  vitalConfig: {
    id: number;
    vital_name: string;
    data_type: string;
    unit: string;
  };
}

export interface VitalsEntry {
  id: number;
  clinic_id: number;
  clinic_patient_id: number;
  entry_date: string;
  entry_time: string;
  recorded_by_admin_id: number;
  appointment_id: number;
  values: Array<{
    id: number;
    vitals_entry_id: number;
    vital_value: string;
    config_id: number;
    config: {
      vital_name: string;
      unit: string;
    };
  }>;
}

export interface StatusInfo {
  text: string;
  color: string;
  icon: LucideIcon;
}

export interface ClinicService {
  id: number;
  clinic_id: number;
  name: string;
  price: number;
}
