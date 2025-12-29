'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { setActivePermissions } from '@/lib/features/auth/authSlice';
import { getPermissionsForRole } from '@/config/roles';
import { Can } from '@/lib/features/auth/Can';

import { FileText, Settings, AlertCircle,Plus } from 'lucide-react';
import { FaNotesMedical, FaStethoscope, FaExchangeAlt } from 'react-icons/fa';

import { DoctorBillingStats } from './components/DoctorBillingStats';
import { DoctorInvoicesTab } from './components/DoctorInvoicesTab';
import { DoctorServicesTab } from './components/DoctorServicesTab';
import { ViewInvoiceModal } from './components/ViewInvoiceModal';
import { DoctorCreateInvoiceModal } from '@/components/doctor/modals/DoctorCreateInvoiceModal';

const CLINIC_INVOICE_BASE = '/clinic-invoice'; 
const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

interface ClinicContext {
    id: number;           // Changed from clinic_id
    name: string;         // Changed from clinic_name
    clinic_id: number;    // Keep this for backward compatibility
    clinic_name: string;  // Keep this for backward compatibility
    role: string;
}
export default function DoctorBillingPage() {
    const dispatch = useAppDispatch();
    
    // --- State ---
    const [clinics, setClinics] = useState<ClinicContext[]>([]);
    const [activeClinicId, setActiveClinicId] = useState<number>(-1);
    const [isBooting, setIsBooting] = useState(true);
    const [viewScope, setViewScope] = useState<'my' | 'clinic'>('my');
    const [activeTab, setActiveTab] = useState<'invoices' | 'services'>('invoices');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);



    // 1. BOOT
   useEffect(() => {
    const bootContext = async () => {
        try {
            const { data } = await api.get('/doctor/my-clinics-details');
            const rawList = Array.isArray(data) ? data : (data?.data || []);
            const list = rawList.map((item: any) => ({
                // New format for modal compatibility
                id: item.clinic?.id,
                name: item.clinic?.name,
                // Old format for existing code
                clinic_id: item.clinic?.id,
                clinic_name: item.clinic?.name,
                role: (item.assigned_role || item.role || 'DOCTOR_VISITING').toUpperCase()
            }));
            setClinics(list);
            if (list.length > 0) setActiveClinicId(-1);
        } catch (e) {
            console.error(e);
        } finally {
            setIsBooting(false);
        }
    };
    bootContext();
}, []);

    // 2. PERMISSIONS
    const currentContext = useMemo(() => clinics.find(c => c.clinic_id === activeClinicId), [activeClinicId, clinics]);
    
    const canAccessClinicView = useMemo(() => {
        if (activeClinicId === -1) return clinics.some(c => PRIVILEGED_ROLES.includes(c.role));
        return currentContext ? PRIVILEGED_ROLES.includes(currentContext.role) : false;
    }, [activeClinicId, clinics, currentContext]);

    useEffect(() => {
        if (isBooting) return;
        let effectiveRole = 'DOCTOR_VISITING';
        if (activeClinicId === -1) {
            if (clinics.some(c => ['OWNER', 'CLINIC_ADMIN'].includes(c.role))) effectiveRole = 'CLINIC_ADMIN';
            else if (clinics.some(c => ['DOCTOR_OWNER', 'DOCTOR_PARTNER'].includes(c.role))) effectiveRole = 'DOCTOR_PARTNER';
        } else if (currentContext) {
            effectiveRole = currentContext.role;
        }
        const perms = getPermissionsForRole(effectiveRole);
        if (['DOCTOR_OWNER', 'DOCTOR_PARTNER'].includes(effectiveRole)) {
            if (!perms.includes('manage_services')) perms.push('manage_services');
        }
        dispatch(setActivePermissions(perms));
        if (!canAccessClinicView && viewScope === 'clinic') setViewScope('my');
    }, [activeClinicId, clinics, isBooting, dispatch, canAccessClinicView, viewScope, currentContext]);

    // --- EFFECT: Auto-switch tab if context changes ---
    useEffect(() => {
        // If we are on 'All Clinics' (-1), we cannot see Services.
        if (activeClinicId === -1 && activeTab === 'services') {
            setActiveTab('invoices');
        }
    }, [activeClinicId, activeTab]);

        // Add this after your existing canAccessClinicView logic
