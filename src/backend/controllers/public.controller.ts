import { Request, Response } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';

/**
 * GET /api/success-stories
 * Fetch all public success stories
 */
export async function getSuccessStories(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('success_stories')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching success stories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch success stories' });
  }
}

/**
 * GET /api/success-stories/:id
 */
export async function getSuccessStoryById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('success_stories')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching success story:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch success story' });
  }
}

/**
 * GET /api/institutions
 */
export async function getInstitutions(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('institutions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching institutions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch institutions' });
  }
}

/**
 * GET /api/institutions/:slug
 */
export async function getInstitutionBySlug(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const { data, error } = await supabaseAdmin
      .from('institutions')
      .select('*, programs(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching institution:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch institution' });
  }
}

/**
 * GET /api/articles
 */
export async function getArticles(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch articles' });
  }
}

/**
 * GET /api/articles/:slug
 */
export async function getArticleBySlug(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('*, categories(*)')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch article' });
  }
}

/**
 * GET /api/search?q=...
 */
export async function searchPublic(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.json({ success: true, data: [] });
      return;
    }

    const searchTerm = `%${query}%`;
    const [coursesRes, programsRes, articlesRes, instRes] = await Promise.all([
      supabaseAdmin.from('courses').select('id, title, short_description, slug, thumbnail_url, difficulty').eq('is_published', true).or(`title.ilike.${searchTerm},short_description.ilike.${searchTerm}`).limit(5),
      supabaseAdmin.from('programs').select('id, title, short_description, slug, hero_image_url').eq('is_published', true).or(`title.ilike.${searchTerm},short_description.ilike.${searchTerm}`).limit(5),
      supabaseAdmin.from('articles').select('id, title, excerpt, slug, thumbnail_url').eq('is_published', true).or(`title.ilike.${searchTerm},excerpt.ilike.${searchTerm}`).limit(5),
      supabaseAdmin.from('institutions').select('id, name, description, slug, logo_url').eq('is_active', true).or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`).limit(5)
    ]);

    const results = [];
    
    if (coursesRes.data) {
      results.push(...coursesRes.data.map(item => ({
        id: item.id, title: item.title, description: item.short_description, type: 'Course', slug: `/courses/${item.slug}`, thumbnail: item.thumbnail_url, badge: item.difficulty
      })));
    }
    if (programsRes.data) {
      results.push(...programsRes.data.map(item => ({
        id: item.id, title: item.title, description: item.short_description, type: 'Program', slug: `/programs/${item.slug}`, thumbnail: item.hero_image_url
      })));
    }
    if (articlesRes.data) {
      results.push(...articlesRes.data.map(item => ({
        id: item.id, title: item.title, description: item.excerpt, type: 'Article', slug: `/resources/${item.slug}`, thumbnail: item.thumbnail_url
      })));
    }
    if (instRes.data) {
      results.push(...instRes.data.map(item => ({
        id: item.id, title: item.name, description: item.description, type: 'Institution', slug: `/institutions/${item.slug}`, thumbnail: item.logo_url
      })));
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error in searchPublic:', error);
    res.status(500).json({ success: false, error: 'Failed to perform search' });
  }
}
