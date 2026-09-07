import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { LessonAssetManager } from '../../components/admin/LessonAssetManager.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  fetchAdminCourseCurriculum,
  createAdminModule,
  updateAdminModule,
  reorderAdminModules,
  createAdminLesson,
  updateAdminLesson,
  reorderAdminLessons,
  createAdminLessonResource,
  updateAdminLessonResource,
  toggleCoursePublishStatus
} from '../../services/api.ts';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  ListChecks,
  Eye,
  Lock
} from 'lucide-react';

export const AdminCourseEditorPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishMessage, setPublishMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // New Module Form State
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  // Edit Module State
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');

  // New Lesson State
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState('VIDEO');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonDuration, setLessonDuration] = useState('600');
  const [lessonIsPreview, setLessonIsPreview] = useState(false);

  // Edit Lesson State
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonType, setEditLessonType] = useState('VIDEO');
  const [editLessonDesc, setEditLessonDesc] = useState('');
  const [editLessonVideoUrl, setEditLessonVideoUrl] = useState('');
  const [editLessonContent, setEditLessonContent] = useState('');

  // New Resource State
  const [activeLessonForResource, setActiveLessonForResource] = useState<string | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState('PDF');
  const [resourceFileUrl, setResourceFileUrl] = useState('');

  const token = session?.access_token || '';

  const loadCourseCurriculum = async () => {
    if (!token || !courseId) return;
    setLoading(true);
    try {
      const res = await fetchAdminCourseCurriculum(token, courseId);
      if (res.success) {
        setCourseData(res);
      } else {
        alert(res.error || 'Failed to load course curriculum');
      }
    } catch (err) {
      console.error('Error loading course curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseCurriculum();
  }, [token, courseId]);

  // Publish Guard Toggle Action
  const handleTogglePublish = async () => {
    if (!token || !courseData?.course?.id) return;
    const currentPublished = courseData.course.is_published;
    const targetPublished = !currentPublished;

    setPublishMessage(null);
    try {
      const res = await toggleCoursePublishStatus(token, courseData.course.id, targetPublished);
      if (res.success) {
        setPublishMessage({ text: res.message, isError: false });
        loadCourseCurriculum();
      } else {
        setPublishMessage({ 
          text: res.error + (res.blockers ? ` Blockers: ${res.blockers.join(' | ')}` : ''), 
          isError: true 
        });
      }
    } catch (err: any) {
      setPublishMessage({ text: err.message || 'Publish toggle failed', isError: true });
    }
  };

  // Module Actions
  const handleCreateModule = async () => {
    if (!newModuleTitle || !token || !courseData?.course?.id) return;
    try {
      const res = await createAdminModule(token, {
        course_id: courseData.course.id,
        title: newModuleTitle,
        description: newModuleDesc
      });
      if (res.success) {
        setShowAddModule(false);
        setNewModuleTitle('');
        setNewModuleDesc('');
        loadCourseCurriculum();
      } else {
        alert(res.error || 'Failed to create module');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating module');
    }
  };

  const handleUpdateModule = async (id: string) => {
    if (!editModuleTitle || !token) return;
    try {
      const res = await updateAdminModule(token, id, {
        title: editModuleTitle,
        description: editModuleDesc
      });
      if (res.success) {
        setEditingModuleId(null);
        loadCourseCurriculum();
      } else {
        alert(res.error || 'Failed to update module');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating module');
    }
  };

  const handleReorderModule = async (index: number, direction: 'up' | 'down') => {
    if (!token || !courseData?.modules) return;
    const modulesList = [...courseData.modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= modulesList.length) return;

    const temp = modulesList[index];
    modulesList[index] = modulesList[targetIndex];
    modulesList[targetIndex] = temp;

    const orders = modulesList.map((m: any, idx: number) => ({
      id: m.id,
      display_order: idx + 1
    }));

    try {
      const res = await reorderAdminModules(token, courseData.course.id, orders);
      if (res.success) {
        loadCourseCurriculum();
      }
    } catch (err) {
      console.error('Error reordering modules:', err);
    }
  };

  // Lesson Actions
  const handleCreateLesson = async (moduleId: string) => {
    if (!lessonTitle || !token) return;
    try {
      const res = await createAdminLesson(token, {
        module_id: moduleId,
        title: lessonTitle,
        lesson_type: lessonType,
        description: lessonDesc,
        video_url: lessonVideoUrl,
        content: lessonContent,
        duration_seconds: parseInt(lessonDuration, 10) || 600,
        is_preview: lessonIsPreview
      });
      if (res.success) {
        setActiveModuleForLesson(null);
        setLessonTitle('');
        setLessonDesc('');
        setLessonVideoUrl('');
        setLessonContent('');
        loadCourseCurriculum();
      } else {
        alert(res.error || 'Failed to create lesson');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating lesson');
    }
  };

  const handleReorderLesson = async (moduleId: string, lessonIndex: number, direction: 'up' | 'down') => {
    if (!token || !courseData?.modules) return;
    const moduleItem = courseData.modules.find((m: any) => m.id === moduleId);
    if (!moduleItem || !moduleItem.lessons) return;

    const lessonsList = [...moduleItem.lessons];
    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;

    if (targetIndex < 0 || targetIndex >= lessonsList.length) return;

    const temp = lessonsList[lessonIndex];
    lessonsList[lessonIndex] = lessonsList[targetIndex];
    lessonsList[targetIndex] = temp;

    const orders = lessonsList.map((l: any, idx: number) => ({
      id: l.id,
      display_order: idx + 1
    }));

    try {
      const res = await reorderAdminLessons(token, moduleId, orders);
      if (res.success) {
        loadCourseCurriculum();
      }
    } catch (err) {
      console.error('Error reordering lessons:', err);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-bold">Loading course curriculum editor...</p>
        </div>
      </AdminLayout>
    );
  }

  const course = courseData?.course;
  const sharedUsage = courseData?.sharedUsage;
  const readiness = courseData?.readiness;
  const modules = courseData?.modules || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="space-y-4">
          <Link
            to="/admin/curriculum"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Master Course Library</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                  {course?.difficulty}
                </span>

                {course?.is_published ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>PUBLISHED</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>DRAFT</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{course?.title}</h1>
              <p className="text-xs text-slate-500 font-mono">slug: {course?.slug}</p>
            </div>

            <div className="flex items-center gap-3">
              <Link to={`/courses/${course?.slug}`} target="_blank">
                <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200">
                  <Eye className="w-4 h-4" />
                  <span>Public Preview</span>
                </button>
              </Link>

              <button
                onClick={handleTogglePublish}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-2 ${
                  course?.is_published
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                    : 'bg-emerald-700 hover:bg-emerald-500 text-white'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>{course?.is_published ? 'Unpublish to DRAFT' : 'Publish Course'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {publishMessage && (
          <div className={`p-4 rounded-2xl border text-xs font-bold ${
            publishMessage.isError
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {publishMessage.text}
          </div>
        )}

        {/* SHARED COURSE WARNING BANNER */}
        {sharedUsage?.isShared && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-amber-900">
                SHARED COURSE WARNING
              </div>
              <p className="leading-relaxed">
                <strong className="text-slate-900">{course?.title}</strong> is currently used across{' '}
                <span className="underline font-bold text-amber-700">{sharedUsage.count} Career Paths</span> (
                {sharedUsage.paths.map((p: any) => p.title).join(', ')}).
                Curriculum changes made here will automatically affect all associated career learning paths.
              </p>
            </div>
          </div>
        )}

        {/* CONTENT READINESS ENGINE STATUS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold text-slate-900">Curriculum Readiness Engine</h3>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              readiness?.status === 'READY'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {readiness?.status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Modules</span>
              <div className="text-xl font-semibold text-slate-900">{readiness?.moduleCount}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Lessons</span>
              <div className="text-xl font-semibold text-amber-600">{readiness?.lessonCount}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Resources</span>
              <div className="text-xl font-semibold text-indigo-600">{readiness?.resourceCount}</div>
            </div>
          </div>

          {/* Blockers Checklist */}
          {readiness?.blockers && readiness.blockers.length > 0 && (
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Publish Guard Blockers ({readiness.blockers.length}):
              </span>
              <ul className="space-y-1 text-xs text-amber-900 font-medium list-disc list-inside">
                {readiness.blockers.map((b: string, idx: number) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* MODULES MANAGEMENT HEADER */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
              <Layers className="w-6 h-6 text-indigo-600" />
              <span>Curriculum Modules ({modules.length})</span>
            </h2>
            <p className="text-xs text-slate-500">Manage modules, lesson structure, video references, and reading material</p>
          </div>

          <button
            onClick={() => setShowAddModule(!showAddModule)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Module</span>
          </button>
        </div>

        {/* NEW MODULE FORM */}
        {showAddModule && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">Add New Module</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Module Title *</label>
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Statistical Thinking & Data"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  placeholder="Module objectives and coverage..."
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddModule(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateModule}
                  disabled={!newModuleTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50"
                >
                  Save Module
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODULES LIST */}
        <div className="space-y-4">
          {modules.map((m: any, mIndex: number) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xs">
              {/* Module Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border border-indigo-100">
                    0{m.display_order}
                  </div>

                  {editingModuleId === m.id ? (
                    <div className="space-y-2 flex-1">
                      <input
                        type="text"
                        value={editModuleTitle}
                        onChange={(e) => setEditModuleTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold"
                      />
                      <textarea
                        value={editModuleDesc}
                        onChange={(e) => setEditModuleDesc(e.target.value)}
                        className="w-full px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 h-14"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateModule(m.id)}
                          className="px-3 py-1 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingModuleId(null)}
                          className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 text-base">{m.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'READY'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : m.status === 'EMPTY'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                      {m.description && (
                        <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleReorderModule(mIndex, 'up')}
                    disabled={mIndex === 0}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                    title="Move Module Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleReorderModule(mIndex, 'down')}
                    disabled={mIndex === modules.length - 1}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                    title="Move Module Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingModuleId(m.id);
                      setEditModuleTitle(m.title);
                      setEditModuleDesc(m.description || '');
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                    title="Edit Module"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Module Lessons Container */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Lessons ({m.lessons?.length || 0})</span>
                  <button
                    onClick={() => setActiveModuleForLesson(activeModuleForLesson === m.id ? null : m.id)}
                    className="text-amber-600 hover:text-amber-700 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Lesson</span>
                  </button>
                </div>

                {/* CREATE LESSON INLINE FORM */}
                {activeModuleForLesson === m.id && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-900">New Lesson for {m.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Lesson Title *</label>
                        <input
                          type="text"
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          placeholder="Lesson Title..."
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Lesson Type *</label>
                        <select
                          value={lessonType}
                          onChange={(e) => setLessonType(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                        >
                          <option value="VIDEO">VIDEO</option>
                          <option value="ARTICLE">ARTICLE</option>
                          <option value="READING">READING</option>
                          <option value="PRACTICAL">PRACTICAL</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Video Reference / URL</label>
                      <input
                        type="text"
                        value={lessonVideoUrl}
                        onChange={(e) => setLessonVideoUrl(e.target.value)}
                        placeholder="https://... or video storage reference"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Reading / Markdown Content</label>
                      <textarea
                        value={lessonContent}
                        onChange={(e) => setLessonContent(e.target.value)}
                        placeholder="Lesson content text or overview..."
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 h-20"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setActiveModuleForLesson(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateLesson(m.id)}
                        disabled={!lessonTitle.trim()}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold disabled:opacity-50"
                      >
                        Save Lesson
                      </button>
                    </div>
                  </div>
                )}

                {/* LESSONS LIST */}
                {!m.lessons || m.lessons.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs italic text-center">
                    No lessons have been added to this module yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {m.lessons.map((l: any, lIndex: number) => (
                      <div key={l.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center border border-amber-200">
                              {lIndex + 1}
                            </span>

                            <h5 className="font-bold text-slate-900 text-xs">{l.title}</h5>

                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase border border-indigo-100">
                              {l.lesson_type}
                            </span>

                            {l.video_url && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[9px] font-mono border border-sky-100">
                                Video URL Configured
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleReorderLesson(m.id, lIndex, 'up')}
                              disabled={lIndex === 0}
                              className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-30"
                              title="Move Lesson Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleReorderLesson(m.id, lIndex, 'down')}
                              disabled={lIndex === m.lessons.length - 1}
                              className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-30"
                              title="Move Lesson Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* LESSON ASSET MANAGER */}
                        <div className="pt-2">
                          <LessonAssetManager
                            token={token}
                            lessonId={l.id}
                            lessonTitle={l.title}
                            lessonType={l.lesson_type}
                            onAssetsUpdated={loadCourseCurriculum}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
