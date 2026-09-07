import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';
import {
  fetchAdminMaterials,
  fetchAdminCurriculumCourses,
  fetchAdminCourseCurriculum,
  initMaterialUpload,
  completeMaterialUpload,
  updateAdminMaterial,
  deleteAdminMaterial,
  getAdminMaterialDownloadUrl,
  extractMaterialContent,
  saveContentToLesson
} from '../../services/api.ts';
import {
  FolderOpen,
  Search,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  ExternalLink,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  Award,
  FileCode,
  Sparkles,
  Eye,
  Code,
  BookOpen,
  Check
} from 'lucide-react';

const PDF_SIZE_LIMIT = 100 * 1024 * 1024; // 100 MB

interface CourseMaterial {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string;
  bucket_name: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  version: number;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
  status: 'ACTIVE' | 'REPLACED' | 'DELETED';
  is_active: boolean;
  course?: {
    title: string;
    slug: string;
  };
  module?: {
    title: string;
  };
}

export const AdminMaterialsPage: React.FC = () => {
  const { session, profile } = useAuth();
  const token = session?.access_token || '';

  // Data states
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog/Modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);

  // Upload Form states
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [replaceWarning, setReplaceWarning] = useState<boolean>(false);

  // Edit Form states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editing, setEditing] = useState(false);

  // Extraction & Preview Modal states
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractedHtml, setExtractedHtml] = useState<string>('');
  const [extractTab, setExtractTab] = useState<'preview' | 'html'>('preview');
  const [moduleLessons, setModuleLessons] = useState<any[]>([]);
  const [targetLessonId, setTargetLessonId] = useState<string>('');
  const [savingLesson, setSavingLesson] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all materials and admin courses on mount
  useEffect(() => {
    if (token) {
      loadMaterials();
      loadCourses();
    }
  }, [token, selectedDomain, selectedCourse, selectedModule, selectedStatus]);

  async function loadMaterials() {
    setLoading(true);
    try {
      const res = await fetchAdminMaterials(token, {
        courseId: selectedCourse,
        moduleId: selectedModule,
        status: selectedStatus,
        search: searchQuery
      });
      if (res.success && res.materials) {
        // If domain is selected, filter materials by domain on frontend
        let items = res.materials;
        if (selectedDomain !== 'ALL') {
          const matchedCourses = courses.filter((c: any) => c.category_id === selectedDomain);
          const courseIds = matchedCourses.map((c: any) => c.id);
          items = items.filter((m: any) => courseIds.includes(m.course_id));
        }
        setMaterials(items);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    try {
      const res = await fetchAdminCurriculumCourses(token);
      if (res.success && res.courses) {
        setCourses(res.courses);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }

  // Load modules dynamically when Course selection changes in Filter
  useEffect(() => {
    if (!token) return;
    if (selectedCourse === 'ALL') {
      setModules([]);
      setSelectedModule('ALL');
      return;
    }

    async function loadCourseModules() {
      try {
        const res = await fetchAdminCourseCurriculum(token, selectedCourse);
        if (res.success && res.curriculum?.modules) {
          setModules(res.curriculum.modules);
        } else {
          setModules([]);
        }
      } catch (err) {
        console.error('Failed to load course modules:', err);
        setModules([]);
      }
    }
    loadCourseModules();
  }, [selectedCourse, token]);

  // Handle Search Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMaterials();
  };

  // Upload Form Modules Dynamic Loading
  const [uploadModules, setUploadModules] = useState<any[]>([]);
  useEffect(() => {
    if (!token || !uploadCourseId) {
      setUploadModules([]);
      setUploadModuleId('');
      return;
    }

    async function loadUploadModules() {
      try {
        const res = await fetchAdminCourseCurriculum(token, uploadCourseId);
        if (res.success && res.curriculum?.modules) {
          setUploadModules(res.curriculum.modules);
        } else {
          setUploadModules([]);
        }
      } catch (err) {
        console.error('Failed to load upload modules:', err);
        setUploadModules([]);
      }
    }
    loadUploadModules();
  }, [uploadCourseId, token]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setUploadError('Invalid file type. Only PDF documents are allowed.');
      setUploadFile(null);
      return;
    }

    if (selected.size > PDF_SIZE_LIMIT) {
      setUploadError('File size exceeds the 100 MB maximum limit.');
      setUploadFile(null);
      return;
    }

    setUploadError(null);
    setUploadFile(selected);
    if (!uploadTitle) {
      setUploadTitle(selected.name.replace(/\.pdf$/i, ''));
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setUploadError('Invalid file type. Only PDF documents are allowed.');
      return;
    }

    if (selected.size > PDF_SIZE_LIMIT) {
      setUploadError('File size exceeds the 100 MB maximum limit.');
      return;
    }

    setUploadError(null);
    setUploadFile(selected);
    if (!uploadTitle) {
      setUploadTitle(selected.name.replace(/\.pdf$/i, ''));
    }
  };

  // Execute Upload Process
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCourseId || !uploadModuleId || !uploadFile) {
      setUploadError('Please select a course, module, and a PDF file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      // Step 1: Initialize Upload
      const initRes = await initMaterialUpload(token, {
        courseId: uploadCourseId,
        moduleId: uploadModuleId,
        filename: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: 'application/pdf',
        title: uploadTitle,
        description: uploadDescription
      });

      if (!initRes.success) {
        throw new Error(initRes.error || 'Failed to initialize upload.');
      }

      setUploadProgress(40);

      // Step 2: Upload file directly to Supabase Storage pre-signed URL
      const putRes = await fetch(initRes.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf'
        },
        body: uploadFile
      });

      if (!putRes.ok) {
        throw new Error('Failed to upload file binary directly to storage.');
      }

      setUploadProgress(70);

      // Step 3: Complete Upload
      const completeRes = await completeMaterialUpload(token, {
        courseId: uploadCourseId,
        moduleId: uploadModuleId,
        storagePath: initRes.storagePath,
        originalFilename: uploadFile.name,
        fileSize: uploadFile.size,
        title: uploadTitle,
        description: uploadDescription,
        replace: replaceWarning
      });

      if (!completeRes.success) {
        // Catch duplicate material block error
        if (completeRes.error && completeRes.error.includes('active course material')) {
          setReplaceWarning(true);
          setUploading(false);
          setUploadProgress(0);
          setUploadError(completeRes.error);
          return;
        }
        throw new Error(completeRes.error || 'Failed to complete material registration.');
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      setTimeout(() => {
        setIsUploadOpen(false);
        resetUploadForm();
        loadMaterials();
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during upload.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadCourseId('');
    setUploadModuleId('');
    setUploadTitle('');
    setUploadDescription('');
    setUploadFile(null);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    setReplaceWarning(false);
  };

  // Replace Action Trigger
  const handleReplaceTrigger = (mat: CourseMaterial) => {
    resetUploadForm();
    setUploadCourseId(mat.course_id);
    setUploadModuleId(mat.module_id);
    setUploadTitle(`${mat.title} (New Version)`);
    setReplaceWarning(true);
    setIsUploadOpen(true);
  };

  // Preview Action Trigger
  const handlePreview = async (id: string) => {
    try {
      const res = await getAdminMaterialDownloadUrl(token, id);
      if (res.success && res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      } else {
        alert(res.error || 'Failed to generate preview URL.');
      }
    } catch (err) {
      console.error('Failed to preview material:', err);
    }
  };

  // Download Action Trigger
  const handleDownload = async (id: string) => {
    try {
      const res = await getAdminMaterialDownloadUrl(token, id);
      if (res.success && res.downloadUrl) {
        const link = document.createElement('a');
        link.href = res.downloadUrl;
        link.download = res.title || 'download.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(res.error || 'Failed to generate download URL.');
      }
    } catch (err) {
      console.error('Failed to download material:', err);
    }
  };

  // Delete Action Trigger
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course material? This will soft-delete the database metadata and remove the file from storage.')) {
      return;
    }

    try {
      const res = await deleteAdminMaterial(token, id);
      if (res.success) {
        loadMaterials();
      } else {
        alert(res.error || 'Failed to delete material.');
      }
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  // Open Edit Modal
  const openEdit = (mat: CourseMaterial) => {
    setSelectedMaterial(mat);
    setEditTitle(mat.title);
    setEditDescription(mat.description || '');
    setIsEditOpen(true);
  };

  // Submit Edit Metadata changes
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    setEditing(true);
    try {
      const res = await updateAdminMaterial(token, selectedMaterial.id, {
        title: editTitle,
        description: editDescription
      });
      if (res.success) {
        setIsEditOpen(false);
        loadMaterials();
      } else {
        alert(res.error || 'Failed to update metadata.');
      }
    } catch (err) {
      console.error('Failed to edit material:', err);
    } finally {
      setEditing(false);
    }
  };

  // Trigger Extraction & Open Preview Modal
  const handleExtractTrigger = async (mat: CourseMaterial) => {
    setSelectedMaterial(mat);
    setIsExtractModalOpen(true);
    setExtracting(true);
    setExtractError(null);
    setSaveSuccess(false);
    setExtractedData(null);
    setExtractedHtml('');
    setModuleLessons([]);
    setTargetLessonId('');

    try {
      // 1. Call PDF extract endpoint
      const res = await extractMaterialContent(token, mat.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to extract text from PDF.');
      }

      setExtractedData(res);
      setExtractedHtml(res.html || '');

      // 2. Fetch module's lessons to populate Target Lesson selector
      const currRes = await fetchAdminCourseCurriculum(token, mat.course_id);
      if (currRes.success && currRes.curriculum?.modules) {
        const mod = currRes.curriculum.modules.find((m: any) => m.id === mat.module_id);
        if (mod && mod.lessons) {
          setModuleLessons(mod.lessons);
          if (mod.lessons.length > 0) {
            setTargetLessonId(mod.lessons[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to extract PDF content:', err);
      setExtractError(err.message || 'An error occurred while extracting PDF text.');
    } finally {
      setExtracting(false);
    }
  };

  // Save extracted HTML to selected lesson
  const handleSaveToLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonId || !extractedHtml.trim()) {
      alert('Please select a target lesson and ensure content is present.');
      return;
    }

    setSavingLesson(true);
    try {
      const res = await saveContentToLesson(token, targetLessonId, extractedHtml, selectedMaterial?.id);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setIsExtractModalOpen(false);
          setSaveSuccess(false);
        }, 1500);
      } else {
        alert(res.error || 'Failed to save content to lesson.');
      }
    } catch (err: any) {
      console.error('Failed to save content to lesson:', err);
      alert(err.message || 'Failed to save content to lesson.');
    } finally {
      setSavingLesson(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <AdminPageHeader
            title="Course materials"
            description="Source PDFs attached to curriculum modules, with versioning and extraction."
          />
          <button
            onClick={() => { resetUploadForm(); setIsUploadOpen(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Master PDF</span>
          </button>
        </div>

        {/* Filters and Search Bar Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials by filename, title, course..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Search
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Domain Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Domain</label>
              <select
                value={selectedDomain}
                onChange={(e) => {
                  setSelectedDomain(e.target.value);
                  setSelectedCourse('ALL');
                  setSelectedModule('ALL');
                }}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Domains</option>
                {CAREER_DOMAINS.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedModule('ALL');
                }}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Courses</option>
                {courses
                  .filter((c: any) => selectedDomain === 'ALL' || c.category_id === selectedDomain)
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Module Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Module</label>
              <select
                value={selectedModule}
                disabled={selectedCourse === 'ALL'}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="ALL">All Modules</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
              >
                <option value="ALL">Active Only</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="REPLACED">REPLACED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Materials Table List */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-bold">Querying materials repository database...</p>
          </div>
        ) : materials.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Course & Module</th>
                    <th className="py-3.5 px-4">Master PDF In Repository</th>
                    <th className="py-3.5 px-4">Version</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Updated By</th>
                    <th className="py-3.5 px-4">Updated At</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {materials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 space-y-1 max-w-[200px]">
                        <div className="font-semibold text-slate-900 text-[13px] leading-tight truncate">
                          {mat.course?.title || 'Unknown Course'}
                        </div>
                        <div className="text-[11px] text-indigo-600 font-bold flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span className="truncate">{mat.module?.title || 'Unknown Module'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 space-y-1">
                        <div className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="truncate" title={mat.title}>{mat.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {mat.original_filename} • {formatBytes(mat.file_size)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold">
                          v{mat.version}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {mat.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle className="w-3 h-3 text-emerald-700" />
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>REPLACED</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-slate-600 text-xs font-semibold">
                          {mat.uploaded_by ? 'Admin' : 'System Ingestion'}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {new Date(mat.uploaded_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(mat.id)}
                            title="Preview PDF"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(mat.id)}
                            title="Download PDF"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {mat.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => handleExtractTrigger(mat)}
                                title="Extract PDF Content & Preview HTML"
                                className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center gap-1 font-bold text-[11px] px-2 shadow-2xs"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Import to Lesson</span>
                              </button>
                              <button
                                onClick={() => openEdit(mat)}
                                title="Edit Metadata"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                              >
                                <Layers className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleReplaceTrigger(mat)}
                                title="Replace PDF Version"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 text-amber-600 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(mat.id)}
                                title="Delete PDF"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs shadow-2xs space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-700">No Master Materials Found</div>
            <p className="text-[11px] text-slate-500">Try adjusting your filters or upload a new PDF learning material.</p>
          </div>
        )}
      </div>

      {/* UPLOAD DRAWER MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-600" />
                <span>Upload Master Material PDF</span>
              </h3>
              <button onClick={() => { setIsUploadOpen(false); resetUploadForm(); }} className="text-slate-500 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {uploadError && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex gap-2 border border-red-200 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <div>
                    <div>{uploadError}</div>
                    {replaceWarning && (
                      <button
                        type="button"
                        onClick={() => { setReplaceWarning(true); setUploadError(null); }}
                        className="mt-1.5 underline font-semibold text-indigo-700 hover:text-indigo-900 block"
                      >
                        Click here to explicitly Replace and version bump
                      </button>
                    )}
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <span>File uploaded and registered successfully!</span>
                </div>
              )}

              {/* Course Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course *</label>
                <select
                  required
                  disabled={replaceWarning}
                  value={uploadCourseId}
                  onChange={(e) => setUploadCourseId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
                >
                  <option value="">Select Target Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Module *</label>
                <select
                  required
                  disabled={!uploadCourseId || replaceWarning}
                  value={uploadModuleId}
                  onChange={(e) => setUploadModuleId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium disabled:bg-slate-50"
                >
                  <option value="">Select Target Module</option>
                  {uploadModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Material Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="E.g., Complete Statistics & Data Analytics Handbook"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Summary of learning material context or scope..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Drag & Drop PDF upload area */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PDF File *</label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all space-y-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto" />
                  {uploadFile ? (
                    <div className="space-y-1">
                      <div className="font-semibold text-xs text-slate-900 truncate max-w-[300px] mx-auto">
                        {uploadFile.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatBytes(uploadFile.size)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Drag & Drop PDF here</div>
                      <div className="text-[10px] text-slate-500 mt-1">Only PDF documents up to 100 MB</div>
                    </div>
                  )}
                </div>
              </div>

              {uploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Uploading direct to Supabase bucket...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {replaceWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-semibold">Replacement Triggered:</span> This upload will replace the active master PDF on this module, deprecating the old version and bumping the version count.
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsUploadOpen(false); resetUploadForm(); }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || uploadSuccess || !uploadFile || !uploadCourseId || !uploadModuleId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {isEditOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Edit Material Metadata</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing || !editTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTRACT & PREVIEW LESSON IMPORT MODAL */}
      {isExtractModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm tracking-tight">
                  Extracted PDF Content — Preview & Lesson Import
                </h3>
              </div>
              <button
                onClick={() => setIsExtractModalOpen(false)}
                className="text-slate-500 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {extracting ? (
              <div className="p-16 text-center space-y-4 my-auto">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-slate-900">Parsing PDF & Generating Formatted HTML...</div>
                  <p className="text-xs text-slate-500">Reading text buffer with pdf-parse and organizing paragraphs & headings.</p>
                </div>
              </div>
            ) : extractError ? (
              <div className="p-8 text-center my-auto space-y-3">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                <div className="font-bold text-slate-900 text-sm">{extractError}</div>
                <button
                  onClick={() => setIsExtractModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Metrics bar & Target Lesson Controls */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 space-y-3 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold flex items-center gap-1.5 shadow-2xs">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{extractedData?.numpages || 1} Pages</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold flex items-center gap-1.5 shadow-2xs">
                        <Code className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{extractedData?.textLength || 0} Characters</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                        {selectedMaterial.original_filename}
                      </span>
                    </div>

                    {/* View Tab Toggle */}
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setExtractTab('preview')}
                        className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          extractTab === 'preview'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtractTab('html')}
                        className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          extractTab === 'html'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>HTML Code</span>
                      </button>
                    </div>
                  </div>

                  {/* Target Lesson Selector Form */}
                  <form onSubmit={handleSaveToLessonSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-200/60">
                    <div className="flex-1 flex items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Target Lesson:
                      </label>
                      {moduleLessons.length > 0 ? (
                        <select
                          required
                          value={targetLessonId}
                          onChange={(e) => setTargetLessonId(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 font-bold focus:ring-indigo-500"
                        >
                          {moduleLessons.map((l: any) => (
                            <option key={l.id} value={l.id}>
                              {l.title} ({l.lesson_type})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex-1">
                          No existing lessons found in this module. Create a lesson in Curriculum Manager first.
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingLesson || !targetLessonId || moduleLessons.length === 0 || !extractedHtml.trim()}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed shrink-0"
                    >
                      {saveSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Imported Successfully!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{savingLesson ? 'Saving Content...' : 'Save to Target Lesson'}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Tab Content Display */}
                <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[300px]">
                  {extractTab === 'preview' ? (
                    <div className="prose prose-slate max-w-none prose-h2:text-lg prose-h2:font-semibold prose-h2:text-slate-900 prose-h2:mt-6 prose-h2:mb-3 prose-p:text-sm prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4 border border-slate-100 p-6 rounded-2xl bg-slate-50/30">
                      <div dangerouslySetInnerHTML={{ __html: extractedHtml }} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Generated HTML Markup (Editable)</div>
                      <textarea
                        value={extractedHtml}
                        onChange={(e) => setExtractedHtml(e.target.value)}
                        rows={16}
                        className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 rounded-2xl focus:outline-none leading-relaxed shadow-inner"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
