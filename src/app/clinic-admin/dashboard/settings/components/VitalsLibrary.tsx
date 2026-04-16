// src/app/clinic-admin/dashboard/settings/components/VitalsLibrary.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@radix-ui/react-label';
import {
  Edit, Trash2, List, Plus, Activity, RefreshCw,
  BookOpen, ChevronDown, ChevronRight, CheckCircle2,
  AlertTriangle, Info, Zap, Search,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClinicVitalConfig {
  id: number;
  clinic_id: number;
  vital_name: string;
  data_type: string;
  unit: string;
  is_active: boolean;
  is_required: boolean;
  catalog_id: number | null;
}

interface CatalogItem {
  id: number;
  category: string;
  vital_name: string;
  unit: string | null;
  data_type: string;
  notes: string | null;
  min_value: number | null;
  max_value: number | null;
  already_added: boolean;
}

// 409 response shapes from the backend
interface LibraryDuplicateError {
  error: 'duplicate_in_library';
  message: string;
  match: { id: number; vital_name: string; unit: string };
}
interface CatalogDuplicateError {
  error: 'duplicate_in_catalog';
  message: string;
  match: { catalog_id: number; vital_name: string; unit: string };
}

interface VitalsLibraryProps {
  clinicId: number;
}

// ─── Fuzzy match (mirrors backend logic for instant inline feedback) ──────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isFuzzyMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const longer = Math.max(na.length, nb.length);
  return longer > 4 && levenshtein(na, nb) <= 2;
}

