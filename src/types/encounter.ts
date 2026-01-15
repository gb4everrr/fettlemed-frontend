import { Appointment, ClinicPatient } from './clinic';

// 1. Define the Nested Vitals Structure
export interface VitalsRecordedValue {
  id: number;
  vital_value: string;
  config: {
    vital_name: string;
    unit: string;
  };
}

export interface VitalsEntry {
  id: number;
  entry_date: string;
  entry_time: string;
  values: VitalsRecordedValue[];
}

// 2. Extend the Base Appointment Type
// This fixes the "Property 'vitals' does not exist" error
export interface EncounterAppointment extends Appointment {
  vitals?: VitalsEntry[]; 
}

// 3. Update the Main Data Contract
export interface EncounterData {
  appointment: EncounterAppointment; // Use the extended type here
  patient: ClinicPatient;
  note?: { note: string }; // Simplified for JSON parsing
  prescription?: { prescription: string };
  labOrders: any[];
  diagnoses: any[];
  allergies: any[];
}

// Re-export other types for the components to use
export interface SoapNoteStructure {
  subjective: string;
  objective: string;
  observations_private?: string;
  note?: string;
}

export interface MedicationItem {
  drug_name: string;
  dose: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
}