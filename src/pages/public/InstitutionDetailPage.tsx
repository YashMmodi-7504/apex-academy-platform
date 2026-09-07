import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { MapPin, Globe, BookOpen, Award, ChevronRight, Loader2, Building2 } from 'lucide-react';
import { fetchInstitutionBySlug } from '../../services/api.ts';

export const InstitutionDetailPage: React.FC = () => {
  const { slug } = useParams();
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      fetchInstitutionBySlug(slug).then(res => {
        if (res.success && res.data) {
          setInstitution(res.data);
        }
        setLoading(false);
      });
    }
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!institution) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Institution Not Found</h2>
          <Link to="/search">
            <Button variant="primary">Back to Search</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const programs = institution.programs || [];

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="apex-hero pt-14 pb-14 lg:pt-20 lg:pb-20">
        <div className="relative apex-container flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0">
            {institution.logo_url ? (
               <img src={institution.logo_url} alt={institution.name} className="w-32 h-32 md:w-48 md:h-48 rounded-2xl border-4 border-white shadow-2xl object-cover bg-white" />
            ) : (
               <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl border-4 border-white shadow-2xl bg-slate-100 flex items-center justify-center">
                 <Building2 className="w-16 h-16 text-slate-500" />
               </div>
            )}
          </div>
          <div className="text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-indigo-200 text-indigo-700 text-sm font-medium shadow-xs">
              <Globe className="w-4 h-4" />
              University Partner
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">{institution.name}</h1>
            {institution.description && (
              <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-lg">
                {institution.description}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
              {institution.country && (
                <div className="flex items-center gap-2 text-slate-700 bg-white/80 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-200 shadow-xs">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium">{institution.country}</span>
                </div>
              )}
              {programs.length > 0 && (
                <div className="flex items-center gap-2 text-slate-700 bg-white/80 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-200 shadow-xs">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium">{programs.length} Programs</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="apex-container py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Content Column */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* About */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Award className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">About the Institution</h2>
              </div>
              {institution.description ? (
                <p className="text-[15px] leading-relaxed text-slate-600 sm:text-lg">
                  {institution.description}
                </p>
              ) : (
                <p className="text-[15px] leading-relaxed text-slate-500 sm:text-lg">
                  No description has been published for this institution yet.
                </p>
              )}
            </section>

            {/* Programs */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-700" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">Offered Programs</h2>
              </div>
              
              <div className="grid gap-4">
                {programs.length > 0 ? programs.map((program: any) => (
                  <Link to={`/programs/${program.slug}`} key={program.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-md">
                          {program.program_type?.replace(/_/g, ' ') || 'PROGRAM'}
                        </span>
                        {program.duration && (
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-md">
                            {program.duration}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{program.title}</h3>
                      <p className="text-sm font-medium text-slate-500 line-clamp-1">{program.short_description}</p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center text-indigo-600 font-bold text-sm shrink-0">
                      View Program <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                )) : (
                  <p className="text-slate-500 italic">No programs currently available for this institution.</p>
                )}
              </div>
            </section>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            
            {/* Quick Stats */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-semibold text-slate-900 text-lg">Institution Overview</h3>
              <ul className="space-y-4">
                {institution.country && (
                  <li className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Location</span>
                    <span className="font-bold text-slate-900">{institution.country}</span>
                  </li>
                )}
                <li className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-sm font-medium">Total Programs</span>
                  <span className="font-bold text-slate-900">{programs.length}</span>
                </li>
                {institution.website && (
                  <li className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Website</span>
                    <a href={institution.website} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">Visit Site</a>
                  </li>
                )}
              </ul>
              {institution.website && (
                <a href={institution.website} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button variant="primary" className="w-full justify-center">
                    Visit Website
                  </Button>
                </a>
              )}
            </div>

          </div>

        </div>
      </div>
    </MainLayout>
  );
};
