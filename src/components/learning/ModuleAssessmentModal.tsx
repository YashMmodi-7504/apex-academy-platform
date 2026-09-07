import React, { useState, useEffect } from 'react';
import { getAuthTokenAsync } from '../../lib/supabaseClient.ts';
import { Button } from '../common/Button.tsx';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  HelpCircle, 
  RotateCcw, 
  X,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

interface ModuleAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
  moduleId: string;
  moduleTitle: string;
  onAssessmentCompleted?: () => void;
}

export const ModuleAssessmentModal: React.FC<ModuleAssessmentModalProps> = ({
  isOpen,
  onClose,
  courseSlug,
  moduleId,
  moduleTitle,
  onAssessmentCompleted
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [locked, setLocked] = useState<boolean>(false);
  const [lockReason, setLockReason] = useState<string>('');
  const [assessment, setAssessment] = useState<any>(null);
  const [userAttempts, setUserAttempts] = useState<any[]>([]);
  const [isPassed, setIsPassed] = useState<boolean>(false);
  
  // Quiz taking state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  // Submit failures render inline instead of in a browser alert() box.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !moduleId) return;

    const fetchAssessment = async () => {
      setLoading(true);
      setResult(null);
      setSelectedAnswers({});

      try {
        const token = await getAuthTokenAsync();
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/learn/${courseSlug}/modules/${moduleId}/assessment`, { headers });
        const data = await res.json();

        if (data.success) {
          if (data.locked) {
            setLocked(true);
            setLockReason(data.reason || 'Complete all required module lessons first.');
          } else {
            setLocked(false);
            setAssessment(data.assessment);
            setUserAttempts(data.userAttempts || []);
            setIsPassed(data.isPassed || false);
          }
        } else {
          setLocked(true);
          setLockReason(data.error || 'Failed to load assessment.');
        }
      } catch (err) {
        console.error('Failed to fetch module assessment:', err);
        setLocked(true);
        setLockReason('Network error fetching assessment.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [isOpen, moduleId, courseSlug]);

  if (!isOpen) return null;

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmitAssessment = async () => {
    if (!assessment) return;
    setSubmitting(true);
    setSubmitError(null);

    const answersArray = Object.entries(selectedAnswers).map(([qId, oId]) => ({
      question_id: qId,
      option_id: oId
    }));

    try {
      const token = await getAuthTokenAsync();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/learn/${courseSlug}/modules/${moduleId}/assessment/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          assessment_id: assessment.id,
          answers: answersArray
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
        if (data.passed) {
          setIsPassed(true);
        }
      } else {
        setSubmitError(data.error || 'Your answers could not be submitted. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      setSubmitError('We could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = assessment?.questions?.length || 10;
  const allAnswered = answeredCount >= totalQuestions;
  // Pass mark comes from the assessment record, not a hardcoded figure.
  const passMark = assessment?.passing_percentage ?? 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        
        {/* Header */}
        <div className="bg-white text-slate-900 p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-semibold text-[10px] tracking-wider uppercase">
              MODULE ASSESSMENT
            </span>
            <h3 className="text-lg font-semibold text-slate-900">{moduleTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading Assessment Questions...</p>
            </div>
          ) : locked ? (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-slate-900">Assessment Locked</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{lockReason}</p>
              </div>
              <Button variant="outline" size="sm" onClick={onClose} className="font-bold">
                Close
              </Button>
            </div>
          ) : result ? (
            /* RESULTS SCREEN */
            <div className="space-y-8">
              
              {/* Top Banner */}
              <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                result.passed 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto text-2xl font-semibold ${
                  result.passed ? 'bg-emerald-700 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {result.passed ? '✓' : '✗'}
                </div>

                <h4 className="text-xl font-semibold">
                  {result.passed ? 'MODULE ASSESSMENT PASSED!' : 'ASSESSMENT NOT PASSED'}
                </h4>

                <p className="text-xs font-medium max-w-md mx-auto">
                  {result.passed
                    ? `Great job! You scored ${result.percentage}% (${result.score}/${result.max_score}). You have satisfied the module completion requirement.`
                    : `You scored ${result.percentage}% (${result.score}/${result.max_score}). Passing requirement is ${result.passing_percentage}%. You may review your answers below and retry.`}
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Score</span>
                  <span className="text-lg font-semibold text-slate-900">{result.percentage}%</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Correct</span>
                  <span className="text-lg font-semibold text-emerald-700">{result.score} / {result.max_score}</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Passing Req</span>
                  <span className="text-lg font-semibold text-amber-700">{result.passing_percentage}%</span>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 text-center">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block">Attempt</span>
                  <span className="text-lg font-semibold text-indigo-700">#{result.attempt_number}</span>
                </div>
              </div>

              {/* Question Review Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Question Detailed Review
                </h5>

                <div className="space-y-4 divide-y divide-slate-100">
                  {result.details?.map((detail: any, idx: number) => (
                    <div key={detail.question_id} className="pt-4 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2 font-bold text-slate-900">
                        <span>Q{idx + 1}. {detail.question_text}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          detail.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {detail.is_correct ? 'CORRECT ✓' : 'INCORRECT'}
                        </span>
                      </div>

                      <p className="text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed border border-slate-200">
                        <strong className="text-slate-900">Explanation: </strong>{detail.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                {!result.passed && (
                  <Button
                    variant="primary"
                    size="md"
                    className="font-bold flex items-center gap-1.5"
                    onClick={() => {
                      setResult(null);
                      setSelectedAnswers({});
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Assessment</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    if (onAssessmentCompleted) {
                      onAssessmentCompleted();
                    }
                    onClose();
                  }}
                  className="font-bold ml-auto"
                >
                  {result.passed ? 'Continue to Next Module' : 'Close'}
                </Button>
              </div>

            </div>
          ) : (
            /* QUIZ TAKING SCREEN */
            <div className="space-y-8">
              
              <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between text-xs text-indigo-950 font-medium">
                <div>
                  <span className="font-semibold block text-indigo-900">Module Graded Quiz</span>
                  <span>Answer all {totalQuestions} questions. Passing score is {passMark}%.</span>
                </div>
                <div className="text-right font-bold">
                  <span>Answered: {answeredCount} / {totalQuestions}</span>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-8 divide-y divide-slate-100">
                {assessment?.questions?.map((q: any, qIdx: number) => (
                  <div key={q.id} className="pt-6 first:pt-0 space-y-3">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      <span className="text-indigo-600 font-semibold mr-1">Q{qIdx + 1}.</span> {q.question_text}
                    </h4>

                    <div className="space-y-2">
                      {q.options?.map((opt: any) => {
                        const isSelected = selectedAnswers[q.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.id)}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center gap-3 ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold shadow-2xs'
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                            </span>
                            <span>{opt.option_text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[13px] text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {allAnswered ? `All ${totalQuestions} questions answered. Ready to submit!` : `Please answer remaining ${totalQuestions - answeredCount} questions.`}
                </span>

                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold"
                  onClick={handleSubmitAssessment}
                  disabled={!allAnswered || submitting}
                >
                  {submitting ? 'Grading Assessment...' : 'Submit Assessment'}
                </Button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
