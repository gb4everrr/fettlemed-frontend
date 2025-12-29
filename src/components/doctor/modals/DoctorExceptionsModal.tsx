// src/components/clinic/modals/DoctorExceptionsModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface DoctorExceptionsModalProps {
    doctorId: number;
    clinicId: number;
    doctorName: string;
    onClose: () => void;
}

// Helpers
const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};
const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};
const formatHour = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
const formatDate = (d: Date) => d.toISOString().split('T')[0];

export function DoctorExceptionsModal({ doctorId, clinicId, doctorName, onClose }: DoctorExceptionsModalProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        return new Date(d.setDate(diff));
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Data State
    const [exceptionsGrid, setExceptionsGrid] = useState<number[][]>([]); // 0:None, 2:Unavailable
    const [existingExceptions, setExistingExceptions] = useState<any[]>([]);
    const [regularAvailability, setRegularAvailability] = useState<any[]>([]); 

    // Painting State
    const [isPainting, setIsPainting] = useState(false);
    const isPaintingRef = useRef(false);
    const paintValueRef = useRef(0);
    const gridScrollRef = useRef<HTMLDivElement>(null);

    // Note Modal
    const [noteModal, setNoteModal] = useState<{ open: boolean; x: number; y: number; note: string; pendingData: any | null }>({
        open: false, x: 0, y: 0, note: '', pendingData: null
    });
    const noteInputRef = useRef<HTMLTextAreaElement>(null);

    const rows = 24 * 4;
    const cols = 7;
    // UI Display Names (Abbreviated)
    const displayDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Backend Logic Names (Full)
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Init Grid
    useEffect(() => {
        setExceptionsGrid(Array(rows).fill(null).map(() => Array(cols).fill(0)));
    }, []);

    // Scroll
    useEffect(() => {
        if (gridScrollRef.current && !isLoading) {
            setTimeout(() => { if (gridScrollRef.current) gridScrollRef.current.scrollTop = (8 * 4) * 20; }, 100);
        }
    }, [isLoading]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [exRes, avRes] = await Promise.all([
                    api.get('/availability/exception', {
                        params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                    }),
                    api.get('/availability/availability', {
                        params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                    })
                ]);
                
                setExistingExceptions(exRes.data);
                setRegularAvailability(avRes.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load schedule data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [doctorId, clinicId]);

    // Calculate Grid (Exceptions only)
    useEffect(() => {
        const newGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
        const weekDates = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(currentWeekStart);
            d.setDate(currentWeekStart.getDate() + i);
            return d;
        });

        existingExceptions.forEach(ex => {
            const [y, m, d] = ex.date.split('-').map(Number);
            const exDate = new Date(y, m - 1, d);
            
            const colIdx = weekDates.findIndex(wd => 
                wd.getDate() === exDate.getDate() && wd.getMonth() === exDate.getMonth()
            );

            if (colIdx !== -1 && !ex.is_available) {
                const startRow = Math.floor(timeToMinutes(ex.start_time) / 15);
                const endRow = Math.floor(timeToMinutes(ex.end_time) / 15);
                for (let i = startRow; i < endRow; i++) {
                    if (i < rows) newGrid[i][colIdx] = 2; // Mark Red (Unavailable)
                }
            }
        });
        setExceptionsGrid(newGrid);
    }, [existingExceptions, currentWeekStart]);

    const weekDates = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);
        return d;
    });
    const today = new Date(); 
    today.setHours(0,0,0,0);

    // --- HELPER: Check Regular Schedule (FIXED) ---
    const isRegularlyAvailable = (date: Date, row: number) => {
        // FIX: Use full names (e.g., 'Monday') to match backend data
        const dayName = fullDayNames[date.getDay()]; 
        const timeStr = minutesToTime(row * 15);
        
        return regularAvailability.some((slot: any) => 
            slot.weekday === dayName && 
            timeStr >= slot.start_time && 
            timeStr < slot.end_time
        );
    };

    // Painting Handlers
    const handleMouseDown = (row: number, col: number) => {
        if (weekDates[col] < today) return;
        setIsPainting(true);
        isPaintingRef.current = true;
        const newVal = exceptionsGrid[row][col] === 2 ? 0 : 2;
        paintValueRef.current = newVal;
        
        const newGrid = exceptionsGrid.map(r => [...r]);
        newGrid[row][col] = newVal;
        setExceptionsGrid(newGrid);
    };

    const handleMouseEnter = (row: number, col: number) => {
        if (isPaintingRef.current && weekDates[col] >= today) {
            const newGrid = exceptionsGrid.map(r => [...r]);
            newGrid[row][col] = paintValueRef.current;
            setExceptionsGrid(newGrid);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (isPaintingRef.current) {
            setIsPainting(false);
            isPaintingRef.current = false;
            
            if (paintValueRef.current === 2) {
                setNoteModal({
                    open: true,
                    x: Math.min(e.clientX, window.innerWidth - 300),
                    y: Math.min(e.clientY, window.innerHeight - 200),
                    note: '',
                    pendingData: { processed: false }
                });
                setTimeout(() => noteInputRef.current?.focus(), 100);
            }
        }
    };

    const handleSaveFull = async () => {
        setIsSaving(true);
        try {
            // 1. Calculate Exceptions from Grid
            const newExceptions = [];
            for (let col = 0; col < cols; col++) {
                const dateStr = formatDate(weekDates[col]);
                let start = -1;
                for (let row = 0; row <= rows; row++) {
                    const isRed = row < rows && exceptionsGrid[row][col] === 2;
                    if (isRed && start === -1) start = row * 15;
                    else if (!isRed && start !== -1) {
                        newExceptions.push({
                            date: dateStr,
                            start_time: minutesToTime(start),
                            end_time: minutesToTime(row * 15),
                            is_available: false,
                            note: ''
                        });
                        start = -1;
                    }
                }
            }

            // 2. Delete existing
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const toDelete = existingExceptions.filter(ex => {
                const [y, m, d] = ex.date.split('-').map(Number);
                const exDate = new Date(y, m - 1, d);
                return exDate >= currentWeekStart && exDate <= weekEnd && !ex.is_available;
            });

            for (const ex of toDelete) {
                await api.delete(`/availability/exception/${ex.id}`, { params: { clinic_doctor_id: doctorId, clinic_id: clinicId } });
            }

            // 3. Create New
            for (const ex of newExceptions) {
                await api.post('/availability/exception', { ...ex, clinic_doctor_id: doctorId, clinic_id: clinicId });
            }

            setSuccessMessage('Exceptions saved!');
            setTimeout(onClose, 1000);

        } catch (err) {
            setError('Failed to save exceptions.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50" onMouseUp={handleMouseUp}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Availability Exceptions</h2>
                        <p className="text-sm text-gray-500">Mark unavailable times for Dr. {doctorName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div className="flex items-center space-x-4">
                         <button onClick={() => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="h-5 w-5"/></button>
                         <span className="font-semibold text-gray-700">
                             {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
                         </span>
                         <button onClick={() => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="h-5 w-5"/></button>
                    </div>
                    <div className="text-sm flex items-center gap-4">
                        <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-sm mr-2"></span> Unavailable (Exception)</div>
                        <div className="flex items-center"><span className="w-3 h-3 bg-gray-300 rounded-sm mr-2"></span> Regular Schedule</div>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-hidden p-0 flex flex-col relative">
                    {isLoading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500"/></div> : (
                        <div className="flex-1 overflow-y-auto" ref={gridScrollRef}>
                            <div className="grid grid-cols-8 gap-0">
                                {/* Time */}
                                <div className="bg-gray-50 border-r border-gray-200">
                                    {Array.from({length: 24}).map((_, h) => (
                                        <div key={h} className="h-20 flex items-center justify-end pr-2 text-xs text-gray-500 border-b border-gray-100">{formatHour(h)}</div>
                                    ))}
                                </div>
                                {/* Days */}
                                {weekDates.map((date, col) => (
                                    <div key={col} className={`border-r border-gray-200 last:border-r-0 ${date < today ? 'bg-gray-50' : ''}`}>
                                        <div className="sticky top-0 bg-white z-10 text-center border-b border-gray-200 py-2">
                                            {/* UI Uses Abbreviated Names */}
                                            <div className="text-xs font-bold text-gray-500 uppercase">{displayDayNames[date.getDay()]}</div>
                                            <div className="text-sm font-semibold">{date.getDate()}</div>
                                        </div>
                                        {Array.from({length: rows}).map((_, row) => {
                                            const isPast = date < today;
                                            const isException = exceptionsGrid[row][col] === 2;
                                            const isRegular = !isException && isRegularlyAvailable(date, row);
                                            
                                            // Determine Background Color
                                            let bgClass = 'bg-white';
                                            if (isPast) bgClass = 'bg-gray-100'; // Past = Light Gray
                                            else if (isException) bgClass = 'bg-red-500 hover:bg-red-600'; // Exception = Red
                                            else if (isRegular) bgClass = 'bg-gray-300 hover:bg-gray-400'; // Regular = Darker Gray
                                            else bgClass = 'hover:bg-red-50'; // Available to click

                                            return (
                                                <div 
                                                    key={row}
                                                    className={`h-[20px] border-b border-gray-50 transition-colors ${bgClass} ${row % 4 === 3 ? 'border-b-gray-200' : ''} ${isPast ? 'pointer-events-none' : 'cursor-pointer'}`}
                                                    onMouseDown={() => handleMouseDown(row, col)}
                                                    onMouseEnter={() => handleMouseEnter(row, col)}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Note Modal */}
                    {noteModal.open && (
                        <div 
                            className="absolute bg-white rounded-lg shadow-xl p-4 border border-gray-200 z-[60]"
                            style={{ top: noteModal.y, left: noteModal.x, width: '300px' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h4 className="text-sm font-semibold mb-2">Optional Reason</h4>
                            <textarea 
                                ref={noteInputRef}
                                className="w-full border rounded p-2 text-sm mb-2" 
                                rows={2}
                                value={noteModal.note}
                                onChange={e => setNoteModal(prev => ({ ...prev, note: e.target.value }))}
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="primary" onClick={() => setNoteModal(prev => ({ ...prev, open: false }))}>OK</Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveFull} disabled={isSaving} shine>{isSaving ? 'Saving...' : 'Save Exceptions'}</Button>
                </div>
            </div>
        </div>
    );
}