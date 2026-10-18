// Video link handling.
//
// One input field; the platform is auto-detected from the URL pattern so a
// brand manager never picks from a dropdown. YouTube and Vimeo get real
// iframe embeds; Facebook, TikTok and Instagram get a thumbnail + button
// that opens in a new tab (their embeds are script-based widgets that break
// easily — a button never does).

export type VideoPlatform =
  | "youtube"
  | "vimeo"
  | "facebook"
  | "tiktok"
  | "instagram"
  | "unknown";

export interface ParsedVideo {
  platform: VideoPlatform;
  /** Set for platforms we embed directly (YouTube, Vimeo). */
  embedUrl?: string;
  /** Poster image, when the platform exposes one without an API call. */
  thumbnailUrl?: string;
  /** Always the original link — used for the click-out platforms. */
  watchUrl: string;
  /** Human-readable name for button copy ("Watch on TikTok"). */
  label: string;
}

const LABELS: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
  unknown: "",
};

function youtubeId(url: URL): string | null {
  if (url.hostname.includes("youtu.be")) {
    return url.pathname.slice(1) || null;
  }
  if (url.pathname.startsWith("/embed/")) {
    return url.pathname.split("/")[2] || null;
  }
  return url.searchParams.get("v");
}

export function parseVideoUrl(raw: string): ParsedVideo {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { platform: "unknown", watchUrl: raw, label: "" };
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    const id = youtubeId(url);
    if (id) {
      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1`,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        watchUrl: raw,
        label: LABELS.youtube,
      };
    }
  }

  if (host.includes("vimeo.com")) {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return {
        platform: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
        // Vimeo thumbnails need an API call — not worth it, so the player
        // shows a plain play surface until clicked.
        watchUrl: raw,
        label: LABELS.vimeo,
      };
    }
  }

  if (host.includes("facebook.com") || host.includes("fb.watch")) {
    return { platform: "facebook", watchUrl: raw, label: LABELS.facebook };
  }
  if (host.includes("tiktok.com")) {
    return { platform: "tiktok", watchUrl: raw, label: LABELS.tiktok };
  }
  if (host.includes("instagram.com")) {
    return { platform: "instagram", watchUrl: raw, label: LABELS.instagram };
  }

  return { platform: "unknown", watchUrl: raw, label: "" };
}
