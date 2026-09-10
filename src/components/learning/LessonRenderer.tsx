import React, { useState, useEffect, useRef } from 'react';
import { LessonResources } from './LessonResources.tsx';
import { YouTubeLessonPlayer } from './YouTubeLessonPlayer.tsx';
import { getAuthTokenAsync } from '../../lib/supabaseClient.ts';
import { sanitizeLessonHtml, looksLikeHtml } from '../../utils/sanitizeHtml.ts';
import { formatLessonDuration } from '../../utils/duration.ts';
import {
  Play,
  CheckCircle2,
  Clock,
  FileText,
  Copy,
  Check,
  Target,
  Lightbulb,
  BookOpen,
  HelpCircle,
  XCircle,
  Volume2,
  Settings
} from 'lucide-react';

interface LessonRendererProps {
  courseSlug?: string;
  lesson: {
    id: string;
    title: string;
    description?: string;
    lesson_type: string;
    content?: string;
    video_url?: string;
    duration_seconds?: number;
    is_required?: boolean;
    learning_objectives?: string[] | null;
    key_takeaways?: string[] | null;
    practical_instructions?: string | null;
  };
  resources: any[];
  progress: {
    status: string;
    last_position_seconds?: number;
    watch_percentage?: number;
  };
  onUpdateProgress: (progressData: { last_position_seconds: number; watch_percentage?: number }) => void;
  onCompleteLesson: () => void;
  isCompleting?: boolean;
}

