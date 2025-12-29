'use client';
import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CreditCard, Edit2, Trash2, Plus } from 'lucide-react';
import api from '@/services/api';

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

export const DoctorServicesTab: React.FC<ServicesTabProps> = ({ services, clinicId, onRefresh }) => {
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
        // CORRECTED: /service/update/:id
        await api.put(`/clinic-invoice/service/update/${editingServiceId}`, payload);
      } else {
        // CORRECTED: /service/create
        await api.post('/clinic-invoice/service/create', payload);
      }
      setServiceForm({ name: '', price: '' });
      setEditingServiceId(null);
      onRefresh();
    } catch (err) {
      console.error("Service Save Error", err);
      alert("Failed to save service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (svc: ClinicService) => {
    setServiceForm({ name: svc.name, price: svc.price.toString() });
    setEditingServiceId(svc.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this service?")) return;
    try {
        // CORRECTED: Route is defined as POST /service/delete/:id
        await api.post(`/clinic-invoice/service/delete/${id}`);
        onRefresh();
    } catch(e) {
        console.error(e);
        alert("Failed to delete service.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1">
        <Card title={editingServiceId ? "Edit Service" : "Add New Service"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
                id="name"
                label="Service Name" 
                value={serviceForm.name} 
                onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                required 
            />
            <Input 
                id="price"
                label="Price (Rs.)" 
                type="number" 
                value={serviceForm.price} 
                onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})}
                required 
            />
            <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
                   {editingServiceId ? 'Update' : 'Add Service'}
                </Button>
                {editingServiceId && (
                    <Button type="button" variant="ghost" onClick={() => {
                        setEditingServiceId(null);
                        setServiceForm({ name: '', price: '' });
                    }}>Cancel</Button>
                )}
            </div>
          </form>
        </Card>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Service List</h3>
                <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500">{services.length} items</span>
            </div>
            <ul className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {services.length === 0 ? (
                <li className="p-8 text-center text-gray-500 italic">No services added yet.</li>
              ) : services.map(svc => (
                  <li key={svc.id} className="p-4 flex items-center justify-between group hover:bg-gray-50">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-3">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{svc.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900 font-mono">Rs. {svc.price.toFixed(2)}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(svc)} className="p-2 text-gray-400 hover:text-blue-600">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(svc.id)} className="p-2 text-gray-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                    </div>
                  </li>
                ))}
            </ul>
        </Card>
      </div>
    </div>
  );
};