import { HealthCheckResponse } from '../types/index.ts';
import { getAuthToken } from '../lib/supabaseClient.ts';

const API_BASE_URL = '/api';

const isValidJwt = (tokenStr: any): boolean => {
  if (!tokenStr || typeof tokenStr !== 'string') return false;
  const trimmed = tokenStr.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false;
  }
  const segments = trimmed.split('.');
  return segments.length === 3 && segments.every((s) => s.length > 0);
};

const resolveToken = (t?: string): string | null => {
  if (isValidJwt(t)) return t!.trim();
  return getAuthToken();
};

export async function checkApiHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to communicate with API server: ${error?.message || 'Network error'}`,
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        details: 'API server unreachable',
      },
    };
  }
}

export async function fetchApiInfo() {
  try {
    const res = await fetch(`${API_BASE_URL}/info`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchCourses(filters?: {
  category?: string;
  difficulty?: string;
  free?: boolean;
  featured?: boolean;
  search?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
    if (filters?.free !== undefined) params.append('free', String(filters.free));
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/courses${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch courses' };
  }
}

export async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE_URL}/courses/categories`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch categories' };
  }
}

export async function fetchDomainLearningPath(slug: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/domains/${slug}/learning-path`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch domain learning path' };
  }
}

export async function fetchInstitutions() {
  try {
    const res = await fetch(`${API_BASE_URL}/institutions`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch institutions' };
  }
}

export async function fetchInstitutionBySlug(slug: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/institutions/${slug}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch institution' };
  }
}

export async function fetchArticles() {
  try {
    const res = await fetch(`${API_BASE_URL}/articles`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch articles' };
  }
}

export async function fetchArticleBySlug(slug: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/articles/${slug}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch article' };
  }
}

export async function fetchSuccessStories() {
  try {
    const res = await fetch(`${API_BASE_URL}/success-stories`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch success stories' };
  }
}

export async function fetchSuccessStoryById(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/success-stories/${id}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch success story' };
  }
}

export async function searchPublic(query: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to search' };
  }
}

export async function fetchAdminCourses(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/courses`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch admin course list' };
  }
}

// ==========================================
// ADMIN CURRICULUM MANAGEMENT API FUNCTIONS
// ==========================================

export async function fetchCurriculumSummary(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/summary`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch curriculum summary' };
  }
}

export async function fetchAdminCurriculumCourses(token: string, params?: { search?: string; status?: string; difficulty?: string; careerPath?: string }) {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.careerPath) query.append('careerPath', params.careerPath);

    const res = await fetch(`${API_BASE_URL}/admin/curriculum/courses?${query.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch admin curriculum courses' };
  }
}

export async function fetchAdminCourseCurriculum(token: string, courseId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/courses/${courseId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch course curriculum details' };
  }
}

export async function createAdminModule(token: string, data: { course_id: string; title: string; description?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create module' };
  }
}

export async function updateAdminModule(token: string, id: string, data: { title?: string; description?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/modules/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update module' };
  }
}

export async function reorderAdminModules(token: string, course_id: string, orders: { id: string; display_order: number }[]) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/modules/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ course_id, orders })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder modules' };
  }
}

export async function createAdminLesson(token: string, data: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create lesson' };
  }
}

export async function updateAdminLesson(token: string, id: string, data: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/lessons/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update lesson' };
  }
}

export async function reorderAdminLessons(token: string, module_id: string, orders: { id: string; display_order: number }[]) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/lessons/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ module_id, orders })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder lessons' };
  }
}

export async function createAdminLessonResource(token: string, lessonId: string, data: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/lessons/${lessonId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create lesson resource' };
  }
}

export async function updateAdminLessonResource(token: string, id: string, data: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/resources/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update lesson resource' };
  }
}

// ============================================================================
// PHASE 6D: SECURE CONTENT STORAGE & INGESTION SERVICE METHODS
// ============================================================================

export async function initContentUpload(token: string, data: {
  lessonId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  resourceType: string;
  isPrimary?: boolean;
  languageCode?: string;
  title?: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/content/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initialize content upload' };
  }
}

export function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `Upload failed with status ${xhr.status}: ${xhr.statusText}` });
      }
    };

    xhr.onerror = () => {
      resolve({ success: false, error: 'Network error during file upload.' });
    };

    xhr.send(file);
  });
}

export async function completeContentUpload(token: string, data: {
  lessonId: string;
  storagePath: string;
  title?: string;
  resourceType: string;
  isPrimary?: boolean;
  fileSize?: number;
  mimeType?: string;
  languageCode?: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/content/upload/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to finalize content upload' };
  }
}

export async function fetchLessonAssets(token: string, lessonId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/content/assets/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch lesson assets' };
  }
}

export async function attachContentAsset(token: string, data: {
  lessonId: string;
  title: string;
  resourceType: string;
  fileUrl: string;
  isPrimary?: boolean;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/content/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to attach asset' };
  }
}

export async function updateContentAsset(token: string, assetId: string, data: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/content/assets/${assetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update asset' };
  }
}

export async function detachContentAsset(token: string, assetId: string, deleteFromStorage = false) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/content/assets/${assetId}/detach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ deleteFromStorage })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to detach asset' };
  }
}

export async function fetchStudentLessonContentAccess(token: string, lessonId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/lessons/${lessonId}/content-access`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to access content' };
  }
}

export async function fetchAdminCareerPaths(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/career-paths`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch career paths' };
  }
}

