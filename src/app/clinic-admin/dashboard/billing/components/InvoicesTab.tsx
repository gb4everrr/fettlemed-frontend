// src/app/clinic-admin/dashboard/billing/components/InvoicesTab.tsx
'use client';
import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker'; // Ensure this path matches your project
import { Search, Eye, Download } from 'lucide-react';

// --- Types must match the Parent Component exactly ---
export interface InvoiceService {
  id: number;
  service_id: number;
  price: number;
  service: { name: string };
}

export interface InvoiceData {
  id: number;
  clinic_id: number;
  clinic_patient_id: number; // Added this
  invoice_date: string;
  total_amount: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
  services: InvoiceService[]; // Updated from any[]
  serviceCount: number;       // Added this
}

interface InvoicesTabProps {
  invoices: InvoiceData[];
  onView: (inv: InvoiceData) => void;
  onDownload: (inv: InvoiceData) => void;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({ invoices, onView, onDownload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.id.toString().includes(searchTerm);
      
      const invDate = new Date(inv.invoice_date);
      invDate.setHours(0,0,0,0);

      let matchesDate = true;
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0,0,0,0);
        matchesDate = matchesDate && invDate >= start;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(0,0,0,0);
        matchesDate = matchesDate && invDate <= end;
      }
      return matchesSearch && matchesDate;
    });
  }, [invoices, searchTerm, dateRange]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange]);

  return (
    <div className="space-y-6 fade-in-up">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
           {/* CSS Fix for Search Icon Alignment */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input 
            type="text"
            className="w-full pl-10 h-12 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Search patient name or invoice ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-40">
            <DatePicker
              value={dateRange.start}
              onChange={(d) => setDateRange(prev => ({ ...prev, start: d }))}
              placeholder="Start Date"
            />
          </div>
          <span className="text-gray-400">-</span>
          <div className="w-40">
            <DatePicker
              value={dateRange.end}
              onChange={(d) => setDateRange(prev => ({ ...prev, end: d }))}
              placeholder="End Date"
              minDate={dateRange.start || undefined}
            />
          </div>
          {(dateRange.start || dateRange.end) && (
            <Button variant="ghost" size="sm" onClick={() => setDateRange({ start: null, end: null })}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden shadow-md border border-gray-100 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr className="uppercase text-xs tracking-wider">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Services</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-600 font-medium">#{inv.id.toString().padStart(6, '0')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {inv.patient.first_name} {inv.patient.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-brand)] text-gray-300">
                        {inv.services.length} Items
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 font-mono">
                      Rs. {inv.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onView(inv)}
                          className="text-[var(--color-primary-brand)] hover:text-[var(--color-secondary-brand)] font-medium"
                        >
                          View
                        </Button>
                        <button 
                          onClick={() => onDownload(inv)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination Controls */}
      {filteredInvoices.length > 0 && (
        <div className="flex flex-wrap justify-between items-center mt-6 gap-4">
            <div className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-semibold text-gray-800">
                    {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}
                </span> of{' '}
                <span className="font-semibold text-gray-800">{filteredInvoices.length}</span> results
            </div>
            
            <nav className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="sr-only">Previous</span>
                    {/* Simple chevron left */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (currentPage <= 3) {
                        pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                        <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                    ? 'bg-[var(--color-primary-brand)] text-white'
                                    : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}
                
                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="sr-only">Next</span>
                     {/* Simple chevron right */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </nav>
        </div>
      )}
    </div>
  );
};