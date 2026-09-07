import { supabaseAdmin } from './src/backend/database/supabaseAdmin.ts';

const institutions = [
  { id: '20000000-0000-0000-0000-000000000001', name: 'Apex Institute of Technology', slug: 'apex-tech', description: 'Premier global institution for software engineering, system architecture, and AI research.', website: 'https://apex.institute', country: 'India', is_active: true },
  { id: '20000000-0000-0000-0000-000000000002', name: 'Vanguard Business School', slug: 'vanguard-business', description: 'Leading executive institute specializing in digital business transformation and leadership.', website: 'https://vanguard.edu', country: 'United States', is_active: true },
  { id: '20000000-0000-0000-0000-000000000003', name: 'Global Institute of Applied AI', slug: 'global-ai-inst', description: 'Pioneering research academy producing world-class AI engineers and ML practitioners.', website: 'https://globalai.org', country: 'United Kingdom', is_active: true },
  { id: '20000000-0000-0000-0000-000000000004', name: 'Horizon School of Data Science', slug: 'horizon-data', description: 'Specialized center for advanced analytics, big data engineering, and business intelligence.', website: 'https://horizon.edu', country: 'Singapore', is_active: true }
];

const successStories = [
  { id: 'c0000000-0000-0000-0000-000000000001', learner_name: 'Rohan Mehta', previous_role: 'Junior Software Developer', previous_company: 'Local Tech Firm', new_role: 'Senior Generative AI Architect', current_company: 'Global Cloud Enterprise', testimonial: 'Apex Academy transformed my career trajectory.', story: 'Detailed transition journey.', is_featured: true, is_published: true },
  { id: 'c0000000-0000-0000-0000-000000000002', learner_name: 'Ananya Roy', previous_role: 'Data Analyst', previous_company: 'Retail Retailers', new_role: 'Lead Data Scientist', current_company: 'FinTech Innovations', testimonial: 'The curriculum is relentlessly practical.', story: 'Transitioned from SQL analyst to ML Lead in 8 months.', is_featured: true, is_published: true }
];

const articles = [
  { id: 'd0000000-0000-0000-0000-000000000001', title: 'The Future of Agentic AI Workflows in 2026', slug: 'future-of-agentic-ai-2026', excerpt: 'Discover how autonomous multi-agent frameworks are changing modern software engineering.', content: '# Agentic AI Workflows in 2026\nAutonomous agents are moving from simple chatbots to complex multi-step reasoning systems...', author: 'Dr. Alistair Vance', published_at: new Date().toISOString(), is_published: true },
  { id: 'd0000000-0000-0000-0000-000000000002', title: 'Mastering RAG Architecture with Vector Indexing', slug: 'mastering-rag-architecture-vector-indexing', excerpt: 'A comprehensive guide to chunking strategies, embeddings, and hybrid retrieval.', content: '# RAG Architecture\nRetrieval-Augmented Generation remains the primary standard for enterprise AI search...', author: 'Dr. Alistair Vance', published_at: new Date().toISOString(), is_published: true }
];

async function main() {
  console.log('Seeding institutions...');
  const { error: err1 } = await supabaseAdmin.from('institutions').upsert(institutions);
  console.log('Institutions seed:', err1 ? err1.message : 'Success');

  console.log('Seeding success_stories...');
  const { error: err2 } = await supabaseAdmin.from('success_stories').upsert(successStories);
  console.log('Success stories seed:', err2 ? err2.message : 'Success');

  console.log('Seeding articles...');
  const { error: err3 } = await supabaseAdmin.from('articles').upsert(articles);
  console.log('Articles seed:', err3 ? err3.message : 'Success');
}

main();
