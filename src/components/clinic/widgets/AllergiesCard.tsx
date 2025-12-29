'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, X, ShieldAlert, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import api from '@/services/api';

// Debounce hook
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export const AllergiesCard = ({ patientId, clinicId }: { patientId: string, clinicId: number }) => {
    const [allergies, setAllergies] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSeverity, setSelectedSeverity] = useState('moderate');
    
    const debouncedQuery = useDebounce(query, 300);

    // Fetch existing allergies
    useEffect(() => {
        if (!patientId || !clinicId) return;
        
        // FIX: Send clinic_id as a query param (RBAC requirement)
        api.get(`/doctor/patient/${patientId}/allergies`, { 
            params: { clinic_id: clinicId } 
        })
            .then(res => setAllergies(res.data))
            .catch(err => console.error(err));
    }, [patientId, clinicId]);

    // Search NLM API
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 3) {
            setSuggestions([]);
            return;
        }
        setIsSearching(true);
        fetch(`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${debouncedQuery}&ef=DISPLAY_NAME`)
            .then(res => res.json())
            .then(data => setSuggestions(data[1] || []))
            .catch(console.error)
            .finally(() => setIsSearching(false));
    }, [debouncedQuery]);

    const handleAddAllergy = async (name: string) => {
        if (!clinicId) return;

        try {
            // Optimistic Update
            const tempId = Date.now();
            const newAllergy = { id: tempId, allergy_name: name, severity: selectedSeverity };
            setAllergies([newAllergy, ...allergies]);
            setQuery('');
            setSuggestions([]);

            // FIX: Send clinic_id in query params AND body to be safe
            const res = await api.post(`/doctor/patient/${patientId}/allergies`, 
                { 
                    allergy_name: name, 
                    severity: selectedSeverity,
                    clinic_id: clinicId 
                },
                { 
                    params: { clinic_id: clinicId } 
                }
            );
            
            setAllergies(prev => prev.map(a => a.id === tempId ? res.data : a));
        } catch (error: any) {
            console.error("Failed to add allergy", error);
            // Revert on fail
            setAllergies(prev => prev.filter(a => a.allergy_name !== name));
        }
    };

    const handleRemoveAllergy = async (id: number) => {
        if (!clinicId) return;
        if (!confirm('Remove this allergy?')) return;
        
        try {
            setAllergies(prev => prev.filter(a => a.id !== id));
            // FIX: Send clinic_id in query params
            await api.delete(`/doctor/allergies/${id}`, { 
                params: { clinic_id: clinicId } 
            });
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <Card className="h-full flex flex-col shadow-sm border-t-4 border-t-red-500">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
                    Allergies
                </h2>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    {allergies.length} Found
                </span>
            </div>

            {/* Input Area */}
            <div className="relative mb-4 space-y-2">
                <div className="flex gap-2">
                    <div className="flex-1 flex items-center border rounded-lg px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-200 transition-all">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                            type="text"
                            className="w-full text-sm bg-transparent outline-none"
                            placeholder="Search allergen..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <select 
                        className="text-xs border rounded-lg px-2 bg-gray-50 outline-none"
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                    >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                    </select>
                </div>
                
                {suggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-100 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                        {suggestions.map((name, idx) => (
                            <div 
                                key={idx}
                                onClick={() => handleAddAllergy(name)}
                                className="px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 cursor-pointer flex justify-between items-center group"
                            >
                                {name}
                                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {allergies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                        <ShieldAlert className="h-8 w-8 mb-1 opacity-20" />
                        <p className="text-xs">No allergies recorded.</p>
                    </div>
                ) : (
                    allergies.map((allergy) => (
                        <div key={allergy.id} className="flex justify-between items-center p-2 rounded-lg border border-red-100 bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center overflow-hidden">
                                <div className={`w-1.5 h-8 rounded-full mr-3 flex-shrink-0 
                                    ${allergy.severity === 'severe' ? 'bg-red-600' : allergy.severity === 'moderate' ? 'bg-orange-400' : 'bg-yellow-400'}`} 
                                />
                                <div className="truncate">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{allergy.allergy_name}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{allergy.severity}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleRemoveAllergy(allergy.id)}
                                className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};