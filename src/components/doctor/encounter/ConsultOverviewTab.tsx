'use client';

import React from 'react';
import { 
  User, Stethoscope, AlertTriangle, 
  FileText, CheckCircle, RefreshCw, XCircle 
} from 'lucide-react';
// @ts-ignore
import Card from '@/components/ui/Card';
// @ts-ignore
import Button from '@/components/ui/Button';
import { VitalsEntryCard } from './VitalsEntryCard';

export const ConsultOverviewTab = ({
  appointment,
  patient,
  history,
  allergies,
  vitalsProps,
  actions
}: any) => {

  const isReturning = history && history.length > 0;
  const patientStatus = isReturning ? 'Returning Patient' : 'New Patient';

  return (
    <div className="space-y-6">
      
      {/* ROW 1: Context & Allergies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: Visit Context */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-var(--color-primary-brand)"/> Visit Context
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Patient Status</p>
                  <p className={`font-semibold ${isReturning ? 'text-var(--color-primary-secondary)' : 'text-green-700'}`}>
                    {patientStatus}
                  </p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Appt Type</p>
                  <p className="font-semibold text-gray-700">Scheduled Followup</p>
               </div>
               <div className="col-span-2">
                  <p className="text-xs text-gray-500 font-medium mb-1">Department / Doctor</p>
                  <div className="flex items-center gap-2 mt-1">
                     <Stethoscope className="w-3.5 h-3.5 text-gray-400"/>
                     <span className="font-semibold text-gray-700">
                        {appointment.doctor?.specialization || 'General Practice'} 
                        <span className="text-gray-500 text-xs font-normal"> — Dr. {appointment.doctor?.last_name}</span>
                     </span>
                  </div>
               </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-700 font-semibold mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3"/> Admin Notes
                </p>
                <p className="text-sm text-gray-700">
                    {appointment.notes || "No administrative notes provided for this visit."}
                </p>
            </div>
          </div>
        </div>

        {/* CARD 2: Clinical Alerts (Allergies) */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <div className="h-full">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500"/> Clinical Alerts
            </h3>
            
            <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Known Allergies</p>
                {allergies && allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {allergies.map((alg: any, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-sm font-medium">
                                {alg.allergy_name || 'Unknown Allergy'}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 text-sm p-4 bg-white rounded-lg justify-center border border-gray-200">
                        <CheckCircle className="w-4 h-4"/> No known allergies recorded
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Vitals Entry */}
      <VitalsEntryCard {...vitalsProps} />

      {/* ROW 3: Quick Actions */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
         <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
         <div className="flex flex-wrap gap-3">
             <Button variant="outline" onClick={actions.onReschedule} className="border-gray-300 text-gray-700 hover:bg-gray-100 flex">
                <RefreshCw className="w-4 h-4 mr-2"/> Reschedule
             </Button>
             
             <Button variant="outline" onClick={actions.onCancel} className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex">
                <XCircle className="w-4 h-4 mr-2"/> Cancel Visit
             </Button>

             <div className="flex-1"></div>

             <Button variant="primary" onClick={actions.onInvoice} shine className="bg-var(--color-primary-brand) hover:bg-var(--color-primary-brand) flex">
                <FileText className="w-4 h-4 mr-2"/> Generate Invoice
             </Button>
             
             {appointment.status !== 1 && (
                 <Button onClick={actions.onComplete} shine className="bg-green-600 hover:bg-green-700 text-white border-none flex">
                    <CheckCircle className="w-4 h-4 mr-2"/> Mark Complete
                 </Button>
             )}
         </div>
      </div>
    </div>
  );
};