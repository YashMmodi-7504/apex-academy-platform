import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.ts';
import { requireAuth, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { getCourses, getCategories, getCourseBySlug, getCourseCurriculum, getDomainLearningPath, getAdminCourses, publishAllCatalogCourses } from '../controllers/courses.controller.ts';
import { enrollInCourse, getEnrollmentStatus, getMyEnrollments } from '../controllers/enrollments.controller.ts';
import {
  getCourseLearningOverview,
  getLessonContent,
  getLessonCheckpointHandler,
  submitCheckpointAttemptHandler,
  getModuleAssessmentHandler,
  submitModuleAssessmentHandler,
  getFinalAssessmentHandler,
  submitFinalAssessmentHandler,
  getCourseCompletionSummaryHandler,
  updateLessonProgress,
  completeLesson
} from '../controllers/learning.controller.ts';
import { submitCounselorLead } from '../controllers/counselor.controller.ts';
import {
  issueCertificateHandler,
  getMyCertificatesHandler,
  getCertificateByIdHandler,
  verifyPublicCertificateHandler
} from '../controllers/certificates.controller.ts';

import {
  getAdminContent,
  getAdminCertificates,
  getAdminAssessments,
  getAdminInquiries,
  getAdminPrograms,
  getAdminStudents
} from '../controllers/admin.controller.ts';

import {
  getSuccessStories,
  getSuccessStoryById,
  getInstitutions,
  getInstitutionBySlug,
  getArticles,
  getArticleBySlug,
  searchPublic
} from '../controllers/public.controller.ts';

import {
  getCurriculumSummary,
  getAdminCurriculumCourses,
  getAdminCourseCurriculum,
  createModule,
  updateModule,
  reorderModules,
  createLesson,
  updateLesson,
  reorderLessons,
  createLessonResource,
  updateLessonResource,
  getCareerPaths,
  addCourseToPath,
  removeCourseFromPath,
  toggleCoursePublish
} from '../controllers/curriculum.controller.ts';

import {
  initContentUpload,
  completeContentUpload,
  getLessonAssets,
  attachContentAsset,
  updateContentAsset,
  detachContentAsset,
  getStudentLessonContentAccess
} from '../controllers/content.controller.ts';

import {
  getAdminMaterials,
  initMaterialUpload,
  completeMaterialUpload,
  updateMaterial,
  deleteMaterial,
  getMaterialDownloadUrl,
  extractMaterialContent,
  saveContentToLesson,
  getBulkImportSummary,
  executeBulkImport,
  populateMassLessonContent,
  generateQuizFromMaterial
} from '../controllers/materials.controller.ts';

const router = Router();

// Health check endpoint
router.get('/health', getHealth);

// System Info endpoint
router.get('/info', (req, res) => {
  res.json({
    success: true,
    platform: 'Apex Academy EdTech LMS',
    phase: 4,
    features: [
      'PostgreSQL Connection Configured',
      'Supabase Authentication & Profiles',
      'Role-Based Access Control (Student / Admin)',
      'Public Course Catalog & Category Filtering',
      'Course Detail & Curriculum Engine',
      'Secure Token-Based Enrollment',
      'My Learning Dashboard Engine'
    ],
    timestamp: new Date().toISOString()
  });
});

// Authenticated user profile verification endpoint
router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: {
      id: req.user?.id,
      email: req.user?.email,
      user_metadata: req.user?.user_metadata
    }
  });
});

// Admin-only verification & management endpoints
router.get('/admin/verify', requireAdmin, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    message: 'Admin authorization verified.',
    admin: req.profile
  });
});
router.get('/admin/courses', requireAdmin, getAdminCourses);

// ==========================================
// ADMIN DASHBOARD DATA ROUTES
// ==========================================
router.get('/admin/content', requireAuth, requireAdmin, getAdminContent);
router.get('/admin/certificates', requireAuth, requireAdmin, getAdminCertificates);
router.get('/admin/assessments', requireAuth, requireAdmin, getAdminAssessments);
router.get('/admin/inquiries', requireAuth, requireAdmin, getAdminInquiries);
router.get('/admin/programs', requireAuth, requireAdmin, getAdminPrograms);
router.get('/admin/students', requireAuth, requireAdmin, getAdminStudents);

// ==========================================
// ADMIN CURRICULUM MANAGEMENT ROUTES
// ==========================================
router.get('/admin/curriculum/summary', requireAuth, requireAdmin, getCurriculumSummary);
router.get('/admin/curriculum/courses', requireAuth, requireAdmin, getAdminCurriculumCourses);
router.get('/admin/curriculum/courses/:courseId', requireAuth, requireAdmin, getAdminCourseCurriculum);

// Module Management
router.post('/admin/curriculum/modules', requireAuth, requireAdmin, createModule);
router.patch('/admin/curriculum/modules/reorder', requireAuth, requireAdmin, reorderModules);
router.patch('/admin/curriculum/modules/:id', requireAuth, requireAdmin, updateModule);

// Lesson Management
router.post('/admin/curriculum/lessons', requireAuth, requireAdmin, createLesson);
router.patch('/admin/curriculum/lessons/reorder', requireAuth, requireAdmin, reorderLessons);
router.patch('/admin/curriculum/lessons/:id', requireAuth, requireAdmin, updateLesson);

// Resource Management
router.post('/admin/curriculum/lessons/:lessonId/resources', requireAuth, requireAdmin, createLessonResource);
router.patch('/admin/curriculum/resources/:id', requireAuth, requireAdmin, updateLessonResource);

