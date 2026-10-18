"use client";

// Shared block: product video. Renders nothing when the product has no
// videoUrl, so a template can place it unconditionally.

import { Product } from "@/lib/types";
import VideoEmbed from "@/components/VideoEmbed";

export default function VideoBlock({ product }: { product: Product }) {
  if (!product.videoUrl) return null;
  return <VideoEmbed url={product.videoUrl} />;
}
