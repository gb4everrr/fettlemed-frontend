'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Activity, 
    Heart, 
    Thermometer, 
    Scale, 
    Clock, 
    FileText, 
    Search, 
    Filter, 
    ArrowUpDown, 
    Calendar,
    X
} from 'lucide-react';
import Card from '@/components/ui/Card';
import api from '@/services/api';

// Helper for icons
const getVitalIcon = (name: string) => {
    const n = name?.toLowerCase() || '';
    if (n.includes('temp')) return <Thermometer className="w-4 h-4 text-orange-500" />;
    if (n.includes('heart') || n.includes('pulse') || n.includes('bp') || n.includes('pressure')) return <Heart className="w-4 h-4 text-red-500" />;
    if (n.includes('weight') || n.includes('bmi') || n.includes('height')) return <Scale className="w-4 h-4 text-blue-500" />;
    return <Activity className="w-4 h-4 text-emerald-500" />;
};

export const VitalsCard = ({ patientId, clinicId }: { patientId: string, clinicId: number }) => {
    // Data State
    const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // 1. Fetch Data
    useEffect(() => {
        if (!patientId || !clinicId) return;

        setLoading(true);
        api.get(`/clinic-vitals/entry/history/${patientId}`, { 
            params: { clinic_id: clinicId } 
        })
        .then(res => {
            const data = Array.isArray(res.data) ? res.data : [];
            setVitalsHistory(data);
        })
        .catch(err => console.error("Failed to load vitals", err))
        .finally(() => setLoading(false));
    }, [patientId, clinicId]);

    // 2. Filter & Sort Logic
    const filteredVitals = useMemo(() => {
        let result = [...vitalsHistory];

        // Search Filter (Checks Vital Name or Value)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry => 
                entry.values?.some((v: any) => {
                    const name = v.config?.vital_name || v.vital_config?.name || '';
                    const val = String(v.vital_value || v.value || '');
                    return name.toLowerCase().includes(query) || val.includes(query);
                })
            );
        }

        // Date Range Filter
        if (dateRange.start) {
            result = result.filter(entry => new Date(entry.entry_date) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            result = result.filter(entry => new Date(entry.entry_date) <= new Date(dateRange.end));
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.entry_date + ' ' + (a.entry_time || '00:00'));
            const dateB = new Date(b.entry_date + ' ' + (b.entry_time || '00:00'));
            return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });

        return result;
    }, [vitalsHistory, searchQuery, sortOrder, dateRange]);

    if (loading) return <Card className="h-full animate-pulse bg-gray-50"><div></div></Card>;

    return (
        <Card className="h-full flex flex-col shadow-sm  ">
            
            {/* --- HEADER & CONTROLS --- */}
            <div className="flex flex-col gap-3 mb-3 border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-emerald-600" />
                        Vitals History
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {filteredVitals.length}
                        </span>
                    </h2>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-1.5 rounded-md transition-colors ${showFilters ? 'bg-emerald-100 text-primary' : 'text-gray-400 hover:bg-gray-100'}`}
                            title="Toggle Filters"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                            title="Sort Date"
                        >
                            <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''} transition-transform`} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search (e.g. 'BP', '120')..." 
                        className="w-full pl-8 pr-3 py-1.5 text-s rounded-md focus:outline-none  bg-gray-50 focus:bg-white transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Collapsible Filters */}
                {showFilters && (
                    <div className="flex gap-2 items-center animate-in slide-in-from-top-2 duration-200">
                        <div className="relative flex-1">
                            <input 
                                type="date" 
                                className="w-full text-s px-2 py-1  rounded bg-gray-50"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                        <span className="text-gray-300">-</span>
                        <div className="relative flex-1">
                            <input 
                                type="date" 
                                className="w-full text-s px-2 py-1  rounded bg-gray-50"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                        {(dateRange.start || dateRange.end) && (
                            <button onClick={() => setDateRange({ start: '', end: '' })} className="text-gray-400 hover:text-red-500">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* --- LIST CONTENT --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                {filteredVitals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-6">
                        <Activity className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-xs">No records found</p>
                    </div>
                ) : (
                    filteredVitals.map((entry: any) => (
                        <div key={entry.id} className="border border-gray-100 rounded-lg p-3  hover:shadow-sm transition-all bg-white group">
                            
                            {/* Entry Header: Date & User */}
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-50 dashed">
                                <div className="flex items-center text-xs font-semibold text-gray-700">
                                    <Calendar className="w-3 h-3 mr-1.5 text-primary" />
                                    {new Date(entry.entry_date).toLocaleDateString()}
                                    <span className="mx-1 text-gray-300">|</span>
                                    <span className="text-gray-400 font-normal">{entry.entry_time?.slice(0, 5)}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 flex items-center">
                                    <FileText className="w-3 h-3 mr-1" />
                                    {entry.recorded_by_user?.first_name || 'Staff'}
                                </div>
                            </div>

                            {/* Vitals Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                {(entry.values || []).map((val: any) => {
                                    const vitalName = val.config?.vital_name || val.vital_config?.name || 'Vital';
                                    const vitalValue = val.vital_value || val.value;
                                    const vitalUnit = val.config?.unit || val.vital_config?.unit_measurement;

                                    // Highlight logic for search
                                    const isMatch = searchQuery && 
                                        (vitalName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                         String(vitalValue).includes(searchQuery));

                                    return (
                                        <div 
                                            key={val.id} 
                                            className={`flex items-center p-1.5 rounded ${isMatch ? 'bg-yellow-50 ring-1 ring-yellow-200' : 'bg-gray-50/50'}`}
                                        >
                                            <div className="mr-2 opacity-70">
                                                {getVitalIcon(vitalName)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold truncate tracking-wide">
                                                    {vitalName}
                                                </span>
                                                <div className="flex items-baseline">
                                                    <span className="text-sm font-bold text-gray-800 leading-none">
                                                        {vitalValue}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 ml-1">
                                                        {vitalUnit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};