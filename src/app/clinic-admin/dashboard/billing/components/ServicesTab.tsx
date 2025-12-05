'use client';
import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CreditCard, Edit2, Trash2, Plus } from 'lucide-react';
import api from '@/services/api';

// Types passed from parent or defined here
interface ClinicService {
  id: number;
  clinic_id: number;
  name: string;
  price: number;
}

interface ServicesTabProps {
  services: ClinicService[];
  clinicId: number;
  onRefresh: () => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ services, clinicId, onRefresh }) => {
  const [serviceForm, setServiceForm] = useState({ name: '', price: '' });
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        name: serviceForm.name,
        price: parseFloat(serviceForm.price),
        clinic_id: clinicId
      };

      if (editingServiceId) {
        await api.put(`/clinic-invoice/service/update/${editingServiceId}`, payload);
      } else {
        await api.post('/clinic-invoice/service/create', payload);
      }
      
      setServiceForm({ name: '', price: '' });
      setEditingServiceId(null);
      onRefresh(); // Trigger parent refresh
    } catch (err) {
      console.error(err);
      alert('Failed to save service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (svc: ClinicService) => {
    setServiceForm({ name: svc.name, price: svc.price.toString() });
    setEditingServiceId(svc.id);
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure you want to delete this service?")) return;
    try {
      await api.post(`/clinic-invoice/service/delete/${id}`, { clinic_id: clinicId });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in-up">
      {/* Form Side */}
      <div className="lg:col-span-1">
        <Card padding="lg" className="shadow-md sticky top-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center font-inter">
            {editingServiceId ? <Edit2 className="h-4 w-4 mr-2"/> : <Plus className="h-4 w-4 mr-2"/>}
            {editingServiceId ? 'Edit Service' : 'Add New Service'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              id="svc_name"
              label="Service Name"
              value={serviceForm.name}
              onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
              required
            />
            <Input 
              id="svc_price"
              label="Price (Rs.)"
              type="number"
              step="0.01"
              value={serviceForm.price}
              onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
              required
            />
            <div className="pt-2 flex gap-2">
              <Button 
                type="submit" 
                variant="primary" 
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (editingServiceId ? 'Update' : 'Add Service')}
              </Button>
              {editingServiceId && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => { setEditingServiceId(null); setServiceForm({name:'', price:''}); }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* List Side */}
      <div className="lg:col-span-2">
        <Card className="shadow-md border border-gray-100">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 font-inter">Available Services</h3>
              <span className="text-xs font-medium px-2 py-1 bg-white border rounded text-gray-500 font-inter">
                {services.length} Total
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {services.length === 0 ? (
                <li className="p-8 text-center text-gray-500 font-inter">No services configured yet.</li>
              ) : (
                services.map(svc => (
                  <li key={svc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 group transition-colors">
                    <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-25 to-gray-50 flex items-center justify-center text-secondary mr-4 shadow-inner">
                                 
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 font-inter">{svc.name}</p>
                          <p className="text-sm text-gray-500 font-inter">Standard Rate</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900 font-mono">Rs. {svc.price.toFixed(2)}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(svc)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(svc.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
        </Card>
      </div>
    </div>
  );
};