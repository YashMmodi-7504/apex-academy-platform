-- ============================================================================
-- APEX ACADEMY — SEED DATA MIGRATION: 00001_SEED_DATA.SQL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CATEGORIES (10 Categories)
-- ----------------------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, description, icon, display_order, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Generative AI & LLMs', 'genai-llms', 'Master Large Language Models, Prompt Engineering, and RAG architectures.', 'BrainCircuit', 1, true),
  ('10000000-0000-0000-0000-000000000002', 'Data Science & BI', 'data-science', 'Learn Python, SQL, Statistics, Machine Learning, and PowerBI.', 'BarChart3', 2, true),
  ('10000000-0000-0000-0000-000000000003', 'Full Stack Development', 'fullstack-dev', 'Modern Web Development with React, Node.js, Express, and PostgreSQL.', 'Code2', 3, true),
  ('10000000-0000-0000-0000-000000000004', 'Executive Management', 'exec-management', 'Strategic leadership, business technology, and innovation management.', 'Briefcase', 4, true),
  ('10000000-0000-0000-0000-000000000005', 'Cloud & DevOps', 'cloud-devops', 'AWS, Azure, Docker, Kubernetes, and CI/CD pipelines.', 'Cloud', 5, true),
  ('10000000-0000-0000-0000-000000000006', 'Cybersecurity', 'cybersecurity', 'Network security, ethical hacking, threat intelligence, and compliance.', 'ShieldCheck', 6, true),
  ('10000000-0000-0000-0000-000000000007', 'Product Management', 'product-mgmt', 'Product strategy, Agile roadmapping, UX research, and growth metrics.', 'Layers', 7, true),
  ('10000000-0000-0000-0000-000000000008', 'MLOps & AI Engineering', 'mlops', 'Deploying, monitoring, and scaling production machine learning models.', 'Cpu', 8, true),
  ('10000000-0000-0000-0000-000000000009', 'Free Bootcamps', 'free-courses', 'Free introductory bootcamps and certification preparation courses.', 'Award', 9, true),
  ('10000000-0000-0000-0000-000000000010', 'System Design & Arch', 'system-design', 'High-level software architecture, microservices, and distributed systems.', 'Server', 10, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 2. INSTITUTIONS (4 Fictional Academic Institutions)
-- ----------------------------------------------------------------------------
INSERT INTO public.institutions (id, name, slug, description, website, country, is_active) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Apex Institute of Technology', 'apex-tech', 'Premier global institution for software engineering, system architecture, and AI research.', 'https://apex.institute', 'India', true),
  ('20000000-0000-0000-0000-000000000002', 'Vanguard Business School', 'vanguard-business', 'Leading executive institute specializing in digital business transformation and leadership.', 'https://vanguard.edu', 'United States', true),
  ('20000000-0000-0000-0000-000000000003', 'Global Institute of Applied AI', 'global-ai-inst', 'Pioneering research academy producing world-class AI engineers and ML practitioners.', 'https://globalai.org', 'United Kingdom', true),
  ('20000000-0000-0000-0000-000000000004', 'Horizon School of Data Science', 'horizon-data', 'Specialized center for advanced analytics, big data engineering, and business intelligence.', 'https://horizon.edu', 'Singapore', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  website = EXCLUDED.website,
  country = EXCLUDED.country,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 3. INSTRUCTORS (6 High-Profile Faculty)
-- ----------------------------------------------------------------------------
INSERT INTO public.instructors (id, name, title, bio, linkedin_url, experience) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Dr. Alistair Vance', 'Chief AI Scientist & Professor', 'Former Lead AI Researcher at DeepTech Labs with 15+ years of experience in Natural Language Processing.', 'https://linkedin.com/in/alistair-vance', '15+ Years'),
  ('30000000-0000-0000-0000-000000000002', 'Elena Rostova', 'Principal Distributed Systems Engineer', 'Ex-BigTech Principal Engineer specializing in high-throughput microservices and cloud infrastructure.', 'https://linkedin.com/in/elena-rostova', '12+ Years'),
  ('30000000-0000-0000-0000-000000000003', 'Rahul Sharma', 'Head of Data Science Practice', 'Veteran Data Architect who built enterprise analytics platforms for Fortune 500 financial institutions.', 'https://linkedin.com/in/rahul-sharma', '14+ Years'),
  ('30000000-0000-0000-0000-000000000004', 'Sarah Jenkins', 'Executive Director of Tech Leadership', 'Advisor to global tech CEOs on AI adoption strategy, organizational agility, and enterprise scale.', 'https://linkedin.com/in/sarah-jenkins', '18+ Years'),
  ('30000000-0000-0000-0000-000000000005', 'Dr. Marcus Thorne', 'Senior MLOps Strategist', 'Author of three textbooks on automated Machine Learning pipelines and model governance.', 'https://linkedin.com/in/marcus-thorne', '10+ Years'),
  ('30000000-0000-0000-0000-000000000006', 'Priya Sundaram', 'Staff Full Stack Architect', 'Lead Architect of cloud-native SaaS platforms processing over 500,000 API requests per second.', 'https://linkedin.com/in/priya-sundaram', '11+ Years')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  linkedin_url = EXCLUDED.linkedin_url,
  experience = EXCLUDED.experience;

-- ----------------------------------------------------------------------------
-- 4. PROGRAMS (5 Premier Career Cohort Programs)
-- ----------------------------------------------------------------------------
INSERT INTO public.programs (
  id, institution_id, category_id, title, slug, short_description, description,
  program_type, duration, learning_format, weekly_commitment, fee, currency,
  eligibility, batch_start_date, is_featured, is_published
) VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Post Graduate Program in Generative AI & Agentic Systems',
    'pgp-generative-ai',
    'Master LLMs, LangChain, LlamaIndex, RAG pipelines, and autonomous AI agents with hands-on projects.',
    'Comprehensive 9-month program co-designed with top research institutions to transform developers into Senior AI Engineers capable of deploying production-grade AI applications.',
    'POST_GRADUATE',
    '9 Months',
    'Live Online + Capstone Projects',
    '10-12 hrs/week',
    250000.00,
    'INR',
    'Bachelor degree in Computer Science, IT, or quantitative background with prior coding experience.',
    '2026-09-15',
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    'Executive Post Graduate Program in Data Science & Machine Learning',
    'exec-pgp-data-science',
    'Accelerate your data career with advanced statistical modeling, deep learning, and business analytics.',
    'Designed for working professionals seeking high-growth roles in Data Science, ML Engineering, and Analytics Leadership.',
    'EXECUTIVE',
    '11 Months',
    'Weekend Live Interactive',
    '12-15 hrs/week',
    285000.00,
    'INR',
    'Min 1 year work experience in IT, Data, Finance, or Analytics.',
    '2026-10-01',
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'Professional Certificate in Full Stack Software Engineering',
    'fullstack-software-engineering',
    'Build scalable cloud-native web applications using React, Express, PostgreSQL, and System Design.',
    'Rigorous engineering program focused on production coding standards, clean architecture, automated testing, and CI/CD pipelines.',
    'PROFESSIONAL_CERTIFICATE',
    '6 Months',
    'Hybrid Self-Paced + Live Mentorship',
    '8-10 hrs/week',
    180000.00,
    'INR',
    'Basic programming understanding in Python, JavaScript, or C++.',
    '2026-09-01',
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'Global Executive Management & Technology Strategy',
    'exec-mgmt-tech-strategy',
    'Equip leaders to drive AI adoption, technology governance, and corporate transformation.',
    'Tailored for Senior Managers, VPs, and Directors seeking to navigate disruptive innovation and lead high-performing tech organizations.',
    'EXECUTIVE',
    '12 Months',
    'Live Virtual Executive Sessions',
    '6-8 hrs/week',
    350000.00,
    'INR',
    '5+ years professional leadership or management experience.',
    '2026-10-15',
    false,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000008',
    'Degree Master in Applied Artificial Intelligence & MLOps',
    'master-applied-ai-mlops',
    'End-to-end degree curriculum covering deep learning models, edge deployment, and cloud scale.',
    'Accredited degree program combining theoretical foundations with real-world industry capstones.',
    'DEGREE',
    '18 Months',
    'Flexible Online Degree',
    '15 hrs/week',
    420000.00,
    'INR',
    'Bachelor degree with mathematics or statistics component.',
    '2026-11-01',
    false,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  institution_id = EXCLUDED.institution_id,
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  program_type = EXCLUDED.program_type,
  duration = EXCLUDED.duration,
  learning_format = EXCLUDED.learning_format,
  weekly_commitment = EXCLUDED.weekly_commitment,
  fee = EXCLUDED.fee,
  currency = EXCLUDED.currency,
  eligibility = EXCLUDED.eligibility,
  batch_start_date = EXCLUDED.batch_start_date,
  is_featured = EXCLUDED.is_featured,
  is_published = EXCLUDED.is_published;

-- ----------------------------------------------------------------------------
-- 5. COURSES (10 Individual Courses)
-- ----------------------------------------------------------------------------
INSERT INTO public.courses (
  id, category_id, title, slug, short_description, description,
  difficulty, duration_minutes, language, certificate_enabled, is_free, is_featured, is_published
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000009',
    'Python Programming Fundamentals',
    'python-programming-fundamentals',
    'Master Python syntax, variables, data structures, functions, and control flow from complete scratch.',
    'The foundational course for software developers, data analysts, and AI engineers. Covers essential Python 3 concepts with practical hands-on coding exercises, quizzes, and a comprehensive final assessment.',
    'BEGINNER',
    240,
    'English',
    true,
    true,
    true,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '10000000-0000-0000-0000-000000000001',
    'Large Language Models & Prompt Architecture',
    'llm-prompt-architecture',
    'Understand Transformer networks, tokenization, fine-tuning, and advanced prompting methods.',
    'In-depth study of model architectures, temperature tuning, system instructions, and structured outputs for production AI systems.',
    'INTERMEDIATE',
    360,
    'English',
    true,
    false,
    true,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '10000000-0000-0000-0000-000000000001',
    'Building RAG Systems with Vector Databases',
    'rag-vector-databases',
    'Implement Retrieval-Augmented Generation using Pinecone, ChromaDB, and hybrid semantic search.',
    'Learn how to connect private enterprise knowledge bases to Gemini and LLMs securely using embeddings and chunking strategies.',
    'ADVANCED',
    420,
    'English',
    true,
    false,
    true,
    true
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '10000000-0000-0000-0000-000000000002',
    'SQL & Relational Database Mastery',
    'sql-database-mastery',
    'Master complex joins, aggregations, indexing, performance tuning, and database normalization.',
    'Essential relational database training using PostgreSQL. Learn window functions, CTEs, query optimization, and schema design.',
    'BEGINNER',
    300,
    'English',
    true,
    true,
    false,
    true
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '10000000-0000-0000-0000-000000000003',
    'Modern Web Applications with React & Node.js',
    'react-nodejs-fullstack',
    'Build high-performance web applications using React 18, Express, REST APIs, and state management.',
    'Step-by-step full stack engineering guide covering frontend component patterns, express API routing, authentication, and deployment.',
    'INTERMEDIATE',
    480,
    'English',
    true,
    false,
    true,
    true
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '10000000-0000-0000-0000-000000000010',
    'Distributed Systems & Microservices Architecture',
    'system-design-microservices',
    'Design resilient distributed architectures handling millions of concurrent operations seamlessly.',
    'Covers caching strategies, message queues, event-driven design, load balancing, and database sharding.',
    'ADVANCED',
    540,
    'English',
    true,
    false,
    false,
    true
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    '10000000-0000-0000-0000-000000000005',
    'Docker & Kubernetes Cloud Operations',
    'docker-kubernetes-devops',
    'Containerize applications and orchestrate production deployments across cloud environments.',
    'Hands-on guide to Dockerfiles, Kubernetes pods, ingress controllers, helm charts, and monitoring with Prometheus.',
    'INTERMEDIATE',
    320,
    'English',
    true,
    false,
    false,
    true
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    '10000000-0000-0000-0000-000000000002',
    'Applied Machine Learning with Scikit-Learn',
    'applied-machine-learning',
    'Supervised and unsupervised machine learning algorithms, feature engineering, and validation.',
    'Learn regression, decision trees, random forests, clustering, and hyperparameter tuning in Python.',
    'INTERMEDIATE',
    400,
    'English',
    true,
    false,
    false,
    true
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    '10000000-0000-0000-0000-000000000004',
    'AI Leadership & Digital Transformation Strategy',
    'ai-leadership-strategy',
    'Guide business units through technology disruption, build AI roadmaps, and assess ROI.',
    'Frameworks for executive decision making, ethical AI policies, risk mitigation, and team scaling.',
    'INTERMEDIATE',
    280,
    'English',
    true,
    false,
    false,
    true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000009',
    'Introduction to Cloud Computing & AWS',
    'intro-cloud-aws',
    'Free beginner course covering AWS core services: EC2, S3, RDS, IAM, and CloudWatch.',
    'Get cloud-certified faster with foundational AWS hands-on labs and architectural best practices.',
    'BEGINNER',
    180,
    'English',
    true,
    true,
    false,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  difficulty = EXCLUDED.difficulty,
  duration_minutes = EXCLUDED.duration_minutes,
  language = EXCLUDED.language,
  certificate_enabled = EXCLUDED.certificate_enabled,
  is_free = EXCLUDED.is_free,
  is_featured = EXCLUDED.is_featured,
  is_published = EXCLUDED.is_published;

-- ----------------------------------------------------------------------------
-- 6. PROGRAM COURSES & COURSE INSTRUCTORS RELATIONSHIPS
-- ----------------------------------------------------------------------------
INSERT INTO public.program_courses (program_id, course_id, display_order, is_required) VALUES
  ('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1, true),
  ('40000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 2, true),
  ('40000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 3, true),
  ('40000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, true),
  ('40000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 2, true),
  ('40000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888', 3, true),
  ('40000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 1, true),
  ('40000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 2, true),
  ('40000000-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', 3, true)
ON CONFLICT (program_id, course_id) DO NOTHING;

INSERT INTO public.course_instructors (course_id, instructor_id) VALUES
  ('11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000003'),
  ('22222222-2222-2222-2222-222222222222', '30000000-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', '30000000-0000-0000-0000-000000000001'),
  ('44444444-4444-4444-4444-444444444444', '30000000-0000-0000-0000-000000000003'),
  ('55555555-5555-5555-5555-555555555555', '30000000-0000-0000-0000-000000000006'),
  ('66666666-6666-6666-6666-666666666666', '30000000-0000-0000-0000-000000000002')
ON CONFLICT (course_id, instructor_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. COMPLETE DEMO COURSE CURRICULUM: PYTHON PROGRAMMING FUNDAMENTALS
-- ----------------------------------------------------------------------------

-- MODULES (5 Modules for Python Course 11111111-1111-1111-1111-111111111111)
INSERT INTO public.modules (id, course_id, title, description, display_order, is_required) VALUES
  ('60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Module 1: Introduction to Python', 'Learn what Python is, its history, ecosystem, and environment setup.', 1, true),
  ('60000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Module 2: Variables & Data Types', 'Explore dynamic typing, numbers, strings, lists, and tuples.', 2, true),
  ('60000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Module 3: Conditional Statements', 'Master decision-making using if, if-else, and elif blocks.', 3, true),
  ('60000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Module 4: Loops & Iteration', 'Automate repetitive operations using for loops and while loops.', 4, true),
  ('60000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Module 5: Functions & Scope', 'Write reusable code blocks using functions, arguments, and return values.', 5, true)
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_required = EXCLUDED.is_required;

-- LESSONS FOR MODULE 1 (3 Lessons)
INSERT INTO public.lessons (id, module_id, title, description, lesson_type, content, video_url, duration_seconds, display_order, is_preview, is_required) VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'What is Python?', 'Overview of Python language features, readability, and modern applications.', 'VIDEO', '# What is Python?\nPython is an interpreted, high-level, general-purpose programming language known for its clear, readable syntax.', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 360, 1, true, true),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Python Applications in Modern Tech', 'Discover where Python is used: AI, Web, Data Science, and Automation.', 'ARTICLE', '# Python Applications\nFrom building backend APIs to powering LLMs and space missions, Python is the top choice.', NULL, 240, 2, true, true),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'Environment Setup & First Code', 'Install Python 3 and write your first Hello World script.', 'PRACTICAL', '# First Program\n```python\nprint("Hello, Apex Academy!")\n```', NULL, 300, 3, false, true),

-- LESSONS FOR MODULE 2 (4 Lessons)
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'Variables & Naming Rules', 'How Python assigns memory and variable references.', 'VIDEO', '# Variables in Python\nPython variables are dynamically typed.', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 420, 1, false, true),
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', 'Numbers & Arithmetic Operators', 'Integers, floats, addition, floor division, and modulus.', 'ARTICLE', '# Numbers\nPython supports integers, floating-point numbers, and complex numbers.', NULL, 300, 2, false, true),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000002', 'Strings & String Methods', 'String formatting, slicing, upper(), lower(), and replace().', 'READING', '# Strings\nStrings are immutable sequences of characters.', NULL, 360, 3, false, true),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000002', 'Lists & Tuples', 'Ordered collections, mutability vs immutability.', 'PRACTICAL', '# Lists & Tuples\n```python\nmy_list = [1, 2, 3]\nmy_tuple = (1, 2, 3)\n```', NULL, 480, 4, false, true),

-- LESSONS FOR MODULE 3 (2 Lessons)
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000003', 'Boolean Logic & Comparison Operators', 'True, False, and logical AND, OR, NOT operators.', 'ARTICLE', '# Boolean Logic\nUsed for evaluating conditional expressions.', NULL, 240, 1, false, true),
  ('70000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000003', 'If, If-Else, and Elif Statements', 'Writing conditional execution branches.', 'PRACTICAL', '# Conditionals\n```python\nif score >= 90:\n    print("Grade A")\nelif score >= 75:\n    print("Grade B")\nelse:\n    print("Grade C")\n```', NULL, 360, 2, false, true),

-- LESSONS FOR MODULE 4 (2 Lessons)
  ('70000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000004', 'For Loops & The range() Function', 'Iterating over sequences and range objects.', 'VIDEO', '# For Loops\nIterates over elements of any sequence.', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 420, 1, false, true),
  ('70000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000004', 'While Loops, Break & Continue', 'Looping until condition becomes false and loop control.', 'PRACTICAL', '# While Loops\nBe careful to avoid infinite loops.', NULL, 360, 2, false, true),

-- LESSONS FOR MODULE 5 (2 Lessons)
  ('70000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000005', 'Creating Functions & Parameters', 'Defining functions with def, parameters, and default arguments.', 'VIDEO', '# Functions\nFunctions allow code reuse.', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 480, 1, false, true),
  ('70000000-0000-0000-0000-000000000013', '60000000-0000-0000-0000-000000000005', 'Return Values & Scope Rules', 'Understanding local vs global variable scope.', 'PRACTICAL', '# Return Values & Scope\nFunctions return values using the return statement.', NULL, 420, 2, false, true)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  lesson_type = EXCLUDED.lesson_type,
  content = EXCLUDED.content,
  video_url = EXCLUDED.video_url,
  duration_seconds = EXCLUDED.duration_seconds,
  display_order = EXCLUDED.display_order,
  is_preview = EXCLUDED.is_preview,
  is_required = EXCLUDED.is_required;

-- LESSON RESOURCES (2 Resources)
INSERT INTO public.lesson_resources (id, lesson_id, title, resource_type, file_url, display_order) VALUES
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Python Cheatsheet PDF', 'PDF', 'https://apex.academy/resources/python-cheatsheet.pdf', 1),
  ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003', 'Starter Code Notebook', 'CODE', 'https://apex.academy/resources/starter-code.ipynb', 1)
ON CONFLICT (id) DO UPDATE SET
  lesson_id = EXCLUDED.lesson_id,
  title = EXCLUDED.title,
  resource_type = EXCLUDED.resource_type,
  file_url = EXCLUDED.file_url,
  display_order = EXCLUDED.display_order;

-- ----------------------------------------------------------------------------
-- 8. ASSESSMENTS & MCQ QUESTIONS FOR PYTHON DEMO COURSE
-- ----------------------------------------------------------------------------

-- FINAL ASSESSMENT FOR PYTHON PROGRAMMING FUNDAMENTALS (1 Assessment)
INSERT INTO public.assessments (
  id, course_id, module_id, title, description, assessment_type,
  passing_percentage, duration_minutes, max_attempts, is_required, is_published
) VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'Python Fundamentals Certification Final Assessment',
    'Comprehensive 12-question assessment evaluating your knowledge of Python syntax, data types, logic, loops, and functions.',
    'FINAL_ASSESSMENT',
    75.00,
    30,
    3,
    true,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  module_id = EXCLUDED.module_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  assessment_type = EXCLUDED.assessment_type,
  passing_percentage = EXCLUDED.passing_percentage,
  duration_minutes = EXCLUDED.duration_minutes,
  max_attempts = EXCLUDED.max_attempts,
  is_required = EXCLUDED.is_required,
  is_published = EXCLUDED.is_published;

-- 12 REALISTIC MCQ QUESTIONS
INSERT INTO public.questions (id, assessment_id, question_text, question_type, marks, explanation, display_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Which keyword is used to define a function in Python?', 'SINGLE_CHOICE', 1, 'In Python, the def keyword is used to declare user-defined functions.', 1),
  ('a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'What is the correct output of print(type([])) in Python 3?', 'SINGLE_CHOICE', 1, 'Square brackets [] declare a list, so type([]) returns <class "list">.', 2),
  ('a0000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', 'Which of the following data structures in Python is IMMUTABLE?', 'SINGLE_CHOICE', 1, 'Tuples cannot be modified after creation, making them immutable.', 3),
  ('a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', 'What value is evaluated by 10 // 3 in Python?', 'SINGLE_CHOICE', 1, 'The // operator performs floor division, rounding down 3.333... to 3.', 4),
  ('a0000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000001', 'How do you insert an item at the end of a list in Python?', 'SINGLE_CHOICE', 1, 'The append() method adds a single element to the end of a list.', 5),
  ('a0000000-0000-0000-0000-000000000006', '90000000-0000-0000-0000-000000000001', 'What does the range(2, 8, 2) function generate when converted to a list?', 'SINGLE_CHOICE', 1, 'range(start, stop, step) generates 2, 4, 6 (stops before 8).', 6),
  ('a0000000-0000-0000-0000-000000000007', '90000000-0000-0000-0000-000000000001', 'Which statement terminates the execution of the innermost loop immediately?', 'SINGLE_CHOICE', 1, 'The break statement exits the active loop instantly.', 7),
  ('a0000000-0000-0000-0000-000000000008', '90000000-0000-0000-0000-000000000001', 'Which operator is used for exponentiation (power) in Python?', 'SINGLE_CHOICE', 1, 'The ** operator raises a number to a power (e.g. 2**3 = 8).', 8),
  ('a0000000-0000-0000-0000-000000000009', '90000000-0000-0000-0000-000000000001', 'What is the boolean result of "python".upper() == "PYTHON"?', 'SINGLE_CHOICE', 1, 'upper() converts string to uppercase "PYTHON", which matches "PYTHON".', 9),
  ('a0000000-0000-0000-0000-000000000010', '90000000-0000-0000-0000-000000000001', 'Which symbol is used for single-line comments in Python?', 'SINGLE_CHOICE', 1, 'The hash symbol # indicates a single-line comment.', 10),
  ('a0000000-0000-0000-0000-000000000011', '90000000-0000-0000-0000-000000000001', 'Which method removes key-value pairs from a Python dictionary safely?', 'SINGLE_CHOICE', 1, 'The pop() method removes the key and returns its value.', 11),
  ('a0000000-0000-0000-0000-000000000012', '90000000-0000-0000-0000-000000000001', 'What happens if a function in Python does not explicitly execute a return statement?', 'SINGLE_CHOICE', 1, 'Functions in Python implicitly return None if no return statement is executed.', 12)
ON CONFLICT (id) DO UPDATE SET
  assessment_id = EXCLUDED.assessment_id,
  question_text = EXCLUDED.question_text,
  question_type = EXCLUDED.question_type,
  marks = EXCLUDED.marks,
  explanation = EXCLUDED.explanation,
  display_order = EXCLUDED.display_order;

-- QUESTION OPTIONS WITH DETERMINISTIC VALID UUIDs (48 total options, 12 correct, 36 incorrect)
-- Q1: def
INSERT INTO public.question_options (id, question_id, option_text, is_correct, display_order) VALUES
  ('b0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000001', 'function', false, 1),
  ('b0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0000-000000000001', 'def', true, 2),
  ('b0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0000-000000000001', 'define', false, 3),
  ('b0000000-0000-0000-0001-000000000004', 'a0000000-0000-0000-0000-000000000001', 'fn', false, 4),

-- Q2: type([])
  ('b0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000002', '<class "array">', false, 1),
  ('b0000000-0000-0000-0002-000000000002', 'a0000000-0000-0000-0000-000000000002', '<class "list">', true, 2),
  ('b0000000-0000-0000-0002-000000000003', 'a0000000-0000-0000-0000-000000000002', '<class "tuple">', false, 3),
  ('b0000000-0000-0000-0002-000000000004', 'a0000000-0000-0000-0000-000000000002', '<class "object">', false, 4),

-- Q3: immutable tuple
  ('b0000000-0000-0000-0003-000000000001', 'a0000000-0000-0000-0000-000000000003', 'List', false, 1),
  ('b0000000-0000-0000-0003-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Dictionary', false, 2),
  ('b0000000-0000-0000-0003-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Tuple', true, 3),
  ('b0000000-0000-0000-0003-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Set', false, 4),

-- Q4: 10 // 3
  ('b0000000-0000-0000-0004-000000000001', 'a0000000-0000-0000-0000-000000000004', '3.33', false, 1),
  ('b0000000-0000-0000-0004-000000000002', 'a0000000-0000-0000-0000-000000000004', '3', true, 2),
  ('b0000000-0000-0000-0004-000000000003', 'a0000000-0000-0000-0000-000000000004', '1', false, 3),
  ('b0000000-0000-0000-0004-000000000004', 'a0000000-0000-0000-0000-000000000004', '3.0', false, 4),

-- Q5: append()
  ('b0000000-0000-0000-0005-000000000001', 'a0000000-0000-0000-0000-000000000005', 'push()', false, 1),
  ('b0000000-0000-0000-0005-000000000002', 'a0000000-0000-0000-0000-000000000005', 'add()', false, 2),
  ('b0000000-0000-0000-0005-000000000003', 'a0000000-0000-0000-0000-000000000005', 'append()', true, 3),
  ('b0000000-0000-0000-0005-000000000004', 'a0000000-0000-0000-0000-000000000005', 'insertLast()', false, 4),

-- Q6: range(2, 8, 2)
  ('b0000000-0000-0000-0006-000000000001', 'a0000000-0000-0000-0000-000000000006', '[2, 4, 6, 8]', false, 1),
  ('b0000000-0000-0000-0006-000000000002', 'a0000000-0000-0000-0000-000000000006', '[2, 4, 6]', true, 2),
  ('b0000000-0000-0000-0006-000000000003', 'a0000000-0000-0000-0000-000000000006', '[2, 3, 4, 5, 6, 7]', false, 3),
  ('b0000000-0000-0000-0006-000000000004', 'a0000000-0000-0000-0000-000000000006', '[4, 6, 8]', false, 4),

-- Q7: break
  ('b0000000-0000-0000-0007-000000000001', 'a0000000-0000-0000-0000-000000000007', 'continue', false, 1),
  ('b0000000-0000-0000-0007-000000000002', 'a0000000-0000-0000-0000-000000000007', 'pass', false, 2),
  ('b0000000-0000-0000-0007-000000000003', 'a0000000-0000-0000-0000-000000000007', 'break', true, 3),
  ('b0000000-0000-0000-0007-000000000004', 'a0000000-0000-0000-0000-000000000007', 'exit', false, 4),

-- Q8: **
  ('b0000000-0000-0000-0008-000000000001', 'a0000000-0000-0000-0000-000000000008', '^', false, 1),
  ('b0000000-0000-0000-0008-000000000002', 'a0000000-0000-0000-0000-000000000008', '**', true, 2),
  ('b0000000-0000-0000-0008-000000000003', 'a0000000-0000-0000-0000-000000000008', 'pow', false, 3),
  ('b0000000-0000-0000-0008-000000000004', 'a0000000-0000-0000-0000-000000000008', '//', false, 4),

-- Q9: True
  ('b0000000-0000-0000-0009-000000000001', 'a0000000-0000-0000-0000-000000000009', 'True', true, 1),
  ('b0000000-0000-0000-0009-000000000002', 'a0000000-0000-0000-0000-000000000009', 'False', false, 2),
  ('b0000000-0000-0000-0009-000000000003', 'a0000000-0000-0000-0000-000000000009', 'None', false, 3),
  ('b0000000-0000-0000-0009-000000000004', 'a0000000-0000-0000-0000-000000000009', 'TypeError', false, 4),

-- Q10: #
  ('b0000000-0000-0000-0010-000000000001', 'a0000000-0000-0000-0000-000000000010', '//', false, 1),
  ('b0000000-0000-0000-0010-000000000002', 'a0000000-0000-0000-0000-000000000010', '/*', false, 2),
  ('b0000000-0000-0000-0010-000000000003', 'a0000000-0000-0000-0000-000000000010', '#', true, 3),
  ('b0000000-0000-0000-0010-000000000004', 'a0000000-0000-0000-0000-000000000010', '--', false, 4),

-- Q11: pop()
  ('b0000000-0000-0000-0011-000000000001', 'a0000000-0000-0000-0000-000000000011', 'remove()', false, 1),
  ('b0000000-0000-0000-0011-000000000002', 'a0000000-0000-0000-0000-000000000011', 'pop()', true, 2),
  ('b0000000-0000-0000-0011-000000000003', 'a0000000-0000-0000-0000-000000000011', 'delete()', false, 3),
  ('b0000000-0000-0000-0011-000000000004', 'a0000000-0000-0000-0000-000000000011', 'discard()', false, 4),

-- Q12: None
  ('b0000000-0000-0000-0012-000000000001', 'a0000000-0000-0000-0000-000000000012', 'It returns 0', false, 1),
  ('b0000000-0000-0000-0012-000000000002', 'a0000000-0000-0000-0000-000000000012', 'It returns None', true, 2),
  ('b0000000-0000-0000-0012-000000000003', 'a0000000-0000-0000-0000-000000000012', 'It throws a SyntaxError', false, 3),
  ('b0000000-0000-0000-0012-000000000004', 'a0000000-0000-0000-0000-000000000012', 'It returns undefined', false, 4)
ON CONFLICT (id) DO UPDATE SET
  question_id = EXCLUDED.question_id,
  option_text = EXCLUDED.option_text,
  is_correct = EXCLUDED.is_correct,
  display_order = EXCLUDED.display_order;

-- ----------------------------------------------------------------------------
-- 9. SUCCESS STORIES & ARTICLES & CAREER RESOURCES
-- ----------------------------------------------------------------------------
INSERT INTO public.success_stories (
  id, learner_name, previous_role, previous_company, new_role, current_company,
  testimonial, story, is_featured, is_published
) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Rohan Mehta', 'Junior Software Developer', 'Local Tech Firm', 'Senior Generative AI Architect', 'Global Cloud Enterprise', 'Apex Academy transformed my career trajectory. The RAG architecture module gave me the exact skills needed to transition into high-paying AI engineering roles.', 'Detailed transition journey from traditional web dev to leading an agentic AI team.', true, true),
  ('c0000000-0000-0000-0000-000000000002', 'Ananya Roy', 'Data Analyst', 'Retail Retailers', 'Lead Data Scientist', 'FinTech Innovations', 'The curriculum is relentlessly practical. Building production pipelines directly in the course enabled me to ace my technical interviews.', 'Transitioned from SQL analyst to ML Lead in 8 months.', true, true)
ON CONFLICT (id) DO UPDATE SET
  learner_name = EXCLUDED.learner_name,
  previous_role = EXCLUDED.previous_role,
  previous_company = EXCLUDED.previous_company,
  new_role = EXCLUDED.new_role,
  current_company = EXCLUDED.current_company,
  testimonial = EXCLUDED.testimonial,
  story = EXCLUDED.story,
  is_featured = EXCLUDED.is_featured,
  is_published = EXCLUDED.is_published;

INSERT INTO public.articles (
  id, title, slug, excerpt, content, author, published_at, is_published
) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'The Future of Agentic AI Workflows in 2026', 'future-of-agentic-ai-2026', 'Discover how autonomous multi-agent frameworks are changing modern software engineering.', '# Agentic AI Workflows in 2026\nAutonomous agents are moving from simple chatbots to complex multi-step reasoning systems...', 'Dr. Alistair Vance', NOW(), true),
  ('d0000000-0000-0000-0000-000000000002', 'Mastering RAG Architecture with Vector Indexing', 'mastering-rag-architecture-vector-indexing', 'A comprehensive guide to chunking strategies, embeddings, and hybrid retrieval.', '# RAG Architecture\nRetrieval-Augmented Generation remains the primary standard for enterprise AI search...', 'Dr. Alistair Vance', NOW(), true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  author = EXCLUDED.author,
  is_published = EXCLUDED.is_published;

INSERT INTO public.career_resources (
  id, title, description, resource_type, resource_url, is_published
) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Tech Resume Template 2026', 'ATS-friendly resume layout designed specifically for AI and Software Engineers.', 'RESUME', 'https://apex.academy/resources/resume-template-2026.docx', true),
  ('e0000000-0000-0000-0000-000000000002', 'System Design Interview Preparation Guide', 'Comprehensive guide covering load balancing, database sharding, and caching strategies.', 'INTERVIEW', 'https://apex.academy/resources/system-design-guide.pdf', true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  resource_type = EXCLUDED.resource_type,
  resource_url = EXCLUDED.resource_url,
  is_published = EXCLUDED.is_published;
