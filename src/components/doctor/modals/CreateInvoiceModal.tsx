// src/components/doctor/modals/CreateInvoiceModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Check, FileText, Plus, Trash2 } from 'lucide-react';
import { Label } from '@radix-ui/react-label';

// Interfaces
interface ClinicPatient {
    id: number;
    first_name: string;
    last_name: string;
    global_patient_id: number | null;
}

interface ClinicService {
    id: number;
    name: string;
    price: number;
}

interface Appointment {
    id: number;
    clinic_patient_id: number;
    patient_name: string;
    doctor: {
        first_name: string;
        last_name: string;
    };
    patient: {
        first_name: string;
        last_name: string;
    };
    datetime_start_str: string;
}

interface SelectedService {
    service_id: number | null;
    name: string;
    price: number;
}

interface CreateInvoiceModalProps {
  clinicId: number;
  clinicName: string; // Added prop
  onClose: () => void;
  role?: string; // Added role prop
}

const formatUtcToLocal = (utcString: string) => {
    if (!utcString) return 'N/A';
    const date = new Date(utcString);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

export function CreateInvoiceModal({ clinicId, clinicName, onClose, role }: CreateInvoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdItemId, setCreatedItemId] = useState<number | null>(null);

  // Invoice form state
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [availableServices, setAvailableServices] = useState<ClinicService[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [clinicPatientId, setClinicPatientId] = useState<number | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const [newServiceForm, setNewServiceForm] = useState({ name: '', price: '' });

  // Fetch data when modal opens
  useEffect(() => {
    if (clinicId) {
      fetchInvoiceData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const fetchInvoiceData = async () => {
    try {
      const [servicesRes, appointmentsRes, patientsRes] = await Promise.all([
        api.get('/clinic-invoice/service/list', { params: { clinic_id: clinicId } }),
        api.get('/appointments', { params: { clinic_id: clinicId } }),
        api.get('/clinic-user/clinic-patient', { params: { clinic_id: clinicId } }),
      ]);
      
      setAvailableServices(servicesRes.data);
      setAppointments(appointmentsRes.data);
      setPatients(patientsRes.data.map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        global_patient_id: p.global_patient_id
      })));
    } catch (err) {
      console.error('Failed to fetch invoice data:', err);
      setErrorMessage('Failed to load invoice data');
    }
  };

  const resetForm = () => {
    setSelectedServices([]);
    setAppointmentId(null);
    setClinicPatientId(null);
    setSelectedPatientName('');
    setNewServiceForm({ name: '', price: '' });
    setSuccessMessage(null);
    setErrorMessage(null);
    setCreatedItemId(null);
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    if (!clinicPatientId || selectedServices.length === 0) {
      setErrorMessage('Please select a patient and at least one service');
      setIsLoading(false);
      return;
    }
    
    try {
      const servicesPayload = selectedServices.map(s => ({
        ...(s.service_id !== null && { service_id: s.service_id }),
        name: s.name,
        price: s.price,
        appointment_id: appointmentId,
      }));
      
      const response = await api.post('/clinic-invoice/invoice/create', {
        clinic_id: clinicId,
        clinic_patient_id: clinicPatientId,
        services: servicesPayload,
      });
      
      setSuccessMessage('Invoice generated successfully!');
      setCreatedItemId(response.data.invoice_id);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: number) => {
    const service = availableServices.find(s => s.id === serviceId);
    if (service) {
      setSelectedServices(prev => [...prev, {
        service_id: service.id,
        name: service.name,
        price: service.price,
      }]);
    }
  };
  
  const handleAddNewService = () => {
    const priceAsNumber = parseFloat(newServiceForm.price);
    if (!newServiceForm.name || isNaN(priceAsNumber)) {
      setErrorMessage('Please enter a valid name and price for the new service');
      return;
    }
    setSelectedServices(prev => [...prev, {
      service_id: null,
      name: newServiceForm.name,
      price: priceAsNumber,
    }]);
    setNewServiceForm({ name: '', price: '' });
  };
  
  const handleRemoveService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleAppointmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const apptId = e.target.value ? parseInt(e.target.value) : null;
    setAppointmentId(apptId);
    
    if (apptId) {
      const selectedAppt = appointments.find(a => a.id === apptId);
      if (selectedAppt) {
        const clinicPatient = patients.find(p => p.id === selectedAppt.clinic_patient_id);
        setClinicPatientId(clinicPatient ? clinicPatient.id : null);
        setSelectedPatientName(clinicPatient ? `${clinicPatient.first_name} ${clinicPatient.last_name}` : '');
      }
    } else {
      setClinicPatientId(null);
      setSelectedPatientName('');
    }
  };
  
  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value ? parseInt(e.target.value) : null;
    setClinicPatientId(patientId);
    const selectedPatient = patients.find(p => p.id === patientId);
    setSelectedPatientName(selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : '');
    setAppointmentId(null);
  };

  const totalAmount = selectedServices.reduce((sum, service) => sum + service.price, 0);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Generate Invoice</h2>
              {/* --- ADDED CLINIC NAME --- */}
              <p className="text-sm text-gray-500 mt-1">{clinicName}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {successMessage ? (
            <div className="text-center py-8">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{successMessage}</h3>
              <div className="flex justify-center space-x-4 mt-6">
                <Button variant="primary" size="md" onClick={resetForm}>
                  Create Another Invoice
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInvoiceSubmit}>
              {errorMessage && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Link to Appointment (Optional)</Label>
                    <select
                      value={appointmentId || ''}
                      onChange={handleAppointmentSelect}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                    >
                      <option value="">-- Select Appointment --</option>
                      {appointments.map((appt) => (
                        <option key={appt.id} value={appt.id}>
                          Dr. {appt.doctor?.first_name} {appt.doctor?.last_name} | Patient: {appt.patient?.first_name} {appt.patient?.last_name} | {formatUtcToLocal(appt.datetime_start_str)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="text-center text-gray-500 text-sm">-- OR --</div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Select Patient</Label>
                    <select
                      value={clinicPatientId || ''}
                      onChange={handlePatientSelect}
                      disabled={!!appointmentId}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                    >
                      <option value="">-- Select Patient --</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedPatientName && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm font-semibold text-blue-800">Selected: {selectedPatientName}</p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Add Services</h3>
                    <div className="mb-3">
                      <Label className="text-sm font-medium text-gray-700">From Service Library</Label>
                      <select
                        onChange={(e) => handleServiceSelect(parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        value=""
                      >
                        <option value="">-- Select Service --</option>
                        {availableServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} (Rs. {service.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="text-center text-gray-500 text-sm my-2">-- OR --</div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Add Custom Service</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="new-service-name"
                          type="text"
                          placeholder="Service Name"
                          value={newServiceForm.name}
                          onChange={(e) => setNewServiceForm({...newServiceForm, name: e.target.value})}
                          className="flex-1"
                        />
                        <Input
                          id="new-service-price"
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={newServiceForm.price}
                          onChange={(e) => setNewServiceForm({...newServiceForm, price: e.target.value})}
                          className="w-24"
                        />
                        <Button type="button" onClick={handleAddNewService} variant="primary" size="sm" className="!p-2.5">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Invoice Preview</h3>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 min-h-[300px]">
                    {selectedServices.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>Add services to preview</p>
                      </div>
                    ) : (
                      <>
                        <ul className="divide-y divide-gray-200">
                          {selectedServices.map((service, index) => (
                            <li key={index} className="py-2 flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{service.name}</p>
                                <span className="text-xs text-gray-500">
                                  {service.service_id ? 'Library' : 'Custom'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">Rs. {service.price.toFixed(2)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveService(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 pt-4 border-t border-gray-300 flex justify-between font-bold">
                          <span>Total</span>
                          <span>Rs. {totalAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <Button type="button" variant="ghost" size="md" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="md" 
                  disabled={isLoading || selectedServices.length === 0 || !clinicPatientId}
                  shine
                >
                  {isLoading ? 'Generating...' : 'Generate Invoice'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}