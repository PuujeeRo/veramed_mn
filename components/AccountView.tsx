"use client";

// The account page's content (inside DashboardShell): the signed-in
// manager's profile, email and password. Profile edits use the same
// UnsavedBar as every other editor; email and password are separate
// actions because neither takes effect the way a field save does (email
// waits for confirmation, a password is never shown back).

import { useState } from "react";
import { FiCheck, FiEye, FiEyeOff, FiLogOut } from "react-icons/fi";
import { useRouter } from "@/lib/navigation";
import { useLanguage } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useOrigin } from "@/lib/useOrigin";
import Spinner from "./Spinner";
import PageHeader from "./ui/PageHeader";
import Section from "./ui/Section";
import Field from "./ui/Field";
import UnsavedBar from "./ui/UnsavedBar";
import { useToast } from "./ui/Toast";
import { useFormState } from "./ui/useFormState";

interface AccountViewProps {
  email: string | null;
  fullName: string | null;
  username: string | null;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export default function AccountView({ email, fullName, username }: AccountViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const toast = useToast();
  const form = useFormState({ fullName: fullName ?? "", username: username ?? "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const errors = {
    fullName: !form.values.fullName.trim() ? t("validation.required") : undefined,
    username: !USERNAME_RE.test(form.values.username) ? t("account.usernameRule") : undefined,
  };
  const firstError = errors.fullName ?? errors.username;

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.values.fullName.trim(), username: form.values.username }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error === "username_taken" ? "username_taken" : "generic");
      }
      form.commit();
      toast(t("common.saved"));
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error && err.message === "username_taken" ? t("account.usernameTaken") : t("common.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title={t("account.title")}
        description={t("account.description")}
        actions={
          <button type="button" onClick={signOut} className="btn-secondary">
            <FiLogOut size={15} /> {t("account.logout")}
          </button>
        }
      />

      <div className="grid max-w-4xl grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section title={t("account.profileTitle")}>
          <div className="flex flex-col gap-5">
            <Field label={t("account.fullName")} htmlFor="a-name" required error={errors.fullName}>
              <input
                id="a-name"
                autoComplete="name"
                value={form.values.fullName}
                onChange={(e) => form.set("fullName", e.target.value)}
                className={`field ${errors.fullName ? "field-invalid" : ""}`}
              />
            </Field>
            <Field label={t("account.username")} htmlFor="a-user" error={saveError === t("account.usernameTaken") ? saveError : errors.username} hint={t("account.usernameRule")}>
              <input
                id="a-user"
                autoComplete="username"
                value={form.values.username}
                onChange={(e) => form.set("username", e.target.value.trim())}
                className={`field font-mono ${errors.username ? "field-invalid" : ""}`}
              />
            </Field>
            <EmailField currentEmail={email} t={t} />
          </div>
        </Section>

        <PasswordCard t={t} />
      </div>

      <UnsavedBar
        dirty={form.dirty}
        saving={saving}
        error={Boolean(saveError) && saveError !== t("account.usernameTaken")}
        blockedReason={firstError ? t("validation.fixErrors") : undefined}
        onSave={handleSave}
        onDiscard={() => {
          form.reset();
          setSaveError(null);
        }}
      />
    </>
  );
}

// Supabase only applies an email change once the NEW address is confirmed
// (emailRedirectTo → /api/auth/callback), so this is its own action with a
// "check your inbox" state rather than part of the profile save.
function EmailField({ currentEmail, t }: { currentEmail: string | null; t: (key: string) => string }) {
  const origin = useOrigin();
  const [email, setEmail] = useState(currentEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const trimmed = email.trim();
  const changed = trimmed.length > 0 && trimmed !== (currentEmail ?? "");

  async function handleChange() {
    setSaving(true);
    setError(false);
    setSent(false);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ email: trimmed }, { emailRedirectTo: `${origin}/api/auth/callback` });
    setSaving(false);
    if (updateError) {
      setError(true);
      return;
    }
    setSent(true);
  }

  return (
    <Field
      label={t("account.email")}
      htmlFor="a-email"
      error={error ? t("common.saveError") : undefined}
      hint={
        sent ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <FiCheck size={12} className="shrink-0" /> {t("account.emailChangeSent")}
          </span>
        ) : (
          t("account.emailNote")
        )
      }
    >
      <div className="flex gap-2">
        <input
          id="a-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSent(false);
          }}
          className="field min-w-0 flex-1"
        />
        <button type="button" onClick={handleChange} disabled={saving || !changed || !origin} className="btn-secondary">
          {saving && <Spinner className="h-4 w-4" />}
          {t("account.changeEmail")}
        </button>
      </div>
    </Field>
  );
}

function PasswordCard({ t }: { t: (key: string) => string }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const tooShort = password.length > 0 && password.length < 8;

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return;
    setSaving(true);
    setError(false);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(true);
      return;
    }
    setPassword("");
    toast(t("account.passwordChanged"));
  }

  return (
    <Section title={t("account.passwordTitle")}>
      <form onSubmit={handleChange} className="flex flex-col gap-4">
        <Field
          label={t("account.newPassword")}
          htmlFor="a-pass"
          error={error ? t("common.saveError") : tooShort ? t("account.passwordHint") : undefined}
          hint={t("account.passwordHint")}
        >
          <div className="relative">
            <input
              id="a-pass"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`field pr-10 ${tooShort ? "field-invalid" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? t("account.hidePassword") : t("account.showPassword")}
              className="icon-btn absolute right-1 top-1"
            >
              {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </button>
          </div>
        </Field>
        <button type="submit" disabled={saving || password.length < 8} className="btn-primary self-start">
          {saving && <Spinner className="h-4 w-4 text-white" />}
          {saving ? t("common.saving") : t("account.changePassword")}
        </button>
      </form>
    </Section>
  );
}
