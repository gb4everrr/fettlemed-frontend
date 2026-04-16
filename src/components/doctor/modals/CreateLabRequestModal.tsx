'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Beaker, Search, Plus, AlertCircle, Loader2 } from 'lucide-react';
// @ts-ignore
import api from '@/services/api';
import Button from '@/components/ui/Button';
import { usePatientAppointmentPicker, PickerAppointment } from './UsePatientAppointmentPicker';
import { ModalShell, PatientStep, AppointmentStep, ContextBar } from './PickerShell';

interface Props {
  onClose: () => void;
}

export const CreateLabRequestModal = ({ onClose }: Props) => {
  const picker = usePatientAppointmentPicker();
  const { step, setStep, selectedAppt, patientDisplayName, goBack } = picker;

  // Step 3 state
  const [orders, setOrders]           = useState<any[]>([]);
  const [permissions, setPermissions] = useState<{ can_edit?: boolean }>({ can_edit: false });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [search, setSearch]           = useState('');
  const [results, setResults]         = useState<any[]>([]);
  const [placing, setPlacing]         = useState(false);

  const isCancelled = selectedAppt?.status === 2;
  const canOrder    = !isCancelled && permissions.can_edit === true;

  const fetchOrders = useCallback(async (appt: PickerAppointment) => {
    setOrdersLoading(true);
    try {
      const res = await api.get(`/lab-orders/appointment/${appt.id}`, {
        params: { clinic_id: appt.clinic_id }
      });
      if (res.data.permissions) {
        setOrders(res.data.orders || []);
        setPermissions(res.data.permissions);
      } else {
        setOrders(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Fetch orders error', err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // When picker selects an appointment, load orders
  const handleSelectAppt = (appt: PickerAppointment) => {
    picker.goToStep3(appt);
    fetchOrders(appt);
  };

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (val.length < 2) return setResults([]);
    try {
      const res = await api.get('/lab-orders/catalog/search', {
        params: { query: val, clinic_id: selectedAppt?.clinic_id }
      });
      setResults(res.data);
    } catch (err) {
      console.error('Search error', err);
    }
  };

  const placeOrder = async (test: any) => {
    if (!canOrder || !selectedAppt) return;
    setPlacing(true);
    try {
      await api.post('/lab-orders/create', {
        appointment_id: selectedAppt.id,
        lab_catalog_id: test.id,
        clinic_id: selectedAppt.clinic_id,
        priority: 'routine',
      });
      setSearch('');
      setResults([]);
      fetchOrders(selectedAppt);
    } catch {
      alert('Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <ModalShell
      icon={<Beaker className="w-5 h-5 text-[var(--color-primary-brand)]" />}
      title="Lab Request"
      onClose={onClose}
      step={step}
      label3="Lab Tests"
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
              setOrders([]);
              setPermissions({ can_edit: false });
            }}
          />

          {/* Search */}
          {canOrder ? (
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[var(--color-primary-brand)]/20 focus:border-[var(--color-primary-brand)] outline-none"
                placeholder="Search labs (e.g. CBC, Glucose, LOINC code...)"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-50">
                  {results.map((test: any) => (
                    <button
                      key={test.id}
                      onMouseDown={() => placeOrder(test)}
                      className="w-full text-left px-4 py-3 hover:bg-[var(--color-primary-brand)]/5 border-b last:border-0 flex justify-between items-center group transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{test.test_name}</p>
                        <p className="text-xs text-gray-400">{test.test_code} · {test.category}</p>
                      </div>
                      <Plus className="w-4 h-4 text-[var(--color-primary-brand)] opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 border ${
              isCancelled ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {isCancelled
                ? 'Appointment cancelled — lab orders are locked.'
                : 'View-only: Only the assigned doctor can place lab orders.'}
            </div>
          )}

          {/* Orders list */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Requested Tests</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                {ordersLoading ? '…' : orders.length}
              </span>
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-10 bg-white">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-white text-gray-400">
                <Beaker className="w-7 h-7 mb-2 opacity-20" />
                <p className="text-sm">No investigations ordered yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 bg-white">
                {orders.map((order: any) => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.test_name?.[0] ?? '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{order.test_name}</p>
                        <p className="text-xs text-gray-400">
                          {order.doctor?.last_name ? `Dr. ${order.doctor.last_name} · ` : ''}
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
};