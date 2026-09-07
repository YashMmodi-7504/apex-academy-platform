import React from 'react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '../../components/layout/StudentLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Card } from '../../components/common/Card.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { BookOpen, ArrowRight, CheckSquare } from 'lucide-react';

/**
 * Assessments are taken inside the course player, where they are served and
 * graded by the server (module quizzes and the final assessment).
 *
 * This route previously rendered a self-contained mock quiz: hardcoded
 * questions, the answer key shipped in the client bundle, grading done in the
 * browser, and a results screen that claimed "Backend verification recorded"
 * and offered to claim a certificate. None of that was real, so it has been
 * replaced with a pointer to the actual flow rather than left to mislead.
 */
export const AssessmentPage: React.FC = () => (
  <StudentLayout>
    <div className="mx-auto max-w-2xl">
      <Card className="p-0">
        <EmptyState
          icon={<CheckSquare className="h-6 w-6" />}
          title="Assessments are taken inside your course"
          description="Open a course you are enrolled in — module assessments unlock as you finish each module's lessons, and the final assessment appears in the course content panel."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/student/my-learning">
                <Button variant="primary" iconRight={<ArrowRight className="h-4 w-4" />}>
                  Go to my learning
                </Button>
              </Link>
              <Link to="/free-courses">
                <Button variant="outline" icon={<BookOpen className="h-4 w-4" />}>
                  Browse courses
                </Button>
              </Link>
            </div>
          }
        />
      </Card>
    </div>
  </StudentLayout>
);
