"use client";

// veramed — real image upload (docs/CLOUDINARY-SETUP.md). Client-
// only: an unsigned upload preset is uploaded to straight from the
// browser, no server round-trip and no secret involved on this path — the
// two env vars read here are NEXT_PUBLIC_ on purpose. isCloudinaryConfigured()
// gates the upload widget the same way isQpayConfigured() gates QPay: build
// to spec, ship a working fallback (the plain URL text field) either way.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/** Uploads one image file to Cloudinary and returns its permanent
 *  `secure_url`. Throws on failure — callers show that as a save error,
 *  same as any other failed write in this app. */
export async function uploadImage(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.status}`);
  }
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
