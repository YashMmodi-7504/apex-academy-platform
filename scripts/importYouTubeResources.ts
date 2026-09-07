/**
 * Apex Academy — YouTube learning-resource importer
 * ------------------------------------------------
 * Reads supabase/seed/youtube_resources.json and reconciles it with the database.
 *
 * Design notes:
 *  - IDEMPOTENT. Courses/modules/lessons are matched on natural keys (course.slug,
 *    module.title within a course, lesson.title within a module). Re-running makes
 *    no further changes once converged.
 *  - NON-DESTRUCTIVE. It never overwrites a lesson that already has a different
 *    video_url, never deletes, and never touches learner data (enrollments,
 *    lesson_progress, assessment_attempts, certificates).
 *  - DRY RUN BY DEFAULT. Writes only with --apply.
 *  - Courses are created UNPUBLISHED (is_published = false). Publishing goes
 *    through the existing admin publish guard (toggleCoursePublish), which checks
 *    that every module has lessons and every lesson has content. This deliberately
 *    avoids the publish-all bypass recorded as APX-23.
 *
 * Usage:
 *    npx tsx scripts/importYouTubeResources.ts            # dry run, prints plan
 *    npx tsx scripts/importYouTubeResources.ts --apply    # performs the writes
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../src/backend/database/supabaseAdmin.ts';

const APPLY = process.argv.includes('--apply');
const MANIFEST = path.join(process.cwd(), 'supabase', 'seed', 'youtube_resources.json');

const WATCH_URL = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

/** Accepts every legitimate YouTube URL form and returns the 11-char video id. */
export function parseYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2] && m[2].length === 11 ? m[2] : null;
}

/** Returns the playlist id from a YouTube playlist or watch-in-playlist URL. */
export function parseYouTubePlaylistId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

type Plan = { action: 'CREATE' | 'REUSE' | 'SET_VIDEO' | 'SKIP_CONFLICT' | 'OK'; detail: string };
const plan: Plan[] = [];
const record = (action: Plan['action'], detail: string) => plan.push({ action, detail });