const canCreateInvoices = useMemo(() => {
    if (activeClinicId === -1) {
        // "All Clinics": Can create if privileged in at least one clinic
        return clinics.some(c => PRIVILEGED_ROLES.includes(c.role));
    } else {
        // "Specific Clinic": Can create only if privileged in this clinic
        return currentContext ? PRIVILEGED_ROLES.includes(currentContext.role) : false;
    }
}, [activeClinicId, clinics, currentContext]);

    // 3. FETCH DATA
    const fetchData = useCallback(async () => {
        if (isBooting) return;
        setIsLoading(true);
        setError(null);
        
        try {
            if (viewScope === 'my') {
                const res = await api.get('/doctor/my-invoices');
                let list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                
                // Filter by active clinic if one is selected
                if (activeClinicId !== -1) {
                    const targetClinic = clinics.find(c => c.clinic_id === activeClinicId);
                    if (targetClinic) {
                        list = list.filter((inv: any) => {
                            if (inv.clinic_id) return Number(inv.clinic_id) === activeClinicId;
                            if (inv.clinicName) {
                                return inv.clinicName.trim().toLowerCase() === targetClinic.clinic_name.trim().toLowerCase();
                            }
                            return false;
                        });
                    }
                }
                setInvoices(list);
            } else {
                if (activeClinicId !== -1) {
                    const res = await api.get(`${CLINIC_INVOICE_BASE}/invoices/list`, { params: { clinic_id: activeClinicId } });
                    const rawData = res.data;
                    const list = Array.isArray(rawData) ? rawData : (rawData?.invoices || rawData?.data || []);
                    setInvoices(list);
                } else {
                    const privClinics = clinics.filter(c => PRIVILEGED_ROLES.includes(c.role));
                    const promises = privClinics.map(c => 
                        api.get(`${CLINIC_INVOICE_BASE}/invoices/list`, { params: { clinic_id: c.clinic_id } })
                           .then(r => {
                               const d = r.data;
                               return Array.isArray(d) ? d : (d?.invoices || d?.data || []);
                           })
                           .catch(() => [])
                    );
                    const results = await Promise.all(promises);
                    setInvoices(results.flat());
                }
            }

            if (activeTab === 'services' && viewScope === 'clinic' && activeClinicId !== -1) {
                 const res = await api.get(`${CLINIC_INVOICE_BASE}/service/list`, { params: { clinic_id: activeClinicId } });
                 setServices(Array.isArray(res.data) ? res.data : (res.data?.data || []));
            }

        } catch (err: any) {
            console.error(err);
            setInvoices([]);
            setServices([]);
            setError("Failed to load data.");
        } finally {
            setIsLoading(false);
        }
    }, [isBooting, viewScope, activeClinicId, activeTab, clinics]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const stats = useMemo(() => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const revenue = safeInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount || 0) || 0), 0);
        const uniquePatients = new Set(safeInvoices.map(i => i.patientName || i.patient?.id || i.ClinicPatient?.id || 'unknown')).size;
        return { revenue, count: safeInvoices.length, uniquePatients };
    }, [invoices]);

    // --- ID RESOLVER ---
    const getResolvedClinicId = (inv: any) => {
        if (!inv) return undefined;
        if (activeClinicId !== -1) return activeClinicId;
        if (inv.clinic_id) return inv.clinic_id;
        if (viewScope === 'my' && inv.clinicName) {
            const normalizedInvName = inv.clinicName.trim().toLowerCase();
            const match = clinics.find(c => (c.clinic_name || '').trim().toLowerCase() === normalizedInvName);
            return match ? match.clinic_id : undefined;
        }
        return undefined;
    };

    const handleDownload = async (invoice: any) => {
        try {
            // ... (Your existing PDF generation logic remains here unchanged) ...
            console.log("Downloading", invoice.id);
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    const currentContextName = activeClinicId === -1 ? "All Associated Clinics" : clinics.find(c => c.clinic_id === activeClinicId)?.clinic_name || "Unknown Clinic";

    return (
        <DoctorDashboardLayout>
            <div className="p-6 md:p-8 font-inter min-h-screen">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-800 font-inter tracking-tight">
                            {viewScope === 'my' ? 'My Billing' : 'Clinic Billing'}
                        </h1>
                        <p className="text-base text-gray-500 font-inter mt-1">
                            Viewing financials for <span className="font-semibold text-[var(--color-primary-brand)]">{currentContextName}</span>
                        </p>
                    </div>
                    
                    {/* ACTION AREA: Dropdown + Toggle Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">

                        {canCreateInvoices && (
    <Button 
        variant="primary" 
        size="lg"
        onClick={() => setIsCreateInvoiceModalOpen(true)}
        className="flex items-center"
        shine
    >
        <Plus className="h-5 w-5 mr-2" />
        New Invoice
    </Button>
)}
                        {/* CLINIC DROPDOWN */}
                        <div className="relative min-w-[220px]">
                             <select 
                                value={activeClinicId} 
                                onChange={(e) => {
                                    setActiveClinicId(Number(e.target.value));
                                    setViewScope('my');
                                    setActiveTab('invoices');
                                }}
                                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-3 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-brand)] font-medium"
                            >
                                <option value={-1}>All Clinics</option>
                                <option disabled>──────────</option>
                                {clinics.map(c => (
                                    <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>
                                ))}
                            </select>
                            <FaExchangeAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        


                        {/* RESTORED: VIEW TOGGLE BUTTONS */}
                        {canAccessClinicView && (
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 h-[50px] shadow-sm">
                                <button 
                                    onClick={() => { setViewScope('my'); setActiveTab('invoices'); }} 
                                    className={`px-4 h-full rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewScope === 'my' ? 'bg-[var(--color-primary-brand)] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                                >
                                    <FaStethoscope /> My View
                                </button>
                                <button 
                                    onClick={() => setViewScope('clinic')} 
                                    className={`px-4 h-full rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewScope === 'clinic' ? 'bg-[var(--color-primary-brand)] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                                >
                                    <FaNotesMedical /> Clinic View
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* STATS - Passed with spread operator to fix type error */}
                <DoctorBillingStats 
                    revenue={stats.revenue} 
                    totalInvoices={stats.count} 
                    uniquePatients={stats.uniquePatients} 
                />

                {/* TAB NAVIGATION */}
                <div className="mt-8 mb-6 border-b border-gray-200">
                    <nav className="flex gap-8">
                         <button
                            onClick={() => setActiveTab('invoices')}
                            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'invoices' 
                                ? 'border-[var(--color-primary-brand)] text-[var(--color-primary-brand)]' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <FileText className="h-4 w-4" /> Invoices
                        </button>
                        
                        {/* HIDE SERVICES TAB IF ACTIVE CLINIC IS -1 (ALL CLINICS) */}
                        {activeClinicId !== -1 && (
                            <>
                                {viewScope === 'clinic' && (
                                    <Can perform="manage_services">
                                        <button
                                            onClick={() => setActiveTab('services')}
                                            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                                activeTab === 'services' 
                                                ? 'border-[var(--color-primary-brand)] text-[var(--color-primary-brand)]' 
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <Settings className="h-4 w-4" /> Services & Rates
                                        </button>
                                    </Can>
                                )}
                            </>
                        )}
                    </nav>
                </div>

                <div >
                    {error ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-100 flex flex-col items-center">
                            <AlertCircle className="h-8 w-8 mb-2"/>
                            {error}
                            <Button variant="outline" size="sm" onClick={fetchData} className="mt-4">Retry</Button>
                        </div>
                    ) : isLoading ? (
                        <Card padding="lg" className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary-brand)]"></div>
                        </Card>
                    ) : (
                        <>
                            {activeTab === 'invoices' && (
                                <DoctorInvoicesTab invoices={invoices} onView={(inv) => setSelectedInvoice(inv)} onDownload={handleDownload} />
                            )}
                            {activeTab === 'services' && (
                                <Can perform="manage_services" no={<div className="p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">You do not have permission to manage services.</div>}>
                                    <DoctorServicesTab services={services} clinicId={activeClinicId} onRefresh={fetchData} />
                                </Can>
                            )}
                        </>
                    )}
                </div>

                {selectedInvoice && (
                    <ViewInvoiceModal 
                        invoiceStub={selectedInvoice} 
                        viewScope={viewScope} 
                        onClose={() => setSelectedInvoice(null)} 
                        clinicId={getResolvedClinicId(selectedInvoice)} 
                    />
                )}
            </div>
            {isCreateInvoiceModalOpen && (
    <DoctorCreateInvoiceModal
        onClose={() => setIsCreateInvoiceModalOpen(false)}
        onRefresh={fetchData}
        selectedClinicId={activeClinicId}
        associatedClinics={clinics}
        canCreateInvoices={canCreateInvoices}
    />
)}

            
        </DoctorDashboardLayout>

        
    );


}