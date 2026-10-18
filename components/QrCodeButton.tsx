"use client";

// QR code for a product or quiz link — generated in the browser, nothing
// stored anywhere. PNG for screens, SVG for print (it scales without
// blurring on packaging).
//
// QrDialog is the dialog alone, controlled from outside — a row menu opens
// it. QrCodeButton is a button that owns one.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { MdQrCode2 } from "react-icons/md";
import { FiDownload, FiX } from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";

interface QrDialogProps {
  open: boolean;
  onClose: () => void;
  url: string;
  label: string;
}

/** File-name-safe version of a label. */
function fileStem(label: string) {
  return label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "qr-code";
}

export function QrDialog({ open, onClose, url, label }: QrDialogProps) {
  const { t } = useLanguage();
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function download(href: string, ext: string) {
    const link = document.createElement("a");
    link.download = `${fileStem(label)}-qr.${ext}`;
    link.href = href;
    link.click();
  }

  function downloadPng() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (canvas) download(canvas.toDataURL("image/png"), "png");
  }

  function downloadSvg() {
    const svg = svgWrapRef.current?.querySelector("svg");
    if (!svg) return;
    const blobUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" })
    );
    download(blobUrl, "svg");
    URL.revokeObjectURL(blobUrl);
  }

  return createPortal(
    <div className="fixed inset-0 z-overlay flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] motion-safe:animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${t("common.qrCode")}: ${label}`}
        className="relative w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-pop motion-safe:animate-pop-in"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">{t("common.qrCode")}</h2>
            <p className="mt-0.5 truncate text-sm text-fg-muted">{label}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="icon-btn -mr-1.5 -mt-1">
            <FiX size={18} />
          </button>
        </div>

        {/* Always black-on-white, whatever the theme — a light-on-dark QR
            code doesn't scan on many phones. */}
        <div className="mt-4 flex justify-center rounded-lg border border-line bg-white p-5">
          <div ref={canvasWrapRef}>
            <QRCodeCanvas value={url} size={192} marginSize={1} />
          </div>
          <div ref={svgWrapRef} className="hidden">
            <QRCodeSVG value={url} size={192} marginSize={1} />
          </div>
        </div>

        <p className="mt-3 truncate rounded-md bg-subtle px-2.5 py-1.5 font-mono text-xs text-fg-muted" title={url}>
          {url}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">{t("qr.hint")}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={downloadPng} className="btn-primary btn-sm">
            <FiDownload size={14} /> PNG
          </button>
          <button type="button" onClick={downloadSvg} className="btn-secondary btn-sm">
            <FiDownload size={14} /> SVG
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function QrCodeButton({ url, label = "QR" }: { url: string; label?: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary btn-sm">
        <MdQrCode2 size={16} /> {t("common.qrShort")}
      </button>
      <QrDialog open={open} onClose={() => setOpen(false)} url={url} label={label} />
    </>
  );
}
