"use client";

import { useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLanguage } from "@/lib/i18n";
import { useRouter } from "@/lib/navigation";
import Spinner from "@/components/Spinner";

// Manager sign-in — email/password via Supabase Auth. There is no signup:
// accounts are created by scripts/seed-auth.mjs. On success, confirm the
// user has a profiles row (RLS: "users read own profile") and open the
// dashboard; middleware.ts re-checks on arrival.
export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) throw new Error("sign_in");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (!profile) {
        // A real auth user who isn't a manager — don't leave them signed in.
        await supabase.auth.signOut();
        throw new Error("no_profile");
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("login.error"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{t("login.heading")}</h1>
      <p className="mt-3 text-sm text-fg-muted">{t("login.managersOnly")}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="field-label">
            {t("contact.email")}
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="field-label">
            {t("login.password")}
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary py-2.5">
          {loading && <Spinner className="h-4 w-4 text-white" />}
          {t("login.title")}
        </button>
      </form>
    </div>
  );
}
