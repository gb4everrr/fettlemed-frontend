// src/app/clinic-admin/dashboard/invoices/view/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Plus 
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceService {
  id: number;
  service_id: number;
  price: number;
  service: {
    name: string;
  };
}

interface InvoiceData {
  id: number;
  clinic_id: number;
  clinic_patient_id: number;
  invoice_date: string;
  total_amount: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
  services: InvoiceService[];
  serviceCount: number;
}

interface InvoiceListResponse {
  invoices: InvoiceData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export default function ViewInvoicesPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    if (!user || user.role !== 'clinic_admin') {
      router.push('/auth/login');
      return;
    }
    fetchInvoices();
  }, [user, router, currentPage]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!user?.clinics || user.clinics.length === 0) {
        setError('No clinic is associated with your account.');
        setIsLoading(false);
        return;
      }

      const clinicId = user.clinics[0].id;
      
      const response = await api.get('/clinic-invoice/invoices/list', {
        params: { 
          clinic_id: clinicId,
          page: currentPage,
          limit: itemsPerPage
        },
      });

      const data: InvoiceListResponse = response.data;
      setInvoices(data.invoices);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch invoices:', err);
      setError(err.response?.data?.error || 'Failed to fetch invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const generateInvoiceNumber = (invoiceId: number) => {
    return `INV-${invoiceId.toString().padStart(6, '0')}`;
  };

  const handleViewInvoice = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedInvoice(null);
    setIsViewModalOpen(false);
  };

  const handleDownloadPDF = async (invoice: InvoiceData) => {
    if (!user?.clinics?.[0]) return;

    const clinicName = user.clinics[0].name || 'Medical Clinic';
    const invoiceNumber = generateInvoiceNumber(invoice.id);
    const patientName = `${invoice.patient.first_name} ${invoice.patient.last_name}`.trim();

    try {
      // Create a temporary div with the invoice content
      const invoiceElement = document.createElement('div');
      invoiceElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background: white; width: 800px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
            <div style="font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px;">${clinicName}</div>
            <div style="font-size: 24px; color: #374151; margin-top: 10px;">INVOICE</div>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin: 30px 0;">
            <div style="flex: 1;">
              <h3 style="color: #2563eb; margin-bottom: 10px; font-size: 16px;">Invoice Details</h3>
              <p style="margin: 5px 0;"><strong>Invoice #:</strong> ${invoiceNumber}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(invoice.invoice_date)}</p>
              <p style="margin: 5px 0;"><strong>Invoice ID:</strong> ${invoice.id}</p>
            </div>
            <div style="flex: 1;">
              <h3 style="color: #2563eb; margin-bottom: 10px; font-size: 16px;">Patient Information</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${patientName}</p>
              <p style="margin: 5px 0;"><strong>Patient ID:</strong> ${invoice.clinic_patient_id}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${invoice.patient.email || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${invoice.patient.phone_number || 'N/A'}</p>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
            <thead>
              <tr>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Service</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; color: #374151;">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.services.map(service => `
                <tr>
                  <td style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">${service.service.name}</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${service.price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 30px;">
            <div style="font-size: 20px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 15px;">
              <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span>Total Amount:</span>
                <span>Rs. ${invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
            <p>Thank you for choosing ${clinicName}</p>
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
      pdf.save(`Invoice-${invoiceNumber}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!user || isLoading) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (error) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-600 text-lg mb-4">Error: {error}</p>
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
            <FileText className="h-8 w-8 mr-2 text-gray-600" />
            View Invoices
          </h1>
          <Link href="/clinic-admin/dashboard/invoices/create" passHref>
            <Button variant="primary" size="md" className="flex items-center" shine>
              <Plus className="h-5 w-5 mr-2" />
              Create New Invoice
            </Button>
          </Link>
        </div>

        {/* Summary Card */}
        <Card padding="lg" className="shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{totalCount}</h3>
              <p className="text-gray-600">Total Invoices</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                Rs. {invoices.reduce((sum, inv) => sum + inv.total_amount, 0).toFixed(2)}
              </h3>
              <p className="text-gray-600">Page Total</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <User className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                {new Set(invoices.map(inv => inv.clinic_patient_id)).size}
              </h3>
              <p className="text-gray-600">Unique Patients</p>
            </div>
          </div>
        </Card>

        {/* Invoices List */}
        <Card padding="lg" className="shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Invoice List</h2>
            <p className="text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} invoices
            </p>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No invoices found</p>
              <Link href="/clinic-admin/dashboard/invoices/create" passHref>
                <Button variant="primary" size="md" className="mt-4">
                  Create Your First Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium">Invoice #</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium">Patient</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium">Date</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium">Services</th>
                      <th className="border border-gray-200 px-4 py-3 text-right font-medium">Amount</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-3 font-mono text-sm">
                          {generateInvoiceNumber(invoice.id)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-800">
                              {invoice.patient.first_name} {invoice.patient.last_name}
                            </p>
                            <p className="text-sm text-gray-500">ID: {invoice.clinic_patient_id}</p>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-sm">{formatDate(invoice.invoice_date)}</span>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {invoice.serviceCount} service{invoice.serviceCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-right font-mono">
                          Rs. {invoice.total_amount.toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInvoice(invoice)}
                              className="flex items-center"
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleDownloadPDF(invoice)}
                              className="flex items-center"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Invoice View Modal */}
        {isViewModalOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  Invoice {generateInvoiceNumber(selectedInvoice.id)}
                </h2>
                <div className="flex space-x-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadPDF(selectedInvoice)}
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseModal}
                    className="flex items-center"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {/* Invoice Preview */}
                <div className="bg-white">
                  <div className="text-center border-b-2 border-blue-600 pb-6 mb-8">
                    <h1 className="text-3xl font-bold text-blue-600 mb-2">
                      {user?.clinics?.[0]?.name || 'Medical Clinic'}
                    </h1>
                    <h2 className="text-2xl text-gray-800">INVOICE</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600 mb-4">Invoice Details</h3>
                      <div className="space-y-2">
                        <p><strong>Invoice #:</strong> {generateInvoiceNumber(selectedInvoice.id)}</p>
                        <p><strong>Date:</strong> {formatDate(selectedInvoice.invoice_date)}</p>
                        <p><strong>Generated:</strong> {formatDateTime(selectedInvoice.invoice_date)}</p>
                        <p><strong>Invoice ID:</strong> {selectedInvoice.id}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600 mb-4">Patient Information</h3>
                      <div className="space-y-2">
                        <p><strong>Name:</strong> {selectedInvoice.patient.first_name} {selectedInvoice.patient.last_name}</p>
                        <p><strong>Patient ID:</strong> {selectedInvoice.clinic_patient_id}</p>
                        <p><strong>Email:</strong> {selectedInvoice.patient.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> {selectedInvoice.patient.phone_number || 'N/A'}</p>
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
                            <th className="border border-gray-200 px-4 py-3 text-right font-medium">Amount (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.services.map((service, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-3">{service.service.name}</td>
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
                          <span className="font-mono">Rs. {selectedInvoice.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-12 pt-6 border-t border-gray-200 text-gray-500">
                    <p>Thank you for choosing {user?.clinics?.[0]?.name || 'Medical Clinic'}</p>
                    <p className="text-sm">Generated on {formatDateTime(selectedInvoice.invoice_date)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClinicDashboardLayout>
  );
}