// src/app/clinic-admin/dashboard/invoices/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { Plus, List, Trash2, CheckCircle, XCircle, Download, ArrowLeft, FileText } from 'lucide-react';
import { Label } from '@radix-ui/react-label';
import Input from '@/components/ui/Input';
import Link from 'next/link';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ClinicService {
  id: number;
  clinic_id: number;
  name: string;
  price: number;
}

interface Appointment {
  id: number;
  clinic_patient_id: number; // Fixed: Changed from patient_profile_id
  patient_name: string;
  // ADDED: Doctor and Patient objects to the interface
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
  appointment_id?: number;
}

// Interface for a unique patient profile - CORRECTED
interface PatientProfile {
  id: number; // clinic_patient_id
  patient_profile_id: number; // global patient ID
  name: string;
  first_name?: string;
  last_name?: string;
}

// New interface for generated invoice
interface GeneratedInvoice {
  id: number;
  invoiceNumber: string;
  date: string;
  patientName: string;
  clinicName: string;
  services: SelectedService[];
  totalAmount: number;
  appointmentId?: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [availableServices, setAvailableServices] = useState<ClinicService[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [clinicPatientId, setClinicPatientId] = useState<number | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  
  const [newServiceForm, setNewServiceForm] = useState({ name: '', price: '' });

  // New state for invoice preview
  const [generatedInvoice, setGeneratedInvoice] = useState<GeneratedInvoice | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const generateInvoiceNumber = () => {
  const timestamp = Date.now();
  return `INV-${timestamp.toString().slice(-8)}`;
};

  useEffect(() => {
    if (!user || user.role !== 'clinic_admin') {
      router.push('/auth/login');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
        if (!user?.clinics || user.clinics.length === 0) {
            setFetchError('No clinic is associated with your account.');
            setIsLoading(false);
            return;
        }
        const clinicId = user.clinics[0].id;
      
        const servicesResponse = await api.get('/clinic-invoice/service/list', {
            params: { clinic_id: clinicId },
        });
        setAvailableServices(servicesResponse.data);

        // Fetch appointments
        const appointmentsResponse = await api.get('/appointments', {
            params: { clinic_id: clinicId },
        });
        setAppointments(appointmentsResponse.data);

        // Fetch patients directly
        const patientsResponse = await api.get('/clinic-user/clinic-patient', {
            params: { clinic_id: clinicId },
        });

        // Map the patient data correctly, including the patient_profile_id
        const directPatients = patientsResponse.data.map((patient: any) => ({
            id: patient.id,
            name: `${patient.first_name} ${patient.last_name}`.trim(),
            patient_profile_id: patient.global_patient_id // Use global_patient_id from API
        }));
        
        setPatients(directPatients);

    } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setFetchError(err.response?.data?.error || 'Failed to fetch required data.');
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
  
const handleAppointmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const selectedApptId = e.target.value;
  const apptId = selectedApptId ? parseInt(selectedApptId) : null;
  setAppointmentId(apptId);

  if (apptId) {
    const selectedAppt = appointments.find(a => a.id === apptId);
    if (selectedAppt) {
      // Fixed: Find the corresponding clinic patient using the clinic_patient_id from the appointment
      const clinicPatient = patients.find(p => p.id === selectedAppt.clinic_patient_id);

      // Set the clinicPatientId state with the correct clinic-specific ID
      setClinicPatientId(clinicPatient ? clinicPatient.id : null);
      
      setSelectedPatientName(clinicPatient ? clinicPatient.name : '');
    }
  } else {
    // Reset states when no appointment is selected
    setClinicPatientId(null);
    setSelectedPatientName('');
  }
};

const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const patientId = e.target.value ? parseInt(e.target.value) : null;
  // Use clinicPatientId
  setClinicPatientId(patientId);
  const selectedPatient = patients.find(p => p.id === patientId);
  setSelectedPatientName(selectedPatient ? selectedPatient.name : '');
  // Reset appointment ID when patient is selected manually
  setAppointmentId(null);
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormError(null);
  setSuccessMessage(null);

  const clinicId = user?.clinics?.[0]?.id;

  if (!clinicPatientId || !clinicId || selectedServices.length === 0) {
    setFormError('Please select a patient and at least one service to create an invoice.');
    return;
  }

  try {
    const servicesPayload = selectedServices.map(s => {
      const serviceItem: any = {
        name: s.name,
        price: s.price,
        appointment_id: appointmentId,
      };
      if (s.service_id !== null) {
        serviceItem.service_id = s.service_id;
      }
      return serviceItem;
    });

    const payload = {
      clinic_id: clinicId,
      clinic_patient_id: clinicPatientId,
      services: servicesPayload,
    };

    const response = await api.post('/clinic-invoice/invoice/create', payload);
    
    // Create invoice preview data
    const invoice: GeneratedInvoice = {
      id: response.data.invoice_id,
      invoiceNumber: generateInvoiceNumber(),
      date: formatDate(new Date()),
      patientName: selectedPatientName,
      clinicName: user?.clinics?.[0]?.name || 'Medical Clinic',
      services: selectedServices,
      totalAmount: selectedServices.reduce((sum, service) => sum + service.price, 0),
      appointmentId: appointmentId || undefined
    };

    setGeneratedInvoice(invoice);
    // Remove this line: setIsPreviewMode(true);
    setSuccessMessage('Invoice created successfully!');
    
  } catch (err: any) {
    console.error('Failed to create invoice:', err);
    setFormError(err.response?.data?.error || 'Failed to create invoice.');
  }
};

// Add a new function to create a new invoice
const handleCreateNew = () => {
  setGeneratedInvoice(null);
  setSelectedServices([]);
  setClinicPatientId(null);
  setAppointmentId(null);
  setSelectedPatientName('');
  setFormError(null);
  setSuccessMessage(null);
};

const handleDownloadPDF = async () => {
  if (!generatedInvoice) return;

  try {
    // Create a temporary div with the invoice content
    const invoiceElement = document.createElement('div');
    invoiceElement.innerHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background: white; width: 800px;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
          <div style="font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px;">${generatedInvoice.clinicName}</div>
          <div style="font-size: 24px; color: #374151; margin-top: 10px;">INVOICE</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin: 30px 0;">
          <div style="flex: 1;">
            <h3 style="color: #2563eb; margin-bottom: 10px; font-size: 16px;">Invoice Details</h3>
            <p style="margin: 5px 0;"><strong>Invoice #:</strong> ${generatedInvoice.invoiceNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${generatedInvoice.date}</p>
            ${generatedInvoice.appointmentId ? `<p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${generatedInvoice.appointmentId}</p>` : ''}
          </div>
          <div style="flex: 1;">
            <h3 style="color: #2563eb; margin-bottom: 10px; font-size: 16px;">Patient Information</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${generatedInvoice.patientName}</p>
            <p style="margin: 5px 0;"><strong>Patient ID:</strong> ${clinicPatientId}</p>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
          <thead>
            <tr>
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Service</th>
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Type</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${generatedInvoice.services.map(service => `
              <tr>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">${service.name}</td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">${service.service_id ? 'Standard Service' : 'Custom Service'}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${service.price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="text-align: right; margin-top: 30px;">
          <div style="font-size: 20px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span>Total Amount:</span>
              <span>Rs. ${generatedInvoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p>Thank you for choosing ${generatedInvoice.clinicName}</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    // Add to document temporarily (hidden)
    invoiceElement.style.position = 'absolute';
    invoiceElement.style.left = '-9999px';
    invoiceElement.style.top = '0';
    document.body.appendChild(invoiceElement);

    // Convert to canvas
    const canvas = await html2canvas(invoiceElement.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Remove temporary element
    document.body.removeChild(invoiceElement);

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Download the PDF
    pdf.save(`Invoice-${generatedInvoice.invoiceNumber}.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to print
    handlePrintPDF();
  }
};

// Keep the print function as backup
const handlePrintPDF = () => {
  // Your existing print implementation...
};

const handleBack = () => {
  setIsPreviewMode(false);
  setGeneratedInvoice(null);
  setSelectedServices([]);
  setClinicPatientId(null);
  setAppointmentId(null);
  setSelectedPatientName('');
  setFormError(null);
  setSuccessMessage(null);
};

  const totalAmount = selectedServices.reduce((sum, service) => sum + service.price, 0);

  if (!user || isLoading) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (fetchError) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-600 text-lg mb-4">Error: {fetchError}</p>
          <Link href="/clinic-admin/dashboard" passHref>
            <Button variant="primary" size="md">Go to Dashboard</Button>
          </Link>
        </div>
      </ClinicDashboardLayout>
    );
  }

 return (
  <ClinicDashboardLayout>
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
          <Plus className="h-8 w-8 mr-2 text-gray-600" />
          {generatedInvoice ? 'Invoice Generated' : 'Create New Invoice'}
        </h1>
        <div className="flex space-x-2">
          {generatedInvoice && (
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateNew}
              className="flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Invoice
            </Button>
          )}
          <Link href="/clinic-admin/dashboard/services" passHref>
            <Button variant="ghost" size="md" className="flex items-center">
              <List className="h-4 w-4 mr-2" />
              Manage Services
            </Button>
          </Link>
        </div>
      </div>

      {successMessage && (
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

      {/* Show invoice preview if generated, otherwise show creation form */}
      {generatedInvoice ? (
        <div className="space-y-6">
          {/* Action buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleDownloadPDF}
              className="flex items-center"
              shine
            >
              <Download className="h-5 w-5 mr-2" />
              Download PDF
            </Button>
          </div>

          {/* Invoice Preview Card */}
          <Card padding="lg" className="shadow-xl">
            <div className="text-center border-b-2 border-blue-600 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-blue-600 mb-2">{generatedInvoice.clinicName}</h1>
              <h2 className="text-2xl text-gray-800">INVOICE</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-4">Invoice Details</h3>
                <div className="space-y-2">
                  <p><strong>Invoice #:</strong> {generatedInvoice.invoiceNumber}</p>
                  <p><strong>Date:</strong> {generatedInvoice.date}</p>
                  {generatedInvoice.appointmentId && (
                    <p><strong>Appointment ID:</strong> {generatedInvoice.appointmentId}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-4">Patient Information</h3>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {generatedInvoice.patientName}</p>
                  <p><strong>Patient ID:</strong> {clinicPatientId}</p>
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
                    {generatedInvoice.services.map((service, index) => (
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
                    <span className="font-mono">Rs. {generatedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-12 pt-6 border-t border-gray-200 text-gray-500">
              <p>Thank you for choosing {generatedInvoice.clinicName}</p>
              <p className="text-sm">Generated on {new Date().toLocaleString()}</p>
            </div>
          </Card>
        </div>
      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="lg" className="shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Invoice Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="appointment" className="text-gray-700">Link to Appointment (Optional)</Label>
                <select
  id="appointment"
  name="appointment"
  value={appointmentId || ''}
  onChange={handleAppointmentSelect}
  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
>
  <option value="">-- Select Appointment --</option>
  {appointments.map((appt) => (
    <option key={`appt-${appt.id}`} value={appt.id}>
      {/* Display Doctor's Name */}
      Dr. {appt.doctor?.first_name} {appt.doctor?.last_name} |
      {/* Display Patient's Name */}
      Patient: {appt.patient?.first_name} {appt.patient?.last_name} |
      {/* Display Formatted Date and Time */}
      Date: {formatUtcToLocal(appt.datetime_start_str)}
    </option>
  ))}
</select>
              </div>
              <div className="text-center text-gray-500 my-4">-- OR --</div>
              <div>
                <Label htmlFor="patient" className="text-gray-700">Patient</Label>
                <select
                  id="patient"
                  name="patient"
                  value={clinicPatientId || ''}
                  onChange={handlePatientSelect}
                  disabled={!!appointmentId}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map((patient) => (
                    <option key={`patient-${patient.id}`} value={patient.id}>
                      {patient.name} (Profile ID: {patient.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Display selected patient info */}
              {selectedPatientName && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-semibold text-blue-800">Selected Patient:</h4>
                  <p className="text-blue-700">{selectedPatientName} (ID: {clinicPatientId})</p>
                  {appointmentId && (
                    <p className="text-blue-600 text-sm">Linked to Appointment ID: {appointmentId}</p>
                  )}
                </div>
              )}

              <div className="mt-6 border-t pt-4">
                <h3 className="text-xl font-bold mb-3">Add Services</h3>
                
                {/* Add from Library */}
                <div className="mb-4">
                  <Label htmlFor="service-library" className="text-gray-700">Add from Service Library</Label>
                  <select
                    id="service-library"
                    name="service-library"
                    onChange={(e) => handleServiceSelect(parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                    value=""
                  >
                    <option value="" disabled>-- Select a Service --</option>
                    {availableServices.map((service) => (
                      <option key={`service-${service.id}`} value={service.id}>
                        {service.name} (Rs. {service.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="text-center text-gray-500 my-4">-- OR --</div>
                
                {/* Add Ad-Hoc Service */}
                <div>
                  <h4 className="font-semibold mb-2">Add a New Service</h4>
                  <div className="flex space-x-2">
                    <Input
                      id="new-service-name"
                      name="name"
                      type="text"
                      placeholder="Service Name"
                      value={newServiceForm.name}
                      onChange={handleNewServiceFormChange}
                      className="flex-1"
                    />
                    <Input
                      id="new-service-price"
                      name="price"
                      type="number"
                      step="0.01"
                      placeholder="Price (Rs.)"
                      value={newServiceForm.price}
                      onChange={handleNewServiceFormChange}
                      className="w-24"
                    />
                    <Button type="button" onClick={handleAddNewService} variant="primary" size="md">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Invoice Preview */}
          <Card padding="lg" className="shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Invoice Preview</h2>
            <div className="bg-gray-50 p-4 rounded-md min-h-[300px]">
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
                          <span className="text-sm text-gray-500">
                            {service.service_id ? 'From Library' : 'Ad-hoc'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-medium text-gray-700">Rs. {service.price.toFixed(2)}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveService(index)} title="Remove service">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center font-bold text-lg">
                    <span>Total Amount</span>
                    <span>Rs. {totalAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={selectedServices.length === 0 || !clinicPatientId}
              className="mt-6 w-full"
              shine
            >
              <Plus className="h-5 w-5 mr-2" />
              Generate Invoice
            </Button>
          </Card>
        </div>)}
      </div>
    </ClinicDashboardLayout>
  );
}