'use client';

import React, { useState, useEffect } from 'react';
import { Beaker, Search, Plus, Clock, AlertCircle, Loader2 } from 'lucide-react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';

export const OrdersTab = ({ appointment, user, clinicId }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<{can_edit?: boolean}>({ can_edit: false });

  const canOrder = permissions.can_edit; 

  const fetchOrders = async () => {
    try {
      const res = await api.get(`/lab-orders/appointment/${appointment.id}`, {
        params: { clinic_id: clinicId }
      });
      
      if (res.data.permissions) {
        setOrders(res.data.orders || []);
        setPermissions(res.data.permissions);
      } else {
        setOrders(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error("Fetch orders error", err);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [appointment.id]);

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (val.length < 2) return setResults([]);
    
    try {
      const res = await api.get(`/lab-orders/catalog/search`, {
        params: { 
          query: val,
          clinic_id: clinicId 
        }
      });
      setResults(res.data);
    } catch (err) {
      console.error("Search error", err);
    }
  };

  const placeOrder = async (test: any) => {
    try {
      setLoading(true);
      await api.post('/lab-orders/create', {
        appointment_id: appointment.id,
        lab_catalog_id: test.id,
        clinic_id: clinicId,
        priority: 'routine'
      });
      setSearch('');
      setResults([]);
      fetchOrders();
    } catch (err) {
      alert("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-var(--color-primary-brand)"/> Orders & Investigations
        </h2>
      </div>

      {/* SEARCH SECTION */}
      {canOrder ? (
        <div className="relative z-30">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-var(--color-secondary-brand) outline-none"
              placeholder="Search Labs (e.g., CBC, Glucose, LOINC code...)"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {results.map((test) => (
                <button
                  key={test.id}
                  onClick={() => placeOrder(test)}
                  className="w-full text-left px-4 py-3 hover:bg-var(--color-secondary-brand) border-b last:border-0 flex justify-between items-center group"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{test.test_name}</p>
                    <p className="text-xs text-gray-500">{test.test_code} • {test.category}</p>
                  </div>
                  <Plus className="w-5 h-5 text-var(--color-primary-brand) opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> View-only access: Orders can only be placed by the assigned doctor.
        </div>
      )}

      {/* ORDERS LIST */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 bg-white border-b border-gray-200 font-semibold text-gray-700">
          Requested Tests ({orders.length})
        </div>
        <div className="divide-y divide-gray-100 bg-white">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No investigations ordered for this visit.</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                    order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.test_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{order.test_name}</p>
                    <p className="text-xs text-gray-500">Ordered by Dr. {order.doctor?.last_name} • {new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  order.status === 'Ordered' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}>
                  {order.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};