export const LessonRenderer: React.FC<LessonRendererProps> = ({
  courseSlug = 'statistics-data-analytics',
  lesson,
  resources,
  progress,
  onUpdateProgress,
  onCompleteLesson,
  isCompleting,
}) => {
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [videoTime, setVideoTime] = useState<number>(progress.last_position_seconds || 0);
  const [videoDuration, setVideoDuration] = useState<number>(lesson.duration_seconds || 300);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Knowledge Checkpoint state
  const [checkpoint, setCheckpoint] = useState<any>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{ is_correct: boolean; explanation: string; correct_option_id?: string } | null>(null);
  const [isSubmittingCheckpoint, setIsSubmittingCheckpoint] = useState<boolean>(false);

  const lastSavedTimeRef = useRef<number>(progress.last_position_seconds || 0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isCompleted = progress.status === 'COMPLETED';
  const subtitleTrack = resources?.find((r: any) => r.resource_type === 'SUBTITLE');

  useEffect(() => {
    setVideoTime(progress.last_position_seconds || 0);
    lastSavedTimeRef.current = progress.last_position_seconds || 0;
  }, [lesson.id, progress.last_position_seconds]);

  // Fetch Checkpoint for ARTICLE and VIDEO lessons
  useEffect(() => {
    setSubmissionResult(null);
    setSelectedOptionId(null);

    const fetchCheckpoint = async () => {
      try {
        const token = await getAuthTokenAsync();
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/learn/${courseSlug}/lessons/${lesson.id}/checkpoint`, { headers });
        const data = await res.json();
        if (data.success && data.checkpoint) {
          setCheckpoint(data.checkpoint);
          // A recorded answer is final: restore it as a locked result so a
          // refresh or re-visit cannot return the question to an answerable
          // state. `answered` is the server's authoritative lock flag.
          if (data.checkpoint.answered && data.checkpoint.previousAttempt) {
            setSelectedOptionId(data.checkpoint.previousAttempt.selected_option_id);
            setSubmissionResult({
              is_correct: data.checkpoint.previousAttempt.is_correct,
              explanation: data.checkpoint.explanation || '',
              correct_option_id: data.checkpoint.correct_option_id,
            });
          }
        } else {
          setCheckpoint(null);
        }
      } catch (err) {
        console.error('Failed to fetch checkpoint:', err);
      }
    };

    fetchCheckpoint();
  }, [lesson.id, courseSlug]);

  // Only ever populated after submission: the server withholds
  // correct_option_id until an answer has been recorded.
  const correctOptionText = submissionResult?.correct_option_id
    ? checkpoint?.options?.find((o: any) => o.id === submissionResult.correct_option_id)?.option_text
    : undefined;

  const handleSubmitCheckpoint = async () => {
    if (!selectedOptionId || !checkpoint) return;
    setIsSubmittingCheckpoint(true);
    try {
      const token = await getAuthTokenAsync();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/learn/${courseSlug}/lessons/${lesson.id}/checkpoint/attempt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ selected_option_id: selectedOptionId })
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionResult({
          is_correct: data.is_correct,
          explanation: data.explanation,
          correct_option_id: data.correct_option_id
        });
        // Instant student progress trigger on correct checkpoint answer
        if (data.is_correct && !isCompleted) {
          onCompleteLesson();
        }
      } else if (data.already_answered) {
        // The server rejected a second submission. Show the recorded outcome
        // rather than an error, so the UI matches the stored answer.
        if (data.selected_option_id) setSelectedOptionId(data.selected_option_id);
        setSubmissionResult({
          is_correct: Boolean(data.is_correct),
          explanation: data.explanation || '',
          correct_option_id: data.correct_option_id
        });
      }
    } catch (err) {
      console.error('Failed to submit checkpoint attempt:', err);
    } finally {
      setIsSubmittingCheckpoint(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.round(videoRef.current.duration) || lesson.duration_seconds || 300;
      setVideoDuration(dur);

      if (progress.last_position_seconds && progress.last_position_seconds > 0) {
        if (progress.last_position_seconds < dur) {
          videoRef.current.currentTime = progress.last_position_seconds;
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentSec = Math.floor(videoRef.current.currentTime);
      setVideoTime(currentSec);

      if (Math.abs(currentSec - lastSavedTimeRef.current) >= 5) {
        lastSavedTimeRef.current = currentSec;
        const watchPct = videoDuration > 0 ? Math.min(100, Math.round((currentSec / videoDuration) * 100)) : 0;
        onUpdateProgress({
          last_position_seconds: currentSec,
          watch_percentage: watchPct
        });

        if (watchPct >= 90 && !isCompleted) {
          onCompleteLesson();
        }
      }
    }
  };

  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
    if (videoRef.current) {
      const dur = Math.floor(videoRef.current.duration) || videoDuration;
      onUpdateProgress({
        last_position_seconds: dur,
        watch_percentage: 100
      });
      if (!isCompleted) {
        onCompleteLesson();
      }
    }
  };

  const handleCopyText = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  /**
   * Lesson content is admin-authored HTML. It used to be printed as literal
   * text, so learners saw raw `<h2>` / `<div style=...>` markup on the page.
   * It is now sanitised (allowlist) and rendered as markup; plain-text content
   * still falls back to the previous whitespace-preserving treatment.
   */
  const renderLessonBody = (body: string | undefined | null, extraClass = '') => {
    if (!body) return null;
    if (looksLikeHtml(body)) {
      return (
        <div
          className={`apex-lesson-html ${extraClass}`}
          dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(body) }}
        />
      );
    }
    return <div className={`apex-lesson-html whitespace-pre-line ${extraClass}`}>{body}</div>;
  };

  const getYouTubeVideoId = (url: string | undefined | null): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  /**
   * A resource only counts as a playable video when it is an absolute http(s)
   * URL that is either a YouTube link or a real video file. Relative storage
   * paths (e.g. "courses/<id>/.../clip.MP4") are not directly playable — used
   * as a <video src> they resolve against the current route and 404.
   */
  const isPlayableVideoUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return false;
    if (getYouTubeVideoId(u)) return true;
    return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(u);
  };

  // The lesson's own video_url is authoritative. An attached resource is only a
  // fallback for lessons that have no video of their own — previously a stray
  // LINK resource could silently override the lesson's real video.
  // (`resource_type === 'VIDEO'` is unreachable: the column's CHECK constraint
  // allows only PDF/PPT/NOTE/CODE/DATASET/LINK.)
  const attachedVideoResource = resources?.find((r: any) => isPlayableVideoUrl(r.file_url));

  const ytVideoId = getYouTubeVideoId(lesson.video_url) || getYouTubeVideoId(attachedVideoResource?.file_url);
  const nativeVideoUrl =
    (isPlayableVideoUrl(lesson.video_url) ? lesson.video_url : null) || attachedVideoResource?.file_url || null;
  const hasRealVideo = !!ytVideoId || (nativeVideoUrl && nativeVideoUrl.trim().length > 0);

  // Primary Content Renderer
  const renderPrimaryContent = () => {
    // 1. If a video is explicitly attached OR it's a VIDEO type lesson, render the video player
    if (hasRealVideo || lesson.lesson_type?.toUpperCase() === 'VIDEO') {
      const watchPercentage = videoDuration > 0 ? Math.min(100, Math.round((videoTime / videoDuration) * 100)) : 0;

      return (
        <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
          {hasRealVideo ? (
            <div className="relative flex h-full w-full items-center justify-center bg-slate-100">
              {ytVideoId ? (
                <YouTubeLessonPlayer
                  key={ytVideoId}
                  videoId={ytVideoId}
                  lessonTitle={lesson.title}
                  lastPositionSeconds={progress.last_position_seconds || 0}
                  isCompleted={progress.status === 'COMPLETED'}
                  onUpdateProgress={onUpdateProgress}
                  onCompleteLesson={onCompleteLesson}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={nativeVideoUrl!}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full rounded-2xl object-contain"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-white p-8 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                <Play className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No video for this lesson yet</p>
              <p className="mt-1.5 text-xs text-slate-500">
                Continue with the written lesson material below.
              </p>
            </div>
          )}

          {/* Minimal Custom Video Controls (Below the video for native MP4s) */}
          {hasRealVideo && !ytVideoId && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center gap-4 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors focus:outline-none"
              >
                <span className="text-xs">{isVideoPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs font-medium font-mono">
                  {Math.floor(videoTime / 60)}:{Math.floor(videoTime % 60).toString().padStart(2, '0')}
                </span>
                <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${watchPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-medium font-mono opacity-70">
                  {Math.floor(videoDuration / 60)}:{Math.floor(videoDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. Fallback for ARTICLE or PRACTICAL when no video is attached
    return (
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#4f46e5' }}>
          <span className="uppercase tracking-widest">{lesson.lesson_type} MATERIAL</span>
        </div>
        {lesson.content ? (
          renderLessonBody(lesson.content)
        ) : (
          <p className="text-sm leading-relaxed text-slate-500">
            Content for this lesson will be available soon.
          </p>
        )}
      </div>
    );
  };

  const hasObjectives = Array.isArray(lesson.learning_objectives) && lesson.learning_objectives.length > 0;
  const hasTakeaways = Array.isArray(lesson.key_takeaways) && lesson.key_takeaways.length > 0;
  const hasNotes = Boolean(lesson.content && lesson.lesson_type === 'VIDEO');

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── LESSON HEADER (GL-style: title + status + Complete CTA in same row) ── */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Breadcrumb-style lesson type badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              {lesson.lesson_type}
            </span>
            {formatLessonDuration(lesson.duration_seconds) && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatLessonDuration(lesson.duration_seconds)}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {lesson.title}
          </h2>

          {lesson.description && (
            <p className="text-sm text-slate-500 leading-relaxed">{lesson.description}</p>
          )}
        </div>

        <div className="shrink-0 sm:pt-1">
          {isCompleted ? (
            <div className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 sm:w-auto">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>Completed</span>
            </div>
          ) : (
            <button
              onClick={onCompleteLesson}
              disabled={isCompleting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isCompleting ? (
                <><span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>Saving</span></>
              ) : (
                <><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Mark as complete</span></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. LEARNING OBJECTIVES (IF POPULATED) */}
      {hasObjectives && (
        <div className="bg-indigo-50/60 border border-indigo-100 p-5 rounded-2xl space-y-3">
          <h3 className="text-xs font-semibold uppercase text-indigo-900 tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span>Learning Objectives</span>
          </h3>
          <ul className="space-y-2 text-xs text-indigo-950 font-medium list-disc list-inside leading-relaxed">
            {lesson.learning_objectives!.map((obj, idx) => (
              <li key={idx}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. PRIMARY CONTENT */}
      {renderPrimaryContent()}

      {/* 4. LESSON NOTES (IF POPULATED) */}
      {hasNotes && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-700" />
            <span>Structured Lesson Notes</span>
          </h3>
          {renderLessonBody(lesson.content)}
        </div>
      )}

      {/* 5. KEY TAKEAWAYS (IF POPULATED) */}
      {hasTakeaways && (
        <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl space-y-3">
          <h3 className="text-xs font-semibold uppercase text-emerald-900 tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-emerald-700" />
            <span>Key Takeaways</span>
          </h3>
          <ul className="space-y-2 text-xs text-emerald-950 font-medium list-disc list-inside leading-relaxed">
            {lesson.key_takeaways!.map((tk, idx) => (
              <li key={idx}>{tk}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Practical instructions removed — GL Academy does not show a separate practical section */}

      {/* 6.5 CHECK YOUR UNDERSTANDING (KNOWLEDGE CHECKPOINT) */}
      {checkpoint && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-indigo-900 tracking-wider">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Check Your Understanding</span>
          </div>

          <h4 className="text-sm font-bold text-slate-900 leading-snug">
            {checkpoint.question}
          </h4>

          <div className="space-y-2">
            {checkpoint.options.map((opt: any) => {
              const isSelected = selectedOptionId === opt.id;
              let optionClass = 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800';

              if (submissionResult) {
                if (opt.id === submissionResult.correct_option_id) {
                  optionClass = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
                } else if (isSelected && !submissionResult.is_correct) {
                  optionClass = 'border-amber-500 bg-amber-50 text-amber-950';
                }
              } else if (isSelected) {
                optionClass = 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !submissionResult && setSelectedOptionId(opt.id)}
                  disabled={Boolean(submissionResult)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center gap-3 ${optionClass}`}
                >
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                  </span>
                  <span>{opt.option_text}</span>
                </button>
              );
            })}
          </div>

          {!submissionResult ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitCheckpoint}
                disabled={!selectedOptionId || isSubmittingCheckpoint}
                className="px-4 py-2 rounded-lg text-white text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#4f46e5' }}
              >
                {isSubmittingCheckpoint ? 'Submitting…' : 'Submit Answer'}
              </button>
            </div>
          ) : (
            <div
              role="status"
              className={`space-y-2 rounded-xl border p-4 text-xs ${
                submissionResult.is_correct
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-rose-200 bg-rose-50 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {submissionResult.is_correct ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Correct</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Incorrect</span>
                  </>
                )}
              </div>

              {!submissionResult.is_correct && correctOptionText && (
                <p className="leading-relaxed">
                  <span className="font-semibold">Correct answer: </span>
                  {correctOptionText}
                </p>
              )}

              {submissionResult.explanation && (
                <p className="font-medium leading-relaxed">{submissionResult.explanation}</p>
              )}

              <p className="pt-1 text-[11px] font-medium opacity-80">
                Answer recorded. Each question allows one submission.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUPPORTING RESOURCES */}
      <LessonResources resources={resources?.filter((r: any) => r.id !== attachedVideoResource?.id) || []} />

      {/* BOTTOM COMPLETION ROW (GL-style: bottom CTA + next navigation hint) */}
      <div className="pt-5 border-t border-slate-200 flex items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          {isCompleted ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Lesson completed — continue to the next topic</span>
            </span>
          ) : (
            <span>Read through the lesson, then mark it complete to track your progress.</span>
          )}
        </div>

        {!isCompleted && (
          <button
            onClick={onCompleteLesson}
            disabled={isCompleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: '#4f46e5' }}
          >
            {isCompleting ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /><span>Mark as Complete</span></>
            )}
          </button>
        )}
      </div>

    </div>
  );
};
