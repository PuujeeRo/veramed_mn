"use client";

import { IconType } from "react-icons";
import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiMessageCircle, FiPhone } from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";
import { messengerUrl } from "@/lib/contact";
import { Brand } from "@/lib/types";

interface Channel {
  key: string;
  Icon: IconType;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}

export default function ContactView({ brand }: { brand: Brand }) {
  const { t } = useLanguage();
  const c = brand.contact ?? {};
  const messenger = messengerUrl(c.facebook);

  // Phone first — the one a visitor can act on without another app's login.
  const channels: Channel[] = [];
  if (c.phone) channels.push({ key: "phone", Icon: FiPhone, label: t("contact.phone"), value: c.phone, href: `tel:${c.phone}` });
  if (messenger) channels.push({ key: "messenger", Icon: FiMessageCircle, label: "Messenger", value: t("contact.messengerHint"), href: messenger, external: true });
  if (c.facebook) channels.push({ key: "facebook", Icon: FiFacebook, label: "Facebook", value: t("contact.facebookHint"), href: c.facebook, external: true });
  if (c.instagram) channels.push({ key: "instagram", Icon: FiInstagram, label: "Instagram", value: t("contact.instagramHint"), href: c.instagram, external: true });
  if (c.email) channels.push({ key: "email", Icon: FiMail, label: t("contact.email"), value: c.email, href: `mailto:${c.email}` });
  if (c.address) channels.push({ key: "address", Icon: FiMapPin, label: t("contact.address"), value: c.address });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{t("contact.title")}</h1>
      <p className="mt-4 max-w-[60ch] text-fg-muted">{t("contact.subtitle")}</p>

      {channels.length === 0 ? (
        <p className="mt-10 text-fg-muted">{t("contact.empty")}</p>
      ) : (
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {channels.map(({ key, Icon, label, value, href, external }) => {
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{label}</span>
                  <span className="mt-0.5 block text-sm text-fg-muted [overflow-wrap:anywhere]">{value}</span>
                </span>
              </>
            );
            const box = "flex h-full items-start gap-3 rounded-2xl border border-line bg-surface p-4";
            return (
              <li key={key}>
                {href ? (
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`${box} transition hover:border-brand-500`}
                  >
                    {body}
                  </a>
                ) : (
                  <div className={box}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
