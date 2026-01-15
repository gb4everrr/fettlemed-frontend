// @ts-ignore
import api from '@/services/api';
import { EncounterData, SoapNoteStructure, MedicationItem } from '@/types/encounter';

export const EncounterService = {
  // 1. Fetch Everything
  getEncounterDetails: async (appointmentId: number, clinicId: number): Promise<EncounterData> => {
    // This requires your 'encounterRoutes' to be mounted at /api/encounter
    const response = await api.get(`/encounter/${appointmentId}`, {
        params: { clinic_id: clinicId }
    });
    return response.data;
  },

  // 2. Catalogs (Search)
  searchDrugs: async (query: string) => {
    const res = await api.get(`/encounter/search/drugs`, { params: { q: query } });
    return res.data;
  },
  
  searchDiagnosis: async (query: string) => {
    const res = await api.get(`/encounter/search/diagnosis`, { params: { q: query } });
    return res.data;
  },

  searchLabs: async (query: string) => {
    const res = await api.get(`/encounter/search/labs`, { params: { q: query } });
    return res.data;
  },

  // 3. Saves

  // FIX: Switched to the correct Doctor Route (PUT) instead of generic POST
  saveSoapNote: async (appointmentId: number, soapData: SoapNoteStructure) => {
    return api.put(`/doctor/consultation-note/${appointmentId}`, {
      // The controller expects 'note' (singular) containing the text/JSON
      note: JSON.stringify(soapData)
    });
  },

  savePrescription: async (appointmentId: number, meds: MedicationItem[]) => {
    // This assumes prescriptionRoutes is mounted at /api/prescription
    return api.post(`/prescription`, {
      appointment_id: appointmentId,
      medicines: meds, // Controller handles JSON.stringify
      notes: '' // Optional top-level note
    });
  },

  addDiagnosis: async (payload: any) => {
    return api.post(`/encounter/diagnosis`, payload);
  },

  removeDiagnosis: async (id: number) => {
    return api.delete(`/encounter/diagnosis/${id}`);
  },

  addLabOrder: async (payload: any) => {
    return api.post(`/encounter/labs`, payload);
  },

  removeLabOrder: async (id: number) => {
    return api.delete(`/encounter/labs/${id}`);
  }
};