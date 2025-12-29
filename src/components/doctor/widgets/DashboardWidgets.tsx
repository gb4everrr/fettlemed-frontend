'use client';
import React, { useState } from 'react';
import { 
    Plus, 
    FileText, 
    Pill, 
    Activity, 
    Calendar, 
    Clock, 
    MapPin,
    AlertTriangle, 
    CheckSquare,
    Users,
    DollarSign,
    Trash2
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';

// --- HELPER: Replicated from CalendarView.tsx ---
const formatClinicTime = (dateString: string | Date, timezone: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    try {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone || 'UTC' 
        }).format(date);
    } catch (error) {
        return '--:--';
    }
};

// --- Quick Actions Widget ---
export const QuickAccessWidget = ({ onAddNote, onAddRx, onAddLab }: { onAddNote: () => void, onAddRx: () => void, onAddLab: () => void }) => (
    <Card className="h-full flex flex-col justify-center shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-[var(--color-primary-brand)]" /> Quick Actions 
        </h2>
        <div className="grid grid-cols-1 gap-3 ">
            <Button 
                variant="primary" 
                shine
                onClick={onAddNote} 
                className="w-full h-12 flex items-center justify-start px-4 transition-all shadow-sm"
                style={{ backgroundColor: 'var(--color-primary-brand)' }}
            >
                <FileText className="h-5 w-5 mr-3 opacity-90" />
                <span className="font-medium text-white">Clinical Note</span>
            </Button>
            
            <Button 
                variant="primary" 
                shine
                onClick={onAddRx} 
                className="w-full h-12 flex items-center justify-start px-4 transition-all shadow-sm"
                style={{ backgroundColor: 'var(--color-primary-brand)' }}
            >
                <Pill className="h-5 w-5 mr-3 opacity-90" />
                <span className="font-medium text-white" >e-Prescription</span>
            </Button>

            <Button 
            shine
                variant="primary" 
                onClick={onAddLab} 
                className="w-full h-12 flex items-center justify-start px-4 transition-all shadow-sm"
                style={{ backgroundColor: 'var(--color-primary-brand)' }}
            >
                <Activity className="h-5 w-5 mr-3 opacity-90" />
                <span className="font-medium text-white">Lab Request</span>
            </Button>
        </div>
    </Card>
);

// --- Today's Schedule Widget (Interactable) ---
interface ScheduleWidgetProps {
    appointments: any[];
    onAppointmentClick: (appt: any) => void; // New Prop
}

