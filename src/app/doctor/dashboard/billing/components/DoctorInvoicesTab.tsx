'use client';
import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Eye, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface DoctorInvoicesTabProps {
    invoices: any[];
    onView: (invoice: any) => void;
    onDownload: (invoice: any) => void;
}

export const DoctorInvoicesTab: React.FC<DoctorInvoicesTabProps> = ({ invoices, onView, onDownload }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const itemsPerPage = 10;

    // 1. Reset pagination when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [invoices]);

    // 2. Safety Check
    const totalPages = Math.ceil(invoices.length / itemsPerPage) || 1;
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    // 3. Calculate Slice
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentInvoices = invoices.slice(startIndex, endIndex);

    const handleDownload = async (invoice: any) => {
        setDownloadingId(invoice.id);
        try {
            await onDownload(invoice);
        } finally {
            setDownloadingId(null);
        }
    };

    if (!invoices || invoices.length === 0) {
        return (
            <Card padding="lg" className="text-center py-16">
                <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Invoices Found</h3>
                <p className="text-sm text-gray-500">There are no invoices to display for the selected filter.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                                <th className="w-[20%] px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient</th>
                                <th className="w-[25%] px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Clinic</th>
                                <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                <th className="w-[10%] px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                                <th className="w-[10%] px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Services</th>
                                <th className="w-[10%] px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {currentInvoices.map((invoice) => {
                                const clinicName = invoice.clinicName || invoice.clinic?.name || 'N/A';
                                
                                return (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <span className="font-mono text-sm font-medium text-gray-900">#{invoice.id}</span>
                                        </td>
                                        
                                        <td className="px-6 py-4 align-top">
                                            <div 
                                                className="text-sm font-medium text-gray-900 truncate" 
                                                title={invoice.patientName || `${invoice.patient?.first_name} ${invoice.patient?.last_name}`}
                                            >
                                                {invoice.patientName || 
                                                 `${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}`.trim() || 
                                                 'N/A'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-start gap-2">
                                                <span className="text-sm text-gray-700 break-words leading-tight">
                                                    {clinicName}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <span className="text-sm text-gray-600">
                                                {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                            <span className="text-sm font-semibold text-gray-900 font-mono">
                                                Rs. {parseFloat(invoice.total_amount || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {invoice.serviceCount || 0} items
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onView(invoice)}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Eye size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownload(invoice)}
                                                    disabled={downloadingId === invoice.id}
                                                    className="flex items-center gap-1"
                                                >
                                                    {downloadingId === invoice.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Download size={14} />
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pagination Controls - Updated to match Directory Style */}
            {totalPages > 1 && (
                <div className="flex flex-wrap justify-between items-center mt-6 gap-4">
                    <div className="text-sm text-gray-500">
                        Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold text-gray-800">{Math.min(endIndex, invoices.length)}</span> of{' '}
                        <span className="font-semibold text-gray-800">{invoices.length}</span> invoices
                    </div>
                    
                    <nav className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (safeCurrentPage <= 3) pageNum = i + 1;
                            else if (safeCurrentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = safeCurrentPage - 2 + i;
                            
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                        safeCurrentPage === pageNum 
                                            ? 'bg-[var(--color-primary-brand)] text-white' 
                                            : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        
                        {totalPages > 5 && safeCurrentPage < totalPages - 2 && (
                            <>
                                <span className="text-gray-500">...</span>
                                <button 
                                    onClick={() => setCurrentPage(totalPages)} 
                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 text-sm font-medium"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                        
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
};