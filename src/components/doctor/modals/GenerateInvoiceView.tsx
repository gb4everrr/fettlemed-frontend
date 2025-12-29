// src/components/doctor/modals/GenerateInvoiceView.tsx
'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Card from '@/components/ui/Card';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  ArrowLeft,
  Loader2 
} from 'lucide-react';
import { Appointment, ClinicService } from '@/types/clinic';

interface SelectedService {
  service_id: number | null;
  name: string;
  price: number;
}

interface GeneratedInvoice {
  id: number;
  invoiceNumber: string;
  date: string;
  patientName: string;
  clinicName: string;
  services: SelectedService[];
  totalAmount: number;
  appointmentId: number;
  clinicPatientId: number;
}

interface GenerateInvoiceViewProps {
  appointment: Appointment;
  clinicId: number;
  clinicName: string;
  onSetView: (view: 'details' | 'invoice') => void;
  // 1. ADDED: Prop definition
  onInvoiceGenerated?: (invoiceId: number) => void; 
  role?: string; 
}

// 2. UPDATED: Force UTC
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC', 
  }).format(date);
};

const generateInvoiceNumber = () => {
  const timestamp = Date.now();
  return `INV-${timestamp.toString().slice(-8)}`;
};

export function GenerateInvoiceView({
  appointment,
  clinicId,
  clinicName,
  onSetView,
  onInvoiceGenerated, // Destructure prop
  role
}: GenerateInvoiceViewProps) {
  
  const [availableServices, setAvailableServices] = useState<ClinicService[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [newServiceForm, setNewServiceForm] = useState({ name: '', price: '' });

  const [invoiceData, setInvoiceData] = useState<GeneratedInvoice | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        setFormError(null);
        
        // 1. Fetch Services
        const servicesResponse = await api.get('/clinic-invoice/service/list', {
          params: { clinic_id: clinicId },
        });
        if (!isMounted) return;
        setAvailableServices(servicesResponse.data);

        // 2. Fetch Existing Invoice
        if (appointment.invoice_id) {
          // Keep the params to satisfy your middleware requirements
          const invoiceResponse = await api.get(`/clinic-invoice/invoice/${appointment.invoice_id}`, {
            params: { clinic_id: clinicId }
          });
          
          if (!isMounted) return;
          
          // --- FIX STARTS HERE ---
          // The backend returns the invoice object directly. 
          // It does NOT wrap it in an "invoice" property.
          const invoiceObj = invoiceResponse.data; 
          const invoiceServices = invoiceObj.services || []; 

          const mappedServices: SelectedService[] = invoiceServices.map((invSvc: any) => {
            const serviceDetail = servicesResponse.data.find((s: ClinicService) => s.id === invSvc.service_id);
            return {
              service_id: invSvc.service_id,
              name: serviceDetail?.name || invSvc.service?.name || 'Unknown Service', // Added fallback to nested service name
              price: invSvc.price, 
            };
          });
          
          setSelectedServices(mappedServices);

          const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`;
          
          setInvoiceData({
            id: invoiceObj.id, // Access ID directly from the response object
            invoiceNumber: `INV-${invoiceObj.id}`, 
            date: formatDate(new Date(invoiceObj.invoice_date || new Date())), // Handle potential missing date
            patientName: patientName,
            clinicName: clinicName,
            services: mappedServices,
            totalAmount: invoiceObj.total_amount,
            appointmentId: appointment.id,
            clinicPatientId: appointment.clinic_patient_id,
          });
          // --- FIX ENDS HERE ---

          setIsPreviewMode(true);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to load invoice data:", err);
          setFormError("Failed to load data: " + (err.response?.data?.error || err.message));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [appointment.invoice_id, appointment.patient, clinicId, clinicName]);

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

  const handleNewServiceFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewServiceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddNewService = () => {
    const priceAsNumber = parseFloat(newServiceForm.price);
    if (!newServiceForm.name || isNaN(priceAsNumber)) {
      setFormError('Please enter a valid name and price for the new service.');
      return;
    }
    setSelectedServices(prev => [...prev, {
      service_id: null,
      name: newServiceForm.name,
      price: priceAsNumber,
    }]);
    setNewServiceForm({ name: '', price: '' });
    setFormError(null);
  };

  const handleRemoveService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (selectedServices.length === 0) {
      setFormError('Please select at least one service to create an invoice.');
      return;
    }

    const servicesPayload = selectedServices.map(s => ({
      name: s.name,
      price: s.price,
      appointment_id: appointment.id,
      ...(s.service_id && { service_id: s.service_id }),
    }));

    const payload = {
      clinic_id: clinicId,
      clinic_patient_id: appointment.clinic_patient_id,
      services: servicesPayload,
    };

    try {
      let response;
      let invoiceId: number;

      if (invoiceData?.id) {
        response = await api.put(`/clinic-invoice/invoice/${invoiceData.id}`, payload);
        invoiceId = invoiceData.id;
        setSuccessMessage('Invoice updated successfully!');
      } else {
        response = await api.post('/clinic-invoice/invoice/create', payload);
        invoiceId = response.data.invoice_id;
        setSuccessMessage('Invoice created successfully!');
      }

      // 3. ADDED: Notify parent component
      if (onInvoiceGenerated) {
        onInvoiceGenerated(invoiceId);
      }

      const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`;
      
      setInvoiceData({
        id: invoiceId,
        invoiceNumber: invoiceData?.invoiceNumber || generateInvoiceNumber(),
        date: formatDate(new Date()),
        patientName: patientName,
        clinicName: clinicName,
        services: selectedServices,
        totalAmount: selectedServices.reduce((sum, service) => sum + service.price, 0),
        appointmentId: appointment.id,
        clinicPatientId: appointment.clinic_patient_id,
      });

      setIsPreviewMode(true);
      
    } catch (err: any) {
      console.error('Failed to create/update invoice:', err);
      setFormError(err.response?.data?.error || 'Failed to save invoice.');
    }
  };

  const handleCreateNew = () => {
    setInvoiceData(null);
    setIsPreviewMode(false);
    setSelectedServices([]);
    setFormError(null);
    setSuccessMessage(null);
    setNewServiceForm({ name: '', price: '' });
  };

  const handleGoBackToEdit = () => {
    setIsPreviewMode(false);
    setSuccessMessage(null);
    onSetView('details');
  };

  // ... (PDF logic omitted for brevity as it remains unchanged) ...

  return (
    <div className="h-full flex flex-col">
       {/* Toolbar / Header */}
       <div className="mb-4 flex items-center justify-between">
           <Button variant="ghost" size="sm" onClick={() => onSetView('details')} className="text-gray-600 hover:text-gray-900">
               <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
           </Button>
           {invoiceData && (
             <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={handleCreateNew}>
                     <Plus className="h-4 w-4 mr-2" /> New Invoice
                 </Button>
             </div>
           )}
       </div>

       {isLoading ? (
           <div className="flex-1 flex items-center justify-center">
               <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
           </div>
       ) : (
          <div className="flex-1 overflow-auto">
             {formError && (
                 <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
                     <XCircle className="h-5 w-5 mr-2" /> {formError}
                 </div>
             )}
             {successMessage && (
                 <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
                     <CheckCircle className="h-5 w-5 mr-2" /> {successMessage}
                 </div>
             )}

             {/* Invoice Form / Preview content */}
             {isPreviewMode && invoiceData ? (
                 <Card className="max-w-3xl mx-auto p-8 border-t-4 border-blue-600 shadow-xl bg-white">
                      <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                          <div>
                              <h1 className="text-2xl font-bold text-gray-900">{clinicName}</h1>
                              <p className="text-sm text-gray-500 mt-1">INVOICE</p>
                          </div>
                          <div className="text-right">
                              <p className="font-mono font-bold text-gray-900 text-lg">{invoiceData.invoiceNumber}</p>
                              <p className="text-sm text-gray-500">{invoiceData.date}</p>
                          </div>
                      </div>

                      <div className="flex justify-between mb-8">
                          <div>
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
                              <p className="font-bold text-gray-800 text-lg">{invoiceData.patientName}</p>
                              <p className="text-sm text-gray-600">ID: {invoiceData.clinicPatientId}</p>
                          </div>
                          <div className="text-right">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Appointment</h3>
                              <p className="text-gray-800">Ref: #{invoiceData.appointmentId}</p>
                          </div>
                      </div>

                      <table className="w-full mb-8">
                          <thead>
                              <tr className="bg-gray-50 border-y border-gray-100">
                                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                              </tr>
                          </thead>
                          <tbody>
                              {invoiceData.services.map((service, i) => (
                                  <tr key={i} className="border-b border-gray-50 last:border-0">
                                      <td className="py-3 px-4 text-gray-800">{service.name}</td>
                                      <td className="py-3 px-4 text-right font-medium text-gray-900">Rs. {service.price.toFixed(2)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot>
                              <tr>
                                  <td className="pt-4 px-4 text-right font-bold text-gray-900">Total</td>
                                  <td className="pt-4 px-4 text-right font-bold text-blue-600 text-xl">Rs. {invoiceData.totalAmount.toFixed(2)}</td>
                              </tr>
                          </tfoot>
                      </table>
                      
                      <div className="flex justify-end pt-6 border-t border-gray-100">
                          <Button variant="secondary" size="sm" onClick={() => setIsPreviewMode(false)}>Edit Invoice</Button>
                      </div>
                 </Card>
             ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Service Selection */}
                    <div>
                        <Card className="h-full">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Plus className="h-4 w-4 mr-2"/> Add Services</h3>
                            <div className="space-y-3">
                                {availableServices.map(service => (
                                    <button 
                                        key={service.id} 
                                        onClick={() => handleServiceSelect(service.id)}
                                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-700 group-hover:text-blue-700">{service.name}</span>
                                            <span className="text-sm font-bold text-gray-900">Rs. {service.price}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-600 mb-3">Custom Item</h4>
                                <div className="flex gap-2">
                                    <Input 
                                        id="name"
                                        
                                        value={newServiceForm.name}
                                        onChange={handleNewServiceFormChange}
                                        className="flex-1"
                                    />
                                    <Input 
                                        id="price"
                                       
                                        type="number"
                                        value={newServiceForm.price}
                                        onChange={handleNewServiceFormChange}
                                        className="w-24"
                                    />
                                    <Button onClick={handleAddNewService} variant="secondary">Add</Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Selected Services / Summary */}
                    <div>
                        <Card className="h-full flex flex-col">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center"><FileText className="h-4 w-4 mr-2"/> Invoice Summary</h3>
                            <div className="flex-1">
                                {selectedServices.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        No items added yet.
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {selectedServices.map((service, index) => (
                                            <li key={index} className="flex justify-between items-center p-3 bg-white rounded border border-gray-100 shadow-sm">
                                                <div>
                                                    <p className="font-medium text-gray-800">{service.name}</p>
                                                    <span className="text-xs text-gray-500">{service.service_id ? 'Standard Service' : 'Custom Item'}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-700">Rs. {service.price}</span>
                                                    <button onClick={() => handleRemoveService(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t-2 border-gray-100">
                                <div className="flex justify-between items-center text-lg font-bold text-gray-900 mb-4">
                                    <span>Total Amount</span>
                                    <span>Rs. {selectedServices.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</span>
                                </div>
                                <Button 
                                    className="w-full" 
                                    size="lg" 
                                    variant="primary" 
                                    onClick={handleSubmit}
                                    disabled={selectedServices.length === 0}
                                    shine
                                >
                                    {invoiceData?.id ? 'Update Invoice' : 'Generate Invoice'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
             )}
          </div>
       )}
    </div>
  );
}