'use client';
import React, { useState, useCallback } from 'react';
import { Pill, Plus, Trash2, AlertCircle, Loader2, Ban } from 'lucide-react';
// @ts-ignore
import api from '@/services/api';
import Button from '@/components/ui/Button';
import { usePatientAppointmentPicker, PickerAppointment } from './UsePatientAppointmentPicker';
import { ModalShell, PatientStep, AppointmentStep, ContextBar } from './PickerShell';

interface Med {
  id: number;
  drug_name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface Props {
  onClose: () => void;
}

export const CreatePrescriptionModal = ({ onClose }: Props) => {
  const picker = usePatientAppointmentPicker();
  const { step, setStep, selectedAppt, patientDisplayName, goBack } = picker;

  // Step 3 state
  const [meds, setMeds]               = useState<Med[]>([]);
  const [permissions, setPermissions] = useState<{ can_edit?: boolean }>({ can_edit: false });
  const [medsLoading, setMedsLoading] = useState(false);
  const [drugSearch, setDrugSearch]   = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [form, setForm] = useState({
    drug_catalog_id: null as number | null,
    drug_name: '', dose: '', frequency: '', duration: '', instructions: ''
  });

  const isCancelled = selectedAppt?.status === 2;
  const canEdit     = !isCancelled && permissions?.can_edit === true;

  const fetchMeds = useCallback(async (appt: PickerAppointment) => {
    setMedsLoading(true);
    try {
      const res = await api.get(`/prescriptions/appointment/${appt.id}`, {
        params: { clinic_id: appt.clinic_id }
      });
      setMeds(res.data.meds || []);
      if (res.data.permissions) setPermissions(res.data.permissions);
    } catch (err) {
      console.error('Failed to load meds', err);
    } finally {
      setMedsLoading(false);
    }
  }, []);

  const handleSelectAppt = (appt: PickerAppointment) => {
    picker.goToStep3(appt);
    fetchMeds(appt);
  };

  const handleDrugSearch = async (val: string) => {
    setDrugSearch(val);
    setForm(f => ({ ...f, drug_name: val }));
    if (val.length < 2) return setSearchResults([]);
    try {
      const res = await api.get('/prescriptions/catalog/search', {
        params: { query: val, clinic_id: selectedAppt?.clinic_id }
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Drug search failed', err);
    }
  };

  const selectDrug = (drug: any) => {
    setForm(f => ({
      ...f,
      drug_catalog_id: drug.id,
      drug_name: drug.name,
      dose: drug.strength || '',
      instructions: drug.form || ''
    }));
    setDrugSearch(drug.name);
    setSearchResults([]);
  };

  const addMed = async () => {
    if (!canEdit || !form.drug_name || !selectedAppt) return;
    try {
      await api.post('/prescriptions/add', {
        ...form,
        appointment_id: selectedAppt.id,
        clinic_id: selectedAppt.clinic_id
      });
      setForm({ drug_catalog_id: null, drug_name: '', dose: '', frequency: '', duration: '', instructions: '' });
      setDrugSearch('');
      fetchMeds(selectedAppt);
    } catch (err) {
      console.error(err);
      alert('Failed to add medication');
    }
  };

  const deleteMed = async (id: number) => {
    if (!canEdit || !selectedAppt) return;
    if (!confirm('Remove this medication?')) return;
    try {
      await api.delete(`/prescriptions/${id}`, { params: { clinic_id: selectedAppt.clinic_id } });
      fetchMeds(selectedAppt);
    } catch {
      alert('Failed to delete');
    }
  };

  return (
    <ModalShell
      icon={<Pill className="w-5 h-5 text-[var(--color-primary-brand)]" />}
      title="e-Prescription"
      onClose={onClose}
      step={step}
      label3="Prescription"
      selectedPatient={picker.selectedPatient}
      goToStep2={picker.goToStep2}
      goBack={goBack}
      footerExtra={step === 3 ? (
        <Button shine variant="primary" onClick={onClose}
          className="text-sm px-5 py-2.5"
          style={{ backgroundColor: 'var(--color-primary-brand)' }}>
          Done
        </Button>
      ) : undefined}
    >
      {/* Step 1 */}
      {step === 1 && <PatientStep {...picker} />}

      {/* Step 2 */}
      {step === 2 && (
        <AppointmentStep
          appointments={picker.appointments}
          apptsLoading={picker.apptsLoading}
          patientDisplayName={patientDisplayName}
          onChangePatient={() => goBack()}
          onSelectAppt={handleSelectAppt}
        />
      )}

      {/* Step 3 */}
      {step === 3 && selectedAppt && (
        <div className="space-y-5">
          <ContextBar
            patientDisplayName={patientDisplayName}
            appt={selectedAppt}
            isCancelled={isCancelled}
            onChangeAppt={() => {
              setStep(2);
              setMeds([]);
              setPermissions({ can_edit: false });
            }}
          />

          {/* Add form */}
          {canEdit ? (
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 relative">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5 relative">
                  <label className="text-xs font-semibold text-emerald-800 mb-1 block">Drug Name</label>
                  <input
                    className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
                    placeholder="Search brand or generic..."
                    value={drugSearch}
                    onChange={e => handleDrugSearch(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl max-h-52 overflow-y-auto rounded-xl mt-1 z-50">
                      {searchResults.map((d: any) => (
                        <div key={d.id} onMouseDown={() => selectDrug(d)}
                          className="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-0 transition-colors">
                          <div className="font-semibold text-sm text-gray-800">{d.name}</div>
                          <div className="text-xs text-gray-400">{d.generic_name} · {d.strength}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-emerald-800 mb-1 block">Dose</label>
                  <input className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
                    placeholder="500mg" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-emerald-800 mb-1 block">Freq</label>
                  <input className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
                    placeholder="1-0-1" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-emerald-800 mb-1 block">Duration</label>
                  <input className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
                    placeholder="5 Days" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
                </div>
                <div className="col-span-1">
                  <Button shine onClick={addMed}
                    className="w-full bg-emerald-600 text-white p-2.5 rounded-lg hover:bg-emerald-700 text-sm flex justify-center items-center shadow-sm transition-colors">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 border ${
              isCancelled ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {isCancelled
                ? 'Appointment cancelled — prescriptions are locked.'
                : 'View-only: Only the assigned doctor can prescribe medications.'}
            </div>
          )}

          {/* Meds list */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Medication List</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                {medsLoading ? '…' : meds.length}
              </span>
            </div>
            {medsLoading ? (
              <div className="flex items-center justify-center py-10 bg-white">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : meds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-white text-gray-400">
                <Pill className="w-7 h-7 mb-2 opacity-20" />
                <p className="text-sm">No medications added yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm bg-white">
                <thead className="bg-gray-50 text-gray-500 text-xs font-semibold border-b">
                  <tr>
                    <th className="p-3 pl-4">Drug</th>
                    <th className="p-3">Dose</th>
                    <th className="p-3">Freq</th>
                    <th className="p-3">Duration</th>
                    {canEdit && <th className="p-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {meds.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 group transition-colors">
                      <td className="p-3 pl-4 font-semibold text-gray-800">
                        {m.drug_name}
                        {m.instructions && <div className="text-xs text-gray-400 font-normal mt-0.5">{m.instructions}</div>}
                      </td>
                      <td className="p-3 text-gray-600 text-xs">{m.dose || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-[var(--color-primary-brand)] rounded text-xs font-semibold border border-blue-100">
                          {m.frequency || '—'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600 text-xs">{m.duration || '—'}</td>
                      {canEdit && (
                        <td className="p-3 text-right">
                          <button onClick={() => deleteMed(m.id)}
                            className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
};