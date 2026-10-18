"use client";

// Shared block: a product's own social links + contact info, shown together
// as one labelled row. Renders nothing when neither is filled in — a
// template can place it unconditionally.

import {
  FiFacebook,
  FiInstagram,
  FiMessageCircle,
  FiPhone,
} from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";
import { Product } from "@/lib/types";

export default function SocialBlock({ product }: { product: Product }) {
  const { t } = useLanguage();

  // Phone first — it is the one a visitor can act on without leaving the
  // page for another app's login wall.
  const links = [
    {
      href: product.contact?.phone ? `tel:${product.contact.phone}` : undefined,
      Icon: FiPhone,
      label: product.contact?.phone,
      external: false,
    },
    {
      href: product.contact?.whatsapp
        ? `https://wa.me/${product.contact.whatsapp.replace(/\D/g, "")}`
        : undefined,
      Icon: FiMessageCircle,
      label: "WhatsApp",
      external: true,
    },
    { href: product.social?.facebook, Icon: FiFacebook, label: "Facebook", external: true },
    { href: product.social?.instagram, Icon: FiInstagram, label: "Instagram", external: true },
  ].filter((l) => l.href);

  if (links.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-fg-faint">
        {t("product.contactHeading")}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map(({ href, Icon, label, external }) => (
          <a
            key={label}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm text-fg-muted transition hover:border-brand-500 hover:text-fg active:scale-[0.98]"
          >
            <Icon size={15} className="shrink-0" />
            <span className="tabular-nums">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
