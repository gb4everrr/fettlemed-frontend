// src/components/doctor/settings/VitalTemplates.tsx
'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Trash2, Layers, Check, Edit2, X } from 'lucide-react';

interface VitalConfig {
  id: number;
  vital_name: string;
  unit: string;
}

interface TemplateMember {
  vital_config_id: number;
  is_required: boolean;
  vitalConfig?: VitalConfig;
}

interface Template {
  id: number;
  template_name: string;
  description: string;
  members: TemplateMember[];
}

export const VitalTemplates = ({ clinicId }: { clinicId: number }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableVitals, setAvailableVitals] = useState<VitalConfig[]>([]);
  const [expandedTemplateId, setExpandedTemplateId] = useState<number | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedVitals, setSelectedVitals] = useState<TemplateMember[]>([]);

  useEffect(() => {
    if (clinicId) loadData();
  }, [clinicId]);

  const loadData = async () => {
    try {
      const [tmplRes, vitalsRes] = await Promise.all([
        api.get('/clinic-vitals/templates/all', { params: { clinic_id: clinicId } }),
        api.get('/clinic-vitals/library/all', { params: { clinic_id: clinicId } })
      ]);
      setTemplates(tmplRes.data);
      setAvailableVitals(vitalsRes.data);
    } catch(e) { console.error(e); }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setTemplateName('');
    setSelectedVitals([]);
    setIsFormOpen(true);
  };

  const openEditForm = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setEditingId(template.id);
    setTemplateName(template.template_name);
    setSelectedVitals(template.members.map(m => ({
      vital_config_id: m.vital_config_id,
      is_required: m.is_required
    })));
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTemplateName('');
    setSelectedVitals([]);
  };

  const toggleVitalSelection = (vitalId: number) => {
    if (selectedVitals.find(v => v.vital_config_id === vitalId)) {
      setSelectedVitals(selectedVitals.filter(v => v.vital_config_id !== vitalId));
    } else {
      setSelectedVitals([...selectedVitals, { vital_config_id: vitalId, is_required: false }]);
    }
  };

  const toggleRequired = (vitalId: number) => {
    setSelectedVitals(prev => prev.map(v => 
      v.vital_config_id === vitalId ? { ...v, is_required: !v.is_required } : v
    ));
  };

  const handleSubmit = async () => {
    if (!templateName) return;
    
    const payload = {
      clinic_id: clinicId,
      template_name: templateName,
      members: selectedVitals
    };

    try {
      if (editingId) {
        await api.put(`/clinic-vitals/templates/update/${editingId}`, payload);
      } else {
        await api.post('/clinic-vitals/templates/create', payload);
      }
      closeForm();
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(confirm('Delete this template?')) {
      await api.delete(`/clinic-vitals/templates/delete/${id}`);
      loadData();
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedTemplateId(expandedTemplateId === id ? null : id);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-600" /> Vital Templates
          </h3>
          <p className="text-sm text-gray-500">Create groups of vitals for quick assignment.</p>
        </div>
        {!isFormOpen && (
          <Button shine variant="primary" className="flex" onClick={openCreateForm}>
            <Plus className="flex h-4 w-4 mr-2" /> Create Template
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card padding="lg" className="border-2 border-gray-200 relative">
          <button onClick={closeForm} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              {editingId ? <Edit2 className="h-5 w-5 text-gray-600" /> : <Plus className="h-5 w-5 text-gray-600" />}
              <h4 className="font-bold text-gray-800">{editingId ? 'Edit Template' : 'Create New Template'}</h4>
            </div>

            <Input 
              id="template_name"
              label="Template Name" 
              value={templateName} 
              onChange={(e) => setTemplateName(e.target.value)} 
              
            />
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Select Vitals:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableVitals.map(v => {
                  const isSelected = !!selectedVitals.find(s => s.vital_config_id === v.id);
                  const isReq = selectedVitals.find(s => s.vital_config_id === v.id)?.is_required;

                  return (
                    <div key={v.id} className={`p-2 rounded border flex items-center justify-between ${isSelected ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggleVitalSelection(v.id)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-gray-700 border-gray-700' : 'border-gray-300'}`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium">{v.vital_name}</span>
                      </div>
                      {isSelected && (
                        <button 
                          onClick={() => toggleRequired(v.id)}
                          className={`text-xs px-2 py-0.5 rounded border ${isReq ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                        >
                          {isReq ? 'Required' : 'Optional'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" onClick={handleSubmit}>
                {editingId ? 'Update Template' : 'Save Template'}
              </Button>
              <Button variant="ghost" onClick={closeForm}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => {
          const isExpanded = expandedTemplateId === t.id;
          if (editingId === t.id) return null;

          return (
            <Card 
              key={t.id} 
              className={`group cursor-pointer transition-all ${isExpanded ? 'row-span-2 border-gray-400 ring-1 ring-gray-300' : 'hover:border-gray-300'}`}
              onClick={() => toggleExpand(t.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gray-400" />
                  <h4 className="font-bold text-gray-800">{t.template_name}</h4>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => openEditForm(e, t)} 
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, t.id)} 
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!isExpanded && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.members?.slice(0, 3).map((m, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                      {m.vitalConfig?.vital_name}
                    </span>
                  ))}
                  {(t.members?.length || 0) > 3 && <span className="text-xs text-gray-400">+{t.members.length - 3} more</span>}
                  {t.members?.length === 0 && <span className="text-xs text-gray-400 italic">No vitals</span>}
                </div>
              )}

              {isExpanded && (
                <div className="mt-4 border-t pt-3">
                  <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Included Vitals</h5>
                  <div className="space-y-1">
                    {t.members.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-1.5 hover:bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-500"></div>
                          <span className="text-gray-700 font-medium">{m.vitalConfig?.vital_name}</span>
                          {m.vitalConfig?.unit && <span className="text-xs text-gray-400">({m.vitalConfig.unit})</span>}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${m.is_required ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {m.is_required ? 'Req' : 'Opt'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};