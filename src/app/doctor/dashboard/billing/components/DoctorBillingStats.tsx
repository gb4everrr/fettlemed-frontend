'use client';
import React from 'react';
import Card from '@/components/ui/Card';
import { TrendingUp, FileText, Users } from 'lucide-react';

interface BillingStatsProps {
  revenue: number;
  totalInvoices: number;
  uniquePatients: number;
}

export const DoctorBillingStats: React.FC<BillingStatsProps> = ({ revenue, totalInvoices, uniquePatients }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card padding="lg" className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1 font-inter">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-800 font-inter">Rs. {revenue.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-green-50 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </Card>

      <Card padding="lg" className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1 font-inter">Total Invoices</p>
            <h3 className="text-2xl font-bold text-gray-800 font-inter">{totalInvoices}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card padding="lg" className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1 font-inter">Unique Patients</p>
            <h3 className="text-2xl font-bold text-gray-800 font-inter">{uniquePatients}</h3>
          </div>
          <div className="p-3 bg-purple-50 rounded-full">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </Card>
    </div>
  );
};