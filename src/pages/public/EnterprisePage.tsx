import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { SectionHeader } from '../../components/common/SectionHeader.tsx';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
  Users,
  Award,
  Route,
  BarChart3,
  ArrowRight,
  Mail,
} from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: Route,
    title: 'Role-aligned learning paths',
    desc: 'Assign structured career tracks that map to the roles you are hiring for, built from the same curriculum learners use today.',
  },
  {
    icon: Zap,
    title: 'Practical, project-led curriculum',
    desc: 'Modules combine guided video lessons with applied exercises and capstone work, so skills transfer directly into delivery.',
  },
  {
    icon: Award,
    title: 'Verifiable certification',
    desc: 'Every completion issues a certificate with a public verification code your teams and clients can independently check.',
  },
  {
    icon: BarChart3,
    title: 'Progress visibility',
    desc: 'Module and lesson level progress is tracked per learner, giving managers a clear view of where each person stands.',
  },
  {
    icon: Users,
    title: 'Cohort onboarding',
    desc: 'Bring a whole team onto the same path so new joiners and existing staff share one consistent skills baseline.',
  },
  {
    icon: ShieldCheck,
    title: 'Managed rollout',
    desc: 'We work with you on curriculum selection, sequencing and rollout rather than handing over a course library.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Scope the skills gap', desc: 'We map your target roles against the eleven career domains on the platform.' },
  { step: '02', title: 'Select the pathway', desc: 'Foundation and specialisation courses are sequenced into a path per role.' },
  { step: '03', title: 'Enrol your teams', desc: 'Learners work through modules at their own pace with progress tracked throughout.' },
  { step: '04', title: 'Certify and review', desc: 'Completion issues verifiable certificates; you review coverage and plan the next cycle.' },
];

export const EnterprisePage: React.FC = () => {
  const domainCount = CAREER_DOMAINS.length;

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="apex-hero">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-violet-400/15 blur-3xl" />

        <div className="relative apex-container py-16 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-xs">
                For Enterprise
              </span>

              <h1 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Upskill your workforce for the{' '}
                <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  AI era
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Structured training across data, AI and analytics — delivered as role-aligned career
                paths with tracked progress and verifiable certification for every learner.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="mailto:enterprise@apexacademy.com" className="inline-block">
                  <Button variant="primary" size="lg" fullWidth iconRight={<ArrowRight className="h-4 w-4" />}>
                    Contact Sales
                  </Button>
                </a>
                <Link to="/programs" className="inline-block">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    
                  >
                    Browse Career Paths
                  </Button>
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[13px] text-slate-600">
                {['Role-aligned pathways', 'Progress tracking', 'Verifiable certificates'].map((t) => (
                  <li key={t} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Real, derived figures only */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600">
                  What your teams get access to
                </p>
                <div className="mt-6 grid grid-cols-2 gap-5">
                  <div>
                    <div className="text-3xl font-semibold text-slate-900">{domainCount}</div>
                    <div className="mt-1 text-[13px] text-slate-600">Career domains</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-slate-900">Self&#8209;paced</div>
                    <div className="mt-1 text-[13px] text-slate-600">Learning format</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-slate-900">Tracked</div>
                    <div className="mt-1 text-[13px] text-slate-600">Per-lesson progress</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-slate-900">Verified</div>
                    <div className="mt-1 text-[13px] text-slate-600">Certificate lookup</div>
                  </div>
                </div>
                <div className="mt-7 border-t border-slate-200 pt-5">
                  <Link
                    to="/programs"
                    className="group inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                  >
                    See the full curriculum
                    <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Value props ---------- */}
      <section className="bg-white">
        <div className="apex-container py-16 lg:py-20">
          <SectionHeader
            eyebrow="Why Apex Academy"
            title="Training built around roles, not a course library"
            description="Teams learn along a defined path with a clear endpoint, rather than picking courses at random."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="apex-container py-16 lg:py-20">
          <SectionHeader
            eyebrow="How it works"
            title="From skills gap to certified team"
            description="A straightforward rollout you can run per role, per team or across the organisation."
          />

          <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s) => (
              <li key={s.step} className="relative rounded-xl border border-slate-200 bg-white p-6">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-indigo-600">{s.step}</span>
                <h3 className="mt-3 text-[15px] font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="bg-white">
        <div className="apex-container py-16 lg:py-20">
          <div className="apex-cta-panel apex-on-accent rounded-2xl px-6 py-12 text-center sm:px-12 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Let&rsquo;s scope your team&rsquo;s learning path
              </h2>
              <p className="mt-4 text-sm leading-relaxed sm:text-base">
                Tell us the roles you are building for and we will map them to the right sequence of
                foundation and specialisation courses.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a href="mailto:enterprise@apexacademy.com" className="inline-block">
                  <Button variant="primary" size="lg" fullWidth icon={<Mail className="h-4 w-4" />}>
                    Contact Sales
                  </Button>
                </a>
                <Link to="/career-support" className="inline-block">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    
                  >
                    Explore Career Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
