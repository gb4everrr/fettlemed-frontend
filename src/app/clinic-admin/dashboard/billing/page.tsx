// src/app/clinic-admin/dashboard/billing/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { useRouter } from 'next/navigation';

// Icons & UI
import { FileText, Plus, List, X } from 'lucide-react';

// Components
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import Button from '@/components/ui/Button';
import { CreateInvoiceModal } from '@/components/clinic/modals/CreateInvoiceModal';

// Sub-Components
import { BillingStats } from './components/BillingStats';
import { ServicesTab } from './components/ServicesTab';
import { InvoicesTab } from './components/InvoicesTab';

// Services
import api from '@/services/api';

// --- Types ---
interface InvoiceService {
  id: number;
  service_id: number;
  price: number;
  service: { name: string };
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

interface ClinicService {
  id: number;
  clinic_id: number;
  name: string;
  price: number;
}

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  
  // Tabs: 'invoices' | 'services'
  const [activeTab, setActiveTab] = useState<'invoices' | 'services'>('invoices');
  
  // Data State
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceData | null>(null);

  // Stats
  const [stats, setStats] = useState({ revenue: 0, totalInvoices: 0, uniquePatients: 0 });

  useEffect(() => {
    if (!user || user.role !== 'clinic_admin') {
      router.push('/auth/login');
      return;
    }
    // Safe check for clinics
    if (user.clinics && user.clinics.length > 0) {
      refreshAllData();
    }
  }, [user, router]);

  const refreshAllData = () => {
    setIsLoading(true);
    // Safe access
    const clinicId = user?.clinics?.[0]?.id;
    if (!clinicId) return;

    Promise.all([
      api.get('/clinic-invoice/invoices/list', { params: { clinic_id: clinicId, limit: 100 } }),
      api.get('/clinic-invoice/service/list', { params: { clinic_id: clinicId } })
    ]).then(([invRes, servRes]) => {
      setInvoices(invRes.data.invoices || []);
      setServices(servRes.data || []);
      calculateStats(invRes.data.invoices || []);
    }).catch(err => {
      console.error("Error fetching billing data", err);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const calculateStats = (data: InvoiceData[]) => {
    const revenue = data.reduce((acc, curr) => acc + curr.total_amount, 0);
    const uniquePatients = new Set(data.map(i => i.clinic_patient_id)).size;
    setStats({ revenue, totalInvoices: data.length, uniquePatients });
  };

  const handleDownloadPDF = async (invoice: InvoiceData) => {
    console.log("Downloading PDF for invoice:", invoice.id);
    // Your PDF logic here...
  };

  if (!user) return <div className="p-8">Loading...</div>;

  // We need a clinic ID to render the tabs properly
  const clinicId = user?.clinics?.[0]?.id;

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8 space-y-6 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-inter">Billing & Services</h1>
            <p className="text-gray-500 mt-1 font-inter">Manage patient invoices, payments, and your service catalog.</p>
          </div>
          <div>
            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center"
              shine
            >
              <Plus className="h-5 w-5 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Stats Overview  <BillingStats 
            revenue={stats.revenue} 
            totalInvoices={stats.totalInvoices} 
            uniquePatients={stats.uniquePatients} 
        />*/}
        

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center font-inter transition-colors
                ${activeTab === 'invoices'
                  ? 'border-[var(--color-primary-brand)] text-[var(--color-primary-brand)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center font-inter transition-colors
                ${activeTab === 'services'
                  ? 'border-[var(--color-primary-brand)] text-[var(--color-primary-brand)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <List className="h-4 w-4 mr-2" />
              Service Library
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          {activeTab === 'invoices' && (
            <InvoicesTab 
                invoices={invoices} 
                onView={setViewInvoice} 
                onDownload={handleDownloadPDF} 
            />
          )}

          {/* Added Check: Only render ServicesTab if we have a clinicId */}
          {activeTab === 'services' && clinicId && (
            <ServicesTab 
                services={services} 
                clinicId={clinicId} 
                onRefresh={refreshAllData} 
            />
          )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Create Invoice Modal - Check clinicId again */}
      {isCreateModalOpen && clinicId && (
        <CreateInvoiceModal 
          clinicId={clinicId} 
          onClose={() => {
            setIsCreateModalOpen(false);
            refreshAllData();
          }} 
        />
      )}

      {/* View Details Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-bold font-inter">Invoice Details</h2>
                <button onClick={() => setViewInvoice(null)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
             </div>
             <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm font-inter">
                   <div>
                      <p className="text-gray-500">Patient</p>
                      <p className="font-medium text-lg text-gray-800">{viewInvoice.patient.first_name} {viewInvoice.patient.last_name}</p>
                      <p className="text-gray-400">{viewInvoice.patient.email}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-gray-500">Invoice ID</p>
                      <p className="font-mono font-bold text-gray-800">#{viewInvoice.id}</p>
                      <p className="text-gray-400">{new Date(viewInvoice.invoice_date).toLocaleString()}</p>
                   </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                   <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="pb-2 font-medium">Service</th>
                          <th className="pb-2 text-right font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewInvoice.services.map((s, i) => (
                           <tr key={i}>
                              <td className="py-3 text-gray-800">{s.service.name}</td>
                              <td className="py-3 text-right font-mono text-gray-600">Rs. {s.price.toFixed(2)}</td>
                           </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold text-gray-900 border-t border-gray-300">
                           <td className="pt-3">Total</td>
                           <td className="pt-3 text-right">Rs. {viewInvoice.total_amount.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                   </table>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                   <Button variant="ghost" onClick={() => setViewInvoice(null)}>Close</Button>
                   <Button variant="primary" onClick={() => handleDownloadPDF(viewInvoice)}>Download PDF</Button>
                </div>
             </div>
          </div>
        </div>
      )}

    </ClinicDashboardLayout>
  );
}