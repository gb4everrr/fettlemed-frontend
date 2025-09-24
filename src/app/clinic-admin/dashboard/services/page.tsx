// src/app/clinic-admin/dashboard/services/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, List } from 'lucide-react';
import { Label } from '@radix-ui/react-label';
import Input from '@/components/ui/Input';
import Link from 'next/link';

interface ClinicService {
  id: number;
  clinic_id: number;
  name: string;
  price: number;
}

export default function ServicesConfigurationPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [services, setServices] = useState<ClinicService[]>([]);
  const [isFetchingServices, setIsFetchingServices] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    name: '',
    price: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'clinic_admin') {
      router.push('/auth/login');
      return;
    }
    fetchServices();
  }, [user, router]);

  const fetchServices = async () => {
    setIsFetchingServices(true);
    setFetchError(null);
    try {
      if (!user?.clinics || user.clinics.length === 0) {
        setFetchError('No clinic is associated with your account.');
        return;
      }
      const clinicId = user.clinics[0].id;
      
      const response = await api.get(`/clinic-invoice/service/list`, {
        params: { clinic_id: clinicId },
      });
      
      setServices(response.data);

    } catch (err: any) {
      console.error('Failed to fetch services:', err);
      setFetchError(err.response?.data?.error || 'Failed to fetch service list.');
    } finally {
      setIsFetchingServices(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    const clinicId = user?.clinics?.[0]?.id;
    const priceAsNumber = parseFloat(formState.price);

    if (isNaN(priceAsNumber)) {
      setFormError('Price must be a valid number.');
      setIsSubmitting(false);
      return;
    }
    
    if (!clinicId) {
      setFormError('Clinic information is not available.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formState,
      price: priceAsNumber,
      clinic_id: clinicId,
    };

    try {
      if (isEditing) {
        await api.put(`/clinic-invoice/service/update/${isEditing}`, payload);
        setSuccessMessage('Service updated successfully!');
      } else {
        await api.post('/clinic-invoice/service/create', payload);
        setSuccessMessage('Service added to library successfully!');
      }
      setFormState({ name: '', price: '' });
      setIsEditing(null);
      fetchServices();
    } catch (err: any) {
      console.error('Failed to save service:', err);
      setFormError(err.response?.data?.error || 'Failed to save service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (service: ClinicService) => {
    setFormState({
      name: service.name,
      price: service.price.toString(),
    });
    setIsEditing(service.id);
  };

  const handleDelete = async (serviceId: number) => {
    if (!window.confirm('Are you sure you want to delete this service from the library?')) {
      return;
    }
    setFormError(null);
    setSuccessMessage(null);
    try {
      const clinicId = user?.clinics?.[0]?.id;
      if (!clinicId) {
        setFormError('Clinic information is missing.');
        return;
      }
      await api.post(`/clinic-invoice/service/delete/${serviceId}`, {
        clinic_id: clinicId,
      });
      setSuccessMessage('Service removed from library successfully!');
      fetchServices();
    } catch (err: any) {
      console.error('Failed to delete service:', err);
      setFormError(err.response?.data?.error || 'Failed to delete service.');
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setFormState({ name: '', price: '' });
    setFormError(null);
  };

  if (!user || isFetchingServices) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-700 text-lg font-inter">Loading services...</p>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (fetchError) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-red-600 text-lg mb-4">Error: {fetchError}</p>
          <Link href="/clinic-admin/dashboard" passHref>
            <Button variant="primary" size="md">Go to Dashboard</Button>
          </Link>
        </div>
      </ClinicDashboardLayout>
    );
  }

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 font-inter flex items-center">
            <List className="h-8 w-8 mr-2 text-gray-600" />
            Service Library
          </h1>
          <Link href="/clinic-admin/dashboard/invoices/create" passHref>
            <Button variant="primary" size="md" className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}
        {formError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{formError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="lg" className="md:col-span-1 shadow-lg h-fit">
            <h2 className="text-2xl font-bold mb-4">
              {isEditing ? 'Edit Service' : 'Add New Service'}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formState.name}
                  onChange={handleFormChange}
                  required
                  className="mt-1"
                  label="Service Name"
                />
              </div>
              <div>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={formState.price}
                  onChange={handleFormChange}
                  required
                  className="mt-1"
                  label="Price (Rs.)"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" variant="primary" size="md" disabled={isSubmitting} shine className="flex-1">
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update Service' : 'Add Service')}
                </Button>
                {isEditing && (
                  <Button type="button" variant="ghost" size="md" onClick={cancelEdit} className="flex-1">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>

          <Card padding="lg" className="md:col-span-2 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Configured Services</h2>
              <div className="text-sm text-gray-500">
                {services.length} service{services.length !== 1 ? 's' : ''} configured
              </div>
            </div>
            {services.length === 0 ? (
              <div className="text-center py-8">
                <List className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No services in your library yet</p>
                <p className="text-sm text-gray-400">Add services using the form to get started</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {services.map((service) => (
                  <li key={service.id} className="p-4 bg-gray-50 rounded-md flex items-center justify-between shadow-sm hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-800">{service.name}</p>
                      <span className="text-sm text-gray-500 mt-1">
                        Price: <span className="font-medium">Rs. {service.price.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(service)} title="Edit service">
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)} title="Delete service">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </ClinicDashboardLayout>
  );
}