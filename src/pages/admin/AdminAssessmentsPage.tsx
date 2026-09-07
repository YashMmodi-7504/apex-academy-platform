import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import { AdminStatCard } from '../../components/admin/AdminStatCard.tsx';
import {
  AdminTable,
  AdminTableCard,
  AdminTableFooter,
  AdminTableScroll,
  AdminTableToolbar,
  AdminTbody,
  AdminTd,
  AdminTh,
  AdminThead,
  AdminTr,
} from '../../components/admin/AdminTable.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Input } from '../../components/common/Input.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { TableSkeleton } from '../../components/common/Skeleton.tsx';
import { fetchAdminAssessments, generateQuizFromMaterial } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Search,
  CheckSquare,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';

export const AdminAssessmentsPage: React.FC = () => {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI generation dialog state — replaces the previous window.prompt()/alert() flow.
  const [genTarget, setGenTarget] = useState<any | null>(null);
  const [materialId, setMaterialId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    loadAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  async function loadAssessments() {
    const token = session?.access_token;
    if (!token) return;
    try {
      const res = await fetchAdminAssessments(token);
      if (res?.success) {
        setAssessments(res.data || []);
        setError(null);
      } else {
        setError(res?.error || 'Assessments could not be loaded.');
      }
    } catch (err: any) {
      setError(err?.message || 'Assessments could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateAI = async () => {
    const token = session?.access_token;
    if (!token || !genTarget || !materialId.trim()) return;

    setGenerating(true);
    setGenResult(null);
    try {
      const res = await generateQuizFromMaterial(token, materialId.trim(), genTarget.id, 5);
      if (res?.success) {
        setGenResult({ ok: true, message: 'Quiz generated and attached to this assessment.' });
        loadAssessments();
      } else {
        setGenResult({ ok: false, message: res?.error || 'Generation failed.' });
      }
    } catch (err: any) {
      setGenResult({ ok: false, message: err?.message || 'Generation failed.' });
    } finally {
      setGenerating(false);
    }
  };

  const closeGenDialog = () => {
    setGenTarget(null);
    setMaterialId('');
    setGenResult(null);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return assessments;
    return assessments.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) || item.courses?.title?.toLowerCase().includes(q)
    );
  }, [assessments, searchTerm]);

  // Counts derived from the loaded rows only.
  const publishedCount = assessments.filter((a) => a.is_published).length;
  const linkedCount = assessments.filter((a) => a.courses?.title).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Assessments"
          description="Quizzes and final assessments defined against courses, with their publication state."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminStatCard
            label="Assessments"
            value={loading || error ? undefined : assessments.length}
            icon={<CheckSquare className="h-5 w-5" />}
            tone="indigo"
          />
          <AdminStatCard
            label="Published"
            value={loading || error ? undefined : publishedCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="emerald"
          />
          <AdminStatCard
            label="Linked to a course"
            value={loading || error ? undefined : linkedCount}
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="amber"
          />
        </div>

        <AdminTableCard>
          <AdminTableToolbar>
            <Input
              placeholder="Search by assessment or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              aria-label="Search assessments"
            />
          </AdminTableToolbar>

          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} cols={5} />
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Assessments could not be loaded"
              description={error}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-6 w-6" />}
              title={searchTerm ? 'No assessments match that search' : 'No assessments yet'}
              description={
                searchTerm
                  ? 'Try a different assessment or course title.'
                  : 'Assessments created against a course will be listed here.'
              }
            />
          ) : (
            <>
              <AdminTableScroll>
                <AdminTable>
                  <AdminThead>
                    <tr>
                      <AdminTh>Assessment</AdminTh>
                      <AdminTh>Course</AdminTh>
                      <AdminTh>Type</AdminTh>
                      <AdminTh>Status</AdminTh>
                      <AdminTh align="right">Actions</AdminTh>
                    </tr>
                  </AdminThead>
                  <AdminTbody>
                    {filtered.map((item) => (
                      <AdminTr key={item.id}>
                        <AdminTd className="font-semibold text-slate-900">
                          <span className="block max-w-70 truncate">{item.title}</span>
                        </AdminTd>
                        <AdminTd className="text-slate-600">
                          <span className="block max-w-70 truncate">
                            {item.courses?.title || 'Not linked'}
                          </span>
                        </AdminTd>
                        <AdminTd>
                          <Badge variant="neutral">{item.assessment_type || '—'}</Badge>
                        </AdminTd>
                        <AdminTd>
                          <Badge variant={item.is_published ? 'success' : 'warning'} dot>
                            {item.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </AdminTd>
                        <AdminTd align="right">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Sparkles className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setGenTarget(item);
                              setGenResult(null);
                              setMaterialId('');
                            }}
                          >
                            Generate
                          </Button>
                        </AdminTd>
                      </AdminTr>
                    ))}
                  </AdminTbody>
                </AdminTable>
              </AdminTableScroll>
              <AdminTableFooter>
                <span>
                  Showing {filtered.length} of {assessments.length}
                </span>
              </AdminTableFooter>
            </>
          )}
        </AdminTableCard>
      </div>

      <Modal
        open={!!genTarget}
        onClose={closeGenDialog}
        title="Generate questions from a course material"
        description={
          genTarget ? `Five questions will be added to "${genTarget.title}".` : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={closeGenDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Sparkles className="h-4 w-4" />}
              loading={generating}
              disabled={!materialId.trim() || generating}
              onClick={handleGenerateAI}
            >
              {generating ? 'Generating' : 'Generate 5 questions'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Course material ID"
            placeholder="Paste the material ID"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            helperText="Copy the ID from the Course Materials page."
            autoFocus
          />
          {genResult && (
            <div
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-[13px] ${
                genResult.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {genResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{genResult.message}</span>
            </div>
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
};
