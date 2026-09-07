import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { SectionHeader } from '../../components/common/SectionHeader.tsx';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';
import {
  Target,
  Users,
  FileEdit,
  Briefcase,
  ArrowRight,
  Route,
  Award,
  Mail,
} from 'lucide-react';

const SERVICES = [
  {
    icon: FileEdit,
    title: 'Resume and portfolio review',
    desc: 'Structured feedback on how you present your projects, so your work reads clearly to a technical reviewer.',
  },
  {
    icon: Users,
    title: 'Mentor conversations',
    desc: 'Talk through your target role, the gaps to close and the order to close them in.',
  },
  {
    icon: Target,
    title: 'Interview preparation',
    desc: 'Practice the technical and behavioural questions that come up for the roles you are applying to.',
  },
  {
    icon: Briefcase,
    title: 'Role-focused guidance',
    desc: 'Advice matched to the specific career domain you are training for, rather than generic job-search tips.',
  },
];

const STEPS = [
  {
    icon: Route,
    title: 'Pick a career domain',
    desc: 'Choose the role you are working towards from the domains on the platform.',
  },
  {
    icon: Award,
    title: 'Complete the pathway',
    desc: 'Work through the foundation and specialisation courses that make up that path.',
  },
  {
    icon: Briefcase,
    title: 'Prepare to apply',
    desc: 'Use the review, mentoring and interview preparation support as you start applying.',
  },
];

export const CareerSupportPage: React.FC = () => {
  const domainCount = CAREER_DOMAINS.length;

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="apex-hero">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-violet-400/15 blur-3xl"
        />

        <div className="relative apex-container py-16 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-xs">
              Career support
            </span>

            <h1 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Support for the step from{' '}
              <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                learning to applying
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Career support sits alongside the curriculum: guidance on how you present your work,
              what to prepare for, and which pathway leads to the role you are aiming at.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/programs" className="inline-block">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  iconRight={<ArrowRight className="h-4 w-4" />}
                >
                  Browse career paths
                </Button>
              </Link>
              <a href="mailto:careers@apexacademy.com" className="inline-block">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  icon={<Mail className="h-4 w-4" />}
                  
                >
                  Talk to the team
                </Button>
              </a>
            </div>

            <p className="mt-6 text-[13px] text-slate-600">
              {domainCount} career domains covered across the platform.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section className="bg-white">
        <div className="apex-container py-16 lg:py-20">
          <SectionHeader
            eyebrow="What is included"
            title="Support that runs alongside your course"
            description="Practical help with the parts of a job search that sit outside the curriculum."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {SERVICES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg sm:p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it fits together ---------- */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="apex-container py-16 lg:py-20">
          <SectionHeader
            eyebrow="How it works"
            title="Three steps, in order"
            description="Career support is most useful once you have work to talk about, so it follows the curriculum rather than replacing it."
          />

          <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-indigo-600">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="bg-white">
        <div className="apex-container py-16 lg:py-20">
          <div className="apex-cta-panel apex-on-accent rounded-2xl px-6 py-12 text-center sm:px-12 lg:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Not sure which path fits?
              </h2>
              <p className="mt-4 text-sm leading-relaxed sm:text-base">
                Start from the career domains and see the courses each one is built from, or get in
                touch and we will help you narrow it down.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/programs" className="inline-block">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    iconRight={<ArrowRight className="h-4 w-4" />}
                  >
                    Explore career paths
                  </Button>
                </Link>
                <Link to="/free-courses" className="inline-block">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    
                  >
                    See all courses
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
