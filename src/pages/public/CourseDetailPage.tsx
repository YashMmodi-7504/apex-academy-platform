import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Card } from '../../components/common/Card.tsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { fetchCourseBySlug, enrollInCourse } from '../../services/api.ts';
import { 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  PlayCircle, 
  FileText, 
  Code2, 
  BookMarked,
  User,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Globe,
  Target
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, session } = useAuth();

  const [course, setCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollSuccessMsg, setEnrollSuccessMsg] = useState<string | null>(null);
  const [enrollErrorMsg, setEnrollErrorMsg] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Expanded module accordion state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCourseData() {
      if (!slug) return;
      setLoading(true);
      setError(null);

      const token = session?.access_token;
      const res = await fetchCourseBySlug(slug, token);

      if (!isMounted) return;

      if (res.success && res.course) {
        setCourse(res.course);
        // Expand first module by default
        if (res.course.modules && res.course.modules.length > 0) {
          setExpandedModules({ [res.course.modules[0].id]: true });
        }
      } else {
        setError(res.error || 'Course not found.');
      }
      setLoading(false);
    }

    loadCourseData();

    return () => {
      isMounted = false;
    };
  }, [slug, session]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleLessonClick = async (lesson: any) => {
    if (!course) return;

    if (course.isEnrolled) {
      navigate(`/learn/${course.slug}/lesson/${lesson.id}`);
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/learn/${course.slug}/lesson/${lesson.id}`)}`);
      return;
    }

    const token = session?.access_token;
    if (token) {
      setIsEnrolling(true);
      const res = await enrollInCourse(course.id, token);
      setIsEnrolling(false);
      if (res.success || res.alreadyEnrolled) {
        setCourse((prev: any) => prev ? { ...prev, isEnrolled: true, enrollment: res.enrollment } : null);
        navigate(`/learn/${course.slug}/lesson/${lesson.id}`);
        return;
      }
    }

    handleEnrollClick();
  };

  const expandAllModules = () => {
    if (!course?.modules) return;
    const allExp: Record<string, boolean> = {};
    course.modules.forEach((m: any) => { allExp[m.id] = true; });
    setExpandedModules(allExp);
  };

  const collapseAllModules = () => {
    setExpandedModules({});
  };

  const handleEnrollClick = async () => {
    if (!isAuthenticated) {
      // Preserve destination for post-login
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (!course) return;

    // Everything is free, proceed directly
    executeEnrollment(false);
  };

  const executeEnrollment = async (paymentCompleted: boolean = false) => {
    setIsEnrolling(true);
    setEnrollErrorMsg(null);
    setEnrollSuccessMsg(null);

    const token = session?.access_token;
    if (!token) {
      setEnrollErrorMsg('Your login session expired. Please sign in again.');
      setIsEnrolling(false);
      return;
    }

    const res = await enrollInCourse(course.id, token, paymentCompleted);
    setIsEnrolling(false);

    if (res.success) {
      setEnrollSuccessMsg('🎉 You are now successfully enrolled!');
      setCourse((prev: any) => prev ? { ...prev, isEnrolled: true, enrollment: res.enrollment } : null);
    } else {
      setEnrollErrorMsg(res.error || 'Enrollment failed. Please try again.');
    }
  };

  const formatDuration = (mins?: number) => {
    if (!mins) return 'Self-Paced';
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${remainingMins} mins`;
    if (remainingMins === 0) return `${hours} hrs`;
    return `${hours} hrs ${remainingMins} mins`;
  };

  const getLessonIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO':
        return <PlayCircle className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'ARTICLE':
        return <FileText className="w-4 h-4 text-emerald-700 shrink-0" />;
      case 'PRACTICAL':
        return <Code2 className="w-4 h-4 text-amber-600 shrink-0" />;
      default:
        return <BookMarked className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="apex-container py-20 flex flex-col items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading course catalog details..." />
        </div>
      </MainLayout>
    );
  }

  if (error || !course) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Course Not Found</h1>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            The course URL you requested is unavailable or has been unpublished.
          </p>
          <div className="pt-2">
            <Link to="/free-courses">
              <Button variant="primary">Browse Available Courses</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const totalLessons = (course.modules || []).reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="apex-hero">
        <div className="apex-container py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/80 text-indigo-700 border border-indigo-200 text-xs font-bold uppercase tracking-wider shadow-xs">
                {course.category?.name || 'Apex Course'}
              </span>
              <Badge variant={course.is_free ? 'emerald' : 'indigo'} size="sm">
                {course.is_free ? 'FREE COURSE' : 'PROFESSIONAL'}
              </Badge>
              <Badge variant="outline" size="sm" className="bg-white/70">
                {course.difficulty}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {course.short_description || course.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>{formatDuration(course.duration_minutes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>{course.language || 'English'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>{course.modules?.length || 0} Modules • {totalLessons} Lessons</span>
              </div>
              {course.certificate_enabled && (
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-700 font-medium">Certificate Eligible</span>
                </div>
              )}
            </div>
          </div>

          {/* Enrollment Card Column */}
          <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-lg space-y-5 lg:sticky lg:top-24">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Access Model</span>
              <div className="text-2xl font-semibold text-slate-900">
                {course.is_free ? '100% Free Access' : 'Professional Enrolment'}
              </div>
              <p className="text-[11px] text-slate-500">
                {course.is_free 
                  ? 'Self-paced learning with quizzes & certificate upon completion' 
                  : 'Includes structured cohort access and career mentorship'}
              </p>
            </div>

            {enrollSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{enrollSuccessMsg}</span>
              </div>
            )}

            {enrollErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{enrollErrorMsg}</span>
              </div>
            )}

            <div>
              {course.isEnrolled ? (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>You are enrolled in this course</span>
                  </div>
                  <Link to={`/student/learning/${course.id}`} className="block w-full">
                    <Button variant="primary" size="lg" className="w-full font-bold">
                      Start Learning Now <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold py-3.5"
                  onClick={handleEnrollClick}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? 'Processing Enrollment...' : 'Enroll Now (Free)'}
                </Button>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Full access to video lectures & readings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Practical coding exercises & module quizzes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Shareable digital completion credential</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="apex-container py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Details, Curriculum, Instructors */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Overview */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>About This Course</span>
            </h2>
            <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-3">
              <p>{course.description}</p>
            </div>
          </section>

          {/* Skills You Will Gain */}
          <section className="bg-linear-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100/80 p-6 rounded-2xl space-y-4 shadow-2xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <span>Skills & Competencies You'll Build</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'Data-Driven Hypothesis Testing',
                'Probability Distributions & Inference',
                'Practical Data Science Workflows',
                'Statistical Model Evaluation',
                'Exploratory Data Analysis (EDA)',
                'Employer-Verifiable Certificate'
              ].map((skill, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-800 font-semibold bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Curriculum Accordion */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Course Curriculum</span>
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <button
                  onClick={expandAllModules}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Expand All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={collapseAllModules}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Collapse All
                </button>
                <span className="text-xs font-medium text-slate-500">
                  {course.modules?.length || 0} Modules • {totalLessons} Lessons
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {(!course.modules || course.modules.length === 0) ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                  Curriculum modules are currently being updated.
                </div>
              ) : (
                course.modules.map((m: any, idx: number) => {
                  const isExpanded = !!expandedModules[m.id];
                  return (
                    <div key={m.id} className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-all">
                      <button
                        onClick={() => toggleModule(m.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                            Module {idx + 1}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm">{m.title}</h3>
                          {m.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{m.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-slate-500 font-medium">
                            {m.lessons?.length || 0} lessons
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && m.lessons && m.lessons.length > 0 && (
                        <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/40">
                          {m.lessons.map((lesson: any, lIdx: number) => {
                            const isEnrolled = course.isEnrolled;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => handleLessonClick(lesson)}
                                className="w-full p-3.5 sm:px-5 flex items-center justify-between text-xs text-left hover:bg-indigo-50/70 hover:text-indigo-950 transition-all cursor-pointer group border-l-2 border-transparent hover:border-indigo-600"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-indigo-300 shadow-2xs transition-colors shrink-0">
                                    {getLessonIcon(lesson.lesson_type)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-900 group-hover:text-indigo-900 transition-colors truncate">
                                        {lIdx + 1}. {lesson.title}
                                      </span>
                                    </div>
                                    {lesson.description && (
                                      <p className="text-[11px] text-slate-500 group-hover:text-slate-600 line-clamp-1 mt-0.5">
                                        {lesson.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                  {lesson.is_preview && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                                      Preview
                                    </span>
                                  )}
                                  {lesson.duration_seconds > 0 && (
                                    <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {Math.round(lesson.duration_seconds / 60)}m
                                    </span>
                                  )}
                                  
                                  {isEnrolled ? (
                                    <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                      Start <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
                                      View <ExternalLink className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Instructors */}
          {course.instructors && course.instructors.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <span>Course Instructors</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {course.instructors.map((inst: any) => (
                  <Card key={inst.id} className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {inst.avatar_url ? (
                        <img src={inst.avatar_url} alt={inst.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        inst.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 text-sm">{inst.name}</h3>
                      <p className="text-xs font-medium text-indigo-600">{inst.title}</p>
                      {inst.bio && <p className="text-xs text-slate-600 line-clamp-2">{inst.bio}</p>}
                      {inst.experience && (
                        <p className="text-[10px] font-semibold text-slate-500">Experience: {inst.experience}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Certificate Notice */}
          {course.certificate_enabled && (
            <section className="p-6 rounded-xl border border-slate-200 shadow-sm space-y-3" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}>
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Award className="w-5 h-5" />
                <span>Earn an Apex Academy Certificate</span>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Upon successfully completing 100% of the course modules and achieving a passing grade on the final assessment, you will unlock a verifiable digital completion certificate that can be shared on LinkedIn and verified by employers.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                {['Employer Verifiable', 'LinkedIn Ready', 'Instant Download', 'Unique QR Code'].map((feature, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] text-blue-100 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    {feature}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* FAQ Section */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {[
                {
                  q: 'Is this course completely free?',
                  a: 'Yes, this course is 100% free to enroll and complete. There are no hidden fees, subscriptions, or credit card requirements. You get full access to all lessons, quizzes, and the completion certificate.',
                },
                {
                  q: 'How do I earn the completion certificate?',
                  a: 'To earn the certificate, you need to complete all lessons, pass all module assessments (minimum 70%), and pass the final assessment. Once all criteria are met, the certificate is automatically issued and available on your dashboard.',
                },
                {
                  q: 'Can I learn at my own pace?',
                  a: 'Absolutely. This is a fully self-paced course. Your progress, video position, and quiz results are automatically saved. You can pause and resume at any time from any device.',
                },
                {
                  q: 'Are there any prerequisites?',
                  a: `This course is designed for the ${course.difficulty?.toLowerCase() || 'intermediate'} level. Basic familiarity with mathematics and a computer is sufficient. No prior specialized knowledge is required to get started.`,
                },
                {
                  q: 'Can I download or share my certificate?',
                  a: 'Yes! Your certificate includes a unique verification code and QR link. You can download it as a PDF, share it directly on LinkedIn, or send the verification link to employers. Verification is instant and public.',
                },
              ].map((faq, i) => {
                const isOpen = activeFaqIndex === i;
                return (
                  <div key={i} className="border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 transition-colors">
                    <button
                      onClick={() => setActiveFaqIndex(isOpen ? null : i)}
                      className="w-full text-left px-5 py-4 font-semibold text-slate-900 text-sm flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <span className="font-semibold text-xl shrink-0" style={{ color: '#4f46e5' }}>
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Course Key Details</h3>
            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Skill Level</span>
                <span className="font-semibold text-slate-900">{course.difficulty}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Total Duration</span>
                <span className="font-semibold text-slate-900">{formatDuration(course.duration_minutes)}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Language</span>
                <span className="font-semibold text-slate-900">{course.language}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Certificate</span>
                <span className="font-semibold text-emerald-700">Included</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Access Mode</span>
                <span className="font-semibold text-slate-900">Online / Self-Paced</span>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </MainLayout>
  );
};
