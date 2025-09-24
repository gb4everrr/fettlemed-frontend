'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// --- Interfaces ---
interface ClinicDetails {
    id: number;
    name: string;
    address: string;
    email: string;
    phone: string;
}

interface ClinicAssociationDetails {
    clinic_doctor_id: number;
    clinic: ClinicDetails;
    specialization: string;
    started_date: string;
    active: boolean;
}

// --- Main Component ---
export default function MyClinicsPage() {
    const [clinics, setClinics] = useState<ClinicAssociationDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // --- Data Fetching ---
    useEffect(() => {
        const fetchClinics = async () => {
            try {
                const { data } = await api.get('/doctor/my-clinics-details');
                setClinics(data);
            } catch (err) {
                setError('Failed to load your clinic associations.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchClinics();
    }, []);

    // --- Filtering and Searching Logic ---
    const filteredClinics = useMemo(() => {
        return clinics
            .filter(c => {
                if (statusFilter === 'active') return c.active;
                if (statusFilter === 'inactive') return !c.active;
                return true;
            })
            .filter(c => {
                const search = searchTerm.toLowerCase();
                return (
                    c.clinic.name.toLowerCase().includes(search) ||
                    c.clinic.address.toLowerCase().includes(search) ||
                    c.specialization.toLowerCase().includes(search)
                );
            });
    }, [clinics, searchTerm, statusFilter]);

    // --- Render Logic ---
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center mt-8"><LoadingSpinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-500 mt-8">{error}</p>;
        }
        if (filteredClinics.length === 0) {
            return <p className="text-center text-gray-500 mt-8">No clinics found matching your criteria.</p>;
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClinics.map(assoc => (
                    <Card key={assoc.clinic_doctor_id} padding="lg" className="flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-gray-800">{assoc.clinic.name}</h3>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    assoc.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {assoc.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{assoc.clinic.address}</p>
                            
                        </div><br/>
                        <div>
                            <p className="text-sm text-gray-700">
                                Start Date: {new Date(assoc.started_date).toLocaleDateString()}
                            </p><br/>

                            <p className="text-sm text-gray-500">Contact:</p>
                            <a href={`mailto:${assoc.clinic.email}`} className="text-sm text-blue-600 hover:underline block mt-2">
                                {assoc.clinic.email}
                            </a>
                            <a href={`tel:${assoc.clinic.phone}`} className="text-sm text-blue-600 hover:underline block">
                                {assoc.clinic.phone}
                            </a>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <DoctorDashboardLayout headerText="My Clinics">
            <div className="p-6 md:p-8 font-inter">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Associated Clinics</h1>
                
                <Card padding="lg" className="mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-grow">
                            <Input
                                id="search"
                                type="text"
                                placeholder="Search by name, address, or specialization..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex-shrink-0">
                             <select
                                id="status-filter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {renderContent()}
            </div>
        </DoctorDashboardLayout>
    );
}