// Content Storage & Ingestion Management (Phase 6D)
router.post('/admin/content/upload/init', requireAuth, requireAdmin, initContentUpload);
router.post('/admin/content/upload/complete', requireAuth, requireAdmin, completeContentUpload);
router.get('/admin/content/assets/:lessonId', requireAuth, requireAdmin, getLessonAssets);
router.post('/admin/content/attach', requireAuth, requireAdmin, attachContentAsset);
router.patch('/admin/content/assets/:assetId', requireAuth, requireAdmin, updateContentAsset);
router.post('/admin/content/assets/:assetId/detach', requireAuth, requireAdmin, detachContentAsset);

// Course Materials Repository Management (Phase 10A & 10B)
router.get('/admin/course-materials', requireAuth, requireAdmin, getAdminMaterials);
router.post('/admin/course-materials/upload/init', requireAuth, requireAdmin, initMaterialUpload);
router.post('/admin/course-materials/upload/complete', requireAuth, requireAdmin, completeMaterialUpload);
router.patch('/admin/course-materials/:id', requireAuth, requireAdmin, updateMaterial);
router.delete('/admin/course-materials/:id', requireAuth, requireAdmin, deleteMaterial);
router.get('/admin/course-materials/:id/download', requireAuth, requireAdmin, getMaterialDownloadUrl);
router.post('/admin/course-materials/:id/extract', requireAuth, requireAdmin, extractMaterialContent);
router.post('/admin/course-materials/:id/generate-quiz', requireAuth, requireAdmin, generateQuizFromMaterial);
router.post('/admin/course-materials/:id/save-to-lesson', requireAuth, requireAdmin, saveContentToLesson);
router.post('/admin/course-materials/save-to-lesson', requireAuth, requireAdmin, saveContentToLesson);

// Bulk Course Content Population Engine (Phase 11A & 11C.4)
router.get('/admin/bulk-import/summary', requireAuth, requireAdmin, getBulkImportSummary);
router.post('/admin/bulk-import/execute', requireAuth, requireAdmin, executeBulkImport);
router.post('/admin/catalog/publish-all', requireAuth, requireAdmin, publishAllCatalogCourses);
router.post('/admin/lessons/mass-populate', requireAuth, requireAdmin, populateMassLessonContent);

// Student Content Access Endpoint (Phase 6D)
router.get('/lessons/:lessonId/content-access', requireAuth, getStudentLessonContentAccess);

// Career Paths Management
router.get('/admin/curriculum/career-paths', requireAuth, requireAdmin, getCareerPaths);
router.post('/admin/curriculum/career-paths/:programId/courses', requireAuth, requireAdmin, addCourseToPath);
router.delete('/admin/curriculum/career-paths/:programId/courses/:courseId', requireAuth, requireAdmin, removeCourseFromPath);

// Publish Guard
router.patch('/admin/curriculum/courses/:id/publish', requireAuth, requireAdmin, toggleCoursePublish);

// ==========================================
// PUBLIC COURSE CATALOG & DOMAIN ROUTES
// ==========================================
router.get('/courses', getCourses);
router.get('/courses/categories', getCategories);
router.get('/courses/:slug', getCourseBySlug);
router.get('/courses/:slug/curriculum', getCourseCurriculum);
router.get('/domains/:slug/learning-path', getDomainLearningPath);
router.get('/success-stories', getSuccessStories);
router.get('/success-stories/:id', getSuccessStoryById);
router.get('/institutions', getInstitutions);
router.get('/institutions/:slug', getInstitutionBySlug);
router.get('/articles', getArticles);
router.get('/articles/:slug', getArticleBySlug);
router.get('/search', searchPublic);

// ==========================================
// ENROLLMENT & STUDENT LEARNING ROUTES
// ==========================================
router.post('/courses/:courseId/enroll', requireAuth, enrollInCourse);
router.get('/courses/:courseId/enrollment', requireAuth, getEnrollmentStatus);
router.get('/me/enrollments', requireAuth, getMyEnrollments);

// ==========================================
// PROTECTED COURSE PLAYER & PROGRESS ROUTES
// ==========================================
router.get('/learn/:courseSlugOrId', requireAuth, getCourseLearningOverview);
router.get('/learn/:courseSlugOrId/lessons/:lessonId', requireAuth, getLessonContent);
router.get('/learn/:courseSlugOrId/lessons/:lessonId/checkpoint', requireAuth, getLessonCheckpointHandler);
router.post('/learn/:courseSlugOrId/lessons/:lessonId/checkpoint/attempt', requireAuth, submitCheckpointAttemptHandler);
router.get('/learn/:courseSlugOrId/modules/:moduleId/assessment', requireAuth, getModuleAssessmentHandler);
router.post('/learn/:courseSlugOrId/modules/:moduleId/assessment/submit', requireAuth, submitModuleAssessmentHandler);
router.get('/learn/:courseSlugOrId/final-assessment', requireAuth, getFinalAssessmentHandler);
router.post('/learn/:courseSlugOrId/final-assessment/submit', requireAuth, submitFinalAssessmentHandler);
router.get('/learn/:courseSlugOrId/completion-summary', requireAuth, getCourseCompletionSummaryHandler);
router.post('/learn/:courseSlugOrId/lessons/:lessonId/progress', requireAuth, updateLessonProgress);
router.post('/learn/:courseSlugOrId/lessons/:lessonId/complete', requireAuth, completeLesson);

// ==========================================
// CERTIFICATE ROUTES
// ==========================================
router.get('/me/certificates', requireAuth, getMyCertificatesHandler);
router.get('/me/certificates/:certificateId', requireAuth, getCertificateByIdHandler);
router.post('/courses/:courseId/certificate', requireAuth, issueCertificateHandler);
router.get('/certificates/verify/:verificationCode', verifyPublicCertificateHandler);

// ==========================================
// CONSULTATION & COUNSELOR LEADS ROUTES
// ==========================================
router.post('/counselor-leads', optionalAuth, submitCounselorLead);

export default router;

