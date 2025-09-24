'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Search } from 'lucide-react';

// --- Interfaces ---
interface InvoiceDetails {
    id: number;
    invoice_date: string;
    total_amount: number;
    clinicName: string;
    patientName: string;
    serviceCount: number;
}

// --- Helper Functions ---
const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);
};

// --- Main Component ---
export default function MyInvoicesPage() {
    const [invoices, setInvoices] = useState<InvoiceDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [clinicFilter, setClinicFilter] = useState('all');

    // --- Data Fetching ---
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const { data } = await api.get<InvoiceDetails[]>('/doctor/my-invoices');
                setInvoices(data || []);
            } catch (err) {
                console.error("Error fetching invoices:", err);
                setError('Failed to load your invoices. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    // --- Filtering Logic ---
    const uniqueClinics = useMemo(() => {
        const clinics = new Set(invoices.map(p => p.clinicName));
        return ['all', ...Array.from(clinics)];
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            // Clinic filter
            if (clinicFilter !== 'all' && invoice.clinicName !== clinicFilter) return false;

            // Search term filter
            const search = searchTerm.toLowerCase();
            return invoice.patientName.toLowerCase().includes(search);
        });
    }, [invoices, searchTerm, clinicFilter]);

    // --- Render Logic ---
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center mt-8"><LoadingSpinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-500 mt-8">{error}</p>;
        }
        if (filteredInvoices.length === 0) {
            return <p className="text-center text-gray-500 mt-8">No invoices found matching your criteria.</p>;
        }
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredInvoices.map(invoice => (
                            <tr key={invoice.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{invoice.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.invoice_date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.patientName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.clinicName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{invoice.serviceCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-800">{formatCurrency(invoice.total_amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <DoctorDashboardLayout headerText="Invoices">
            <div className="p-6 md:p-8 font-inter">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Patient Invoices</h1>
                
                <Card padding="lg" className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                id="search"
                                type="text"
                                placeholder="Search by patient name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <select
                            id="clinic-filter"
                            value={clinicFilter}
                            onChange={e => setClinicFilter(e.target.value)}
                            className="h-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            {uniqueClinics.map(clinic => (
                                <option key={clinic} value={clinic}>{clinic === 'all' ? 'All Clinics' : clinic}</option>
                            ))}
                        </select>
                    </div>
                </Card>

                {renderContent()}
            </div>
        </DoctorDashboardLayout>
    );
}
