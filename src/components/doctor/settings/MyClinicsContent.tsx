'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
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
export const MyClinicsContent = () => {
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
                setError('Failed to load clinic details.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchClinics();
    }, []);

    const filteredClinics = clinics.filter(c => {
        const matchesSearch = c.clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.clinic.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.specialization.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' 
                              ? true 
                              : statusFilter === 'active' ? c.active : !c.active;
        return matchesSearch && matchesStatus;
    });

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
        if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-md">{error}</div>;
        
        if (filteredClinics.length === 0) {
             return (
                 <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                     <p className="text-gray-500">No clinics found matching your criteria.</p>
                 </div>
             );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {filteredClinics.map((assoc) => (
                    <Card key={assoc.clinic_doctor_id} className="h-full flex flex-col hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{assoc.clinic.name}</h3>
                                <p className="text-sm text-gray-500">{assoc.clinic.address}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${assoc.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {assoc.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 flex-grow">
                             <div className="flex justify-between">
                                 <span className="font-medium">Specialization:</span>
                                 <span>{assoc.specialization}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="font-medium">Phone:</span>
                                 <span>{assoc.clinic.phone}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="font-medium">Email:</span>
                                 <span>{assoc.clinic.email}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="font-medium">Started:</span>
                                 <span>{new Date(assoc.started_date).toLocaleDateString()}</span>
                             </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card padding="md">
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
    );
};