async function run() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

  // ---- 0. Validate every video id in the manifest before touching anything ----
  const seen = new Set<string>();
  for (const c of manifest.new_courses) {
    for (const m of c.modules) {
      for (const l of m.lessons) {
        if (!/^[A-Za-z0-9_-]{11}$/.test(l.video_id)) {
          throw new Error(`Invalid YouTube video id "${l.video_id}" in ${c.slug} / ${m.title} / ${l.title}`);
        }
        if (seen.has(l.video_id)) {
          throw new Error(`Duplicate video id ${l.video_id} in manifest — a canonical video must appear once.`);
        }
        seen.add(l.video_id);
      }
    }
  }
  console.log(`Manifest OK: ${manifest.new_courses.length} courses, ${seen.size} unique video ids.\n`);

  // ---- 1. Snapshot existing state ----
  const { data: courses } = await supabaseAdmin.from('courses').select('id, slug, title');
  const { data: modules } = await supabaseAdmin.from('modules').select('id, course_id, title, display_order');
  const { data: lessons } = await supabaseAdmin.from('lessons').select('id, module_id, title, video_url, display_order');
  const { data: categories } = await supabaseAdmin.from('categories').select('id, slug');
  const { data: programs } = await supabaseAdmin.from('programs').select('id, category_id, title');
  const { data: programCourses } = await supabaseAdmin.from('program_courses').select('program_id, course_id, display_order');

  const bySlug = new Map((courses ?? []).map((c) => [c.slug, c]));
  const existingVideoIds = new Set(
    (lessons ?? []).map((l) => parseYouTubeVideoId(l.video_url)).filter(Boolean) as string[]
  );

  // ---- 2. Reconcile each manifest course ----
  for (const cs of manifest.new_courses) {
    let course = bySlug.get(cs.slug);

    if (!course) {
      record('CREATE', `course ${cs.slug} — "${cs.title}" (unpublished)`);
      if (APPLY) {
        const { data, error } = await supabaseAdmin
          .from('courses')
          .insert({
            slug: cs.slug,
            title: cs.title,
            short_description: cs.short_description,
            description: cs.short_description,
            difficulty: cs.difficulty,
            is_free: true,
            is_published: false,
            certificate_enabled: true,
          })
          .select('id, slug, title')
          .single();
        if (error) throw new Error(`create course ${cs.slug}: ${error.message}`);
        course = data;
        bySlug.set(cs.slug, data);
      } else {
        // Dry run: synthesise an id so the rest of the plan can still be previewed.
        course = { id: `dry:course:${cs.slug}`, slug: cs.slug, title: cs.title };
        bySlug.set(cs.slug, course);
      }
    } else {
      record('REUSE', `course ${cs.slug} already exists`);
    }
    if (!course) continue; // dry run: nothing downstream to resolve against

    // ---- 2a. Attach the course to the domain's career-path program ----
    const cat = (categories ?? []).find((c) => c.slug === cs.attach_to_program_domain);
    const prog = cat ? (programs ?? []).find((p) => p.category_id === cat.id) : undefined;
    if (prog) {
      const linked = (programCourses ?? []).some((pc) => pc.program_id === prog.id && pc.course_id === course!.id);
      if (!linked) {
        const next =
          Math.max(0, ...(programCourses ?? []).filter((pc) => pc.program_id === prog.id).map((pc) => pc.display_order ?? 0)) + 1;
        record('CREATE', `program_courses: "${prog.title}" -> ${cs.slug} (order ${next})`);
        if (APPLY) {
          const { error } = await supabaseAdmin
            .from('program_courses')
            .insert({ program_id: prog.id, course_id: course.id, display_order: next, is_required: true });
          if (error && error.code !== '23505') throw new Error(`link ${cs.slug}: ${error.message}`);
        }
      } else {
        record('OK', `program link for ${cs.slug} already present`);
      }
    } else {
      record('SKIP_CONFLICT', `no program found for domain "${cs.attach_to_program_domain}" — ${cs.slug} left unlinked`);
    }

    // ---- 2b. Modules ----
    for (const ms of cs.modules) {
      let mod = (modules ?? []).find((m) => m.course_id === course!.id && m.title === ms.title);
      if (!mod) {
        record('CREATE', `  module ${cs.slug} / M${ms.order} ${ms.title}`);
        if (APPLY) {
          const { data, error } = await supabaseAdmin
            .from('modules')
            .insert({ course_id: course.id, title: ms.title, display_order: ms.order, is_required: true })
            .select('id, course_id, title, display_order')
            .single();
          if (error) throw new Error(`create module ${ms.title}: ${error.message}`);
          mod = data;
          modules!.push(data);
        } else {
          // Dry run: synthesise an id so lesson planning can still be previewed.
          mod = { id: `dry:module:${cs.slug}:${ms.order}`, course_id: course.id, title: ms.title, display_order: ms.order };
          modules!.push(mod);
        }
      } else {
        record('OK', `  module ${ms.title} already exists`);
      }
      if (!mod) continue;

      // ---- 2c. Lessons ----
      for (const ls of ms.lessons) {
        const url = WATCH_URL(ls.video_id);
        const existing = (lessons ?? []).find((l) => l.module_id === mod!.id && l.title === ls.title);

        if (!existing) {
          if (existingVideoIds.has(ls.video_id)) {
            record('SKIP_CONFLICT', `    video ${ls.video_id} already attached elsewhere — not duplicating`);
            continue;
          }
          record('CREATE', `    lesson ${ls.title}  [${ls.video_id}]`);
          if (APPLY) {
            const { data, error } = await supabaseAdmin
              .from('lessons')
              .insert({
                module_id: mod.id,
                title: ls.title,
                description: null,
                lesson_type: 'VIDEO',
                video_url: url,
                content: `<h2>${ls.title}</h2><p>Watch the lesson video above, then continue to the next item.</p>`,
                duration_seconds: 0,
                display_order: ls.order,
                is_preview: false,
                is_required: true,
              })
              .select('id, module_id, title, video_url, display_order')
              .single();
            if (error) throw new Error(`create lesson ${ls.title}: ${error.message}`);
            lessons!.push(data);
            existingVideoIds.add(ls.video_id);
          }
        } else {
          const current = parseYouTubeVideoId(existing.video_url);
          if (!current) {
            record('SET_VIDEO', `    lesson ${ls.title} -> ${ls.video_id}`);
            if (APPLY) {
              const { error } = await supabaseAdmin.from('lessons').update({ video_url: url }).eq('id', existing.id);
              if (error) throw new Error(`set video on ${ls.title}: ${error.message}`);
            }
          } else if (current !== ls.video_id) {
            record('SKIP_CONFLICT', `    lesson ${ls.title} holds a different video (${current}) — left untouched`);
          } else {
            record('OK', `    lesson ${ls.title} already correct`);
          }
        }
      }
    }
  }

  // ---- 3. Verify the already-integrated set is still intact ----
  const missing: string[] = (manifest.already_integrated_video_ids as string[]).filter((v) => !existingVideoIds.has(v));
  if (missing.length) {
    console.log(`\nWARNING: ${missing.length} previously-integrated video(s) are no longer present: ${missing.join(', ')}`);
  }

  // ---- 4. Report ----
  const counts = plan.reduce<Record<string, number>>((a, p) => ((a[p.action] = (a[p.action] ?? 0) + 1), a), {});
  console.log(plan.map((p) => `${p.action.padEnd(14)} ${p.detail}`).join('\n'));
  console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN — no writes performed'}`);
  console.log(Object.entries(counts).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
  if (!APPLY) console.log('\nRe-run with --apply to perform these writes.');
  if (manifest.conflicts?.some((c: any) => c.resolution === 'UNRESOLVED')) {
    console.log(`\n${manifest.conflicts.filter((c: any) => c.resolution === 'UNRESOLVED').length} unresolved conflict(s) in the manifest — see "conflicts" in youtube_resources.json.`);
  }
}

run().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
