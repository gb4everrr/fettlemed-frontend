'use client';
import React, { useState } from 'react';
import { X, Check, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AddNoteModalProps {
    onClose: () => void;
}

export function AddNoteModal({ onClose }: AddNoteModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        patient_name: '',
        date_of_service: new Date().toISOString().split('T')[0],
        note_type: 'initial_consultation',
        note_content: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Create New Patient Note</h3>
                        <p className="text-xs text-gray-500">Record clinical observations and details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* Row 1: Patient & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Patient Name</label>
                            <Input 
                                id="patient_name" 
                                placeholder="Search or enter patient name..." 
                                value={formData.patient_name}
                                onChange={e => setFormData({...formData, patient_name: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Service</label>
                            <Input 
                                id="date_of_service" 
                                type="date"
                                value={formData.date_of_service}
                                onChange={e => setFormData({...formData, date_of_service: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Note Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type of Note</label>
                        <div className="relative">
                            <select 
                                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                value={formData.note_type}
                                onChange={e => setFormData({...formData, note_type: e.target.value})}
                            >
                                <option value="initial_consultation">Initial Consultation</option>
                                <option value="follow_up">Follow-up Visit</option>
                                <option value="procedure">Procedure Note</option>
                                <option value="general">General Inquiry</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Textarea */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 resize-none"
                            rows={8}
                            value={formData.note_content}
                            onChange={e => setFormData({...formData, note_content: e.target.value})}
                            placeholder="Enter detailed findings, diagnosis, and plan..."
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isLoading} className="flex items-center">
                            <Save className="h-4 w-4 mr-2" />
                            {isLoading ? 'Saving...' : 'Save Note'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}