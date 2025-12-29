// src/components/clinic/modals/GenerateInvoiceView.tsx
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
import { Label } from '@radix-ui/react-label';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Download, 
  FileText, 
  User, 
  Stethoscope, 
  Clock,
  ArrowLeft,
  Loader2 
} from 'lucide-react';
import { Appointment, ClinicService } from '@/types/clinic';
import { formatDateTime } from '@/lib/utils/datetime';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- (Helper interfaces and functions) ---
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
  onSetView: (view: 'details') => void; 
}

// UPDATED: Added { timeZone: 'UTC' } to prevent local timezone conversion
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

const generateInvoiceNumber = () => {
  const timestamp = Date.now();
  return `INV-${timestamp.toString().slice(-8)}`;
};

export function GenerateInvoiceView({
  appointment,
  clinicId,
  clinicName,
  onSetView
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
        
        const servicesResponse = await api.get('/clinic-invoice/service/list', {
          params: { clinic_id: clinicId },
        });
        if (!isMounted) return;
        setAvailableServices(servicesResponse.data);

        if (appointment.invoice_id) {
          const invoiceResponse = await api.get(`/clinic-invoice/invoice/${appointment.invoice_id}`, {
            params: { clinic_id: clinicId }
          });
          if (!isMounted) return;
          
          const invoiceObj = invoiceResponse.data;
          
          if (!invoiceObj) {
            throw new Error("Invoice data is missing from the server response.");
          }

          const invoiceServices = invoiceObj.services || [];

          const mappedServices: SelectedService[] = invoiceServices.map((invSvc: any) => {
            const serviceDetail = servicesResponse.data.find((s: ClinicService) => s.id === invSvc.service_id);
            return {
              service_id: invSvc.service_id,
              name: serviceDetail?.name || invSvc.service?.name || 'Unknown Service', 
              price: invSvc.price, 
            };
          });
          
          setSelectedServices(mappedServices);

          const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`;
          
          setInvoiceData({
            id: invoiceObj.id,
            invoiceNumber: `INV-${invoiceObj.id}`, 
            date: formatDate(new Date(invoiceObj.invoice_date)),
            patientName: patientName,
            clinicName: clinicName,
            services: mappedServices,
            totalAmount: invoiceObj.total_amount,
            appointmentId: appointment.id,
            clinicPatientId: appointment.clinic_patient_id,
          });

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
  };

  const handleDownloadPDF = async () => {
    if (!invoiceData) return;
    try {
      // UPDATED: Use UTC for the 'Generated on' timestamp
      const generatedDate = new Date().toLocaleString('en-US', { timeZone: 'UTC' });

      const invoiceElement = document.createElement('div');
      invoiceElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background: white; width: 800px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
            <div style="font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px;">${invoiceData.clinicName}</div>
            <div style="font-size: 24px; color: #374151; margin-top: 10px;">INVOICE</div>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 30px 0;">
            <div style="flex: 1;"><h3 style="color: #2563eb; margin-bottom: 10px; font-size: 16px;">Invoice Details</h3><p style="margin: 5px 0;"><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p><p style="margin: 5px 0;"><strong>Date:</strong> ${invoiceData.date}</p><p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${invoiceData.appointmentId}</p></div>
            <div style="flex: 1;"><h3 style="color: #2563eb; margin-bottom: 10px; font-size: 16px;">Patient Information</h3><p style="margin: 5px 0;"><strong>Name:</strong> ${invoiceData.patientName}</p><p style="margin: 5px 0;"><strong>Patient ID:</strong> ${invoiceData.clinicPatientId}</p></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
            <thead><tr><th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Service</th><th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Type</th><th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Amount (Rs.)</th></tr></thead>
            <tbody>
              ${invoiceData.services.map(service => `<tr><td style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">${service.name}</td><td style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">${service.service_id ? 'Standard Service' : 'Custom Service'}</td><td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${service.price.toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div style="text-align: right; margin-top: 30px;"><div style="font-size: 20px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 15px;"><div style="display: flex; justify-content: space-between; padding: 10px 0;"><span>Total Amount:</span><span>Rs. ${invoiceData.totalAmount.toFixed(2)}</span></div></div></div>
          <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;"><p>Thank you for choosing ${invoiceData.clinicName}</p><p>Generated on ${generatedDate}</p></div>
        </div>
      `;
      invoiceElement.style.position = 'absolute';
      invoiceElement.style.left = '-9999px';
      invoiceElement.style.top = '0';
      document.body.appendChild(invoiceElement);
      const canvas = await html2canvas(invoiceElement.firstElementChild as HTMLElement, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
      document.body.removeChild(invoiceElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice-${invoiceData.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setFormError('Error generating PDF. Please try again.');
    }
  };

  const totalAmount = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`;
  const doctorName = `${appointment.doctor?.first_name || ''} ${appointment.doctor?.last_name || ''}`;

  return (
    <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onSetView('details')} 
        className="mb-4 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Appointment Details
      </Button>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="ml-3 text-gray-600">Loading invoice data...</p>
        </div>
      ) : (
        <>
          {successMessage && !isPreviewMode && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
              <CheckCircle className="text-green-600 h-5 w-5" />
              <p className="text-green-600 text-sm font-medium">{successMessage}</p>
            </div>
          )}
          
          {formError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <XCircle className="text-red-600 h-5 w-5" />
              <p className="text-red-600 text-sm font-medium">{formError}</p>
            </div>
          )}

          {isPreviewMode && invoiceData ? (
            // --- INVOICE PREVIEW SCREEN ---
            <div className="space-y-6">
              {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
                  <CheckCircle className="text-green-600 h-5 w-5" />
                  <p className="text-green-600 text-sm font-medium">{successMessage}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" size="md" onClick={handleCreateNew} className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Invoice
                </Button>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="secondary" size="md" onClick={handleGoBackToEdit} className="flex items-center">
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Edit
                  </Button>
                  <Button variant="primary" size="md" onClick={handleDownloadPDF} className="flex items-center" shine>
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

              <Card padding="lg" className="shadow-xl" id="invoice-preview">
                <div className="text-center border-b-2 border-blue-600 pb-6 mb-8">
                  <h1 className="text-3xl font-bold text-blue-600 mb-2">{invoiceData.clinicName}</h1>
                  <h2 className="text-2xl text-gray-800">INVOICE</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-600 mb-4">Invoice Details</h3>
                    <div className="space-y-2">
                      <p><strong>Invoice #:</strong> {invoiceData.invoiceNumber}</p>
                      <p><strong>Date:</strong> {invoiceData.date}</p>
                      <p><strong>Appointment ID:</strong> {invoiceData.appointmentId}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-600 mb-4">Patient Information</h3>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {invoiceData.patientName}</p>
                      <p><strong>Patient ID:</strong> {invoiceData.clinicPatientId}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-blue-600 mb-4">Services</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-3 text-left font-medium">Service</th>
                          <th className="border border-gray-200 px-4 py-3 text-left font-medium">Type</th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium">Amount (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.services.map((service, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-3">{service.name}</td>
                            <td className="border border-gray-200 px-4 py-3">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                service.service_id 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {service.service_id ? 'Standard Service' : 'Custom Service'}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-right font-mono">
                              {service.price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="w-full max-w-xs">
                    <div className="border-t-2 border-blue-600 pt-4">
                      <div className="flex justify-between items-center text-xl font-bold text-blue-600">
                        <span>Total Amount:</span>
                        <span className="font-mono">Rs. {invoiceData.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            // --- INVOICE CREATION FORM ---
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card padding="lg" className="shadow-lg lg:col-span-1 h-fit sticky top-0">
                <h2 className="text-xl font-bold mb-4 text-blue-600 border-b pb-2">Appointment Info</h2>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center"><User className="h-4 w-4 mr-2" /> Patient</Label>
                    <p className="text-lg font-semibold text-gray-800">{patientName} (ID: {appointment.clinic_patient_id})</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center"><Stethoscope className="h-4 w-4 mr-2" /> Doctor</Label>
                    <p className="text-lg font-semibold text-gray-800">Dr. {doctorName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center"><Clock className="h-4 w-4 mr-2" /> Appointment Time</Label>
                    <p className="text-lg font-semibold text-gray-800">{formatDateTime(appointment.datetime_start)}</p>
                    <p className="text-sm text-gray-600">ID: {appointment.id}</p>
                  </div>
                </div>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                <Card padding="lg" className="shadow-lg">
                  <h3 className="text-xl font-bold mb-3">1. Add Services</h3>
                  <div className="mb-4">
                    <Label htmlFor="service-library" className="text-gray-700">Add from Service Library</Label>
                    <select id="service-library" name="service-library" onChange={(e) => handleServiceSelect(parseInt(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" value="" disabled={isLoading}>
                      <option value="" disabled>{isLoading ? 'Loading...' : '-- Select a Service --'}</option>
                      {availableServices.map((service) => (
                        <option key={`service-${service.id}`} value={service.id}>
                          {service.name} (Rs. {service.price.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center text-gray-500 my-4">-- OR --</div>
                  <div>
                    <h4 className="font-semibold mb-2">Add a Custom Service</h4>
                    <div className="flex items-center space-x-2">
                      <Input id="new-service-name" name="name" type="text" placeholder="Service Name" value={newServiceForm.name} onChange={handleNewServiceFormChange} className="flex-1" />
                      <Input id="new-service-price" name="price" type="number" step="0.01" placeholder="Price (Rs.)" value={newServiceForm.price} onChange={handleNewServiceFormChange} className="w-28" />
                      <Button type="button" onClick={handleAddNewService} variant="primary" className="!p-2.5">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card padding="lg" className="shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">2. Invoice Preview</h2>
                  <div className="bg-gray-50 p-4 rounded-md min-h-[200px]">
                    {selectedServices.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Add services to see the invoice preview</p>
                      </div>
                    ) : (
                      <>
                        <ul className="divide-y divide-gray-200">
                          {selectedServices.map((service, index) => (
                            <li key={`selected-service-${index}-${service.service_id || 'adhoc'}`} className="py-3 flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-800">{service.name}</p>
                                <span className="text-sm text-gray-500">{service.service_id ? 'From Library' : 'Custom'}</span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="font-medium text-gray-700">Rs. {service.price.toFixed(2)}</span>
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveService(index)} title="Remove service"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 pt-4 border-t-2 border-blue-600 flex justify-between items-center font-bold text-lg">
                          <span>Total Amount</span>
                          <span>Rs. {totalAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <Button type="submit" variant="primary" size="lg" onClick={handleSubmit} disabled={selectedServices.length === 0} className="mt-6 w-full" shine>
                    <Plus className="h-5 w-5 mr-2" />
                    {invoiceData?.id ? 'Update Invoice' : 'Generate Invoice'}
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}