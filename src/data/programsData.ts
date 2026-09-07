export interface ModuleItem {
  id: string;
  title: string;
  duration: string;
  description: string;
  topics: string[];
  toolsCovered: string[];
  project?: string;
}

export interface ProgramData {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  institution: string;
  institutionLogo?: string;
  badge: string;
  rating: number;
  reviewsCount: number;
  duration: string;
  commitment: string;
  format: string;
  nextCohort: string;
  fee: {
    total: string;
    emiStart: string;
    currency: string;
  };
  highlights: { title: string; description: string; iconName: string }[];
  whoShouldAttend: { role: string; desc: string; iconName: string }[];
  curriculum: ModuleItem[];
  tools: { name: string; category: string; iconBg?: string }[];
  projects: {
    title: string;
    domain: string;
    description: string;
    techStack: string[];
    image: string;
  }[];
  certificate: {
    title: string;
    issuer: string;
    sampleId: string;
    description: string;
  };
  faculty: {
    name: string;
    title: string;
    organization: string;
    experience: string;
    avatar: string;
  }[];
  careerOutcomes: {
    avgSalaryHike: string;
    hiringPartners: string[];
    placementRate: string;
  };
  faqs: { question: string; answer: string }[];
}

export const PROGRAM_DETAILS_MAP: Record<string, ProgramData> = {
  'genai-leaders': {
    id: 'genai-leaders',
    slug: 'genai-leaders',
    title: 'Executive Certificate in Generative AI, LLMs & AI Agents',
    subtitle: 'Joint Executive Education Program with IIT Bombay & Apex AI Research Lab. Master LLM Fine-Tuning, RAG Architecture, Prompt Engineering & Autonomous AI Agents with Live Mentorship.',
    institution: 'IIT Bombay & Apex Executive Ed',
    badge: 'Ranked #1 GenAI Program in 2026',
    rating: 4.92,
    reviewsCount: 3420,
    duration: '6 Months',
    commitment: '6-8 Hours / Week',
    format: 'Online Live Masterclasses + Weekend Mentorship',
    nextCohort: 'September 15, 2026',
    fee: {
      total: '₹1,25,000 + GST',
      emiStart: '₹4,999 / month',
      currency: 'INR',
    },
    highlights: [
      {
        title: 'Live Faculty Masterclasses',
        description: 'Interactive lectures delivered by senior CS faculty from IIT Bombay and Silicon Valley AI Architects.',
        iconName: 'GraduationCap',
      },
      {
        title: '12+ Production-Grade Projects',
        description: 'Build enterprise RAG pipelines, fine-tuned LLaMA-3 models, and multi-agent AI automation systems.',
        iconName: 'Code',
      },
      {
        title: '1:1 Industry Mentorship',
        description: 'Weekly mentorship sessions with Lead AI Engineers from OpenAI, Google DeepMind, and Microsoft.',
        iconName: 'Users',
      },
      {
        title: 'Cryptographic Certificate',
        description: 'Co-branded certificate with verifiable QR code and blockchain hash for instant LinkedIn endorsement.',
        iconName: 'Award',
      },
      {
        title: 'Dedicated Career Support',
        description: 'Resume polishing, 1:1 mock technical interviews, and direct referral to 3,300+ hiring partners.',
        iconName: 'Briefcase',
      },
      {
        title: 'Executive Alumni Network',
        description: 'Gain lifelong access to the Apex & IIT Alumni Directory, exclusive AI roundtables, and hackathons.',
        iconName: 'ShieldCheck',
      },
    ],
    whoShouldAttend: [
      {
        role: 'Software Engineers & Developers',
        desc: 'Engineers looking to transition into Generative AI, LLM Engineering, and Autonomous Agent Development.',
        iconName: 'Code2',
      },
      {
        role: 'Data Scientists & ML Engineers',
        desc: 'Practitioners wanting to master modern Transformer architectures, Fine-Tuning (LoRA/QLoRA), and Vector DBs.',
        iconName: 'BrainCircuit',
      },
      {
        role: 'Product Managers & Tech Leads',
        desc: 'Leaders seeking to integrate GenAI capabilities into enterprise products and automate business workflows.',
        iconName: 'Sparkles',
      },
      {
        role: 'CTOs & Tech Executives',
        desc: 'Decision-makers building enterprise AI roadmaps, evaluating model performance, security, and cloud deployment.',
        iconName: 'Building2',
      },
    ],
    curriculum: [
      {
        id: 'mod-1',
        title: 'Module 1: Foundations of Deep Learning & Natural Language Processing',
        duration: '4 Weeks',
        description: 'Build a rock-solid mathematical and practical foundation in neural networks, PyTorch, word embeddings, and attention mechanisms.',
        topics: [
          'Neural Networks, Backpropagation & Optimizers in PyTorch',
          'Word Embeddings: Word2Vec, GloVe, FastText',
          'Recurrent Neural Networks (RNNs) & LSTMs for Text',
          'Introduction to Sequence-to-Sequence Models & Encoder-Decoder Architecture',
        ],
        toolsCovered: ['Python 3.11', 'PyTorch 2.2', 'NumPy', 'Scikit-Learn'],
        project: 'Building a Customer Support Sentiment & Intent Classifier from scratch in PyTorch.',
      },
      {
        id: 'mod-2',
        title: 'Module 2: Transformer Architectures, HuggingFace & LLM Fundamentals',
        duration: '5 Weeks',
        description: 'Deep dive into Self-Attention, Multi-Head Attention, BERT, GPT-4, LLaMA, and model tokenization.',
        topics: [
          'The Transformer Breakthrough: Attention Is All You Need',
          'Decoder-only vs. Encoder-only vs. Encoder-Decoder LLMs',
          'Tokenization: BPE, WordPiece, Tiktoken & Vocabulary Design',
          'HuggingFace Transformers, Datasets & Accelerate Libraries',
        ],
        toolsCovered: ['HuggingFace', 'Transformers', 'Tiktoken', 'Google Colab Pro'],
        project: 'Custom Code Autocomplete Model trained on GitHub repositories using HuggingFace.',
      },
      {
        id: 'mod-3',
        title: 'Module 3: Advanced Prompt Engineering & In-Context Learning',
        duration: '3 Weeks',
        description: 'Master system prompts, Chain-of-Thought (CoT), Tree-of-Thought (ToT), Directional Stimulus, and Few-Shot prompting strategies.',
        topics: [
          'Zero-shot, Few-shot & Chain-of-Thought (CoT) Prompting',
          'ReAct Framework: Reason and Act Loops in LLMs',
          'Structured Output Generation: Pydantic, JSON Mode, Outlines',
          'Prompt Leakage, Injection Defense & Model Guardrails (NeMo Guardrails)',
        ],
        toolsCovered: ['OpenAI API', 'Anthropic Claude 3.5', 'NeMo Guardrails', 'Instructor'],
        project: 'Building an Automated Financial Contract Auditor with Strict JSON Schema Guardrails.',
      },
      {
        id: 'mod-4',
        title: 'Module 4: Retrieval-Augmented Generation (RAG) & Vector Databases',
        duration: '5 Weeks',
        description: 'Architect production-grade RAG systems with hybrid search, semantic chunking, re-ranking, and vector databases.',
        topics: [
          'Vector Embeddings & Similarity Metrics (Cosine, Dot Product, Euclidean)',
          'Vector DBs: Pinecone, Qdrant, ChromaDB, PGVector',
          'Advanced Chunking Strategies: Parent-Child, Semantic Chunking',
          'Hybrid Search (BM25 + Dense Vectors) & Re-Ranking with Cohere',
          'RAG Evaluation Metrics: RAGAS, Faithfulness, Context Precision',
        ],
        toolsCovered: ['Pinecone', 'ChromaDB', 'PGVector', 'LlamaIndex', 'Cohere Rerank', 'RAGAS'],
        project: 'Enterprise Multi-PDF Technical Manual Q&A Engine with Hybrid Vector Search.',
      },
      {
        id: 'mod-5',
        title: 'Module 5: Fine-Tuning LLMs, Parameter-Efficient Tuning & Quantization',
        duration: '4 Weeks',
        description: 'Learn when and how to fine-tune open-source models like LLaMA-3, Mistral, and Gemma for domain-specific tasks.',
        topics: [
          'Full Fine-Tuning vs. PEFT (Parameter-Efficient Fine-Tuning)',
          'LoRA (Low-Rank Adaptation) & QLoRA 4-bit Quantization',
          'Supervised Fine-Tuning (SFT) & Dataset Curation',
          'RLHF (Reinforcement Learning from Human Feedback) & DPO (Direct Preference Optimization)',
        ],
        toolsCovered: ['Unsloth', 'TRL', 'PEFT', 'BitsAndBytes', 'Weights & Biases'],
        project: 'Fine-Tuning LLaMA-3 8B on Medical Records for Automated Clinical Diagnosis Summary.',
      },
      {
        id: 'mod-6',
        title: 'Module 6: Autonomous AI Agents & Multi-Agent Workflows',
        duration: '5 Weeks',
        description: 'Design and deploy autonomous AI agents capable of planning, using external APIs/tools, memory management, and multi-agent collaboration.',
        topics: [
          'Agent Anatomy: Perception, Planning, Memory, Tool Calling',
          'LangChain, LangGraph & AutoGen Frameworks',
          'Short-term & Long-term Agent Memory (Mem0, Redis)',
          'Multi-Agent Orchestration: Supervisor & Hierarchical Agent Swarms',
        ],
        toolsCovered: ['LangGraph', 'AutoGen', 'CrewAI', 'Mem0', 'Tavily Search API'],
        project: 'Autonomous Software Engineering Agent that Reads GitHub Issues, Writes Code, and Submits Pull Requests.',
      },
      {
        id: 'mod-7',
        title: 'Capstone Module: Production Deployment & Scale',
        duration: '4 Weeks',
        description: 'Deploy GenAI apps with low latency using vLLM, TensorRT-LLM, Docker, Cloud APIs, and real-time monitoring.',
        topics: [
          'Fast LLM Serving: vLLM, Ollama, TGI & TensorRT-LLM',
          'API Gateway, Rate Limiting & Streaming Responses in FastAPI',
          'Observability: Arize Phoenix, LangSmith, TruLens',
          'Final Capstone Defense before IIT Bombay & Industry Panel',
        ],
        toolsCovered: ['vLLM', 'FastAPI', 'Docker', 'LangSmith', 'AWS SageMaker'],
        project: 'Production Deployment of an End-to-End Enterprise Multi-Agent Knowledge System with Monitoring.',
      },
    ],
    tools: [
      { name: 'Python 3.11', category: 'Programming Language' },
      { name: 'PyTorch', category: 'Deep Learning Framework' },
      { name: 'HuggingFace', category: 'Model Hub & Datasets' },
      { name: 'OpenAI GPT-4o', category: 'Proprietary LLMs' },
      { name: 'Anthropic Claude', category: 'Reasoning Models' },
      { name: 'LangChain & LangGraph', category: 'Agentic Frameworks' },
      { name: 'LlamaIndex', category: 'Data Framework for RAG' },
      { name: 'Pinecone Vector DB', category: 'Vector Infrastructure' },
      { name: 'Qdrant & Chroma', category: 'Vector Databases' },
      { name: 'vLLM', category: 'High-Throughput LLM Serving' },
      { name: 'Docker & FastAPI', category: 'Deployment & Microservices' },
      { name: 'Unsloth & QLoRA', category: 'Model Fine-Tuning' },
    ],
    projects: [
      {
        title: 'Enterprise Financial Document RAG Assistant',
        domain: 'FinTech & Banking',
        description: 'Developed a high-accuracy document Q&A engine over 10,000+ SEC 10-K filings using hybrid vector search, Cohere re-ranking, and strict source citation.',
        techStack: ['LlamaIndex', 'Pinecone', 'OpenAI', 'Cohere', 'FastAPI'],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
      },
      {
        title: 'Autonomous Multi-Agent Code Auditor & Security Agent',
        domain: 'DevOps & Cybersecurity',
        description: 'Built a multi-agent swarm using LangGraph where an architect agent drafts system designs, a developer agent writes code, and a reviewer agent performs automated security audits.',
        techStack: ['LangGraph', 'Claude 3.5 Sonnet', 'Docker', 'Tavily', 'GitHub API'],
        image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
      },
      {
        title: 'Fine-Tuned Domain Specialist LLaMA-3 Model',
        domain: 'Healthcare & Medical Diagnostics',
        description: 'Fine-tuned LLaMA-3 8B using QLoRA and Unsloth on 500,000 anonymized medical consultation records, achieving 94% diagnostic summary accuracy.',
        techStack: ['PyTorch', 'Unsloth', 'QLoRA', 'HuggingFace', 'Weights & Biases'],
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
      },
    ],
    certificate: {
      title: 'Executive Certificate in Generative AI, LLMs & AI Agents',
      issuer: 'Apex Executive Education & IIT Bombay AI Lab',
      sampleId: 'APEX-IITB-GENAI-2026-9842',
      description: 'Upon successful completion, learners earn a globally accredited credential verified on blockchain, signed by IIT Bombay CS Faculty Directors and Apex Executive Deans.',
    },
    faculty: [
      {
        name: 'Dr. Ramesh K. Sharma',
        title: 'Professor of Computer Science & AI Lab Director',
        organization: 'IIT Bombay',
        experience: '22+ Years in AI Research, 140+ Published Papers',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Dr. Sarah Chen',
        title: 'Chief GenAI Architect & Ex-Google Brain Scientist',
        organization: 'Apex AI Research Lab',
        experience: '15+ Years in Machine Learning, Co-Author Transformer Papers',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Arjun Mehta',
        title: 'Principal Engineer (LLM Infrastructure)',
        organization: 'Anthropic AI',
        experience: '10+ Years in Distributed AI & Large Model Training',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      },
    ],
    careerOutcomes: {
      avgSalaryHike: '54%',
      hiringPartners: ['Google', 'Amazon', 'Microsoft', 'McKinsey', 'Deloitte', 'Flipkart', 'Goldman Sachs', 'Uber'],
      placementRate: '92% Transitioned to AI Roles within 6 Months',
    },
    faqs: [
      {
        question: 'Is prior experience in Machine Learning required for this program?',
        answer: 'Basic knowledge of Python programming is recommended. The program includes a 2-week prerequisite Python & Math bootcamp to ensure learners of all backgrounds build strong fundamentals.',
      },
      {
        question: 'What is the format of the live classes and time commitment?',
        answer: 'Live interactive masterclasses are held on weekends (Saturdays and Sundays, 2 hours each). Weekdays require 3-4 hours of self-paced lab work and project development.',
      },
      {
        question: 'How is the certificate issued and verified?',
        answer: 'The certificate is issued jointly by Apex Executive Education and IIT Bombay AI Lab. It features a unique QR code and cryptographic verification hash that can be checked on our public verification portal.',
      },
      {
        question: 'What financial aid or EMI options are available?',
        answer: 'We offer 0% Interest No-Cost EMI plans starting at ₹4,999/month through our financial partners. Scholarships up to 25% are available for meritorious applicants.',
      },
    ],
  },
};

// Fallback generator for any other program slug
export function getProgramDataBySlug(slug: string): ProgramData | null {
  // Returns null for an unknown slug. This previously spread the
  // 'genai-leaders' record over the requested slug, which meant any URL under
  // /programs/ rendered another program's faculty, partner and outcome claims
  // as if they belonged to it.
  return PROGRAM_DETAILS_MAP[slug] || null;
}
