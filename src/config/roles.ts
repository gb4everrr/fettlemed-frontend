// This strictly matches your backend 'config/roles.js' logic
import { Permission } from '@/lib/features/auth/Can'; // Import the type from your Can component

type RoleDefinition = {
  inherits: string[];
  permissions: Permission[];
};

export const ROLES: Record<string, RoleDefinition> = {
  // --- OWNER & ADMIN ---
  OWNER: { inherits: ['CLINIC_ADMIN', 'DOCTOR_OWNER'], permissions: ['manage_branches', 'manage_roles'] },
  CLINIC_ADMIN: { 
    inherits: ['RECEPTIONIST', 'NURSE'], 
    permissions: ['manage_staff', 'manage_roles', 'manage_clinic_profile', 'manage_services', 'manage_templates', 'view_financials', 'view_analytics_ops', 'delete_patient', 'manage_vitals_library', 'view_clinic_details', 'manage_availability'] 
  },

  // --- DOCTORS ---
  DOCTOR_OWNER: { inherits: ['CLINIC_ADMIN', 'DOCTOR_PARTNER'], permissions: [] },
  
  DOCTOR_PARTNER: { 
    inherits: ['DOCTOR_VISITING'], 
    permissions: ['view_financials', 'view_analytics_doc', 'view_all_schedule', 'manage_appointments'] 
  },
  
  DOCTOR_VISITING: { 
    inherits: [], 
    permissions: ['view_own_schedule', 'view_assigned_patients', 'create_prescription', 'view_prescription', 'manage_medical_records', 'manage_availability', 'view_patient_history', 'view_clinic_details'] 
  },

  // --- STAFF ---
  RECEPTIONIST: { inherits: [], permissions: ['manage_patients', 'manage_appointments', 'view_all_schedule', 'manage_invoices', 'view_services', 'manage_vitals_entry'] },
  NURSE: { inherits: [], permissions: ['manage_vitals_entry', 'view_patient_history', 'manage_medical_records', 'view_all_schedule'] }
};

// Helper to flatten permissions (handling inheritance)
export const getPermissionsForRole = (role: string): Permission[] => {
  const roleDef = ROLES[role];
  if (!roleDef) return [];

  let perms = new Set<Permission>(roleDef.permissions);
  
  // Recursive inheritance
  roleDef.inherits.forEach(inheritedRole => {
    const inheritedPerms = getPermissionsForRole(inheritedRole);
    inheritedPerms.forEach(p => perms.add(p));
  });

  return Array.from(perms);
};