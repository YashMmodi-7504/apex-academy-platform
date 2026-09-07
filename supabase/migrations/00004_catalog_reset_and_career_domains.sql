-- ============================================================================
-- 00004_catalog_reset_and_career_domains.sql
-- APEX ACADEMY: Catalog Reset & Career Domain Foundation
-- ============================================================================

-- 1. Safely remove demo learning records in foreign-key-aware order
DELETE FROM public.student_answers;
DELETE FROM public.assessment_attempts;
DELETE FROM public.lesson_progress;
DELETE FROM public.certificates;
DELETE FROM public.enrollments;
DELETE FROM public.question_options;
DELETE FROM public.questions;
DELETE FROM public.assessments;
DELETE FROM public.lesson_resources;
DELETE FROM public.lessons;
DELETE FROM public.modules;
DELETE FROM public.course_instructors;
DELETE FROM public.program_courses;
DELETE FROM public.courses;
DELETE FROM public.programs;
DELETE FROM public.instructors;
DELETE FROM public.institutions;
DELETE FROM public.categories;

-- 2. Insert the 11 Approved Career Domains into public.categories
INSERT INTO public.categories (id, name, slug, description, display_order, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Data Scientist', 'data-scientist', 'Master statistical modeling, machine learning algorithms, predictive analytics, and data-driven problem solving.', 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'AI Engineer', 'ai-engineer', 'Build production-ready Generative AI, LLM applications, RAG pipelines, and agentic workflows.', 2, true),
  ('c0000000-0000-0000-0000-000000000003', 'AI Backend Engineer', 'ai-backend-engineer', 'Architect robust microservices, vector search backends, API gateways, and cloud inference systems.', 3, true),
  ('c0000000-0000-0000-0000-000000000004', 'Data Engineer', 'data-engineer', 'Design enterprise data pipelines, big data architectures, data lakes, and real-time streaming infrastructure.', 4, true),
  ('c0000000-0000-0000-0000-000000000005', 'ETL Developer', 'etl-developer', 'Specialize in data extraction, transformation, loading processes, warehousing, and data quality pipelines.', 5, true),
  ('c0000000-0000-0000-0000-000000000006', 'Data Analyst', 'data-analyst', 'Transform complex datasets into actionable business insights using SQL, Python, Excel, and statistical testing.', 6, true),
  ('c0000000-0000-0000-0000-000000000007', 'BI Developer', 'bi-developer', 'Construct scalable data models, semantic layers, ETL workflows, and automated reporting infrastructure.', 7, true),
  ('c0000000-0000-0000-0000-000000000008', 'BI Analyst', 'bi-analyst', 'Create executive dashboards, interactive PowerBI/Tableau visual reports, and key performance indicators.', 8, true),
  ('c0000000-0000-0000-0000-000000000009', 'Technical Analyst', 'technical-analyst', 'Bridge business operations and engineering by auditing system requirements, data workflows, and tech specs.', 9, true),
  ('c0000000-0000-0000-0000-000000000010', 'Machine Learning Engineer', 'machine-learning-engineer', 'Deploy, monitor, and scale production ML models, feature stores, and MLOps pipelines.', 10, true),
  ('c0000000-0000-0000-0000-000000000011', 'Market Analytics & Research', 'market-analytics-research', 'Leverage quantitative research, market intelligence, customer analytics, and econometric forecasting.', 11, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;
