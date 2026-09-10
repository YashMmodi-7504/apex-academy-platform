/**
 * Sync authoritative YouTube durations into lessons.duration_seconds.
 *
 * Source of truth: supabase/seed/youtube_durations.json, harvested from the
 * YouTube IFrame Player API (player.getDuration()) against each INDIVIDUAL
 * video id — never a playlist, never an estimate.
 *
 * Safety properties:
 *   - Dry run by default; writes only with --apply.
 *   - Record-level targeting: one UPDATE per lesson id. No broad UPDATE.
 *   - Re-runnable: rows already holding the correct value are skipped.
 *   - Cannot invent a duration: an entry without a positive integer
 *     duration_seconds is refused.
 *   - Verifies the lesson still points at the same YouTube video before
 *     writing, so a re-pointed lesson is never given a stale duration.
 *   - Touches only lessons that carry a YouTube video_url. Never touches
 *     ARTICLE/PRACTICAL lessons without video, assessments, or course-level
 *     duration_minutes.
 *
 * Usage:
 *   npx tsx scripts/syncVideoDurations.ts            # dry run (default)
 *   npx tsx scripts/syncVideoDurations.ts --apply    # write
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const MANIFEST = path.join(process.cwd(), 'supabase', 'seed', 'youtube_durations.json');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(2);
}

// Realtime is never used here; stub the transport so the client constructs on
// any Node version (mirrors src/backend/database/supabaseAdmin.ts).
class NoRealtime { constructor() { throw new Error('Realtime not supported in this script'); } }
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: NoRealtime as any },
});

/** Same extraction rule the frontend uses, so script and UI agree. */
const RE = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
const youtubeId = (u?: string | null): string | null => {
  const m = String(u || '').match(RE);
  return m && m[2].length === 11 ? m[2] : null;
};

type Entry = {
  lesson_id: string;
  lesson_title: string;
  youtube_video_id: string;
  duration_seconds: number;
  previous_duration_seconds?: number;
};

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error('Manifest not found:', MANIFEST);
    process.exit(3);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const entries: Entry[] = manifest.lessons || [];

  console.log(`Mode          : ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`);
  console.log(`Manifest      : ${entries.length} verified entries\n`);

  const { data: lessons, error } = await db
    .from('lessons')
    .select('id, title, lesson_type, video_url, duration_seconds');
  if (error) {
    console.error('Failed to read lessons:', error.message);
    process.exit(4);
  }
  const byId = new Map((lessons || []).map((l: any) => [l.id, l]));

  let updated = 0, skippedCorrect = 0, refused = 0, notFound = 0, drifted = 0;

  for (const e of entries) {
    // Refuse anything that is not a positive integer number of seconds.
    if (!Number.isInteger(e.duration_seconds) || e.duration_seconds <= 0) {
      console.log(`  REFUSED  ${e.lesson_title} — manifest duration is not a positive integer`);
      refused++;
      continue;
    }

    const row: any = byId.get(e.lesson_id);
    if (!row) {
      console.log(`  MISSING  ${e.lesson_title} — lesson id not present in database`);
      notFound++;
      continue;
    }

    // The lesson must still point at the video this duration was measured from.
    const currentId = youtubeId(row.video_url);
    if (currentId !== e.youtube_video_id) {
      console.log(`  DRIFTED  ${e.lesson_title} — video changed (${e.youtube_video_id} -> ${currentId ?? 'none'}); not updating`);
      drifted++;
      continue;
    }

    if (row.duration_seconds === e.duration_seconds) {
      skippedCorrect++;
      continue;
    }

    const from = row.duration_seconds ?? 0;
    console.log(`  ${APPLY ? 'UPDATE ' : 'WOULD  '} ${String(from).padStart(5)}s -> ${String(e.duration_seconds).padStart(5)}s  ${e.lesson_title}`);

    if (APPLY) {
      const { error: upErr } = await db
        .from('lessons')
        .update({ duration_seconds: e.duration_seconds })
        .eq('id', e.lesson_id); // record-level targeting
      if (upErr) {
        console.log(`  FAILED   ${e.lesson_title} — ${upErr.message}`);
        continue;
      }
    }
    updated++;
  }

  console.log('\nSummary');
  console.log(`  ${APPLY ? 'updated' : 'would update'} : ${updated}`);
  console.log(`  already correct  : ${skippedCorrect}`);
  console.log(`  refused          : ${refused}`);
  console.log(`  lesson not found : ${notFound}`);
  console.log(`  video drifted    : ${drifted}`);
  if (!APPLY) console.log('\nDry run only. Re-run with --apply to write.');
}

main().catch((e) => {
  console.error('Fatal:', e?.message || e);
  process.exit(1);
});
