// Fallback for a brand logo / product image that fails to load. Still a
// real risk now that product images upload through Cloudinary
// (lib/cloudinary.ts): `brands.logoUrl` has no upload path at all and is
// plain text, an uploaded asset can be deleted from Cloudinary later, and
// products created before the upload flow existed still hold hand-pasted
// URLs. Any of those degrades to this placeholder instead of the browser's
// broken-image icon with overlapping alt text.

import type { SyntheticEvent } from "react";

export const PLACEHOLDER_IMAGE = "/placeholder-image.svg";

/** onError handler for next/image (unoptimized) and plain <img> alike.
 *  Guards against looping if the placeholder itself ever fails to load. */
export function onImageError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.endsWith(PLACEHOLDER_IMAGE)) return;
  img.src = PLACEHOLDER_IMAGE;
}
