// PATCH /api/brands/{brandId} — the company's own site content: name, logo,
// tagline, about copy and contact details (the dashboard's "Site content"
// tab). Server-only write path: uses supabaseAdmin (service_role, bypasses
// RLS) after checking the caller manages the company — see lib/auth.ts.
// Sanitizes about_mn/en before it reaches Postgres.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeHtml } from "@/lib/sanitize";
import { canManageBrand, getSessionProfile } from "@/lib/auth";

// Links are rendered as hrefs on public pages — only http(s) may be stored,
// or a "javascript:" URL typed (or pasted) here would run on a visitor's click.
const httpUrl = z.string().refine((v) => v === "" || /^https?:\/\//i.test(v), "must be http(s)");

const bodySchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().min(1),
  taglineMn: z.string().min(1),
  taglineEn: z.string().optional(),
  aboutMn: z.string().optional(),
  aboutEn: z.string().optional(),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    facebook: httpUrl.optional(),
    instagram: httpUrl.optional(),
  }),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const profile = await getSessionProfile();
  if (!canManageBrand(profile, params.brandId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, logoUrl, taglineMn, taglineEn, aboutMn, aboutEn } = parsed.data;

  // Empty fields are dropped rather than stored as "" — same rule as the
  // product route.
  const contact: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data.contact)) {
    if (value && value.trim()) contact[key] = value.trim();
  }

  const { error } = await supabaseAdmin
    .from("brands")
    .update({
      name,
      logo_url: logoUrl,
      quiz_intro_mn: taglineMn,
      quiz_intro_en: taglineEn || null,
      about_mn: aboutMn ? sanitizeHtml(aboutMn) : null,
      about_en: aboutEn ? sanitizeHtml(aboutEn) : null,
      contact: Object.keys(contact).length ? contact : null,
    })
    .eq("id", params.brandId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
