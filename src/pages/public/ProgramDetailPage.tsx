import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Star, 
  Download, 
  Users, 
  Award, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight, 
  ShieldCheck, 
  Code, 
  BrainCircuit, 
  Building2, 
  Briefcase, 
  X, 
  Check, 
  BookOpen, 
  FileText, 
  PhoneCall, 
  ExternalLink,
  Laptop
} from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { getProgramDataBySlug, ProgramData, ModuleItem } from '../../data/programsData.ts';
import { submitCounselorLeadApi } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const ProgramDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { session, user } = useAuth();
  const program: ProgramData | null = getProgramDataBySlug(slug || '');

  // State
  const [openModuleId, setOpenModuleId] = useState<string>('mod-1');
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'projects' | 'certificate' | 'faculty' | 'fees'>('overview');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  
  // Lead form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    targetDomain: (program as any)?.category || 'Data Scientist',
    experienceLevel: 'Student / Fresher',
    preferredContactMethod: 'Phone Call',
    message: '',
    experience: 'Students / Recent Graduates',
    cohortDate: 'Sept 15, 2026 (Upcoming)',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Prefill authenticated user information if available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.user_metadata?.full_name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingForm) return;

    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedDomain = formData.targetDomain.trim() || 'Artificial Intelligence & Machine Learning';
    const trimmedExp = formData.experienceLevel.trim() || 'Student / Fresher';
    const trimmedContact = formData.preferredContactMethod.trim() || 'Phone Call';
    const trimmedMsg = formData.message.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const cleanDigits = trimmedPhone.replace(/\D/g, '');
    if (!trimmedPhone || cleanDigits.length < 7) {
      setFormError('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    setIsSubmittingForm(true);
    setFormError(null);

    try {
      const res = await submitCounselorLeadApi({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        target_domain: trimmedDomain,
        experience_level: trimmedExp,
        preferred_contact_method: trimmedContact,
        message: trimmedMsg || undefined,
        program_id: program.id,
      }, session?.access_token);

      if (res.success) {
        setFormSubmitted(true);
        setFormError(null);
      } else {
        setFormError(res.error || "We couldn't submit your request. Please check your details and try again.");
      }
    } catch {
      setFormError("We couldn't submit your request. Please check your details and try again.");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const toggleModule = (id: string) => {
    setOpenModuleId(openModuleId === id ? '' : id);
  };

  // Every hook above runs unconditionally; the guard sits after them.
  if (!program) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            Program not found
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
            We don&rsquo;t have a page for this program. Browse the career paths to find the one you
            are looking for.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/programs">
              <Button variant="primary" fullWidth>
                Browse career paths
              </Button>
            </Link>
            <Link to="/free-courses">
              <Button variant="outline" fullWidth>
                See all courses
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <MainLayout>
      <div className="bg-slate-50 min-h-screen text-slate-800">

        {/* Sticky Sub-Navigation Bar */}
        <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
          <div className="apex-container">
            <div className="flex items-center justify-between h-14 overflow-x-auto no-scrollbar gap-4">
              
              {/* Left: Program Branding & Live Status Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden lg:flex items-center gap-2 pr-3 border-r border-slate-200">
                  <span className="px-2 py-0.5 rounded bg-indigo-100/80 text-[10px] font-semibold text-indigo-800 uppercase tracking-wider">
                    {program.institution.split('&')[0].trim()}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 max-w-[220px] truncate" title={program.title}>
                    {program.title}
                  </span>
                  <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Cohort Sept 15
                  </span>
                </div>

                {/* Tab Navigation Items */}
                <nav className="flex items-center gap-1 text-xs font-bold text-slate-600">
                  {[
                    { id: 'overview', label: 'Overview', section: 'overview-section', icon: BookOpen },
                    { id: 'curriculum', label: 'Curriculum', section: 'curriculum-section', icon: FileText },
                    { id: 'projects', label: 'Projects', section: 'projects-section', icon: Code },
                    { id: 'certificate', label: 'Certificate', section: 'certificate-section', icon: Award },
                    { id: 'fees', label: 'Fees & EMI', section: 'fees-section', icon: ShieldCheck },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button 
                        key={tab.id}
                        onClick={() => { 
                          setActiveTab(tab.id as any); 
                          scrollToSection(tab.section); 
                        }}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                          isActive 
                            ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Right Action CTA Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsSyllabusModalOpen(true)}
                  className="text-xs font-bold gap-1.5 hidden sm:flex bg-indigo-50/60 border-indigo-200 text-indigo-700 hover:bg-indigo-100/80 hover:text-indigo-800 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Syllabus PDF</span>
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setIsApplyModalOpen(true)}
                  className="text-xs font-semibold gap-1.5 shadow-md bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white border-0 transition-all active:scale-95 px-4"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Apply Now</span>
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* HERO BANNER SECTION (Realistic Executive Light Theme) */}
        <section className="bg-gradient-to-b from-white via-slate-50 to-indigo-50/20 border-b border-slate-200/80 pt-8 pb-12">
          <div className="apex-container">
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
              <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3 text-slate-500" />
              <Link to="/programs" className="hover:text-indigo-600 transition-colors">Executive Programs</Link>
              <ChevronRight className="w-3 h-3 text-slate-500" />
              <span className="text-slate-900 font-semibold truncate">{program.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Hero Left Content Column (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Accreditation & Rank Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-800 text-xs font-bold border border-indigo-200">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    {program.institution}
                  </span>
                </div>

                {/* Program Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
                  {program.title}
                </h1>

                {/* Subtitle / Description */}
                <p className="text-slate-600 text-base leading-relaxed font-normal">
                  {program.subtitle}
                </p>

                {/* Key Metrics Quick Stats Grid (4 Cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Duration</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{program.duration}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{program.commitment}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                      <Laptop className="w-4 h-4 text-emerald-700" />
                      <span>Format</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Live Mentored</p>
                    <p className="text-[10px] text-slate-500 font-medium">Online Masterclasses</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Next Batch</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{program.nextCohort}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      <span>Format</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{program.format}</p>
                  </div>
                </div>


              </div>

              {/* Hero Right Application Lead Card (5 cols) */}
              <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-60"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Fast-Track Admission</span>
                      <h3 className="text-xl font-semibold text-slate-900">Apply or Request Info</h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      2026
                    </div>
                  </div>

                  {formSubmitted ? (
                    <div className="py-8 text-center space-y-3 bg-emerald-50 rounded-xl p-6 border border-emerald-200 animate-in fade-in">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                        <Check className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">Application Submitted!</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Thank you, <strong className="text-slate-900">{formData.fullName}</strong>. Our Admissions Counselor will call you at <strong className="text-slate-900">{formData.phone}</strong> within 2 hours with the detailed curriculum brochure and fee discount details.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setFormSubmitted(false)}
                        className="mt-2 text-xs"
                      >
                        Submit Another Request
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Alex Rivera" 
                          value={formData.fullName}
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                          <input 
                            type="email" 
                            required
                            placeholder="alex@company.com" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                          <input 
                            type="tel" 
                            required
                            placeholder="+1 (555) 000-0000" 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Work Experience</label>
                          <select 
                            value={formData.experience}
                            onChange={(e) => setFormData({...formData, experience: e.target.value})}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:outline-none"
                          >
                            <option>Students / Recent Graduates</option>
                            <option>1 - 3 Years</option>
                            <option>3 - 8 Years</option>
                            <option>8+ Years (Leadership)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Cohort</label>
                          <select 
                            value={formData.cohortDate}
                            onChange={(e) => setFormData({...formData, cohortDate: e.target.value})}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:outline-none"
                          >
                            <option>Sept 15, 2026 (Upcoming)</option>
                            <option>Oct 01, 2026</option>
                            <option>Nov 15, 2026</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
                        <Button variant="primary" className="w-full py-2.5 text-xs font-bold tracking-wide shadow-md">
                          Submit Application & Download Syllabus
                        </Button>
                        <p className="text-center text-[11px] text-slate-500">
                          We use your details only to respond to this enquiry.
                        </p>
                      </div>
                    </form>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="block font-bold text-slate-900">{program.fee.total}</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">Easy EMI: {program.fee.emiStart}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => scrollToSection('fees-section')} className="text-xs text-indigo-600 font-semibold">
                      Fee Details →
                    </Button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* SECTION 2: KEY PROGRAM HIGHLIGHTS */}
        <section id="overview-section" className="py-12 bg-white border-b border-slate-200/80">
          <div className="apex-container">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600">
                Program overview
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-3">
                Why Choose This Executive Program?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                What the program covers and how it is structured.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {program.highlights.map((h, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    {idx === 0 && <GraduationCap className="w-5 h-5" />}
                    {idx === 1 && <Code className="w-5 h-5" />}
                    {idx === 2 && <Users className="w-5 h-5" />}
                    {idx === 3 && <Award className="w-5 h-5" />}
                    {idx === 4 && <Briefcase className="w-5 h-5" />}
                    {idx === 5 && <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{h.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: WHO SHOULD ATTEND */}
        <section className="py-12 bg-slate-100/60 border-b border-slate-200/80">
          <div className="apex-container">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                Who Is This Program Designed For?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Tailored for motivated professionals seeking to master state-of-the-art Generative AI & LLM workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {program.whoShouldAttend.map((person, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    0{idx + 1}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{person.role}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{person.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: COMPREHENSIVE CURRICULUM ACCORDION (The core piece) */}
        <section id="curriculum-section" className="py-14 bg-white border-b border-slate-200/80">
          <div className="apex-container">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Detailed Syllabus
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-3">
                  Industry-Aligned Curriculum (7 Modules)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  120+ Hours of Live Learning • 12+ Hands-on Projects • Capstone Defense
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsSyllabusModalOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download Full Syllabus PDF</span>
                </Button>
              </div>
            </div>

            {/* Modules Accordion List */}
            <div className="space-y-4 max-w-5xl mx-auto">
              {program.curriculum.map((module) => {
                const isOpen = openModuleId === module.id;
                return (
                  <div 
                    key={module.id} 
                    className={`rounded-2xl border transition-all ${
                      isOpen 
                        ? 'bg-white border-indigo-300 shadow-md ring-1 ring-indigo-200' 
                        : 'bg-slate-50 hover:bg-white border-slate-200'
                    }`}
                  >
                    {/* Module Accordion Header */}
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-4 pr-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {module.id.replace('mod-', '')}
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                            {module.duration}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            {module.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          {module.topics.length} Key Topics
                        </span>
                        <div className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center transition-transform ${isOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </button>

                    {/* Module Accordion Expanded Content */}
                    {isOpen && (
                      <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                        <p className="text-xs text-slate-600 leading-relaxed font-normal">
                          {module.description}
                        </p>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                            Key Topics Covered:
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {module.topics.map((topic, tIdx) => (
                              <div key={tIdx} className="flex items-start gap-2 text-xs text-slate-700">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{topic}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {module.toolsCovered && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                              Tools & Frameworks Introduced:
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {module.toolsCovered.map((tool, toolIdx) => (
                                <span key={toolIdx} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {module.project && (
                          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 flex items-start gap-3">
                            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Hands-On Module Project:</span>
                              <p className="text-xs text-slate-800 font-medium">{module.project}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* SECTION 5: TOOLS & FRAMEWORKS COVERED */}
        <section id="tools-section" className="py-12 bg-slate-50 border-b border-slate-200/80">
          <div className="apex-container">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-semibold text-slate-900">
                Tools & Technologies You Will Master
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Gain hands-on proficiency with the most in-demand AI libraries, vector databases, and LLM orchestration tools.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {program.tools.map((tool, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs hover:border-indigo-300 transition-colors">
                  <span className="text-xs font-bold text-slate-900 block truncate">{tool.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium block truncate">{tool.category}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6: HANDS-ON PROJECTS */}
        <section id="projects-section" className="py-14 bg-white border-b border-slate-200/80">
          <div className="apex-container">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                Portfolio Ready
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-3">
                Real-World Capstone Projects & Industry Labs
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Build 12+ real-world projects that solve complex enterprise challenges and feature them on your GitHub portfolio.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {program.projects.map((proj, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="relative h-44 bg-slate-200 overflow-hidden">
                      <img src={proj.image} alt={proj.title} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                        {proj.domain}
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {proj.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {proj.techStack.map((tech, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7: SAMPLE CERTIFICATE PREVIEW */}
        <section id="certificate-section" className="py-14 bg-gradient-to-b from-slate-50 to-indigo-50/30 border-b border-slate-200/80">
          <div className="apex-container">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Certificate Info */}
              <div className="lg:col-span-5 space-y-5">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-100/80 px-3 py-1 rounded-full border border-indigo-200">
                  Global Credential
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
                  Earn an Authentic & Verifiable Executive Certificate
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {program.certificate.description}
                </p>

                <div className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Jointly Issued by IIT Bombay CS Faculty & Apex Executive Education</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Cryptographic Blockchain Hash & QR Code Validation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Direct Shareable to LinkedIn, Resume, and Credly</span>
                  </div>
                </div>

                <div className="pt-3">
                  <Link to={`/verify-certificate/${program.certificate.sampleId}`}>
                    <Button variant="primary" className="text-xs gap-2 shadow-md">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Test Live Certificate Verifier ({program.certificate.sampleId})</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Certificate Graphic Mockup */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border-4 border-amber-200/80 shadow-2xl relative overflow-hidden bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:16px_16px]">
                
                {/* Decorative Certificate Frame */}
                <div className="border-2 border-indigo-900/20 p-6 sm:p-8 rounded-xl space-y-6 text-center relative bg-white/95">
                  
                  {/* Top Seal & Crest */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">ISSUING INSTITUTION</span>
                      <span className="text-xs sm:text-sm font-semibold text-indigo-950 uppercase">{program.institution}</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-400 text-indigo-950 flex items-center justify-center font-semibold text-xs shadow-md border-2 border-white">
                      SEAL
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="space-y-3 py-2">
                    <span className="text-xs text-slate-500 font-serif italic block">This is to certify that</span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-wide underline decoration-amber-400 decoration-2 underline-offset-8">
                      Alex Rivera
                    </h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto pt-2">
                      has successfully completed the executive requirements for the
                    </p>
                    <h4 className="text-base sm:text-lg font-semibold text-indigo-900">
                      {program.title}
                    </h4>
                  </div>

                  {/* Signatures & QR Code */}
                  <div className="pt-6 border-t border-slate-200 grid grid-cols-3 items-end text-center">
                    <div className="text-left">
                      <span className="block font-serif text-xs text-slate-800 font-bold italic border-b border-slate-300 pb-1 max-w-[120px]">R.K. Sharma</span>
                      <span className="text-[10px] font-semibold text-slate-500 block pt-1">Program Director, IITB</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-900 p-1 rounded border border-slate-300 shadow-2xs flex items-center justify-center">
                        <div className="w-full h-full bg-white flex items-center justify-center text-[8px] font-bold text-slate-900">
                          QR VERIFY
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 mt-1">{program.certificate.sampleId}</span>
                    </div>

                    <div className="text-right">
                      <span className="block font-serif text-xs text-slate-800 font-bold italic border-b border-slate-300 pb-1 max-w-[120px] ml-auto">Sarah Chen</span>
                      <span className="text-[10px] font-semibold text-slate-500 block pt-1">Academic Dean</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </section>

        {/* SECTION 8: FACULTY & MENTORS */}
        {/* The faculty section was removed: it presented named individuals
            with stock-photo portraits and affiliations that are not real. */}

        {/* SECTION 9: FEES & EMI CALCULATOR */}
        <section id="fees-section" className="py-14 bg-slate-100/80 border-b border-slate-200/80">
          <div className="apex-container">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-10 space-y-8">
              
              <div className="text-center space-y-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Transparent Pricing
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                  Program Fees & Flexible Installments
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  What the program fee covers is listed below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                
                {/* Full Fee Card */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Program Fee</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-slate-900">{program.fee.total}</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> Full access to the {program.curriculum.length}-module curriculum</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> {program.projects.length} hands-on projects</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> Certificate with public verification</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> Career support access</li>
                  </ul>
                  <Button variant="primary" className="w-full text-xs font-bold" onClick={() => setIsApplyModalOpen(true)}>
                    Pay Full Fee & Enrol Now
                  </Button>
                </div>

                {/* Monthly EMI Card */}
                <div className="bg-indigo-900 text-white p-6 rounded-2xl border border-indigo-800 space-y-4 shadow-lg">
                  <span className="text-xs font-bold text-indigo-300 uppercase">No-Cost Flexible EMI</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-amber-400">{program.fee.emiStart}</span>
                    <span className="text-xs text-indigo-200">/ month</span>
                  </div>
                  <p className="text-xs text-indigo-200 leading-relaxed">
                    0% Interest EMI options available across major credit cards & financial partners (12/18/24 Months duration).
                  </p>
                  <ul className="space-y-2 text-xs text-indigo-100">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Zero Processing Fees</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Instant Online Approval</li>
                  </ul>
                  <Button variant="secondary" className="w-full text-xs font-bold bg-amber-400 text-slate-900 hover:bg-amber-300" onClick={() => setIsApplyModalOpen(true)}>
                    Check EMI Eligibility
                  </Button>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* SECTION 10: FAQS ACCORDION */}
        <section id="faqs-section" className="py-14 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-slate-600">
                Have questions about admission, prerequisites, or time commitment?
              </p>
            </div>

            <div className="space-y-3">
              {program.faqs.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-indigo-600 font-semibold">Q:</span>
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed pl-6">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MODAL 1: APPLICATION / ENQUIRY POPUP */}
        {isApplyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 relative shadow-2xl animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setIsApplyModalOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-indigo-600 uppercase">Apex Academy Admissions</span>
                <h3 className="text-xl font-semibold text-slate-900">Apply for Cohort Admission</h3>
                <p className="text-xs text-slate-500">{program.title}</p>
              </div>

              {formSubmitted ? (
                <div className="py-6 text-center space-y-3 bg-emerald-50 rounded-xl p-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Application Received!</h4>
                  <p className="text-xs text-slate-600">
                    Thank you! Your consultation request has been submitted. Our career advisor will contact you using your preferred contact method.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-3 text-left">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium animate-in fade-in">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Karan Paramar"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="e.g. karan@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number / WhatsApp *</label>
                    <input 
                      type="tel" 
                      required 
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Target Domain *</label>
                      <select
                        value={formData.targetDomain}
                        onChange={(e) => setFormData({...formData, targetDomain: e.target.value})}
                        className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Data Scientist">Data Scientist</option>
                        <option value="AI Engineer">AI Engineer</option>
                        <option value="AI Backend Engineer">AI Backend Engineer</option>
                        <option value="Data Engineer">Data Engineer</option>
                        <option value="ETL Developer">ETL Developer</option>
                        <option value="Data Analyst">Data Analyst</option>
                        <option value="BI Developer">BI Developer</option>
                        <option value="BI Analyst">BI Analyst</option>
                        <option value="Technical Analyst">Technical Analyst</option>
                        <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                        <option value="Market Analytics & Research">Market Analytics & Research</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level *</label>
                      <select
                        value={formData.experienceLevel}
                        onChange={(e) => setFormData({...formData, experienceLevel: e.target.value})}
                        className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Student / Fresher">Student / Fresher</option>
                        <option value="0–2 Years">0–2 Years</option>
                        <option value="2–5 Years">2–5 Years</option>
                        <option value="5+ Years">5+ Years</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Contact *</label>
                    <select
                      value={formData.preferredContactMethod}
                      onChange={(e) => setFormData({...formData, preferredContactMethod: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Phone Call">Phone Call</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Message / Query (Optional)</label>
                    <textarea 
                      rows={2}
                      placeholder="e.g. Guidance on AI curriculum"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={isSubmittingForm}
                    className="w-full py-2.5 text-xs font-bold mt-2 flex items-center justify-center gap-2"
                  >
                    {isSubmittingForm ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Request Free Call Back</span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: SYLLABUS DOWNLOAD POPUP */}
        {isSyllabusModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-4 relative shadow-2xl animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setIsSyllabusModalOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Download Detailed Syllabus (PDF)</h3>
                <p className="text-xs text-slate-500">Get complete module breakdowns, project specs, and fee schedules.</p>
              </div>

              {formSubmitted ? (
                <div className="py-6 text-center space-y-3 bg-indigo-50 rounded-xl p-4">
                  <CheckCircle2 className="w-10 h-10 text-indigo-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Downloading Syllabus...</h4>
                  <p className="text-xs text-slate-600">A copy has also been sent to {formData.email}</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Email Address</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="alex@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <Button variant="primary" className="w-full py-2.5 text-xs font-bold gap-2">
                    <Download className="w-4 h-4" />
                    <span>Download Brochure PDF</span>
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};
