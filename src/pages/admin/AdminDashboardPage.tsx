import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import { AdminStatCard } from '../../components/admin/AdminStatCard.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  fetchAdminCertificates,
  fetchAdminCourses,
  fetchAdminInquiries,
  fetchAdminStudents,
} from '../../services/api.ts';
import {
  Users,
  BookOpen,
  Award,
  MessageSquare,
  ArrowRight,
  Layers,
  FolderOpen,
  CheckSquare,
} from 'lucide-react';

/** Every figure below is a count of rows actually returned by the admin API. */
interface Counts {
  students?: number;
  courses?: number;
  published?: number;
  certificates?: number;
  inquiries?: number;
  openInquiries?: number;
}

const QUICK_LINKS = [
  { to: '/admin/curriculum', label: 'Curriculum', desc: 'Modules, lessons and publishing', icon: Layers },
  { to: '/admin/materials', label: 'Course Materials', desc: 'Uploads and extracted content', icon: FolderOpen },
  { to: '/admin/assessments', label: 'Assessments', desc: 'Quizzes and question banks', icon: CheckSquare },
  { to: '/admin/inquiries', label: 'Inquiries', desc: 'Counselling and enterprise leads', icon: MessageSquare },
];

export const AdminDashboardPage: React.FC = () => {
  const { session } = useAuth();
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = session?.access_token;
      if (!token) return;
      // Settled, not all-or-nothing: one failing endpoint must not blank the others.
      const [students, courses, certificates, inquiries] = await Promise.all([
        fetchAdminStudents(token).catch(() => null),
        fetchAdminCourses(token).catch(() => null),
        fetchAdminCertificates(token).catch(() => null),
        fetchAdminInquiries(token).catch(() => null),
      ]);
      if (cancelled) return;

      const courseRows: any[] = courses?.success ? courses.courses || courses.data || [] : [];
      const inquiryRows: any[] = inquiries?.success ? inquiries.data || [] : [];

      setCounts({
        students: students?.success ? (students.data || []).length : undefined,
        courses: courses?.success ? courseRows.length : undefined,
        published: courses?.success
          ? courseRows.filter((c) => c.status === 'PUBLISHED' || c.is_published).length
          : undefined,
        certificates: certificates?.success ? (certificates.data || []).length : undefined,
        inquiries: inquiries?.success ? inquiryRows.length : undefined,
        openInquiries: inquiries?.success
          ? inquiryRows.filter((i) => i.status && i.status !== 'CLOSED').length
          : undefined,
      });
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Platform overview"
          description="Live counts read from the admin API. Figures show a dash where the data is not available."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-26 rounded-xl" />
            ))
          ) : (
            <>
              <AdminStatCard
                label="Students"
                value={counts.students}
                tone="blue"
                icon={<Users className="h-5 w-5" />}
                hint="Profiles with the STUDENT role"
              />
              <AdminStatCard
                label="Courses"
                value={counts.courses}
                tone="indigo"
                icon={<BookOpen className="h-5 w-5" />}
                hint={
                  counts.published !== undefined && counts.courses !== undefined
                    ? `${counts.published} published`
                    : undefined
                }
              />
              <AdminStatCard
                label="Certificates issued"
                value={counts.certificates}
                tone="emerald"
                icon={<Award className="h-5 w-5" />}
                hint="Includes revoked records"
              />
              <AdminStatCard
                label="Inquiries"
                value={counts.inquiries}
                tone="purple"
                icon={<MessageSquare className="h-5 w-5" />}
                hint={
                  counts.openInquiries !== undefined ? `${counts.openInquiries} not closed` : undefined
                }
              />
            </>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Jump to
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_LINKS.map(({ to, label, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900">
                    <span className="truncate">{label}</span>
                    <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-500" />
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
