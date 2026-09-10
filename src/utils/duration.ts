/**
 * Single source of truth for rendering lesson durations.
 *
 * `lessons.duration_seconds` holds the authoritative length of the lesson's
 * individual YouTube video (see supabase/seed/youtube_durations.json and
 * scripts/syncVideoDurations.ts). Previously three components each did their
 * own `Math.round(seconds / 60) + ' min'`, which discarded the seconds and
 * showed e.g. "4 min" for a 4:01 video and "9 min" for an 8:34 one.
 *
 * Formatting rule — exact, never rounded away:
 *   45     -> "45s"
 *   480    -> "8m"          (whole minutes drop the seconds component)
 *   514    -> "8m 34s"
 *   5375   -> "1h 29m 35s"
 *
 * Returns null for missing/zero/invalid input so callers can omit the element
 * entirely rather than render a misleading "0m".
 */
export function formatLessonDuration(seconds?: number | null): string | null {
  if (seconds === null || seconds === undefined) return null;
  const total = Math.floor(Number(seconds));
  if (!Number.isFinite(total) || total <= 0) return null;

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * Clock form (`8:34`, `1:29:35`) for use beside a player scrubber, where a
 * timestamp reads more naturally than the compact form above.
 */
export function formatClock(seconds?: number | null): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
}
