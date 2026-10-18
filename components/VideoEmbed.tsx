"use client";

// video.
//
// Click-to-play, never autoplay: the iframe isn't created until the visitor
// asks for it. iOS Safari blocks autoplay-with-sound anyway, and autoplay
// burns mobile data before anyone asked for the video — a real cost on
// Mongolian mobile plans.

import { useState } from "react";
import Image from "next/image";
import { FiExternalLink, FiPlay } from "react-icons/fi";
import { parseVideoUrl } from "@/lib/video";
import { useLanguage } from "@/lib/i18n";

export default function VideoEmbed({ url }: { url: string }) {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const video = parseVideoUrl(url);

  if (video.platform === "unknown") {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-subtle p-4 text-center text-sm text-fg-muted">
        {t("video.unsupported")}
      </div>
    );
  }

  // Facebook / TikTok / Instagram: click-out, not embed.
  if (!video.embedUrl) {
    return (
      <a
        href={video.watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-8 text-sm font-medium text-white transition hover:bg-gray-800"
      >
        <FiPlay /> {t("video.watchOn", { platform: video.label })}
        <FiExternalLink size={14} />
      </a>
    );
  }

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl bg-black">
        <iframe
          src={video.embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`${video.label} video`}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-900"
      aria-label={t("video.watchOn", { platform: video.label })}
    >
      {video.thumbnailUrl && (
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          className="object-cover opacity-80 transition group-hover:opacity-60"
        />
      )}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-surface/90 text-fg shadow-lg transition group-hover:scale-105">
        <FiPlay size={22} className="ml-1" />
      </span>
    </button>
  );
}
