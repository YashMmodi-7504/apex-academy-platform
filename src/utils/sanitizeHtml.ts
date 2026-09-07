/**
 * Allowlist HTML sanitiser for admin-authored lesson content.
 *
 * Lesson `content` is stored as HTML (headings, lists, tables, code blocks).
 * It was previously printed as literal text, so learners saw raw `<h2>` markup.
 * Rendering it requires `dangerouslySetInnerHTML`, so it must be sanitised
 * first — that is what this does.
 *
 * Strategy: parse into an inert document (no scripts execute, no resources are
 * fetched during parsing), then walk the tree and delete anything not on the
 * allowlist. Deny-listing is not used because it fails open on anything new.
 */

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'span', 'div', 'section', 'article',
  'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'pre', 'code', 'kbd', 'samp',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'a', 'figure', 'figcaption', 'img',
]);

/** Attributes allowed on any element. `style` is handled separately. */
const ALLOWED_ATTRS = new Set(['class', 'title', 'colspan', 'rowspan', 'scope', 'dir', 'lang']);

/** Only these CSS properties survive from inline styles. */
const ALLOWED_CSS_PROPS = new Set([
  'background', 'background-color', 'color', 'border', 'border-left', 'border-right',
  'border-top', 'border-bottom', 'border-radius', 'border-collapse',
  'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
  'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'font-size', 'font-weight', 'font-family', 'font-style',
  'text-align', 'text-decoration', 'line-height', 'white-space', 'width', 'max-width',
]);

/** Anything that can reach a URL fetcher or a JS context inside a style value. */
const DANGEROUS_CSS = /(expression|javascript:|url\s*\(|@import|behavior|binding)/i;

const SAFE_URL = /^(https?:|mailto:|#|\/)/i;

function sanitizeStyle(value: string): string {
  return value
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const idx = decl.indexOf(':');
      if (idx < 0) return false;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1);
      if (!ALLOWED_CSS_PROPS.has(prop)) return false;
      if (DANGEROUS_CSS.test(val)) return false;
      return true;
    })
    .join('; ');
}

/**
 * Returns HTML safe to pass to dangerouslySetInnerHTML.
 * Returns '' outside the browser (no DOMParser during SSR/tests).
 */
export function sanitizeLessonHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') return '';

  // DOMParser produces an inert document: scripts do not run and img/iframe
  // src values are not fetched while we inspect the tree.
  const doc = new DOMParser().parseFromString(`<body>${raw}</body>`, 'text/html');

  const walk = (node: Element) => {
    // Iterate over a static copy — the live list mutates as we remove nodes.
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap unknown structural elements so their text survives, but drop
        // executable/embedding containers entirely.
        if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' ||
            tag === 'embed' || tag === 'link' || tag === 'meta' || tag === 'form' ||
            tag === 'input' || tag === 'button' || tag === 'svg' || tag === 'math') {
          child.remove();
        } else {
          const text = doc.createTextNode(child.textContent || '');
          child.replaceWith(text);
        }
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();

        // Every inline event handler.
        if (name.startsWith('on')) { child.removeAttribute(attr.name); continue; }

        if (name === 'style') {
          const cleaned = sanitizeStyle(attr.value);
          if (cleaned) child.setAttribute('style', cleaned);
          else child.removeAttribute('style');
          continue;
        }

        if (name === 'href' && tag === 'a') {
          if (!SAFE_URL.test(attr.value.trim())) child.removeAttribute('href');
          continue;
        }

        if (name === 'src' && tag === 'img') {
          if (!SAFE_URL.test(attr.value.trim())) child.remove();
          continue;
        }

        if (name === 'alt' && tag === 'img') continue;

        if (!ALLOWED_ATTRS.has(name)) child.removeAttribute(attr.name);
      }

      // External links must not silently hand the opener to another origin.
      if (tag === 'a' && child.getAttribute('href')?.startsWith('http')) {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer nofollow');
      }

      walk(child);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

/** True when the string carries block-level HTML worth rendering as markup. */
export function looksLikeHtml(s: string | null | undefined): boolean {
  if (!s) return false;
  return /<\s*(h[1-6]|p|div|ul|ol|li|table|pre|blockquote|strong|em)\b[^>]*>/i.test(s);
}
