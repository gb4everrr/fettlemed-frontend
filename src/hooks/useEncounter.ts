import { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import api from '@/services/api'; 
// @ts-ignore
import { Appointment, ClinicPatient } from '@/types/clinic';

export interface EncounterData {
  appointment: Appointment & { vitals?: any[] };
  patient: ClinicPatient;
  history: Appointment[];
  vitalConfigs: any[];
  diagnoses: any[];
  labOrders: any[];
  allergies: any[];
  appointmentVitals: any[];
}

export const useEncounter = (
  appointmentId?: number, 
  clinicId?: number, 
  initialPatientId?: number, 
  clinicDoctorId?: number    
) => {
  const [data, setData] = useState<EncounterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms State
  const [soapForm, setSoapForm] = useState({ 
    subjective: '', 
    objective: '', 
    observations_private: '' 
  });
  
  const [medsForm, setMedsForm] = useState<any[]>([]);

  // 1. DATA FETCHING (The "Getter")
  const fetchEncounter = useCallback(async () => {
    if (!appointmentId || !clinicId) return;

    try {
      setLoading(true);
      
      let pId = initialPatientId;
      let apptData: any = null;

      if (!pId) {
         const apptRes = await api.get(`/appointment/${appointmentId}`);
         apptData = apptRes.data;
         pId = apptData.clinic_patient_id;
      }

      // Parallel Fetch of all encounter data
      const [
        patientRes,
        vitalsRes,
        assignmentsRes,
        historyRes,
        allergiesRes,
        notesRes,
        diagnosisRes, // Fetch Diagnoses
        labsRes       // Fetch Lab Orders
      ] = await Promise.all([
        api.get(`/doctor/patient-details/${pId}?clinic_id=${clinicId}`),
        api.get(`/clinic-vitals/appointment/${appointmentId}?clinic_id=${clinicId}`),
        clinicDoctorId ? api.get(`/clinic-vitals/doctor-assignments/${clinicDoctorId}?clinic_id=${clinicId}`) : { data: [] },
        api.get(`/clinic-vitals/entry/history/${pId}?clinic_id=${clinicId}`),
        api.get(`/doctor/patient/${pId}/allergies?clinic_id=${clinicId}`),
        api.get(`/consultation-note/${appointmentId}`),
        api.get(`/encounter/diagnosis/${appointmentId}`), // Make sure this route exists or return []
        api.get(`/encounter/lab-orders/${appointmentId}`) // Make sure this route exists or return []
      ]);

      setData({
        appointment: apptData || { id: appointmentId, clinic_patient_id: pId },
        patient: patientRes.data,
        appointmentVitals: vitalsRes.data || [],
        vitalConfigs: assignmentsRes.data || [], 
        history: historyRes.data || [],
        allergies: allergiesRes.data || [],
        diagnoses: diagnosisRes.data || [], 
        labOrders: labsRes.data || []
      });

      // Populate SOAP Form if exists
      if (notesRes.data) {
        setSoapForm({
            subjective: notesRes.data.subjective || '',
            objective: notesRes.data.objective || '',
            observations_private: notesRes.data.observations_private || ''
        });
      }

    } catch (err: any) {
      console.error("Encounter Load Error:", err);
      // We don't block the UI here, just log the error. 
      // This ensures the modal still opens even if one endpoint fails.
    } finally {
      setLoading(false);
    }
  }, [appointmentId, clinicId, initialPatientId, clinicDoctorId]);

  useEffect(() => {
    fetchEncounter();
  }, [fetchEncounter]);

  // 2. ACTIONS (The "Setter" Logic) - Restored!
  
  const addDiagnosis = async (diagnosisData: any) => {
    try {
        await api.post('/encounter/diagnosis/add', {
            appointment_id: appointmentId,
            clinic_id: clinicId,
            ...diagnosisData
        });
        await fetchEncounter(); // Reload to show new item
    } catch (err) {
        console.error("Add Diagnosis Failed", err);
        alert("Failed to add diagnosis");
    }
  };

  const removeDiagnosis = async (id: number) => {
    try {
        await api.delete(`/encounter/diagnosis/${id}`);
        await fetchEncounter();
    } catch (err) {
        console.error("Remove Diagnosis Failed", err);
    }
  };

  const addLabOrder = async (labData: any) => {
    try {
        await api.post('/encounter/lab-orders/add', {
            appointment_id: appointmentId,
            clinic_id: clinicId,
            ...labData
        });
        await fetchEncounter();
    } catch (err) {
        console.error("Add Lab Failed", err);
        alert("Failed to add lab order");
    }
  };

  const removeLabOrder = async (id: number) => {
    try {
        await api.delete(`/encounter/lab-orders/${id}`);
        await fetchEncounter();
    } catch (err) {
        console.error("Remove Lab Failed", err);
    }
  };

  return {
    data,
    loading,
    error,
    forms: { soapForm, setSoapForm, medsForm, setMedsForm },
    actions: { 
        reload: fetchEncounter,
        addDiagnosis,   // <--- Now exists
        removeDiagnosis,// <--- Now exists
        addLabOrder,    // <--- Now exists
        removeLabOrder  // <--- Now exists
    }
  };
};