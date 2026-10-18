// veramed — server-side HTML sanitization for Lexical-authored content.
//
// Product descriptions and brand "about" copy are HTML from the Lexical
// rich-text editor, rendered via dangerouslySetInnerHTML on the
// brand page and product pages. CLAUDE.md has flagged, more than once,
// that this must be sanitized server-side "the moment a real backend
// exists" — Phase 3 is that moment. Call this in every API route that
// persists description_mn/en or about_mn/en before the value reaches
// Postgres. Never trust the client-sent HTML as-is, even though it comes
// from Lexical's own editor — the request body itself isn't trusted.

import sanitizeHtmlLib from "sanitize-html";

// Exactly the tags Lexical's toolbar (RichTextEditor.tsx) can produce:
// headings (always h2 in practice, h1/h3 allowed as harmless headroom),
// bold/italic/underline, lists, links, line breaks, paragraphs. Anything
// else — scripts, iframes, event handlers, arbitrary styles — is stripped.
//
// Underline needs care: Lexical's HTML export renders it as either a <u>
// tag or a <span style="text-decoration:underline"> depending on version —
// `span` is allowed here ONLY with that one style property, specifically
// so the toolbar's Underline button doesn't silently stop working the
// moment this sanitizer is added.
const ALLOWED_TAGS = ["p", "strong", "em", "u", "span", "ul", "ol", "li", "a", "h1", "h2", "h3", "br"];

export function sanitizeHtml(input: string): string {
  return sanitizeHtmlLib(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href"], span: ["style"] },
    allowedStyles: { span: { "text-decoration": [/^underline$/] } },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}
