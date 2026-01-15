import React from 'react';
import { X, Phone, Mail } from 'lucide-react';
// @ts-ignore
import Button from '@/components/ui/Button';
import { VitalsCard } from './VitalsCard';

const safeInt = (val: any) => {
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const PatientHistoryPanel = ({ patient, onClose, appointmentId, clinicId, doctorId, user }: any) => {
  if (!patient) return null;

  const pId = safeInt(patient.id);
  const aId = safeInt(appointmentId);
  const cId = safeInt(clinicId);
  const dId = safeInt(doctorId);
  const uId = safeInt(user?.id); // Get User ID safely

  return (
    <div className="absolute inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      
      <div className="p-5 border-b flex justify-between items-center bg-gray-50 shrink-0">
        <div>
            <h3 className="font-bold text-lg text-gray-900">Patient Profile</h3>
            <p className="text-xs text-gray-500">{patient.first_name} {patient.last_name}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <section>
             <VitalsCard 
                appointmentId={aId} 
                patientId={pId} 
                clinicId={cId} 
                doctorId={dId} 
                recorderId={uId} // Pass to Card
             />
        </section>

        <section className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h4>
            <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{patient.phone_number || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{patient.email || 'No email'}</span>
                </div>
            </div>
        </section>
        
        {/* Visit History Section Placeholder */}
        <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Visit History</h4>
            <div className="border-l-2 border-gray-100 pl-4">
               <div className="relative">
                 <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white"></div>
                 <p className="text-sm font-medium text-gray-900">Current Visit</p>
                 <p className="text-xs text-gray-500">Today</p>
               </div>
            </div>
        </section>
      </div>
    </div>
  );
};