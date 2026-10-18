"use client";

// A public link with its two everyday actions: copy it, or make a QR code
// of it. The QR variant carries `?src=qr` so scans are counted separately
// from web visits in Stats; the copied link stays plain.
//
// Paths are deliberately unprefixed (MN-canonical): a printed QR code must
// not depend on the language the manager happened to be using.

import { useState } from "react";
import { FiCheck, FiCopy, FiExternalLink, FiLink } from "react-icons/fi";
import { MdQrCode2 } from "react-icons/md";
import { useOrigin } from "@/lib/useOrigin";
import { useLanguage } from "@/lib/i18n";
import { QrDialog } from "./QrCodeButton";
import { useToast } from "./ui/Toast";

interface ShareLinkRowProps {
  label: string;
  path: string; // e.g. `/p/{id}` or `/quiz`
  /** Show an "open" button too. */
  openable?: boolean;
}

export default function ShareLinkRow({ label, path, openable }: ShareLinkRowProps) {
  const { t } = useLanguage();
  const origin = useOrigin();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const url = origin ? `${origin}${path}` : path;

  async function handleCopy() {
    if (!origin) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(t("common.linkCopied"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast(t("common.copyFailed"), "error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-10 min-w-0 flex-1 basis-56 items-center gap-2 rounded-lg border border-line bg-subtle/60 px-3">
        <FiLink size={14} className="shrink-0 text-fg-faint" aria-hidden="true" />
        <span className="sr-only">{label}: </span>
        <span className="truncate font-mono text-[0.8125rem] text-fg" title={url}>
          {url.replace(/^https?:\/\//, "")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleCopy} disabled={!origin} className="btn-secondary btn-sm">
          {copied ? <FiCheck size={14} className="text-emerald-600" /> : <FiCopy size={14} />}
          {copied ? t("common.copied") : t("common.copy")}
        </button>
        <button type="button" onClick={() => setQrOpen(true)} disabled={!origin} className="btn-secondary btn-sm">
          <MdQrCode2 size={16} /> {t("common.qrShort")}
        </button>
        {openable && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" aria-label={t("common.open")} title={t("common.open")}>
            <FiExternalLink size={14} />
          </a>
        )}
      </div>
      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} url={`${url}?src=qr`} label={label} />
    </div>
  );
}
