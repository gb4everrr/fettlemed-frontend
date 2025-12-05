'use client';
import { useSelector } from 'react-redux';
import { ReactNode } from 'react';
// Import your RootState type if you have one, otherwise use any
// import { RootState } from '@/lib/store'; 


export type Permission = 
  // Owner Level
  | 'delete_clinic'
  | 'manage_subscription'
  | 'view_audit_logs'
  | 'manage_branches'
  
  // Admin Level
  | 'manage_clinic_profile'
  | 'manage_staff'
  | 'manage_services'
  | 'view_financials'
  | 'manage_invoices'
  | 'view_analytics_ops'
  | 'view_analytics_doc'
  | 'manage_vitals_library'
  | 'manage_templates'
  
  // Clinical Level (Doctors/Nurses)
  | 'view_assigned_patients'
  | 'manage_medical_records'
  | 'create_prescription'
  | 'view_prescription'
  | 'manage_availability'
  | 'view_own_schedule'
  | 'manage_vitals_entry'
  | 'view_patient_history'
  
  // Operational Level (Reception)
  | 'manage_patients'
  | 'manage_appointments'
  | 'view_all_schedule'
  | 'process_payments'
  | 'view_services';

interface CanProps {
  perform: Permission;
  yes?: ReactNode;      // Render this if allowed
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
