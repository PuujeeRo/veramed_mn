// veramed — auth gate + session refresh + locale routing.
//
// Three jobs, on every request:
// 1. Refresh the Supabase session cookie (the standard @supabase/ssr
//    pattern — without this, a session silently goes stale).
// 2. Block `/dashboard/*` and `/account/*` (either locale) from anyone who
//    isn't signed in as the company's manager (brand_members) or an admin.
// 3. Run next-intl's locale routing (lib/routing.ts) for everything except
//    `/api/**` — "/quiz" resolves as MN and "/en/quiz" as EN.
//
// Route handlers (app/api/**) do their own ownership check too (lib/auth.ts)
// — this middleware guards page navigation, not the API itself.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/lib/routing";
import { COMPANY_ID, isSupabaseConfigured } from "@/lib/company";

const intlMiddleware = createIntlMiddleware(routing);

/** Strips a leading "/en" so the auth guard's route matching works the
 *  same regardless of which locale the visitor is on. */
function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const rest = stripLocalePrefix(pathname);
  const isGated =
    rest === "/dashboard" || rest.startsWith("/dashboard/") || rest === "/account" || rest.startsWith("/account/");

  const denyToLogin = () => {
    const url = request.nextUrl.clone();
    // Preserve the visitor's language on the bounce to /login.
    url.pathname = pathname.startsWith("/en") ? "/en/login" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!isSupabaseConfigured()) {
    // No database yet (see lib/company.ts) — there is no session to refresh
    // and nobody can be signed in, so the gated pages simply aren't
    // reachable. Public pages still get locale routing.
    if (isGated) return denyToLogin();
    return isApiRoute ? response : intlMiddleware(request);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refreshing on every request is what @supabase/ssr needs to keep the
  // cookie valid — cheap even on routes this gate doesn't otherwise touch.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isGated) {
    if (!user) return denyToLogin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile) return denyToLogin();

    if (profile.role !== "admin") {
      const { data: membership } = await supabase
        .from("brand_members")
        .select("brand_id")
        .eq("user_id", user.id)
        .eq("brand_id", COMPANY_ID)
        .maybeSingle();
      if (!membership) return denyToLogin();
    }
  }

  if (!isApiRoute) {
    const intlResponse = intlMiddleware(request);
    // Carry over the just-refreshed session cookie onto next-intl's
    // response (it may be a rewrite or a canonicalization redirect —
    // either way, losing the session cookie here would silently log
    // someone out on every navigation).
    response.cookies.getAll().forEach((cookie) => intlResponse.cookies.set(cookie));
    return intlResponse;
  }

  return response;
}

export const config = {
  // `.*\..*` excludes anything with a file extension — every static asset
  // under public/ (logo, product images, favicon, robots.txt, …). Without
  // it, next-intl's locale rewrite fires on those requests too and sends
  // them into the app/[locale]/ page tree instead of letting Next serve the
  // actual file, which 404s.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
