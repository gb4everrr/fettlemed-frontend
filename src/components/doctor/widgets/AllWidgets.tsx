// You can split these into separate files later if you wish.
import React from 'react';
import { Edit, Pill, TestTube, AlertTriangle, AlertOctagon, Info, CheckCircle, Clock, XCircle, TrendingUp, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';

// --- 1. Quick Access ---
export const QuickAccessWidget = ({ onAddNote, onAddRx, onAddLab }: any) => (
    <Card padding="md" className="border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Access</h2>
        <div className="flex flex-col gap-3">
            <button onClick={onAddNote} className="flex items-center justify-center w-full h-12 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
                <Edit className="w-4 h-4 mr-2" /> Add Notes
            </button>
            <button onClick={onAddRx} className="flex items-center justify-center w-full h-12 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition-colors">
                <Pill className="w-4 h-4 mr-2" /> e-Prescribe
            </button>
            <button onClick={onAddLab} className="flex items-center justify-center w-full h-12 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition-colors">
                <TestTube className="w-4 h-4 mr-2" /> Lab Order
            </button>
        </div>
    </Card>
);

// --- 2. Patient Alerts ---
export const PatientAlertsWidget = ({ alerts }: { alerts: any[] }) => (
    <Card padding="md" className="border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Patient Alerts</h2>
        <div className="flex flex-col gap-4">
            {alerts.length === 0 && <p className="text-gray-500 text-sm">No active alerts.</p>}
            {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${alert.type === 'critical' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {alert.type === 'critical' ? <AlertOctagon size={18} /> : <AlertTriangle size={18} />}
                    </div>
                    <div>
                        <p className="font-medium text-sm text-gray-800">{alert.message}</p>
                        <p className="text-xs text-gray-500">{alert.subtext}</p>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

// --- 3. Today's Schedule ---
export const TodaysScheduleWidget = ({ schedule }: { schedule: any[] }) => (
    <Card padding="md" className="border border-gray-200 shadow-sm h-[600px] flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Schedule</h2>
        <div className="flex-grow overflow-y-auto space-y-2 relative pr-2">
            {/* Timeline Line */}
            <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-gray-200"></div>
            
            {schedule.length === 0 && <div className="text-center text-gray-500 mt-10">No appointments today.</div>}

            {schedule.map((item) => {
                const timeStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                    <div key={item.id} className="flex items-start group">
                        <div className="w-16 text-right text-xs text-gray-400 pt-2 pr-4">{timeStr}</div>
                        <div className="flex-1 ml-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg hover:bg-blue-100 transition-colors cursor-pointer">
                            <p className="font-semibold text-sm text-blue-900">{item.patientName}</p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-blue-700">{item.type} • {item.clinicName}</p>
                                {item.status === 1 && <CheckCircle size={14} className="text-green-600" />}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </Card>
);

// --- 4. Insights ---
export const InsightsWidget = ({ insights }: any) => (
    <Card padding="md" className="border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Insights</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{insights?.completed || 0}</p>
                <p className="text-xs text-gray-500">Done</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{insights?.scheduled || 0}</p>
                <p className="text-xs text-gray-500">Upcoming</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{insights?.canceled || 0}</p>
                <p className="text-xs text-gray-500">Canceled</p>
            </div>
        </div>
    </Card>
);

// --- 5. Revenue ---
export const RevenueWidget = ({ revenue }: any) => (
    <Card padding="md" className="border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue Snapshot</h2>
        <div className="h-24 w-full flex items-end gap-2 mb-4 px-2">
            <div className="flex-1 h-[40%] bg-blue-200 rounded-t-sm"></div>
            <div className="flex-1 h-[60%] bg-blue-200 rounded-t-sm"></div>
            <div className="flex-1 h-[30%] bg-blue-200 rounded-t-sm"></div>
            <div className="flex-1 h-full bg-green-300 rounded-t-sm relative group">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Today
                </div>
            </div>
        </div>
        <div className="flex justify-between items-center border-t pt-3">
            <div>
                <p className="text-xs text-gray-500">Today</p>
                <p className="text-lg font-bold text-gray-800">${revenue?.today || 0}</p>
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500">Month to Date</p>
                <p className="text-lg font-bold text-gray-800">${revenue?.mtd || 0}</p>
            </div>
        </div>
    </Card>
);

// --- 6. Tasks ---
export const TasksWidget = ({ tasks }: { tasks: any[] }) => (
    <Card padding="md" className="border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Tasks</h2>
        <div className="flex flex-col gap-3">
            {tasks.map(task => (
                <div key={task.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-700">{task.title}</p>
                    {task.priority === 'high' && <AlertCircle size={16} className="text-orange-500" />}
                </div>
            ))}
        </div>
    </Card>
);