export const TodaysScheduleWidget = ({ appointments, onAppointmentClick }: ScheduleWidgetProps) => {
    
    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <span className="bg-blue-50 text-[var(--color-primary-brand)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">Pending</span>;
            case 1: return <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-green-100">Confirmed</span>;
            case 2: return <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-red-100">Cancelled</span>;
            case 3: return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-200">Completed</span>;
            default: return <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">--</span>;
        }
    };

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-[var(--color-primary-brand)]" /> Today's Schedule
                </h2>
                <div className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {appointments.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center h-full text-gray-400">
                        <Clock className="h-10 w-10 mb-2 opacity-20" />
                        <p>No appointments scheduled for today.</p>
                    </div>
                ) : appointments.map((appt) => {
                    const timezone = appt.clinic?.timezone || 'UTC';
                    const timeString = formatClinicTime(appt.datetime_start, timezone);

                    return (
                        <div key={appt.id} className="group flex items-stretch">
                            {/* Time Column */}
                            <div className="flex flex-col items-center mr-4 min-w-[70px] pt-1">
                                <span className="text-sm font-bold text-gray-900 leading-tight">
                                    {timeString}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    {timezone.split('/')[1]?.replace('_', ' ') || 'Local'}
                                </span>
                                <div className="w-px h-full bg-gray-100 my-1 group-last:hidden"></div>
                            </div>

                            {/* Appointment Card - CLICKABLE */}
                            <div 
                                onClick={() => onAppointmentClick(appt)}
                                className={`flex-1 p-4 rounded-xl border mb-3 transition-all hover:shadow-md cursor-pointer ${
                                    appt.status === 1 ? 'bg-white border-l-4 border-l-green-500 border-gray-100' :
                                    appt.status === 2 ? 'bg-red-50/30 border-l-4 border-l-red-500 border-red-100' :
                                    'bg-white border-l-4 border-gray-100'
                                }`}
                                style={{ borderLeftColor: appt.status !== 1 && appt.status !== 2 ? 'var(--color-primary-brand)' : undefined }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">
                                            {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Unknown Patient'}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            {appt.clinic && (
                                                <span className="flex items-center text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                                    <MapPin className="h-3 w-3 mr-1" /> {appt.clinic.name}
                                                </span>
                                            )}
                                            {appt.appointment_type && (
                                                <span className="bg-gray-50 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-medium border border-gray-100">
                                                    {appt.appointment_type}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        {getStatusBadge(appt.status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

// --- Insights Widget ---
export const InsightsWidget = ({ totalPatients, totalAppts }: { totalPatients: number, totalAppts: number }) => (
    <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex flex-col justify-between transition-colors shadow-sm hover:border-[var(--color-primary-brand)]/30">
            <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg text-[var(--color-primary-brand)] bg-[var(--color-primary-brand)]/10">
                    <Users className="h-5 w-5" />
                </div>
            </div>
            <div className="mt-3">
                <p className="text-xs text-gray-500 font-medium uppercase">My Patients</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalPatients}</h3>
            </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between transition-colors shadow-sm hover:border-[var(--color-primary-brand)]/30">
            <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg text-purple-600 bg-purple-50">
                    <Calendar className="h-5 w-5" />
                </div>
            </div>
            <div className="mt-3">
                <p className="text-xs text-gray-500 font-medium uppercase">My Appointments</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalAppts}</h3>
            </div>
        </Card>
    </div>
);

// --- Revenue Mini Widget ---
export const RevenueWidget = ({ amount }: { amount: number }) => {
    // Calculate percentage of month passed
    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const passedPercent = Math.min(100, (now.getDate() / totalDays) * 100);

    return (
        <Card className="h-full flex flex-col justify-center items-center shadow-sm bg-white border border-gray-100">
            <div className="w-full px-6 text-center">
                <div className="flex items-center justify-center mb-1 text-gray-500">
                    <span className="text-xs uppercase tracking-wider font-semibold">Total Revenue</span>
                </div>
                <span className="text-3xl font-bold tracking-tight text-gray-800">
                    ₹{amount.toLocaleString()}
                </span>
                
                {/* Time Elapsed Bar */}
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ 
                            width: `${passedPercent}%`, 
                            backgroundColor: 'var(--color-primary-brand)' 
                        }}
                    ></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-right">
                    {Math.round(passedPercent)}% of month elapsed
                </p>
            </div>
        </Card>
    );
};

// --- UPDATED Tasks Widget ---
export const TasksWidget = ({ tasks, setTasks }: { tasks: any[], setTasks: any }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleToggleTask = async (id: number, currentStatus: boolean) => {
        try {
            // Optimistic update
            const updatedTasks = tasks.map(t => 
                t.id === id ? { ...t, is_completed: !currentStatus } : t
            );
            // Sort: Incomplete first
            updatedTasks.sort((a, b) => Number(a.is_completed) - Number(b.is_completed));
            setTasks(updatedTasks);

            // API Call
            await api.put(`/doctor/tasks/${id}`, { is_completed: !currentStatus });
        } catch (error) {
            console.error("Failed to update task", error);
            // Revert on failure (optional, depending on UX preference)
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const tempId = Date.now(); // Temp ID for optimistic UI
            const newTask = {
                id: tempId,
                title: newTaskTitle,
                is_completed: false,
                priority: 'normal'
            };

            setTasks([newTask, ...tasks]);
            setNewTaskTitle('');
            setIsAdding(false);

            // API Call
            const res = await api.post('/doctor/tasks', { title: newTaskTitle, priority: 'normal' });
            
            // Replace temp ID with real ID from server
            setTasks((currentTasks: any[]) => currentTasks.map(t => t.id === tempId ? res.data : t));
        } catch (error) {
            console.error("Failed to create task", error);
        }
    };

    const handleDeleteTask = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent toggling when clicking delete
        try {
            setTasks(tasks.filter(t => t.id !== id));
            await api.delete(`/doctor/tasks/${id}`);
        } catch (error) {
            console.error("Failed to delete task", error);
        }
    };

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <CheckSquare className="w-5 h-5 mr-2 text-[var(--color-primary-brand)]" />
                    My Tasks
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
                    <Plus className={`h-4 w-4 ${isAdding ? 'rotate-45 text-red-500' : ''} transition-transform`} />
                </Button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddTask} className="mb-3">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Add a new task..."
                        className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                </form>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {tasks.length === 0 && !isAdding ? (
                    <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                        <CheckSquare className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-xs">All caught up!</p>
                    </div>
                ) : (
                    tasks.map((task: any) => (
                        <div 
                            key={task.id} 
                            onClick={() => handleToggleTask(task.id, task.is_completed)}
                            className={`group flex items-center p-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 border border-transparent hover:border-gray-100 ${task.is_completed ? 'opacity-60' : ''}`}
                        >
                            <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors
                                ${task.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}`}>
                                {task.is_completed && <CheckSquare className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm flex-1 ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {task.title}
                            </span>
                            <button 
                                onClick={(e) => handleDeleteTask(task.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

// --- Patient Alerts Widget ---
export const PatientAlertsWidget = ({ alerts = [] }: { alerts?: any[] }) => (
    <Card className="flex flex-col h-full shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" /> Patient Alerts
            </h2>
             {alerts.length > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold">{alerts.length} New</span>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {alerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <CheckSquare className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No active alerts.</p>
                </div>
            ) : alerts.map((alert: any) => (
                <div key={alert.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-gray-800 text-sm group-hover:text-[var(--color-primary-brand)] transition-colors">{alert.patient_name}</h4>
                        <span className="text-[10px] text-gray-400">{alert.time}</span>
                    </div>
                    <p className={`text-xs font-medium ${alert.level === 'critical' ? 'text-red-600' : 'text-amber-600'} flex items-center`}>
                        {alert.level === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {alert.alert}
                    </p>
                </div>
            ))}
        </div>
    </Card>
);