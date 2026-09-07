/**
 * Safe resource type detection from filename and MIME type
 */
export function detectResourceType(
  filename?: string,
  mimeType?: string,
  requestedType?: string
): string {
  const name = (filename || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  const req = (requestedType || '').toUpperCase();

  // 1. VIDEO detection
  if (
    mime.startsWith('video/') ||
    name.endsWith('.mp4') ||
    name.endsWith('.webm') ||
    name.endsWith('.mov') ||
    name.endsWith('.mkv') ||
    name.endsWith('.avi') ||
    name.endsWith('.m4v')
  ) {
    return 'VIDEO';
  }

  // 2. PDF detection
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return 'PDF';
  }

  // 3. PPT / Presentation detection
  if (
    mime.includes('powerpoint') ||
    mime.includes('presentation') ||
    name.endsWith('.ppt') ||
    name.endsWith('.pptx')
  ) {
    return 'PPT';
  }

  // 4. Subtitle detection
  if (
    mime === 'text/vtt' ||
    mime === 'application/x-subrip' ||
    name.endsWith('.vtt') ||
    name.endsWith('.srt')
  ) {
    return 'SUBTITLE';
  }

  // 5. Notebook detection
  if (
    mime.includes('ipynb') ||
    name.endsWith('.ipynb')
  ) {
    return 'NOTEBOOK';
  }

  // 6. Dataset / Spreadsheet detection
  if (
    mime.includes('csv') ||
    mime.includes('parquet') ||
    mime.includes('spreadsheet') ||
    name.endsWith('.csv') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.parquet')
  ) {
    return 'DATASET';
  }

  // 7. Source Code / Script / Zip detection
  if (
    name.endsWith('.zip') ||
    name.endsWith('.py') ||
    name.endsWith('.js') ||
    name.endsWith('.ts') ||
    name.endsWith('.tsx') ||
    name.endsWith('.jsx') ||
    name.endsWith('.java') ||
    name.endsWith('.sql') ||
    name.endsWith('.sh') ||
    name.endsWith('.json') ||
    name.endsWith('.c') ||
    name.endsWith('.cpp') ||
    name.endsWith('.html') ||
    name.endsWith('.css')
  ) {
    return 'CODE';
  }

  // 8. Text Note / Document
  if (
    name.endsWith('.md') ||
    name.endsWith('.txt') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  ) {
    return 'NOTE';
  }

  // 9. If user requested a valid type, respect it
  const VALID_TYPES = ['VIDEO', 'PDF', 'PPT', 'NOTE', 'CODE', 'DATASET', 'NOTEBOOK', 'SUBTITLE', 'LINK'];
  if (req && VALID_TYPES.includes(req)) {
    return req;
  }

  // 10. Fallback: Default to 'NOTE' rather than 'PDF' if unknown document
  return 'NOTE';
}
