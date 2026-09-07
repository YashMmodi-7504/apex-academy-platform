import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
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
  Target, 
  ChevronRight, 
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  const [activeSlug, setActiveSlug] = useState('data-scientist');

  if (!isOpen) return null;

  const currentDomain = CAREER_DOMAINS.find(d => d.slug === activeSlug) || CAREER_DOMAINS[0];
  const ActiveIcon = DOMAIN_ICON_MAP[currentDomain.iconName] || BarChart3;

  return (
    <div 
      className="absolute top-full left-0 w-full bg-white shadow-xl border-b border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      onMouseLeave={onClose}
    >
      <div className="apex-container-wide py-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-slate-900 text-sm tracking-wide">Explore Career Domains ({CAREER_DOMAINS.length})</span>
          </div>
          <Link 
            to="/programs" 
            onClick={onClose}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All Learning Programs
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-6 min-h-[360px]">
          {/* Domain Sidebar List */}
          <div className="col-span-5 bg-slate-50 p-2 rounded-xl border border-slate-200/60 max-h-[380px] overflow-y-auto space-y-1">
            {CAREER_DOMAINS.map((domain) => {
              const IconComp = DOMAIN_ICON_MAP[domain.iconName] || BarChart3;
              const isActive = activeSlug === domain.slug;
              return (
                <button
                  key={domain.id}
                  onMouseEnter={() => setActiveSlug(domain.slug)}
                  onClick={() => setActiveSlug(domain.slug)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                    <span className="truncate">{domain.name}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>

          {/* Selected Domain Preview Card */}
          <div className="col-span-7 flex flex-col justify-between bg-linear-to-br from-indigo-50 via-white to-slate-50 text-slate-900 border border-slate-200 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-300/25 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 text-xs font-bold shadow-xs">
                  <ActiveIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{currentDomain.badge}</span>
                </div>
                <span className="text-xs text-amber-700 font-semibold">Apex Career Domain</span>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{currentDomain.name}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{currentDomain.description}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Target Career Roles:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentDomain.targetRoles.map((role, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded-md bg-white text-slate-700 border border-slate-200 font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Core Tools & Technologies:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentDomain.keyTools.map((tool, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-200 flex items-center justify-between mt-4">
              <span className="text-xs text-slate-500">Explore domain overview & training path</span>
              <Link
                to={`/domains/${currentDomain.slug}`}
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <span>View Domain Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

