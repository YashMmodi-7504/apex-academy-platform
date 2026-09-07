// Global Types for Apex Academy LMS

export type UserRole = 'STUDENT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  title?: string;
  company?: string;
  createdAt: string;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  location: string;
  programCount: number;
}

export type ProgramType = 'POST_GRADUATE' | 'PROFESSIONAL_CERTIFICATE' | 'EXECUTIVE' | 'DEGREE';
export type LearningMode = 'ONLINE' | 'HYBRID' | 'LIVE_VIRTUAL';

export interface Program {
  id: string;
  title: string;
  slug: string;
  institution: Institution;
  category: string;
  type: ProgramType;
  duration: string;
  mode: LearningMode;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  highlights: string[];
  description: string;
  fee: string;
  nextBatch: string;
}

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface Course {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: CourseLevel;
  durationHours: number;
  rating: number;
  learnerCount: number;
  imageUrl: string;
  hasCertificate: boolean;
  isFree: boolean;
  instructorName: string;
  instructorTitle: string;
  description: string;
}

export interface HealthCheckResponse {
  success: boolean;
  message: string;
  timestamp: string;
  environment?: string;
  database?: {
    status: 'connected' | 'healthy' | 'disconnected';
    details: string;
    name?: string;
    queryTimestamp?: string;
    version?: string;
    responseTimeMs?: number;
  };
  envCheck?: Record<string, string>;
  version?: string;
}
