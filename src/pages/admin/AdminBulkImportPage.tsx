import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';
import {
  fetchBulkImportSummary,
  executeBulkImport,
  fetchAdminMaterials
} from '../../services/api.ts';
import { Layers, UploadCloud, CheckCircle, Clock, AlertTriangle, FileText, Search, RefreshCw, BookOpen, X, Play, Check, ChevronRight, Shield, Award, BarChart2 } from 'lucide-react';

export const AdminBulkImportPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token || '';

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('ALL');

  // Bulk Queue Modal states
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [autoMatch, setAutoMatch] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Execution states
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [itemStatuses, setItemStatuses] = useState<Record<string, { status: string; error?: string }>>({});
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    if (token) {
      loadSummary();
      loadMaterials();
    }
  }, [token]);

  async function loadSummary() {
    setLoading(true);
    try {
      const res = await fetchBulkImportSummary(token);
      if (res.success) {
        setMetrics(res.metrics);
        setCourses(res.courses || []);
      }
    } catch (err) {
      console.error('Failed to load bulk import summary:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials() {
    try {
      const res = await fetchAdminMaterials(token, { status: 'ACTIVE' });
      if (res.success && res.materials) {
        setMaterials(res.materials);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  }

  // Pre-import validation check
  const handleStartQueue = () => {
    setValidationErrors([]);
    setExecutionResult(null);
    setItemStatuses({});

    if (selectedMaterialIds.length === 0) {
      setValidationErrors(['Please select at least one material PDF from the repository to import.']);
      return;
    }

    const selectedItems = materials.filter((m) => selectedMaterialIds.includes(m.id));
    const errors: string[] = [];

    selectedItems.forEach((mat) => {
      if (!mat.module_id) {
        errors.push(`Material "${mat.title}" is not linked to a valid target module.`);
      }
      if (!mat.storage_path) {
        errors.push(`Material "${mat.title}" is missing cloud storage path.`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    setIsQueueOpen(true);
  };

  // Run Bulk Import Execution
  const handleExecuteImport = async () => {
    if (selectedMaterialIds.length === 0) return;

    setImporting(true);
    setImportProgress(10);
    const initialStatuses: Record<string, { status: string }> = {};
    selectedMaterialIds.forEach((id) => {
      initialStatuses[id] = { status: 'IMPORTING' };
    });
    setItemStatuses(initialStatuses);

    try {
      const payloadItems = selectedMaterialIds.map((id) => ({
        materialId: id,
        autoMatch: true
      }));

      setImportProgress(40);
      const res = await executeBulkImport(token, payloadItems);

      setImportProgress(100);
      if (res.success) {
        setExecutionResult(res);
        const finalStatuses: Record<string, { status: string; error?: string }> = {};
        (res.results || []).forEach((r: any) => {
          finalStatuses[r.materialId] = {
            status: r.status,
            error: r.error
          };
        });
        setItemStatuses(finalStatuses);
        loadSummary();
      } else {
        alert(res.error || 'Bulk import failed.');
      }
    } catch (err: any) {
      console.error('Failed executing bulk import:', err);
      alert(err.message || 'Error occurred during bulk import execution.');
    } finally {
      setImporting(false);
    }
  };

  // Toggle material selection
  const toggleSelectMaterial = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all active materials
  const toggleSelectAllMaterials = () => {
    if (selectedMaterialIds.length === materials.length) {
      setSelectedMaterialIds([]);
    } else {
      setSelectedMaterialIds(materials.map((m) => m.id));
    }
  };

  // Group courses by Domain
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomainFilter === 'ALL' || c.category_id === selectedDomainFilter;
    return matchesSearch && matchesDomain;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <AdminPageHeader
            title="Bulk import"
            description="Extract content from uploaded PDFs and populate course lessons in one pass."
          />
          <button
            onClick={handleStartQueue}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Open Bulk Import Queue ({selectedMaterialIds.length})</span>
          </button>
        </div>

        {/* Platform Metrics Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Total Courses</div>
              <div className="text-xl font-semibold text-slate-900">{metrics.total_courses}</div>
              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>All Visible</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Published</div>
              <div className="text-xl font-semibold text-emerald-700">{metrics.published_courses}</div>
              <div className="text-[10px] text-slate-500 font-medium">No Draft Locks</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Total Lessons</div>
              <div className="text-xl font-semibold text-slate-900">{metrics.total_lessons}</div>
              <div className="text-[10px] text-slate-500 font-medium">Curriculum Units</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Imported Lessons</div>
              <div className="text-xl font-semibold text-indigo-600">{metrics.imported_lessons}</div>
              <div className="text-[10px] text-indigo-600 font-semibold">Active Theory HTML</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Pending Lessons</div>
              <div className="text-xl font-semibold text-amber-600">{metrics.pending_lessons}</div>
              <div className="text-[10px] text-amber-600 font-medium">Placeholder Ready</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Completion Rate</div>
              <div className="text-xl font-semibold text-indigo-700">{metrics.overall_completion_pct}%</div>
              <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                <div className="bg-indigo-600 h-1" style={{ width: `${metrics.overall_completion_pct}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter courses by name or slug..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedDomainFilter}
            onChange={(e) => setSelectedDomainFilter(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Career Domains</option>
            {CAREER_DOMAINS.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadSummary}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center"
            title="Refresh Summary"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Course Readiness Table List */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-bold">Calculating course content readiness metrics...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {CAREER_DOMAINS.map((domain) => {
              const domainCourses = filteredCourses.filter((c) => c.category_id === domain.id);
              if (domainCourses.length === 0) return null;

              return (
                <div key={domain.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">{domain.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                        {domainCourses.length} Courses
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Course Name & Slug</th>
                          <th className="py-3 px-4 text-center">Modules</th>
                          <th className="py-3 px-4 text-center">Lessons (Imported / Total)</th>
                          <th className="py-3 px-4">Progress & Readiness</th>
                          <th className="py-3 px-4">Readiness Checks</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {domainCourses.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 space-y-0.5">
                              <div className="font-semibold text-slate-900 text-xs">{c.title}</div>
                              <div className="text-[10px] font-mono text-slate-500">{c.slug}</div>
                            </td>

                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                              {c.total_modules}
                            </td>

                            <td className="py-3.5 px-4 text-center font-bold">
                              <span className="text-indigo-600">{c.imported_lessons}</span> /{' '}
                              <span className="text-slate-600">{c.total_lessons}</span>
                            </td>

                            <td className="py-3.5 px-4 space-y-1 min-w-[140px]">
                              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                <span>{c.completion_percentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    c.completion_percentage === 100
                                      ? 'bg-emerald-500'
                                      : c.completion_percentage > 0
                                      ? 'bg-indigo-600'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${c.completion_percentage}%` }}
                                ></div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                                <span className={`px-2 py-0.5 rounded-md border ${
                                  c.theory_imported
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  Theory: {c.theory_imported ? 'Ready' : 'Placeholder'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Quiz: Ready
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {c.status === 'READY' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                                  <CheckCircle className="w-3 h-3 text-emerald-700" />
                                  <span>READY</span>
                                </span>
                              ) : c.status === 'IN_PROGRESS' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>IN PROGRESS</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                                  <span>NOT STARTED</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BULK IMPORT QUEUE MODAL */}
      {isQueueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Bulk Import Queue & Execution</h3>
              </div>
              <button
                onClick={() => setIsQueueOpen(false)}
                className="text-slate-500 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {validationErrors.length > 0 && (
                <div className="p-3.5 bg-red-50 text-red-800 rounded-xl text-xs border border-red-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Pre-Import Validation Warnings</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Material Selection List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Uploaded Materials to Ingest ({selectedMaterialIds.length} / {materials.length})
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAllMaterials}
                    className="text-[10px] font-semibold text-indigo-600 hover:underline"
                  >
                    {selectedMaterialIds.length === materials.length ? 'Deselect All' : 'Select All Active'}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/50">
                  {materials.length > 0 ? (
                    materials.map((m) => (
                      <label
                        key={m.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-100/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.includes(m.id)}
                            onChange={() => toggleSelectMaterial(m.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">{m.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {m.original_filename} • v{m.version}
                            </div>
                          </div>
                        </div>

                        {itemStatuses[m.id] ? (
                          itemStatuses[m.id].status === 'IMPORTED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              IMPORTED
                            </span>
                          ) : itemStatuses[m.id].status === 'FAILED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200" title={itemStatuses[m.id].error}>
                              FAILED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                              IMPORTING...
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                            QUEUED
                          </span>
                        )}
                      </label>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No active uploaded materials found in repository. Upload PDFs in Course Materials first.
                    </div>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800">Automated Module & Lesson Matching</div>
                  <div className="text-[10px] text-slate-500">Matches filename/module order to unimported lessons</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoMatch}
                  onChange={(e) => setAutoMatch(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {importing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Processing bulk import batch sequentially...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-600 h-1.5 transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                  </div>
                </div>
              )}

              {executionResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    <span>{executionResult.message}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">
                    Successfully processed {executionResult.importedCount} materials into lesson theory content.
                  </div>
                </div>
              )}
            </div>

            <div className="h-16 border-t border-slate-200 px-6 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsQueueOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || selectedMaterialIds.length === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{importing ? 'Importing Batch...' : 'Import All Selected'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
