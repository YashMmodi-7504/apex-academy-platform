import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { 
  fetchCurriculumSummary, 
  fetchAdminCurriculumCourses, 
  fetchAdminCareerPaths,
  addCourseToCareerPath,
  removeCourseFromCareerPath
} from '../../services/api.ts';
import { BookOpen, Search, Eye, Sliders, Plus, Trash2, CheckCircle2, Clock, Briefcase } from 'lucide-react';

export const AdminCurriculumPage: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'courses' | 'paths'>('courses');
  const [summary, setSummary] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [careerPaths, setCareerPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Course Library
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [pathFilter, setPathFilter] = useState('ALL');

  // Selected Career Path modal state
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseToAdd, setCourseToAdd] = useState('');

  const token = session?.access_token || '';

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sumRes, coursesRes, pathsRes] = await Promise.all([
        fetchCurriculumSummary(token),
        fetchAdminCurriculumCourses(token, {
          search,
          status: statusFilter,
          difficulty: difficultyFilter,
          careerPath: pathFilter
        }),
        fetchAdminCareerPaths(token)
      ]);

      if (sumRes.success) setSummary(sumRes.summary);
      if (coursesRes.success) setCourses(coursesRes.courses || []);
      if (pathsRes.success) setCareerPaths(pathsRes.careerPaths || []);
    } catch (err) {
      console.error('[AdminCurriculumPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, search, statusFilter, difficultyFilter, pathFilter]);

  const handleAddCourseToPath = async () => {
    if (!selectedPath || !courseToAdd || !token) return;
    try {
      const res = await addCourseToCareerPath(token, selectedPath.id, { course_id: courseToAdd });
      if (res.success) {
        setShowAddCourseModal(false);
        setCourseToAdd('');
        loadData();
      } else {
        alert(res.error || 'Failed to add course to career path');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding course');
    }
  };

  const handleRemoveCourseFromPath = async (programId: string, courseId: string) => {
    if (!token || !confirm('Remove course mapping from this career path?')) return;
    try {
      const res = await removeCourseFromCareerPath(token, programId, courseId);
      if (res.success) {
        loadData();
      } else {
        alert(res.error || 'Failed to remove course mapping');
      }
    } catch (err: any) {
      alert(err.message || 'Error removing course mapping');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <AdminPageHeader
            title="Curriculum"
            description="Career paths, courses, modules, lessons and their resources."
          />

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'courses'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Master Course Library</span>
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'paths'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Career Paths ({careerPaths.length})</span>
            </button>
          </div>
        </div>

        {/* Database Metrics Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Domains</span>
            <div className="text-lg font-semibold text-slate-900">{summary?.domains ?? '-'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Paths</span>
            <div className="text-lg font-semibold text-amber-600">{summary?.careerPaths ?? '-'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Courses</span>
            <div className="text-lg font-semibold text-indigo-600">{summary?.courses ?? '-'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Modules</span>
            <div className="text-lg font-semibold text-emerald-700">{summary?.modules ?? '-'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lessons</span>
            <div className="text-lg font-semibold text-sky-600">{summary?.lessons ?? '-'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Resources</span>
            <div className="text-lg font-semibold text-purple-600">{summary?.resources ?? '-'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Drafts</span>
            <div className="text-lg font-semibold text-amber-600">{summary?.draftCourses ?? '-'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Published</span>
            <div className="text-lg font-semibold text-emerald-700">{summary?.publishedCourses ?? '-'}</div>
          </div>
        </div>

        {/* TAB 1: MASTER COURSE LIBRARY */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 shadow-2xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Status: All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>

              <div>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Difficulty: All</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div>
                <select
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Career Path: All</option>
                  {careerPaths.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Courses Table */}
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-500 font-bold">Loading master course catalog...</p>
              </div>
            ) : courses.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Course Title</th>
                        <th className="py-3.5 px-4">Level</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-center">Modules</th>
                        <th className="py-3.5 px-4 text-center">Lessons</th>
                        <th className="py-3.5 px-4">Mapped Paths</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {courses.map((course) => (
                        <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 space-y-1">
                            <div className="font-semibold text-slate-900 text-sm">{course.title}</div>
                            <div className="text-[10px] font-mono text-indigo-600">{course.slug}</div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[10px]">
                              {course.difficulty}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            {course.status === 'PUBLISHED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                <span>PUBLISHED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>DRAFT</span>
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center font-bold text-slate-900">
                            {course.module_count}
                          </td>

                          <td className="py-4 px-4 text-center font-bold text-slate-500">
                            {course.lesson_count}
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {course.associated_paths && course.associated_paths.length > 0 ? (
                                course.associated_paths.map((pName: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200 font-semibold">
                                    {pName.replace(' Career Path', '')}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 text-[10px]">Unassigned</span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/admin/curriculum/courses/${course.id}`}>
                                <button className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs">
                                  <Sliders className="w-3.5 h-3.5" />
                                  <span>Manage Curriculum</span>
                                </button>
                              </Link>
                              <Link to={`/courses/${course.slug}`} target="_blank">
                                <button className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title="Public Preview">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-xs shadow-2xs">
                No courses matched your current filter criteria.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CAREER PATHS VIEW */}
        {activeTab === 'paths' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {careerPaths.map((path) => (
                <div key={path.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {path.category?.name || 'Career Domain'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {path.mapped_courses?.length || 0} Courses
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-900 text-base">{path.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{path.short_description || path.description}</p>

                    <div className="pt-2 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Mapped Foundation Courses:
                      </div>
                      <div className="space-y-1.5">
                        {path.mapped_courses && path.mapped_courses.length > 0 ? (
                          path.mapped_courses.map((mc: any, idx: number) => (
                            <div key={mc.mapping_id} className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                                  0{idx + 1}
                                </span>
                                <span className="text-slate-800 font-semibold truncate">{mc.course.title}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveCourseFromPath(path.id, mc.course.id)}
                                className="text-slate-500 hover:text-red-600 p-1"
                                title="Remove mapping"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-xl border border-slate-200">
                            Additional curriculum stages have not been added yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPath(path);
                      setShowAddCourseModal(true);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Map Existing Course</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: ADD COURSE TO CAREER PATH */}
        {showAddCourseModal && selectedPath && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">
                Map Course to {selectedPath.title}
              </h3>
              <p className="text-xs text-slate-500">
                Select an existing master course to attach to this Career Path.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Select Course</label>
                <select
                  value={courseToAdd}
                  onChange={(e) => setCourseToAdd(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.difficulty})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCourseToPath}
                  disabled={!courseToAdd}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50"
                >
                  Confirm Mapping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
