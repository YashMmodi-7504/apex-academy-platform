import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { SectionHeader } from '../../components/common/SectionHeader.tsx';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';
import {
  Building2,
  BookOpen,
  Presentation,
  GraduationCap,
  Mail,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const BENEFITS = [
  {
    icon: BookOpen,
    title: 'Ready-made curriculum',
    desc: 'Structured courses across data, AI and analytics that can be dropped into an existing programme rather than built from scratch.',
  },
  {
    icon: Presentation,
    title: 'Cohort learning environment',
    desc: 'Students work through the same modules and lessons, with per-lesson progress tracked for every learner.',
  },
  {
    icon: GraduationCap,
    title: 'Verifiable certificates',
    desc: 'Each completion issues a certificate with a public verification code your department can check independently.',
  },
];

export const InstitutionsPage: React.FC = () => {
  const domainCount = CAREER_DOMAINS.length;

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="border-b border-slate-200 bg-white">
        <div className="apex-container py-16 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="mt-6 block text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600">
              For institutions
            </span>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Industry curriculum, ready for your programme
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base">
              Bring the same data, AI and analytics curriculum learners use on Apex Academy into your
              own courses, with progress tracking and verifiable certification built in.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="mailto:partnerships@apexacademy.com" className="inline-block">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Mail className="h-4 w-4" />}
                >
                  Contact partnerships
                </Button>
              </a>
              <Link to="/programs" className="inline-block">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  iconRight={<ArrowRight className="h-4 w-4" />}
                >
                  See the curriculum
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Benefits ---------- */}
      <section className="bg-slate-50">
        <div className="apex-container py-16 lg:py-20">
          <SectionHeader
            eyebrow="Why partner"
            title="What your department gets"
            description="A curriculum and delivery platform, not a course library your students have to navigate alone."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-2xl font-semibold tabular-nums text-slate-900">{domainCount}</div>
              <div className="mt-1 text-[13px] text-slate-500">Career domains</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-2xl font-semibold text-slate-900">Self&#8209;paced</div>
              <div className="mt-1 text-[13px] text-slate-500">Delivery format</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-500" />
                Verified
              </div>
              <div className="mt-1 text-[13px] text-slate-500">Public certificate lookup</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className="bg-white">
        <div className="apex-container py-16 lg:py-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Talk to the partnerships team
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Tell us which programmes you are running and which roles your students are heading
              into, and we will map that to the right sequence of courses.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="mailto:partnerships@apexacademy.com" className="inline-block">
                <Button variant="primary" size="lg" fullWidth icon={<Mail className="h-4 w-4" />}>
                  Email partnerships
                </Button>
              </a>
              <Link to="/enterprise" className="inline-block">
                <Button variant="outline" size="lg" fullWidth>
                  Enterprise training
                </Button>
              </Link>
            </div>
            <p className="mt-5 break-all text-[13px] text-slate-500">
              partnerships@apexacademy.com
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
