import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  BrainCircuit, 
  BarChart3, 
  Code2, 
  Briefcase, 
  Building2, 
  Clock, 
  Award, 
  ChevronRight, 
  CheckCircle2, 
  Users, 
  Star,
  ShieldCheck,
  Server,
  Database,
  Layers,
  LineChart,
  PieChart,
  Activity,
  Target,
  ArrowRight,
  GraduationCap,
  Search,
  TrendingUp,
  PhoneCall,
  Check,
  BookOpen,
  X,
  Trophy,
  Play,
  Zap
} from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import {
  checkApiHealth,
  submitCounselorLeadApi,
  fetchCourses,
  fetchSuccessStories,
} from '../../services/api.ts';
import { HealthCheckResponse } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { CAREER_DOMAINS, CareerDomain } from '../../data/domainsData.ts';

import campusBgImage from '../../assets/images/iit_campus_collaboration_1785784162422.jpg';

const DOMAIN_ICON_MAP: Record<string, React.ElementType> = {
  BarChart3,
  BrainCircuit,
  Server,
  Database,
  Layers,
  LineChart,
  PieChart,
  Briefcase,
  Activity,
  Sparkles,
  Target
};

export const HomePage: React.FC = () => {
  const { isAuthenticated, user, profile, session } = useAuth();
  const [apiHealth, setApiHealth] = useState<HealthCheckResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const navigate = useNavigate();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isCounselorModalOpen, setIsCounselorModalOpen] = useState<boolean>(false);
  const [counselorFormSubmitted, setCounselorFormSubmitted] = useState<boolean>(false);
  const [isCounselorSubmitting, setIsCounselorSubmitting] = useState<boolean>(false);
  const [counselorError, setCounselorError] = useState<string | null>(null);
  const [counselorData, setCounselorData] = useState({
    name: '',
    email: '',
    phone: '',
    target_domain: 'Data Scientist',
    experience_level: 'Student / Fresher',
    preferred_contact_method: 'Phone Call',
    message: ''
  });

  useEffect(() => {
    if (isCounselorModalOpen) {
      setCounselorError(null);
      if (isAuthenticated) {
        setCounselorData((prev) => ({
          ...prev,
          name: prev.name || profile?.full_name || user?.user_metadata?.full_name || '',
          email: prev.email || user?.email || '',
        }));
      }
    }
  }, [isCounselorModalOpen, isAuthenticated, profile, user]);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    checkApiHealth().then((res) => {
      setApiHealth(res);
      setLoadingHealth(false);
    });
  }, []);

  // Real catalogue figures — replaces previously hardcoded marketing numbers.
  const [catalogue, setCatalogue] = useState<any[]>([]);
  useEffect(() => {
    fetchCourses().then((res) => {
      if (res?.success) setCatalogue(res.courses || []);
    });
  }, []);

  // Learner stories come from the published records, not a hardcoded list.
  const [stories, setStories] = useState<any[]>([]);
  useEffect(() => {
    fetchSuccessStories().then((res) => {
      if (res?.success) setStories((res.data || []).slice(0, 3));
    });
  }, []);

  const publishedCourseCount = catalogue.length;
  const freeCourseCount = catalogue.filter((c: any) => c.is_free).length;
  const certificateCourseCount = catalogue.filter((c: any) => c.certificate_enabled).length;


  const DOMAIN_CATEGORIES = [
    { id: 'all', label: 'All Domains', icon: Sparkles },
    { id: 'ai', label: 'AI & Deep Learning', icon: BrainCircuit },
    { id: 'data-engineering', label: 'Data Engineering', icon: Database },
    { id: 'analytics-bi', label: 'Analytics & BI', icon: BarChart3 },
    { id: 'strategy', label: 'Research & Strategy', icon: Target },
  ];

  // Derived from live data / the real domain catalogue — no invented figures.
  const PLATFORM_STATS = [
    { value: String(CAREER_DOMAINS.length), label: 'Career Domains', icon: Briefcase },
    { value: publishedCourseCount ? String(publishedCourseCount) : '—', label: 'Published Courses', icon: BookOpen },
    { value: certificateCourseCount ? String(certificateCourseCount) : '—', label: 'With Certification', icon: Award },
    { value: 'Self-Paced', label: 'Learning Format', icon: Users },
  ];

  const FAQS = [
    {
      q: 'What are the 11 Career Domains offered at Apex Academy?',
      a: 'The 11 specialized career domains are: Data Scientist, AI Engineer, AI Backend Engineer, Data Engineer, ETL Developer, Data Analyst, BI Developer, BI Analyst, Technical Analyst, Machine Learning Engineer, and Market Analytics & Research. Each domain has a structured learning path, curated toolstack, and a verifiable completion certificate.',
    },
    {
      q: 'Are the courses completely free to enroll in?',
      a: 'Yes! All foundational courses on Apex Academy are 100% free to enroll. You get full access to video lectures, reading materials, hands-on exercises, module quizzes, and a verifiable digital certificate upon course completion — with no credit card required.',
    },
    {
      q: 'Will I receive a verifiable certificate upon completing a course?',
      a: 'Yes, every completed course includes an employer-verifiable digital certificate featuring a unique verification code. Employers and recruiters can instantly verify authenticity via our public verification page. Share it directly on LinkedIn or attach it to job applications.',
    },
    {
      q: 'How do I speak to a Career Advisor about domain selection?',
      a: 'Click "Talk to Career Advisor" anywhere on the platform to schedule a complimentary 1-on-1 consultation. Our career advisors will review your background, experience level, and career goals to recommend the optimal domain path for maximum impact.',
    },
    {
      q: 'Can I learn at my own pace?',
      a: 'Absolutely. All courses on Apex Academy are 100% self-paced. You can start, pause, and resume learning at any time. Your progress, video position, and quiz results are automatically saved to your dashboard.',
    },
  ];

  const filteredDomains = CAREER_DOMAINS.filter((d) => {
    let categoryMatch = true;
    if (activeCategoryFilter === 'ai') {
      categoryMatch = ['ai-engineer', 'ai-backend-engineer', 'machine-learning-engineer'].includes(d.slug);
    } else if (activeCategoryFilter === 'data-engineering') {
      categoryMatch = ['data-engineer', 'etl-developer'].includes(d.slug);
    } else if (activeCategoryFilter === 'analytics-bi') {
      categoryMatch = ['data-scientist', 'data-analyst', 'bi-developer', 'bi-analyst'].includes(d.slug);
    } else if (activeCategoryFilter === 'strategy') {
      categoryMatch = ['technical-analyst', 'market-analytics-research'].includes(d.slug);
    }

    const searchMatch = searchQuery === '' || 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.targetRoles.some(r => r.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.keyTools.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return categoryMatch && searchMatch;
  });

  const handleCounselorFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCounselorSubmitting) return;

    const trimmedName = counselorData.name.trim();
    const trimmedEmail = counselorData.email.trim();
    const trimmedPhone = counselorData.phone.trim();
    const trimmedDomain = counselorData.target_domain.trim();
    const trimmedExp = counselorData.experience_level.trim();
    const trimmedContact = counselorData.preferred_contact_method.trim();
    const trimmedMsg = counselorData.message.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setCounselorError('Please enter your full name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setCounselorError('Please enter a valid email address.');
      return;
    }

    const cleanDigits = trimmedPhone.replace(/\D/g, '');
    if (!trimmedPhone || cleanDigits.length < 7) {
      setCounselorError('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    if (!trimmedDomain) {
      setCounselorError('Please select a Target Domain.');
      return;
    }

    setIsCounselorSubmitting(true);
    setCounselorError(null);

    try {
      const response = await submitCounselorLeadApi(
        {
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          target_domain: trimmedDomain,
          experience_level: trimmedExp,
          preferred_contact_method: trimmedContact,
          message: trimmedMsg || undefined,
        },
        session?.access_token
      );

      if (response.success) {
        setCounselorFormSubmitted(true);
        setCounselorError(null);
      } else {
        setCounselorError(response.error || "We couldn't submit your request. Please check your details and try again.");
      }
    } catch (err: any) {
      setCounselorError("We couldn't submit your request. Please check your details and try again.");
    } finally {
      setIsCounselorSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">

        {/* ── ANNOUNCEMENT STRIP ─────────────────────────────── */}
        <div className="border-b border-indigo-500/20 bg-linear-to-r from-indigo-700 via-indigo-600 to-violet-600 text-white">
          <div className="apex-container flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 sm:justify-between sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-950">
                Free
              </span>
              <span className="truncate text-[12px] font-medium text-white/90">
                {publishedCourseCount > 0
                  ? `Enrol in any of our ${publishedCourseCount} published courses — certificate included`
                  : 'Enrol in our published courses — certificate included'}
              </span>
            </div>
            <button
              onClick={() => setIsCounselorModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
            >
              <PhoneCall className="h-3 w-3 shrink-0" />
              <span>Talk to a Career Advisor</span>
            </button>
          </div>
        </div>

        {/* ── HERO SECTION ──────────────────────────────────────── */}
        <section style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #eef2ff 40%, #f5f0ff 100%)' }} className="pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/60">
          <div className="apex-container">

            {/* Domain Quick Pills */}
            <div className="no-scrollbar mb-8 flex items-center gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible">
              <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider shrink-0 mr-1">
                11 Domains:
              </span>
              {CAREER_DOMAINS.slice(0, 8).map((domain) => {
                const IconComp = DOMAIN_ICON_MAP[domain.iconName] || BarChart3;
                return (
                  <Link key={domain.id} to={`/domains/${domain.slug}`} className="shrink-0 group">
                    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-transparent hover:bg-indigo-600 hover:text-white hover:shadow-md">
                      <IconComp className="h-3.5 w-3.5 shrink-0 text-indigo-600 transition-colors group-hover:text-amber-300" />
                      <span>{domain.name}</span>
                    </span>
                  </Link>
                );
              })}
              <Link to="/programs" className="shrink-0">
                <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

              {/* LEFT COPY */}
              <div className="lg:col-span-7 space-y-6">

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-blue-800 text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Aligned with 11 High-Growth Career Tracks — Certificates Included</span>
                </div>

                <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Master Future-Ready{' '}
                  <span style={{ background: 'linear-gradient(90deg, #4f46e5, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Career Domains
                  </span>
                  <br />
                  <span className="text-slate-700">with Apex Academy</span>
                </h1>

                <p className="text-base text-slate-600 max-w-xl leading-relaxed">
                  Whether you aspire to become a <strong className="text-slate-800">Data Scientist, AI Engineer, Data Engineer, or BI Analyst</strong>, Apex Academy provides structured learning paths, quizzes, practical exercises, and industry-verifiable certificates across 11 career domains.
                </p>

                {/* Hero Search */}
                <div className="max-w-lg">
                  <div className="flex items-center bg-white rounded-xl border-2 border-indigo-200 shadow-md focus-within:border-blue-500 focus-within:shadow-lg transition-all overflow-hidden">
                    <Search className="w-4 h-4 text-slate-500 ml-4 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Search career domains, roles, or tools..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-3 text-sm text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-500"
                    />
                    <button 
                      onClick={() => {
                        const el = document.getElementById('domains-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ background: '#4f46e5' }}
                      className="hover:opacity-90 text-white font-semibold text-sm px-5 py-3 shrink-0 transition-opacity"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Link to="/free-courses">
                    <button style={{ background: '#4f46e5' }} className="hover:opacity-90 text-white font-bold text-sm px-7 py-3 rounded-lg shadow-md transition-all flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Browse Free Courses</span>
                    </button>
                  </Link>
                  <button 
                    onClick={() => setIsCounselorModalOpen(true)}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-sm px-7 py-3 rounded-lg shadow-sm transition-all flex items-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4 text-indigo-600" />
                    <span>Talk to Career Advisor</span>
                  </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-4 border-t border-slate-200 sm:grid-cols-4 sm:gap-3">
                  {PLATFORM_STATS.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={i} className="text-center">
                        <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
                        <p className="text-[11px] text-slate-600 font-medium leading-tight">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* RIGHT CARD */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                  
                  {/* Course Preview Image */}
                  <div className="relative h-52 overflow-hidden bg-slate-900">
                    <img 
                      src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80" 
                      alt="AI Learning Lab" 
                      className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="bg-white/95 text-slate-900 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md flex items-center gap-1">
                        <BrainCircuit className="w-3 h-3 text-indigo-600" />
                        AI Engineer Domain
                      </span>
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-1 rounded-full">
                        🔥 Most Popular
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="text-xs font-semibold text-white/80">Featured Learning Track</p>
                      <p className="text-base font-semibold text-white">AI Engineer Career Blueprint</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">LLMs • Computer Vision • AI Agents</span>
                      <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">FREE</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-slate-500 text-[10px] uppercase font-bold">Status</p>
                        <p className="font-bold text-slate-900 mt-0.5">Live & Enrolling</p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-indigo-700 text-[10px] uppercase font-bold">Certificate</p>
                        <p className="font-bold text-blue-800 mt-0.5">Employer Verifiable</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to="/domains/ai-engineer" className="flex-1">
                        <button style={{ background: '#4f46e5' }} className="w-full text-white font-semibold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                          Explore Domain
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                      <Link to="/free-courses">
                        <button className="border border-indigo-200 text-indigo-700 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors">
                          All Courses
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        
        {/* ── PLATFORM STATS (derived from live catalogue data) ── */}
        <section className="border-b border-slate-200 bg-white py-12">
          <div className="apex-container">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {[
                { value: String(CAREER_DOMAINS.length), label: 'Career domains', accent: 'text-indigo-600' },
                { value: publishedCourseCount ? String(publishedCourseCount) : '—', label: 'Published courses', accent: 'text-violet-600' },
                { value: certificateCourseCount ? String(certificateCourseCount) : '—', label: 'With certification', accent: 'text-emerald-700' },
                { value: freeCourseCount ? String(freeCourseCount) : 'Free', label: 'Free to enrol', accent: 'text-amber-600' },
              ].map((s2, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-center transition-shadow hover:shadow-md sm:p-6"
                >
                  <p className={`text-2xl font-semibold sm:text-3xl ${s2.accent}`}>{s2.value}</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500">{s2.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CAREER DOMAIN CATALOG ─────────────────────────────── */}
        <section id="domains-section" className="py-16 bg-white">
          <div className="apex-container">

            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="inline-block text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-blue-100">
                11 Core Career Tracks
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mt-3">
                Explore Career Domains
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Choose your target career role. Each domain includes structured courses, hands-on labs, assessments, and a verifiable certificate.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar mb-8 pb-2">
              {DOMAIN_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                      isActive 
                        ? 'text-white shadow-md' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                    style={isActive ? { background: '#4f46e5' } : {}}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Domain Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDomains.map((domain) => {
                const IconComp = DOMAIN_ICON_MAP[domain.iconName] || BarChart3;
                return (
                  <div 
                    key={domain.id} 
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col group"
                  >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-slate-800">
                      <img 
                        src={domain.cardImage} 
                        alt={domain.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 rounded-md bg-white/95 text-slate-900 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                          <IconComp className="w-3 h-3 text-indigo-600" />
                          {domain.badge}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-[10px] text-blue-200 font-semibold uppercase">Focus Area</span>
                        <p className="text-xs font-bold text-white line-clamp-1">{domain.learningFocus}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors mb-1">
                        {domain.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">
                        {domain.shortDesc}
                      </p>

                      {/* Target Roles */}
                      <div className="mb-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Target Roles</p>
                        <div className="flex flex-wrap gap-1">
                          {domain.targetRoles.slice(0, 3).map((role, rIdx) => (
                            <span key={rIdx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tools */}
                      <div className="mb-5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Key Tools</p>
                        <div className="flex flex-wrap gap-1">
                          {domain.keyTools.slice(0, 4).map((tool, tIdx) => (
                            <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono border border-blue-100">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-auto flex gap-2">
                        <Link to={`/domains/${domain.slug}`} className="flex-1">
                          <button style={{ background: '#4f46e5' }} className="w-full text-white font-semibold text-xs py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
                            Explore Domain
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => {
                            setCounselorData(prev => ({ ...prev, target_domain: domain.name }));
                            setIsCounselorModalOpen(true);
                          }}
                          className="border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs px-3 py-2.5 rounded-lg transition-colors"
                          title="Get counseling"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDomains.length === 0 && (
              <div className="bg-white p-12 rounded-xl text-center border border-slate-200">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No matching domains found</h3>
                <p className="text-xs text-slate-500 mt-1">Try resetting the filter or changing your search term.</p>
                <button 
                  onClick={() => { setActiveCategoryFilter('all'); setSearchQuery(''); }}
                  className="mt-4 text-indigo-600 font-semibold text-sm hover:underline"
                >
                  Reset Filters
                </button>
              </div>
            )}

          </div>
        </section>

        {/* ── FREE COURSES SECTION ──────────────────────────────── */}
        <section className="py-16 bg-slate-50 border-t border-slate-200">
          <div className="apex-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
              <div>
                <span className="inline-block text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  🎁 100% Free — No Credit Card
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-3">
                  Start Learning for Free Today
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Get immediate access to structured courses with quizzes, labs, and verifiable certificates.
                </p>
              </div>
              <Link to="/free-courses" className="shrink-0">
                <button className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                  <BookOpen className="h-4 w-4 shrink-0" />
                  View full catalogue
                </button>
              </Link>
            </div>

            {/* Real published courses from the catalogue. The previous version
                hardcoded three titles with invented star ratings. */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {catalogue
                .filter((c: any) => c.is_free)
                .slice(0, 3)
                .map((course: any) => (
                  <Link
                    to={`/courses/${course.slug}`}
                    key={course.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                  >
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Free
                        </span>
                        {course.difficulty && (
                          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {course.difficulty}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600">
                        {course.title}
                      </h3>
                      {course.short_description && (
                        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                          {course.short_description}
                        </p>
                      )}

                      <span className="mt-auto inline-flex items-center gap-1.5 whitespace-nowrap pt-4 text-[13px] font-bold text-indigo-600">
                        Start this course
                        <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* ── WHY APEX ACADEMY ──────────────────────────────────── */}
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="apex-container">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-blue-100">
                The Apex Advantage
              </span>
              <h2 className="text-2xl sm:text-4xl font-semibold text-slate-900 tracking-tight mt-3">
                Why Professionals Choose Apex Academy
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: GraduationCap,
                  color: '#4f46e5',
                  bg: '#eef2ff',
                  title: 'Verified Certificates',
                  desc: 'Every completion issues a certificate with a code anyone can check on the public verification page.',
                },
                {
                  icon: Users,
                  color: '#7c3aed',
                  bg: '#f3f0ff',
                  title: '1-on-1 Domain Mentorship',
                  desc: 'Guidance from working practitioners on the path you are training for.',
                },
                {
                  icon: Briefcase,
                  color: '#d97706',
                  bg: '#fffbeb',
                  title: 'Placement Support',
                  desc: 'Resume building, interview preparation and structured guidance as you move into a new role.',
                },
                {
                  icon: ShieldCheck,
                  color: '#16a34a',
                  bg: '#f0fdf4',
                  title: 'Instant Verification',
                  desc: 'Verifiable certificates instantly shareable on LinkedIn — recruiters can verify in seconds.',
                },
              ].map((adv, idx) => {
                const Icon = adv.icon;
                return (
                  <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-center group">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"
                      style={{ background: adv.bg }}
                    >
                      <Icon className="w-7 h-7" style={{ color: adv.color }} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">{adv.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{adv.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── LEARNER STORIES (published records only) ──────────── */}
        {stories.length > 0 && (
          <section className="border-t border-slate-200 bg-slate-50 py-16">
            <div className="apex-container">
              <div className="mx-auto mb-12 max-w-3xl text-center">
                <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Learner stories
                </span>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  In their own words
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {stories.map((story: any) => (
                  <Link
                    to={`/success-stories/${story.id}`}
                    key={story.id}
                    className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-base font-bold text-slate-500"
                      >
                        {story.learner_name?.charAt(0) || 'A'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                          {story.learner_name}
                        </h3>
                        {story.new_role && (
                          <span className="block truncate text-[11px] font-semibold text-indigo-600">
                            {story.new_role}
                          </span>
                        )}
                      </div>
                    </div>

                    {story.testimonial && (
                      <p className="mt-4 line-clamp-4 flex-1 text-[13px] italic leading-relaxed text-slate-600">
                        &ldquo;{story.testimonial}&rdquo;
                      </p>
                    )}

                    <span className="mt-4 inline-flex items-center gap-1.5 whitespace-nowrap border-t border-slate-100 pt-3 text-[12.5px] font-bold text-indigo-600">
                      Read the full story
                      <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-10 text-center">
                <Link
                  to="/success-stories"
                  className="group inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  See all learner stories
                  <ArrowRight className="apex-cta-arrow h-4 w-4 shrink-0" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ SECTION ───────────────────────────────────────── */}
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-slate-500 mt-2">Everything you need to know about learning at Apex Academy</p>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-200 transition-colors">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full text-left px-6 py-4 font-semibold text-slate-900 text-sm flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="font-semibold text-xl shrink-0" style={{ color: '#4f46e5' }}>
                      {openFaqIndex === idx ? '−' : '+'}
                    </span>
                  </button>
                  {openFaqIndex === idx && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────── */}
        <section
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}
          className="apex-on-accent py-16 text-center"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-blue-100 text-sm max-w-xl mx-auto leading-relaxed">
              Schedule a free 1:1 consultation with a career advisor to find the perfect domain path based on your experience and goals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button 
                onClick={() => setIsCounselorModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm px-8 py-3.5 rounded-lg shadow-xl transition-colors flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                Book Free 1:1 Domain Counseling
              </button>
              <Link to="/programs">
                <button className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-sm px-8 py-3.5 rounded-lg transition-colors">
                  Browse All 11 Domains
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── COUNSELOR MODAL ───────────────────────────────────── */}
        {isCounselorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setIsCounselorModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {counselorFormSubmitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Request Received!</h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-xs mx-auto">
                      Thank you! Your domain consultation request has been submitted. Our career advisor will contact you using your preferred contact method.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCounselorModalOpen(false);
                      setCounselorFormSubmitted(false);
                      setCounselorData({
                        name: '', email: '', phone: '',
                        target_domain: 'Data Scientist',
                        experience_level: 'Student / Fresher',
                        preferred_contact_method: 'Phone Call',
                        message: ''
                      });
                    }}
                    className="mt-2 text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Done & Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCounselorFormSubmit} className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                      Free Domain Consultation
                    </span>
                    <h3 className="text-xl font-semibold text-slate-900 mt-2">Speak to a Domain Advisor</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Get personalized advice on selecting the right career domain path.</p>
                  </div>

                  {counselorError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                      {counselorError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input 
                      type="text" required
                      placeholder="e.g. Karan Patel"
                      value={counselorData.name}
                      onChange={(e) => setCounselorData({ ...counselorData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input 
                      type="email" required
                      placeholder="e.g. karan@gmail.com"
                      value={counselorData.email}
                      onChange={(e) => setCounselorData({ ...counselorData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp *</label>
                    <input 
                      type="tel" required
                      placeholder="+91 98765 43210"
                      value={counselorData.phone}
                      onChange={(e) => setCounselorData({ ...counselorData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Target Domain *</label>
                      <select 
                        value={counselorData.target_domain}
                        onChange={(e) => setCounselorData({ ...counselorData, target_domain: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      >
                        {CAREER_DOMAINS.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Experience *</label>
                      <select 
                        value={counselorData.experience_level}
                        onChange={(e) => setCounselorData({ ...counselorData, experience_level: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="Student / Fresher">Student / Fresher</option>
                        <option value="0–2 Years">0–2 Years</option>
                        <option value="2–5 Years">2–5 Years</option>
                        <option value="5+ Years">5+ Years</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isCounselorSubmitting}
                    style={{ background: '#4f46e5' }}
                    className="w-full text-white font-bold text-sm py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isCounselorSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Request Free Callback</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};
