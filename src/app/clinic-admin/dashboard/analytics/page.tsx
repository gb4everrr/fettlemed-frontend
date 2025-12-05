'use client';

import React, { useState, useEffect } from 'react';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import DatePicker from '@/components/ui/DatePicker';
import api from '@/services/api';
import { useAppSelector } from '@/lib/hooks';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Loader2, TrendingUp, Users, Clock, DollarSign, Activity } from 'lucide-react';

// Colors matching your design system
const COLORS = ['#2D5367', '#276264', '#70B8BA', '#10252A', '#1f3b49', '#2d5367'];

// Custom Glassmorphic Card Component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`glassmorphic-card p-6 ${className}`}>
    {children}
  </div>
);

// Custom Tooltip with glassmorphism
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-gray-600">
            <span style={{ color: entry.color }}>{entry.name}: </span>
            <span className="font-medium">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { user } = useAppSelector((state: any) => state.auth);
  const clinicId = user?.clinics?.[0]?.id;

  const [activeTab, setActiveTab] = useState<'performance' | 'operational' | 'financial'>('performance');
  const [loading, setLoading] = useState(false);
  
  // State for data
  const [doctorData, setDoctorData] = useState<any>(null);
  const [opsData, setOpsData] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);

  // Default date range: Last 30 days
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getDefaultEndDate = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDate(),
    end: getDefaultEndDate()
  });

  useEffect(() => {
    if (!clinicId) return;
    fetchData(activeTab);
  }, [clinicId, activeTab, dateRange]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const params = { 
        clinic_id: clinicId, 
        startDate: dateRange.start.toISOString().split('T')[0], 
        endDate: dateRange.end.toISOString().split('T')[0]
      };
      
      if (tab === 'performance') {
        const res = await api.get('/analytics/doctor-performance', { params });
        setDoctorData(res.data);
      } else if (tab === 'operational') {
        const res = await api.get('/analytics/operational', { params });
        setOpsData(res.data);
      } else if (tab === 'financial') {
        const res = await api.get('/analytics/financial', { params });
        setFinanceData(res.data);
      }
    } catch (err) {
      console.error("Analytics fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header Section with Glassmorphic Style */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] font-inter mb-1">
              Analytics & Reports
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Real-time insights into your clinic performance
            </p>
          </div>
          
          {/* Date Filter with DatePicker Components */}
          <div className="flex gap-3 items-center">
            <DatePicker
              value={dateRange.start}
              onChange={(date) => setDateRange({...dateRange, start: date})}
              placeholder="Start date"
            />
            <span className="text-[var(--color-text-secondary)]">to</span>
            <DatePicker
              value={dateRange.end}
              onChange={(date) => setDateRange({...dateRange, end: date})}
              placeholder="End date"
              minDate={dateRange.start}
            />
          </div>
        </div>

        {/* Tab Navigation with Modern Style */}
        <div className="flex gap-3 border-b border-[var(--color-border)]">
          {[
            { id: 'performance', label: 'Doctor Performance', icon: Users },
            { id: 'operational', label: 'Operational Metrics', icon: Clock },
            { id: 'financial', label: 'Financial Reports', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300
                border-b-2 relative overflow-hidden group
                ${activeTab === tab.id 
                  ? 'border-[var(--color-primary-brand)] text-[var(--color-primary-brand)]' 
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }
              `}
            >
              <tab.icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--color-primary-brand)] to-[var(--color-secondary-brand)] animate-fade-in" />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary-brand)] mx-auto" />
              <p className="text-sm text-[var(--color-text-secondary)]">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* 1. DOCTOR PERFORMANCE */}
            {activeTab === 'performance' && doctorData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="min-h-[400px] transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.01]">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-[var(--color-primary-brand)]" />
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      Patient Volume by Doctor
                    </h3>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={doctorData.volumeData}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2D5367" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#276264" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e4e6" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#1f3b49', fontSize: 12 }}
                          axisLine={{ stroke: '#e5e4e6' }}
                        />
                        <YAxis 
                          tick={{ fill: '#1f3b49', fontSize: 12 }}
                          axisLine={{ stroke: '#e5e4e6' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar 
                          dataKey="consultations" 
                          fill="url(#barGradient)" 
                          name="Consultations"
                          radius={[8, 8, 0, 0]}
                          animationDuration={800}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard className="min-h-[400px] transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.01]">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-5 w-5 text-[var(--color-primary-brand)]" />
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      Completion vs Cancellation
                    </h3>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={doctorData.statusData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e4e6" opacity={0.3} />
                        <XAxis type="number" tick={{ fill: '#1f3b49', fontSize: 12 }} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={100}
                          tick={{ fill: '#1f3b49', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar 
                          dataKey="confirmed" 
                          stackId="a" 
                          fill="#10b981" 
                          name="Confirmed"
                          radius={[0, 4, 4, 0]}
                          animationDuration={800}
                        />
                        <Bar 
                          dataKey="cancelled" 
                          stackId="a" 
                          fill="#ef4444" 
                          name="Cancelled"
                          radius={[0, 4, 4, 0]}
                          animationDuration={800}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* 2. OPERATIONAL METRICS */}
            {activeTab === 'operational' && opsData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Utilization KPI */}
                  <GlassCard className="col-span-1 flex flex-col justify-center items-center transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.01]">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-5 w-5 text-[var(--color-primary-brand)]" />
                      <h3 className="text-lg font-bold text-[var(--color-text-secondary)]">
                        Slot Utilization
                      </h3>
                    </div>
                    <div className="relative flex items-center justify-center h-44 w-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            <linearGradient id="pieGradient" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#2D5367" />
                              <stop offset="100%" stopColor="#276264" />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={[
                              { name: 'Booked', value: opsData.utilization.booked },
                              { name: 'Empty', value: opsData.utilization.total - opsData.utilization.booked }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            animationDuration={800}
                          >
                            <Cell fill="url(#pieGradient)" />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <span className="text-3xl font-bold text-[var(--color-primary-brand)]">
                          {opsData.utilization.rate}%
                        </span>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Utilized</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-4 text-center">
                      {opsData.utilization.booked} / {opsData.utilization.total} Slots Booked
                    </p>
                  </GlassCard>

                  {/* Peak Hours Chart */}
                  <GlassCard className="col-span-1 md:col-span-2 transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.01]">
                    <div className="flex items-center gap-2 mb-6">
                      <Activity className="h-5 w-5 text-[var(--color-primary-brand)]" />
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                        Peak Appointment Hours
                      </h3>
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={opsData.peakHours}>
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2D5367" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#276264" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e4e6" opacity={0.3} />
                          <XAxis 
                            dataKey="hour" 
                            tickFormatter={(tick) => `${tick}:00`}
                            tick={{ fill: '#1f3b49', fontSize: 12 }}
                          />
                          <YAxis tick={{ fill: '#1f3b49', fontSize: 12 }} />
                          <Tooltip 
                            content={<CustomTooltip />}
                            labelFormatter={(label) => `${label}:00 - ${Number(label)+1}:00`} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#2D5367" 
                            strokeWidth={2}
                            fill="url(#areaGradient)" 
                            name="Appointments"
                            animationDuration={1000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {/* 3. FINANCIAL REPORTS */}
            {activeTab === 'financial' && financeData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="min-h-[400px] transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.01]">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-5 w-5 text-[var(--color-primary-brand)]" />
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      Revenue Trends
                    </h3>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={financeData.earningsData}>
                        <defs>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#2D5367" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e4e6" opacity={0.3} />
                        <XAxis 
                          dataKey="date"
                          tick={{ fill: '#1f3b49', fontSize: 12 }}
                        />
                        <YAxis tick={{ fill: '#1f3b49', fontSize: 12 }} />
                        <Tooltip 
                          content={<CustomTooltip formatter={(value: any) => `Rs. ${value}`} />}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="url(#lineGradient)" 
                          strokeWidth={3}
                          name="Daily Revenue"
                          dot={{ fill: '#2D5367', r: 4 }}
                          activeDot={{ r: 6 }}
                          animationDuration={1000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard className="min-h-[400px] transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.01]">
                  <div className="flex items-center gap-2 mb-6">
                    <DollarSign className="h-5 w-5 text-[var(--color-primary-brand)]" />
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      Revenue by Service
                    </h3>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financeData.revenueByServiceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={110}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          animationDuration={1000}
                        >
                          {financeData.revenueByServiceData.map((entry: any, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={<CustomTooltip formatter={(value: any) => `Rs. ${value}`} />}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        )}
      </div>
    </ClinicDashboardLayout>
  );
}