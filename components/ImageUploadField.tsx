"use client";

// An image as a tile, not a text box: what the manager sees is the picture
// itself. Two modes, chosen by isCloudinaryConfigured():
//
//   - Upload: click the tile (or drop a file on it) to upload; hover shows
//     "Replace". Uploading shows progress over the old picture.
//   - Link only (no Cloudinary keys): the tile previews whatever URL is in
//     the small field under it. Same component, so every caller works with
//     zero setup.
//
// `onRemove` adds a remove button to the corner — gallery images use it,
// the required main image doesn't.

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { FiImage, FiUploadCloud, FiX } from "react-icons/fi";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { onImageError } from "@/lib/media";
import { useLanguage } from "@/lib/i18n";
import Spinner from "./Spinner";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** Names the image for screen readers and the link field ("Main image"). */
  label: string;
  onRemove?: () => void;
  /** A small badge in the corner — "Cover" on the main image. */
  badge?: string;
  invalid?: boolean;
}

export default function ImageUploadField({ value, onChange, label, onRemove, badge, invalid }: ImageUploadFieldProps) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlId = useId();
  const canUpload = isCloudinaryConfigured();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError(true);
      return;
    }
    setUploading(true);
    setError(false);
    try {
      onChange(await uploadImage(file));
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  const frame = `group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-subtle/60 transition ${
    invalid
      ? "border-red-500"
      : dragging
        ? "border-brand-500 ring-4 ring-brand-500/15"
        : value
          ? "border-line"
          : "border-dashed border-line-strong"
  }`;

  const picture = value ? (
    <Image
      key={value}
      src={value}
      alt={label}
      width={320}
      height={320}
      unoptimized
      onError={onImageError}
      className="h-full w-full object-contain p-2"
    />
  ) : (
    <span className="flex flex-col items-center gap-2 px-3 text-center text-fg-muted">
      {canUpload ? <FiUploadCloud size={22} /> : <FiImage size={22} />}
      <span className="text-xs font-medium leading-snug">
        {canUpload ? t("media.dropOrClick") : t("media.pasteLinkBelow")}
      </span>
    </span>
  );

  return (
    <div className="min-w-0">
      <div className="relative">
        {canUpload ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-label={`${label}: ${value ? t("media.uploadChange") : t("media.uploadLabel")}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={`${frame} hover:border-brand-500`}
          >
            {picture}
            {value && !uploading && (
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/55 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <FiUploadCloud size={13} /> {t("media.uploadChange")}
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/80 text-xs font-medium text-fg-muted backdrop-blur-[1px]">
                <Spinner className="h-5 w-5 text-brand-600" />
                {t("media.uploading")}
              </span>
            )}
          </button>
        ) : (
          <div className={frame}>{picture}</div>
        )}

        {badge && value && (
          <span className="pointer-events-none absolute left-2 top-2 rounded bg-fg/85 px-1.5 py-0.5 text-[0.6875rem] font-medium text-page">
            {badge}
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${label}: ${t("common.remove")}`}
            title={t("common.remove")}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface/90 text-fg-muted shadow-xs backdrop-blur transition hover:border-red-500/40 hover:text-red-600"
          >
            <FiX size={14} />
          </button>
        )}
      </div>

      {canUpload ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = ""; // lets choosing the same file again re-fire onChange
          }}
        />
      ) : (
        <>
          <label htmlFor={urlId} className="sr-only">
            {label} — {t("media.imageLink")}
          </label>
          <input
            id={urlId}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            placeholder="https://…"
            className={`field field-sm mt-2 text-xs ${invalid ? "field-invalid" : ""}`}
          />
        </>
      )}
      {error && <p className="field-error">{t("media.uploadError")}</p>}
    </div>
  );
}