function normalizeUnit(unit?: string | null): string {
  return (unit ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Inline warning shown while typing in the custom form */
function DuplicateWarning({
  type,
  message,
  onUseExisting,
  onUseCatalog,
}: {
  type: 'library' | 'catalog';
  message: string;
  onUseExisting?: () => void;
  onUseCatalog?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
      <div className="flex-1">
        <p className="font-semibold mb-1">Possible duplicate</p>
        <p>{message}</p>
        {type === 'library' && onUseExisting && (
          <button
            type="button"
            onClick={onUseExisting}
            className="mt-2 text-blue-600 underline hover:no-underline"
          >
            Scroll to existing vital →
          </button>
        )}
        {type === 'catalog' && onUseCatalog && (
          <button
            type="button"
            onClick={onUseCatalog}
            className="mt-2 text-blue-600 underline hover:no-underline"
          >
            Add from catalog instead →
          </button>
        )}
      </div>
    </div>
  );
}

/** A single accordion section in the catalog browser */
function CatalogCategorySection({
  category,
  items,
  onAdd,
  addingId,
}: {
  category: string;
  items: CatalogItem[];
  onAdd: (item: CatalogItem) => void;
  addingId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const added = items.filter(i => i.already_added).length;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          <span className="font-semibold text-sm text-gray-700">{category}</span>
          <span className="text-xs text-gray-400">({items.length})</span>
        </div>
        {added > 0 && (
          <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
            {added} added
          </span>
        )}
      </button>

      {open && (
        <ul className="divide-y divide-gray-50">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.vital_name}
                  {item.unit && <span className="text-gray-400 font-normal ml-1">({item.unit})</span>}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 capitalize">{item.data_type}</span>
                  {item.notes && (
                    <span className="text-xs text-gray-400 truncate max-w-[200px]" title={item.notes}>
                      · {item.notes}
                    </span>
                  )}
                </div>
              </div>

              <div className="ml-3 flex-shrink-0">
                {item.already_added ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Added
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onAdd(item)}
                    disabled={addingId === item.id}
                    className="text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {addingId === item.id ? '...' : <><Plus className="h-3.5 w-3.5 mr-1" />Add</>}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const VitalsLibrary: React.FC<VitalsLibraryProps> = ({ clinicId }) => {
  // Library state
  const [vitals, setVitals] = useState<ClinicVitalConfig[]>([]);
  const [isFetchingLibrary, setIsFetchingLibrary] = useState(true);

  // Catalog state
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isFetchingCatalog, setIsFetchingCatalog] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [addingCatalogId, setAddingCatalogId] = useState<number | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');

  // Custom form state
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    vital_name: '',
    data_type: 'number',
    unit: '',
    is_required: false,
  });

  // Inline duplicate warning (shows while typing, before submit)
  const [inlineDuplicate, setInlineDuplicate] = useState<{
    type: 'library' | 'catalog';
    message: string;
    libraryId?: number;
    catalogId?: number;
  } | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchLibrary = useCallback(async () => {
    setIsFetchingLibrary(true);
    try {
      const res = await api.get('/clinic-vitals/library/all', { params: { clinic_id: clinicId } });
      setVitals(res.data);
    } catch (err) {
      console.error('Failed to fetch library:', err);
    } finally {
      setIsFetchingLibrary(false);
    }
  }, [clinicId]);

  const fetchCatalog = useCallback(async () => {
    setIsFetchingCatalog(true);
    try {
      const res = await api.get('/clinic-vitals/catalog', { params: { clinic_id: clinicId } });
      setCatalog(res.data);
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setIsFetchingCatalog(false);
    }
  }, [clinicId]);

  useEffect(() => {
    if (clinicId) {
      fetchLibrary();
      fetchCatalog();
    }
  }, [clinicId, fetchLibrary, fetchCatalog]);

  // ── Catalog actions ──────────────────────────────────────────────────────────

  const handleAddFromCatalog = async (item: CatalogItem) => {
    setAddingCatalogId(item.id);
    try {
      await api.post('/clinic-vitals/catalog/add', {
        clinic_id: clinicId,
        catalog_id: item.id,
      });
      // Update both states optimistically
      setCatalog(prev => prev.map(c => c.id === item.id ? { ...c, already_added: true } : c));
      await fetchLibrary();
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert(err.response.data.message || 'Already in library.');
        setCatalog(prev => prev.map(c => c.id === item.id ? { ...c, already_added: true } : c));
      } else {
        alert('Failed to add vital. Please try again.');
      }
    } finally {
      setAddingCatalogId(null);
    }
  };

  // ── Custom form ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormState({ vital_name: '', data_type: 'number', unit: '', is_required: false });
    setIsEditing(null);
    setFormError(null);
    setInlineDuplicate(null);
  };

  const handleEdit = (vital: ClinicVitalConfig) => {
    setFormState({
      vital_name: vital.vital_name,
      data_type: vital.data_type,
      unit: vital.unit,
      is_required: vital.is_required,
    });
    setIsEditing(vital.id);
    setFormError(null);
    setInlineDuplicate(null);
    setActiveTab('custom');
  };

  /**
   * Runs inline duplicate detection as the user types.
   * Fires on blur of the vital_name field once there's a value.
   */
  const handleNameBlur = () => {
    if (isEditing || !formState.vital_name.trim()) {
      setInlineDuplicate(null);
      return;
    }

    // Check library
    const libraryMatch = vitals.find(v =>
      isFuzzyMatch(v.vital_name, formState.vital_name) &&
      normalizeUnit(v.unit) === normalizeUnit(formState.unit)
    );
    if (libraryMatch) {
      setInlineDuplicate({
        type: 'library',
        message: `"${libraryMatch.vital_name}" already exists in your library with the same unit.`,
        libraryId: libraryMatch.id,
      });
      return;
    }

    // Check catalog
    const catalogMatch = catalog.find(c =>
      isFuzzyMatch(c.vital_name, formState.vital_name) &&
      normalizeUnit(c.unit) === normalizeUnit(formState.unit)
    );
    if (catalogMatch) {
      setInlineDuplicate({
        type: 'catalog',
        message: `"${catalogMatch.vital_name}" is already in the standard catalog.`,
        catalogId: catalogMatch.id,
      });
      return;
    }

    setInlineDuplicate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const payload = { ...formState, clinic_id: clinicId };

    try {
      if (isEditing) {
        await api.put(`/clinic-vitals/library/update/${isEditing}`, payload);
      } else {
        await api.post('/clinic-vitals/library/create', payload);
      }
      resetForm();
      fetchLibrary();
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 409) {
        // Surface the backend duplicate error inline
        if (data?.error === 'duplicate_in_library') {
          setInlineDuplicate({
            type: 'library',
            message: data.message,
            libraryId: data.match?.id,
          });
        } else if (data?.error === 'duplicate_in_catalog') {
          setInlineDuplicate({
            type: 'catalog',
            message: data.message,
            catalogId: data.match?.catalog_id,
          });
        } else {
          setFormError(data?.message || 'Duplicate vital detected.');
        }
      } else {
        setFormError(data?.error || 'Failed to save configuration.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vitalId: number) => {
    if (!window.confirm('Remove this vital? It will no longer be available for assignment.')) return;
    try {
      await api.delete(`/clinic-vitals/library/delete/${vitalId}`, { params: { clinic_id: clinicId } });
      setVitals(prev => prev.filter(v => v.id !== vitalId));
      // Refresh catalog so already_added flags update
      fetchCatalog();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove vital.');
    }
  };

  // ── Catalog display ──────────────────────────────────────────────────────────

  const filteredCatalog = catalog.filter(item =>
    !catalogSearch ||
    item.vital_name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const groupedCatalog = filteredCatalog.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalAdded = catalog.filter(c => c.already_added).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">

      {/* ── Left column: Add panel ── */}
      <div className="lg:col-span-1">
        <Card padding="lg" className="shadow-sm border border-gray-100 sticky top-6">

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Standard Catalog
            </button>
            <button
              onClick={() => { setActiveTab('custom'); if (!isEditing) resetForm(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'custom'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Plus className="h-3.5 w-3.5" /> {isEditing ? 'Edit Vital' : 'Add Custom'}
            </button>
          </div>

          {/* ── Catalog tab ── */}
          {activeTab === 'catalog' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search catalog…"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {isFetchingCatalog ? (
                <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading catalog…
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                  {Object.entries(groupedCatalog).map(([category, items]) => (
                    <CatalogCategorySection
                      key={category}
                      category={category}
                      items={items}
                      onAdd={handleAddFromCatalog}
                      addingId={addingCatalogId}
                    />
                  ))}
                  {Object.keys(groupedCatalog).length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-6">No results for "{catalogSearch}"</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Custom form tab ── */}
          {activeTab === 'custom' && (
            <>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                {isEditing
                  ? <Edit className="h-5 w-5 text-blue-600" />
                  : <Plus className="h-5 w-5 text-primary" />}
                <h3 className="font-bold text-gray-800">
                  {isEditing ? 'Edit Vital Config' : 'Add Custom Vital'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 text-red-700 text-xs bg-red-50 border border-red-100 rounded-md">
                    {formError}
                  </div>
                )}

                {inlineDuplicate && (
                  <DuplicateWarning
                    type={inlineDuplicate.type}
                    message={inlineDuplicate.message}
                    onUseExisting={inlineDuplicate.libraryId ? () => {
                      // Scroll the library list to the matching item
                      document.getElementById(`vital-item-${inlineDuplicate.libraryId}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } : undefined}
                    onUseCatalog={inlineDuplicate.catalogId ? () => {
                      const catalogItem = catalog.find(c => c.id === inlineDuplicate.catalogId);
                      if (catalogItem) {
                        resetForm();
                        setActiveTab('catalog');
                        setCatalogSearch(catalogItem.vital_name);
                      }
                    } : undefined}
                  />
                )}

                <Input
                  id="vital_name"
                  label="Vital Name"
                  value={formState.vital_name}
                  onChange={e => {
                    setFormState({ ...formState, vital_name: e.target.value });
                    setInlineDuplicate(null); // clear stale warning while typing
                  }}
                  onBlur={handleNameBlur}
                  required
                />

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Data Type</Label>
                  <select
                    value={formState.data_type}
                    onChange={e => setFormState({ ...formState, data_type: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                  >
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                    <option value="boolean">Yes/No</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                <Input
                  id="unit"
                  label="Unit (Optional)"
                  value={formState.unit}
                  onChange={e => {
                    setFormState({ ...formState, unit: e.target.value });
                    setInlineDuplicate(null);
                  }}
                  onBlur={handleNameBlur}
                />

                <div className="flex items-center space-x-2 py-2">
                  <input
                    id="is_required"
                    type="checkbox"
                    checked={formState.is_required}
                    onChange={e => setFormState({ ...formState, is_required: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="is_required" className="text-sm text-gray-700 cursor-pointer select-none">
                    Required by Default
                  </Label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving…' : (isEditing ? 'Update Vital' : 'Add Vital')}
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                  )}
                </div>
              </form>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-100 flex gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>Use the Standard Catalog tab to quickly add common vitals. Custom vitals are for clinic-specific measurements not in the catalog.</span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Right column: Library list ── */}
      <div className="lg:col-span-2">
        <Card className="shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-gray-700">Your Library</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-1 bg-white border rounded text-gray-500">
                {vitals.length} Total
              </span>
              <button
                onClick={() => { fetchLibrary(); fetchCatalog(); }}
                className="text-gray-400 hover:text-[var(--color-primary-brand)] transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingLibrary ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-20rem)]">
            {vitals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                <List className="h-12 w-12 mb-3 opacity-20" />
                <p>No vitals in your library yet.</p>
                <p className="text-sm mt-1">
                  Add from the <strong>Standard Catalog</strong> or create a custom vital.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {vitals.map(v => (
                  <li
                    key={v.id}
                    id={`vital-item-${v.id}`}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 group transition-colors scroll-mt-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-500 font-semibold shadow-inner">
                        {v.vital_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {v.vital_name}
                            {v.unit && <span className="text-gray-400 font-normal text-sm ml-1">({v.unit})</span>}
                          </p>
                          {v.catalog_id && (
                            <span
                              title="From standard catalog"
                              className="flex items-center gap-0.5 text-xs text-blue-500"
                            >
                              <Zap className="h-3 w-3" /> Standard
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize border border-gray-200">
                            {v.data_type}
                          </span>
                          {v.is_required && (
                            <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(v)}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(v.id)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};