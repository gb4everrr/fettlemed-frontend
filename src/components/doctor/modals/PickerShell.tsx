'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronRight, User, Calendar, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  PickerStep, PickerPatient, PickerAppointment,
  STATUS_LABELS, formatApptDate,
} from './UsePatientAppointmentPicker';

// ─── Dropdown Portal ──────────────────────────────────────────────────────────

export const DropdownPortal = ({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLInputElement | null>;
  open: boolean;
  children: React.ReactNode;
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef]);

  if (!open || !rect) return null;
  return (
    <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}>
      {children}
    </div>
  );
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

export const StepIndicator = ({ step, label3 }: { step: PickerStep; label3: string }) => (
  <div className="flex items-center gap-1 mb-6">
    {(['Patient', 'Appointment', label3] as const).map((label, i) => {
      const s = (i + 1) as PickerStep;
      return (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
            step === s ? 'bg-[var(--color-primary-brand)] text-white'
              : step > s ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-400'
          }`}>
            <span>{s}</span><span>{label}</span>
          </div>
          {s < 3 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Step 1: Patient Search ───────────────────────────────────────────────────

export const PatientStep = ({
  patientQuery, setPatientQuery,
  filteredPats, selectedPatient,
  patientsLoading, dropdownOpen, setDropdownOpen,
  patientInputRef, patientDisplayName,
  selectPatient,
}: {
  patientQuery: string;
  setPatientQuery: (v: string) => void;
  filteredPats: PickerPatient[];
  selectedPatient: PickerPatient | null;
  patientsLoading: boolean;
  dropdownOpen: boolean;
  setDropdownOpen: (v: boolean) => void;
  patientInputRef: React.RefObject<HTMLInputElement | null>;
  patientDisplayName: string;
  selectPatient: (p: PickerPatient) => void;
}) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-500">Search for a patient by name or phone number.</p>
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">Patient</label>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={patientInputRef}
          autoFocus
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[var(--color-primary-brand)]/20 focus:border-[var(--color-primary-brand)] outline-none transition"
          placeholder="Name or phone number..."
          value={patientQuery}
          onChange={e => setPatientQuery(e.target.value)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          onFocus={() => filteredPats.length > 0 && setDropdownOpen(true)}
        />
      </div>

      <DropdownPortal anchorRef={patientInputRef} open={dropdownOpen}>
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {filteredPats.map(p => (
            <div
              key={p.id}
              onMouseDown={() => selectPatient(p)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-primary-brand)]/5 cursor-pointer border-b last:border-0 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-800">{p.firstName} {p.lastName}</div>
                <div className="text-xs text-gray-400 flex gap-2">
                  {p.phone && <span>{p.phone}</span>}
                  {p.clinicName && <span>· {p.clinicName}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DropdownPortal>

      {patientQuery.length >= 2 && filteredPats.length === 0 && !selectedPatient && !patientsLoading && (
        <p className="text-xs text-gray-400 mt-2 ml-1">No patients found.</p>
      )}
    </div>

    {selectedPatient && (
      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="font-semibold text-sm text-emerald-800">{patientDisplayName}</div>
          {selectedPatient.phone && <div className="text-xs text-emerald-600">{selectedPatient.phone}</div>}
        </div>
      </div>
    )}
  </div>
);

// ─── Step 2: Appointment Select ───────────────────────────────────────────────

export const AppointmentStep = ({
  appointments, apptsLoading, patientDisplayName,
  onChangePatient, onSelectAppt,
}: {
  appointments: PickerAppointment[];
  apptsLoading: boolean;
  patientDisplayName: string;
  onChangePatient: () => void;
  onSelectAppt: (a: PickerAppointment) => void;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
        <User className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <span className="font-semibold text-gray-700 text-sm flex-1">{patientDisplayName}</span>
      <button onClick={onChangePatient} className="text-xs text-[var(--color-primary-brand)] hover:underline">Change</button>
    </div>

    <p className="text-sm text-gray-500">Select an appointment.</p>

    {apptsLoading ? (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    ) : appointments.length === 0 ? (
      <div className="py-10 text-center text-gray-400 text-sm">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
        No appointments found for this patient.
      </div>
    ) : (
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {appointments.map(appt => {
          const badge = STATUS_LABELS[appt.status] ?? STATUS_LABELS[0];
          return (
            <div
              key={appt.id}
              onClick={() => onSelectAppt(appt)}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[var(--color-primary-brand)] hover:bg-[var(--color-primary-brand)]/5 cursor-pointer transition-all group"
            >
              <div>
                <div className="font-semibold text-sm text-gray-800 group-hover:text-[var(--color-primary-brand)]">
                  {formatApptDate(appt.datetime_start)}
                </div>
                <div className="flex gap-2 mt-1">
                  {appt.clinic?.name && <span className="text-xs text-gray-400">{appt.clinic.name}</span>}
                  {appt.appointment_type && <span className="text-xs text-gray-400">· {appt.appointment_type}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${badge.className}`}>{badge.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--color-primary-brand)]" />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// ─── Context Bar (shown in Step 3 of every modal) ─────────────────────────────

export const ContextBar = ({
  patientDisplayName, appt, onChangeAppt, isCancelled,
}: {
  patientDisplayName: string;
  appt: PickerAppointment;
  onChangeAppt: () => void;
  isCancelled?: boolean;
}) => (
  <div className="flex items-center gap-2 flex-wrap mb-1">
    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
      <User className="w-3 h-3" />{patientDisplayName}
    </div>
    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
      <Calendar className="w-3 h-3" />{formatApptDate(appt.datetime_start)}
    </div>
    {isCancelled && (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
        Cancelled · Read-only
      </span>
    )}
    <button onClick={onChangeAppt} className="ml-auto text-xs text-[var(--color-primary-brand)] hover:underline">Change</button>
  </div>
);

// ─── Modal Shell ──────────────────────────────────────────────────────────────

export const ModalShell = ({
  icon, title, onClose,
  step, label3,
  selectedPatient, goToStep2, goBack,
  children,
  footerExtra,
}: {
  icon: React.ReactNode;
  title: string;
  onClose: () => void;
  step: PickerStep;
  label3: string;
  selectedPatient: PickerPatient | null;
  goToStep2: () => void;
  goBack: () => void;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
}) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <StepIndicator step={step} label3={label3} />
        {children}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
        <Button
          variant="ghost"
          onClick={step === 1 ? onClose : goBack}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </Button>

        <div className="flex items-center gap-2">
          {step === 1 && (
            <Button
              shine variant="primary"
              onClick={goToStep2}
              disabled={!selectedPatient}
              className="text-sm px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-primary-brand)' }}
            >
              Next: Appointment →
            </Button>
          )}
          {footerExtra}
        </div>
      </div>
    </div>
  </div>
);