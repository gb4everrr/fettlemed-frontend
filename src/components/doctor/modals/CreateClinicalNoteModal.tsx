'use client';
import React, { useState, useCallback } from 'react';
import { FileText, Save, AlertCircle, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
// @ts-ignore
import api from '@/services/api';
import Button from '@/components/ui/Button';
import { usePatientAppointmentPicker, PickerAppointment } from './UsePatientAppointmentPicker';
import { ModalShell, PatientStep, AppointmentStep, ContextBar } from './PickerShell';

interface SoapFields {
  subjective: string;
  objective: string;
  provisional_diagnosis: string;
  observations_private: string;
}

interface NotePermissions {
  can_edit?: boolean;
  can_view_private?: boolean;
}

interface Props {
  onClose: () => void;
}

const EMPTY_SOAP: SoapFields = {
  subjective: '',
  objective: '',
  provisional_diagnosis: '',
  observations_private: '',
};

export const CreateClinicalNoteModal = ({ onClose }: Props) => {
  const picker = usePatientAppointmentPicker();
  const { step, setStep, selectedAppt, patientDisplayName, goBack } = picker;

  // Step 3 state
  const [soap, setSoap]               = useState<SoapFields>(EMPTY_SOAP);
  const [noteId, setNoteId]           = useState<number | null>(null);
  const [permissions, setPermissions] = useState<NotePermissions>({ can_edit: false, can_view_private: false });
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);

  const isCancelled    = selectedAppt?.status === 2;
  const canEdit        = !isCancelled && permissions.can_edit === true;
  const canViewPrivate = permissions.can_view_private === true;

  // Load existing note when appointment is selected
  const fetchNote = useCallback(async (appt: PickerAppointment) => {
    setLoading(true);
    try {
      // The consultation-notes endpoint returns the note + permissions for this appointment
      const res = await api.get(`/consultation-notes/${appt.id}`, {
        params: { clinic_id: appt.clinic_id }
      });
      const data = res.data;
      setSoap({
        subjective:           data.subjective           || '',
        objective:            data.objective            || '',
        provisional_diagnosis: data.provisional_diagnosis || '',
        observations_private: data.observations_private || '',
      });
      if (data.id) setNoteId(data.id);
      if (data.permissions) setPermissions(data.permissions);
    } catch (err: any) {
      // 404 = no note yet, that's fine — start blank
      if (err?.response?.status !== 404) {
        console.error('Failed to load note', err);
      }
      setSoap(EMPTY_SOAP);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectAppt = (appt: PickerAppointment) => {
    picker.goToStep3(appt);
    fetchNote(appt);
  };

  const handleChange = (field: keyof SoapFields, value: string) => {
    if (!canEdit) return;
    setSoap(s => ({ ...s, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!canEdit || !selectedAppt) return;
    setSaving(true);
    try {
      // POST /consultation-notes/ — controller does findOrCreate on appointment_id
      await api.post(`/consultation-notes/`, {
        appointment_id: selectedAppt.id,
        clinic_id: selectedAppt.clinic_id,
        ...soap,
      });
      setSaved(true);
    } catch (err) {
      console.error('Save note failed', err);
      alert('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const textareaClass = (editable: boolean) =>
    `w-full p-4 rounded-lg border text-sm resize-none transition-all outline-none focus:ring-2 ${
      editable
        ? 'bg-white border-gray-300 focus:ring-[var(--color-primary-brand)]/20 focus:border-[var(--color-primary-brand)]'
        : 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
    }`;

  return (
    <ModalShell
      icon={<FileText className="w-5 h-5 text-[var(--color-primary-brand)]" />}
      title="Clinical Note"
      onClose={onClose}
      step={step}
      label3="SOAP Note"
      selectedPatient={picker.selectedPatient}
      goToStep2={picker.goToStep2}
      goBack={goBack}
      footerExtra={step === 3 ? (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              shine
              onClick={handleSave}
              disabled={saving}
              className="text-sm px-5 py-2.5 bg-[var(--color-primary-brand)] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : saved
                ? <><Save className="w-4 h-4" /> Saved ✓</>
                : <><Save className="w-4 h-4" /> Save Note</>
              }
            </Button>
          )}
          <Button
            shine variant="primary"
            onClick={onClose}
            className="text-sm px-5 py-2.5"
            style={{ backgroundColor: saved || !canEdit ? 'var(--color-primary-brand)' : '#6b7280' }}
          >
            Done
          </Button>
        </div>
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
              setSoap(EMPTY_SOAP);
              setNoteId(null);
              setPermissions({ can_edit: false, can_view_private: false });
              setSaved(false);
            }}
          />

          {!canEdit && !isCancelled && (
            <div className="p-3 rounded-lg text-sm flex items-center gap-2 border bg-gray-50 border-gray-200 text-gray-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              View-only: Only the assigned doctor can edit clinical notes.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="space-y-5">

              {/* Subjective */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Subjective
                  <span className="text-xs font-normal text-gray-400 ml-1">— Symptoms & History</span>
                </label>
                <textarea
                  rows={4}
                  className={textareaClass(canEdit)}
                  placeholder={canEdit ? "Patient's complaints, history, and symptoms…" : 'No data recorded.'}
                  value={soap.subjective}
                  onChange={e => handleChange('subjective', e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              {/* Objective */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Objective
                  <span className="text-xs font-normal text-gray-400 ml-1">— Examination Findings</span>
                </label>
                <textarea
                  rows={4}
                  className={textareaClass(canEdit)}
                  placeholder={canEdit ? 'Physical exam findings, vitals, lab results…' : 'No data recorded.'}
                  value={soap.objective}
                  onChange={e => handleChange('objective', e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              {/* Provisional Diagnosis */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Provisional Diagnosis</label>
                <p className="text-xs text-gray-400 -mt-1">Working diagnosis — may be updated after investigations</p>
                <textarea
                  rows={3}
                  className={`${textareaClass(canEdit)} ${canEdit ? 'border-amber-200 focus:ring-amber-400/20 focus:border-amber-400' : ''}`}
                  placeholder={canEdit ? 'e.g. Suspected Type 2 DM, pending HbA1c…' : 'No data recorded.'}
                  value={soap.provisional_diagnosis}
                  onChange={e => handleChange('provisional_diagnosis', e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              {/* Private Observations (only if permitted) */}
              {canViewPrivate && (
                <div className={`p-4 rounded-xl border transition-all ${showPrivate ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className={`w-4 h-4 ${showPrivate ? 'text-yellow-600' : 'text-gray-400'}`} />
                      <label className={`text-sm font-semibold ${showPrivate ? 'text-yellow-800' : 'text-gray-600'}`}>
                        Observations (Doctor's View Only)
                      </label>
                    </div>
                    <button
                      onClick={() => setShowPrivate(!showPrivate)}
                      className={`text-xs font-semibold flex items-center px-3 py-1.5 rounded-full transition-colors ${
                        showPrivate ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {showPrivate ? <><EyeOff className="w-3 h-3 mr-1" />Hide</> : <><Eye className="w-3 h-3 mr-1" />Show</>}
                    </button>
                  </div>
                  {showPrivate && (
                    <div>
                      <textarea
                        rows={3}
                        className={`w-full p-4 rounded-lg border border-yellow-300 bg-white text-sm resize-none outline-none focus:ring-2 focus:ring-yellow-400/20 ${!canEdit ? 'cursor-not-allowed opacity-75' : ''}`}
                        placeholder={canEdit ? 'Private notes (only visible to you)…' : 'No private notes.'}
                        value={soap.observations_private}
                        onChange={e => handleChange('observations_private', e.target.value)}
                        disabled={!canEdit}
                      />
                      <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Strictly private — not visible to other staff.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
};