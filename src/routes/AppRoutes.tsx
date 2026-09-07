import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public Pages
import { HomePage } from '../pages/public/HomePage.tsx';
import { ProgramsPage } from '../pages/public/ProgramsPage.tsx';
import { ProgramDetailPage } from '../pages/public/ProgramDetailPage.tsx';
import { FreeCoursesPage } from '../pages/public/FreeCoursesPage.tsx';
import { CourseDetailPage } from '../pages/public/CourseDetailPage.tsx';
import { InstitutionsPage } from '../pages/public/InstitutionsPage.tsx';
import { InstitutionDetailPage } from '../pages/public/InstitutionDetailPage.tsx';
import { NotFoundPage } from '../pages/public/NotFoundPage.tsx';
import { CareerSupportPage } from '../pages/public/CareerSupportPage.tsx';
import { SuccessStoriesPage } from '../pages/public/SuccessStoriesPage.tsx';
import { SuccessStoryDetailPage } from '../pages/public/SuccessStoryDetailPage.tsx';
import { EnterprisePage } from '../pages/public/EnterprisePage.tsx';
import { ResourcesPage } from '../pages/public/ResourcesPage.tsx';
import { ResourceDetailPage } from '../pages/public/ResourceDetailPage.tsx';
import { VerifyCertificatePage } from '../pages/public/VerifyCertificatePage.tsx';
import { PublicCertificateVerificationPage } from '../pages/public/PublicCertificateVerificationPage.tsx';
import { SearchPage } from '../pages/public/SearchPage.tsx';
import { DomainDetailPage } from '../pages/public/DomainDetailPage.tsx';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage.tsx';
import { RegisterPage } from '../pages/auth/RegisterPage.tsx';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.tsx';

// Student Pages
import { StudentDashboardPage } from '../pages/student/StudentDashboardPage.tsx';
import { MyLearningPage } from '../pages/student/MyLearningPage.tsx';
import { LearningInterfacePage } from '../pages/student/LearningInterfacePage.tsx';
import { AssessmentPage } from '../pages/student/AssessmentPage.tsx';
import { StudentCertificatesPage } from '../pages/student/StudentCertificatesPage.tsx';
import { StudentProfilePage } from '../pages/student/StudentProfilePage.tsx';

// Admin Pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.tsx';
import { AdminProgramsPage } from '../pages/admin/AdminProgramsPage.tsx';
import { AdminCoursesPage } from '../pages/admin/AdminCoursesPage.tsx';
import { AdminCurriculumPage } from '../pages/admin/AdminCurriculumPage.tsx';
import { AdminCourseEditorPage } from '../pages/admin/AdminCourseEditorPage.tsx';
import { AdminAssessmentsPage } from '../pages/admin/AdminAssessmentsPage.tsx';
import { AdminStudentsPage } from '../pages/admin/AdminStudentsPage.tsx';
import { AdminCertificatesPage } from '../pages/admin/AdminCertificatesPage.tsx';
import { AdminContentPage } from '../pages/admin/AdminContentPage.tsx';
import { AdminInquiriesPage } from '../pages/admin/AdminInquiriesPage.tsx';
import { AdminMaterialsPage } from '../pages/admin/AdminMaterialsPage.tsx';
import { AdminBulkImportPage } from '../pages/admin/AdminBulkImportPage.tsx';

// Route Protection Guards
import { RequireAuth, RequireAdmin } from '../components/common/ProtectedRoutes.tsx';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<HomePage />} />
      <Route path="/programs" element={<ProgramsPage />} />
      <Route path="/programs/:slug" element={<ProgramDetailPage />} />
      <Route path="/free-courses" element={<FreeCoursesPage />} />
      <Route path="/courses/:slug" element={<CourseDetailPage />} />
      <Route path="/institutions" element={<InstitutionsPage />} />
      <Route path="/institutions/:slug" element={<InstitutionDetailPage />} />
      <Route path="/career-support" element={<CareerSupportPage />} />
      <Route path="/success-stories" element={<SuccessStoriesPage />} />
      <Route path="/success-stories/:id" element={<SuccessStoryDetailPage />} />
      <Route path="/enterprise" element={<EnterprisePage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/resources/:slug" element={<ResourceDetailPage />} />
      <Route path="/verify-certificate" element={<PublicCertificateVerificationPage />} />
      <Route path="/verify-certificate/:code" element={<PublicCertificateVerificationPage />} />
      <Route path="/verify/:verificationCode" element={<PublicCertificateVerificationPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/domains/:slug" element={<DomainDetailPage />} />

      {/* AUTH ROUTES */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* STUDENT PORTAL PROTECTED ROUTES */}
      <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
      <Route path="/student/dashboard" element={<RequireAuth><StudentDashboardPage /></RequireAuth>} />
      <Route path="/student/my-learning" element={<RequireAuth><MyLearningPage /></RequireAuth>} />
      <Route path="/student/learning/:courseId" element={<RequireAuth><LearningInterfacePage /></RequireAuth>} />
      <Route path="/learn/:courseSlug" element={<RequireAuth><LearningInterfacePage /></RequireAuth>} />
      <Route path="/learn/:courseSlug/lesson/:lessonId" element={<RequireAuth><LearningInterfacePage /></RequireAuth>} />
      <Route path="/student/assessment/:assessmentId" element={<RequireAuth><AssessmentPage /></RequireAuth>} />
      <Route path="/student/certificates" element={<RequireAuth><StudentCertificatesPage /></RequireAuth>} />
      <Route path="/student/profile" element={<RequireAuth><StudentProfilePage /></RequireAuth>} />

      {/* ADMIN PORTAL PROTECTED ROUTES */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
      <Route path="/admin/curriculum" element={<RequireAdmin><AdminCurriculumPage /></RequireAdmin>} />
      <Route path="/admin/curriculum/courses/:courseId" element={<RequireAdmin><AdminCourseEditorPage /></RequireAdmin>} />
      <Route path="/admin/programs" element={<RequireAdmin><AdminProgramsPage /></RequireAdmin>} />
      <Route path="/admin/courses" element={<RequireAdmin><AdminCoursesPage /></RequireAdmin>} />
      <Route path="/admin/assessments" element={<RequireAdmin><AdminAssessmentsPage /></RequireAdmin>} />
      <Route path="/admin/students" element={<RequireAdmin><AdminStudentsPage /></RequireAdmin>} />
      <Route path="/admin/certificates" element={<RequireAdmin><AdminCertificatesPage /></RequireAdmin>} />
      <Route path="/admin/content" element={<RequireAdmin><AdminContentPage /></RequireAdmin>} />
      <Route path="/admin/materials" element={<RequireAdmin><AdminMaterialsPage /></RequireAdmin>} />
      <Route path="/admin/bulk-import" element={<RequireAdmin><AdminBulkImportPage /></RequireAdmin>} />
      <Route path="/admin/inquiries" element={<RequireAdmin><AdminInquiriesPage /></RequireAdmin>} />

      {/* FALLBACK */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

