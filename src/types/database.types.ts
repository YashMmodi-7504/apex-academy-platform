export type UserRole = 'STUDENT' | 'ADMIN';

export type ProgramType = 
  | 'POST_GRADUATE' 
  | 'EXECUTIVE' 
  | 'DEGREE' 
  | 'PROFESSIONAL_CERTIFICATE';

export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type LessonType = 'VIDEO' | 'ARTICLE' | 'READING' | 'PRACTICAL';

export type ResourceType = 'PDF' | 'PPT' | 'NOTE' | 'CODE' | 'DATASET' | 'LINK';

export type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED';

export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type AssessmentType = 'MODULE_QUIZ' | 'FINAL_ASSESSMENT';

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED';
export type PreferredContactMethod = 'Phone Call' | 'WhatsApp' | 'Email';

export interface CounselorLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  target_domain: string;
  experience_level: string;
  preferred_contact_method: PreferredContactMethod;
  message: string | null;
  program_id: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export const TARGET_DOMAINS = [
  'Data Scientist',
  'AI Engineer',
  'AI Backend Engineer',
  'Data Engineer',
  'ETL Developer',
  'Data Analyst',
  'BI Developer',
  'BI Analyst',
  'Technical Analyst',
  'Machine Learning Engineer',
  'Market Analytics & Research'
] as const;

export const EXPERIENCE_LEVELS = [
  'Student / Fresher',
  '0–2 Years',
  '2–5 Years',
  '5+ Years'
] as const;

export const PREFERRED_CONTACT_METHODS = [
  'Phone Call',
  'WhatsApp',
  'Email'
] as const;

export type CertificateVerificationStatus = 'VALID' | 'REVOKED';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  experience_level: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  institution_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  program_type: ProgramType;
  duration: string | null;
  learning_format: string | null;
  weekly_commitment: string | null;
  hero_image_url: string | null;
  career_support: boolean;
  certificate_enabled: boolean;
  fee: number;
  currency: string;
  eligibility: string | null;
  admission_process: string | null;
  batch_start_date: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  difficulty: CourseDifficulty;
  duration_minutes: number;
  language: string;
  certificate_enabled: boolean;
  is_free: boolean;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Instructor {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  experience: string | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  lesson_type: LessonType;
  content: string | null;
  video_url: string | null;
  duration_seconds: number;
  display_order: number;
  is_preview: boolean;
  is_required: boolean;
  learning_objectives?: string[] | null;
  key_takeaways?: string[] | null;
  practical_instructions?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  resource_type: ResourceType;
  file_url: string;
  display_order: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress_percentage: number;
  last_accessed_lesson_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  watch_percentage: number;
  last_position_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  assessment_type: AssessmentType;
  passing_percentage: number;
  duration_minutes: number;
  max_attempts: number;
  is_required: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  explanation: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionOptionPublic {
  id: string;
  question_id: string;
  option_text: string;
  display_order: number;
  created_at: string;
}

export interface QuestionOptionAdmin extends QuestionOptionPublic {
  is_correct: boolean;
}

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_taken_seconds: number;
  created_at: string;
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  option_id: string;
  is_correct: boolean | null;
  marks_awarded: number;
  created_at: string;
}

export interface Certificate {
  id: string;
  certificate_code: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  issued_at: string;
  pdf_url: string | null;
  verification_status: CertificateVerificationStatus;
  created_at: string;
}

export interface SuccessStory {
  id: string;
  learner_name: string;
  avatar_url: string | null;
  previous_role: string | null;
  previous_company: string | null;
  new_role: string | null;
  current_company: string | null;
  testimonial: string;
  story: string | null;
  program_id: string | null;
  course_id: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnail_url: string | null;
  author: string;
  category_id: string | null;
  published_at: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareerResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