export async function addCourseToCareerPath(token: string, programId: string, data: { course_id: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/career-paths/${programId}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add course to career path' };
  }
}

export async function removeCourseFromCareerPath(token: string, programId: string, courseId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/career-paths/${programId}/courses/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to remove course from career path' };
  }
}

export async function toggleCoursePublishStatus(token: string, courseId: string, is_published: boolean) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/curriculum/courses/${courseId}/publish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_published })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update publication status' };
  }
}

export async function fetchCourseBySlug(slug: string, token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/courses/${slug}`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch course details' };
  }
}

export async function enrollInCourse(courseId: string, token?: string, paymentCompleted?: boolean) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paymentCompleted }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Enrollment request failed' };
  }
}

export async function fetchMyEnrollments(token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/me/enrollments`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch enrollments' };
  }
}

export async function fetchCourseLearningOverview(courseSlugOrId: string, token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/learn/${courseSlugOrId}`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch course learning structure' };
  }
}

export async function fetchLessonContent(courseSlugOrId: string, lessonId: string, token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/learn/${courseSlugOrId}/lessons/${lessonId}`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch lesson content' };
  }
}

export async function updateLessonProgress(
  courseSlugOrId: string,
  lessonId: string,
  token?: string,
  progressData?: { last_position_seconds: number; watch_percentage?: number }
) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/learn/${courseSlugOrId}/lessons/${lessonId}/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify(progressData || {}),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save lesson progress' };
  }
}

export async function completeLesson(courseSlugOrId: string, lessonId: string, token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/learn/${courseSlugOrId}/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to mark lesson complete' };
  }
}

export interface CounselorLeadPayload {
  name: string;
  email: string;
  phone: string;
  target_domain: string;
  experience_level: string;
  preferred_contact_method: string;
  message?: string;
  program_id?: string;
}

export async function submitCounselorLeadApi(payload: CounselorLeadPayload, token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/counselor-leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok && !data.error) {
      data.error = `HTTP Error ${res.status}`;
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "We couldn't submit your request. Please try again."
    };
  }
}

export async function fetchMyCertificates(token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/me/certificates`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch certificates' };
  }
}

export async function fetchCertificateById(certificateId: string, token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/me/certificates/${certificateId}`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch certificate detail' };
  }
}

export async function claimCourseCertificate(courseId: string, token?: string) {
  try {
    const activeToken = resolveToken(token);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/certificate`, {
      method: 'POST',
      headers,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to claim certificate' };
  }
}

export async function verifyCertificatePublic(code: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/certificates/verify/${encodeURIComponent(code)}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    return await res.json();
  } catch (err: any) {
    return { verified: false, error: err.message || 'Verification service error' };
  }
}

// ==========================================
// ADMIN COURSE MATERIALS MANAGEMENT API FUNCTIONS
// ==========================================

export async function fetchAdminMaterials(token: string, filters?: { courseId?: string; moduleId?: string; status?: string; search?: string }) {
  try {
    const query = new URLSearchParams();
    if (filters?.courseId) query.append('courseId', filters.courseId);
    if (filters?.moduleId) query.append('moduleId', filters.moduleId);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.search) query.append('search', filters.search);

    const res = await fetch(`${API_BASE_URL}/admin/course-materials?${query.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch course materials' };
  }
}

export async function initMaterialUpload(token: string, data: { courseId: string; moduleId: string; filename: string; fileSize?: number; mimeType?: string; title?: string; description?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/course-materials/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initialize material upload' };
  }
}

export async function completeMaterialUpload(token: string, data: { courseId: string; moduleId: string; storagePath: string; originalFilename: string; fileSize?: number; title?: string; description?: string; replace?: boolean }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/course-materials/upload/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to finalize material upload' };
  }
}

export async function updateAdminMaterial(token: string, id: string, data: { title: string; description?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/course-materials/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update material metadata' };
  }
}

export async function deleteAdminMaterial(token: string, id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/course-materials/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete material' };
  }
}

export async function getAdminMaterialDownloadUrl(token: string, id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/course-materials/${id}/download`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to retrieve download link' };
  }
}

export async function extractMaterialContent(token: string, id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/course-materials/${id}/extract`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to extract PDF content' };
  }
}

export async function saveContentToLesson(token: string, lessonId: string, htmlContent: string, materialId?: string) {
  try {
    const url = materialId
      ? `${API_BASE_URL}/admin/course-materials/${materialId}/save-to-lesson`
      : `${API_BASE_URL}/admin/course-materials/save-to-lesson`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lessonId, htmlContent, materialId })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save extracted content to lesson' };
  }
}

export async function fetchBulkImportSummary(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/bulk-import/summary`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch bulk import summary' };
  }
}

export async function executeBulkImport(token: string, items: Array<{ materialId: string; lessonId?: string; autoMatch?: boolean }>) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/bulk-import/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to execute bulk import' };
  }
}

// ==========================================
// NEW DASHBOARD ENDPOINTS
// ==========================================

export async function fetchAdminContent(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/content`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminCertificates(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/certificates`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminAssessments(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/assessments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminInquiries(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/inquiries`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminPrograms(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/programs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminStudents(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateQuizFromMaterial(token: string, materialId: string, assessmentId: string, count: number = 5) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/course-materials/${materialId}/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ assessment_id: assessmentId, count })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
