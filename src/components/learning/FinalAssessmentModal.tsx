import React, { useState, useEffect } from 'react';
import { getAuthTokenAsync } from '../../lib/supabaseClient.ts';
import { Button } from '../common/Button.tsx';
import { 
  Award, 
  Lock, 
  RotateCcw, 
  X,
  AlertCircle
} from 'lucide-react';

interface FinalAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
  onAssessmentCompleted?: () => void;
}

export const FinalAssessmentModal: React.FC<FinalAssessmentModalProps> = ({
  isOpen,
  onClose,
  courseSlug,
  onAssessmentCompleted
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [locked, setLocked] = useState<boolean>(false);
  const [lockReason, setLockReason] = useState<string>('');
  const [assessment, setAssessment] = useState<any>(null);
  
  // Quiz taking state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  // Submit failures render inline instead of in a browser alert() box.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

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
        const res = await fetch(`/api/learn/${courseSlug}/final-assessment`, { headers });
        const data = await res.json();

        if (data.success) {
          if (data.locked) {
            setLocked(true);
            setLockReason(data.reason || 'Complete all 11 modules and pass all module assessments first.');
          } else {
            setLocked(false);
            setAssessment(data.assessment);
          }
        } else {
          setLocked(true);
          setLockReason(data.error || 'Failed to load final assessment.');
        }
      } catch (err) {
        console.error('Failed to fetch final assessment:', err);
        setLocked(true);
        setLockReason('Network error fetching final assessment.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [isOpen, courseSlug]);

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
      const res = await fetch(`/api/learn/${courseSlug}/final-assessment/submit`, {
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
      } else {
        setSubmitError(data.error || 'Your answers could not be submitted. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit final assessment:', err);
      setSubmitError('We could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = assessment?.questions?.length || 30;
  const allAnswered = answeredCount >= totalQuestions;
  // Pass mark comes from the assessment record, not a hardcoded figure.
  const passMark = assessment?.passing_percentage ?? 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        
        {/* Header */}
        <div className="bg-amber-50 text-amber-950 p-6 flex items-center justify-between border-b border-amber-200">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-semibold text-[10px] tracking-wider uppercase">
              FINAL COMPREHENSIVE EXAMINATION
            </span>
            <h3 className="text-xl font-semibold text-amber-950">Course Final Assessment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-amber-100 rounded-xl text-amber-700 hover:text-amber-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading 30 Final Assessment Questions...</p>
            </div>
          ) : locked ? (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-slate-900">Final Assessment Locked</h4>
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
                  {result.passed ? 'FINAL COURSE ASSESSMENT PASSED!' : 'FINAL ASSESSMENT NOT PASSED'}
                </h4>

                <p className="text-xs font-medium max-w-md mx-auto">
                  {result.passed
                    ? `Outstanding achievement! You scored ${result.percentage}% (${result.score}/${result.max_score}). You have satisfied all academic requirements for this course.`
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

              {/* Detailed Review Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Comprehensive Question Review (30 Questions)
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
                    <span>Retry Final Assessment</span>
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
                  {result.passed ? 'View Course Certificate & Complete' : 'Close Exam Window'}
                </Button>
              </div>

            </div>
          ) : (
            /* QUIZ TAKING SCREEN */
            <div className="space-y-8">
              
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-medium">
                <div>
                  <span className="font-semibold block text-amber-900">Final Comprehensive Examination</span>
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
                    <div className="flex items-center justify-between text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                      <span>Module {q.module_number} Concept</span>
                      <span>Question {qIdx + 1} of 30</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {q.question_text}
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
                                ? 'border-amber-600 bg-amber-50/90 text-amber-950 font-semibold shadow-2xs'
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
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
                  {allAnswered ? `All ${totalQuestions} questions answered. Ready to submit final exam!` : `Please answer remaining ${totalQuestions - answeredCount} questions.`}
                </span>

                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold bg-amber-600 hover:bg-amber-500 border-amber-700 text-white"
                  onClick={handleSubmitAssessment}
                  disabled={!allAnswered || submitting}
                >
                  {submitting ? 'Grading Final Exam...' : 'Submit Final Assessment'}
                </Button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
