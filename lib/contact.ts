// Company contact helpers — PURE.

const NOT_A_USERNAME = new Set(["profile.php", "people", "pages", "groups", "share", "p"]);

/** A Facebook page URL → its Messenger link (m.me/{username}), so "write to
 *  us" opens a chat instead of the page. Null when the URL isn't a plain
 *  facebook.com/{username} address (numeric-id profiles, share links, …). */
export function messengerUrl(facebookUrl: string | undefined): string | null {
  if (!facebookUrl) return null;
  try {
    const url = new URL(facebookUrl);
    if (!/(^|\.)facebook\.com$/i.test(url.hostname)) return null;
    const username = url.pathname.split("/").filter(Boolean)[0];
    if (!username || NOT_A_USERNAME.has(username.toLowerCase())) return null;
    return `https://m.me/${username}`;
  } catch {
    return null;
  }
}
