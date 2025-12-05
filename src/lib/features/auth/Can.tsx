'use client';
import { useSelector } from 'react-redux';
import { ReactNode } from 'react';

// --- THE PERMISSION DICTIONARY ---
// This strictly matches your backend 'config/roles.js'.
// Using this type gives you IntelliSense everywhere in your app.
export type Permission = 
  // Owner & Admin Level
  | 'manage_branches'
  | 'manage_roles'
  | 'manage_staff'
  | 'manage_clinic_profile'
  | 'manage_services'
  | 'manage_templates'
  | 'view_financials'
  | 'view_analytics_ops'
  | 'delete_patient'
  | 'manage_vitals_library'
  | 'view_clinic_details'
  
  // Doctor & Clinical Level
  | 'view_analytics_doc'
  | 'view_all_schedule'
  | 'manage_appointments'
  | 'view_own_schedule'
  | 'view_assigned_patients'
  | 'create_prescription'
  | 'view_prescription'
  | 'manage_medical_records'
  | 'manage_availability'
  | 'view_patient_history'
  
  // Operational Level (Reception/Nurse)
  | 'manage_patients'
  | 'manage_invoices'
  | 'view_services'
  | 'manage_vitals_entry';

interface CanProps {
  perform: Permission;
  yes?: ReactNode;      // Render this if allowed (optional, can use children instead)
  no?: ReactNode;       // Render this if denied (optional fallback)
  children?: ReactNode; // Default render if allowed
}

export const Can = ({ perform, yes, no, children }: CanProps) => {
  // Access auth state - adjust state path if different in your store
  const { activePermissions } = useSelector((state: any) => state.auth);

  // Safety check: if no permissions loaded yet, deny by default
  if (!activePermissions || !Array.isArray(activePermissions)) {
    return <>{no || null}</>;
  }

  const isAllowed = activePermissions.includes(perform);

  if (isAllowed) {
    return <>{children || yes}</>;
  }

  return <>{no || null}</>;
};