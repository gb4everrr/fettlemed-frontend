'use client';
import React, { useState } from 'react';
import { X, Plus, Trash2, Printer, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props {
    onClose: () => void;
}

interface Medicine {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
}

export function CreatePrescriptionModal({ onClose }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [patientName, setPatientName] = useState('');
    const [instructions, setInstructions] = useState('');
    const [medicines, setMedicines] = useState<Medicine[]>([
        { name: '', dosage: '', frequency: '', duration: '' }
    ]);

    const addMedicine = () => {
        setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
    };

    const removeMedicine = (idx: number) => {
        setMedicines(medicines.filter((_, i) => i !== idx));
    };
    
    const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
        const updated = [...medicines];
        updated[index] = { ...updated[index], [field]: value };
        setMedicines(updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 flex flex-col max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Quick e-Prescription</h2>
                        <p className="text-xs text-gray-500">Draft and sign digital prescriptions</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Patient Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Patient Name</label>
                        <Input 
                            id="patient_select" 
                            placeholder="Search patient..." 
                            value={patientName}
                            onChange={e => setPatientName(e.target.value)}
                        />
                    </div>

                    {/* Medications List */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-gray-800 text-sm">Medications</h3>
                            <Button variant="ghost" size="sm" onClick={addMedicine} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Plus size={16} className="mr-1" /> Add Drug
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {medicines.map((med, idx) => (
                                <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-200 relative group">
                                    <div className="flex-grow min-w-[200px]">
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Drug Name</label>
                                        <Input 
                                            id={`drug_${idx}`} 
                                            placeholder="e.g. Amoxicillin" 
                                            value={med.name} 
                                            onChange={e => updateMedicine(idx, 'name', e.target.value)} 
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="w-1/4 min-w-[100px]">
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Dosage</label>
                                        <Input 
                                            id={`dose_${idx}`} 
                                            placeholder="e.g. 500mg" 
                                            value={med.dosage} 
                                            onChange={e => updateMedicine(idx, 'dosage', e.target.value)} 
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="w-1/4 min-w-[120px]">
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Frequency</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                value={med.frequency}
                                                onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                                            >
                                                <option value="">Select...</option>
                                                <option value="Daily">Daily</option>
                                                <option value="BID">Twice Daily (BID)</option>
                                                <option value="TID">Three Times (TID)</option>
                                                <option value="QID">Four Times (QID)</option>
                                                <option value="PRN">As Needed (PRN)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="w-1/6 min-w-[80px]">
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Duration</label>
                                        <Input 
                                            id={`dur_${idx}`} 
                                            placeholder="Days" 
                                            value={med.duration} 
                                            onChange={e => updateMedicine(idx, 'duration', e.target.value)} 
                                            className="bg-white"
                                        />
                                    </div>
                                    
                                    {medicines.length > 1 && (
                                        <button 
                                            onClick={() => removeMedicine(idx)} 
                                            className="mt-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instructions for Pharmacist (Optional)</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 min-h-[80px] resize-y"
                            placeholder="Add any special instructions..."
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
                        Cancel
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" className="flex items-center gap-2">
                            <Printer size={16} /> Print
                        </Button>
                        <Button variant="primary" onClick={handleSubmit} disabled={isLoading} shine className="flex items-center gap-2">
                            <Send size={16} />
                            {isLoading ? 'Sending...' : 'Sign & Send'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}