// PATCH /api/account — a signed-in user editing their OWN full_name/
// username. No brandId involved at all: unlike every other write route in
// this app, ownership here is just "you can only ever be the row with
// your own id" (getSessionProfile()'s userId), so there's nothing to
// check beyond "is anyone signed in."
//
// username has a real unique index (supabase/schema.sql) — the client-side
// form doesn't pre-check availability (unlike brand slugs, a taken
// username is a rare collision, not something worth a live-typing check),
// so the Postgres unique-violation (23505) is the only guard, caught below
// and turned into a friendly error rather than a raw 500.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionProfile } from "@/lib/auth";

const bodySchema = z.object({
  fullName: z.string().min(1),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
});

export async function PATCH(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { fullName, username } = parsed.data;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: fullName, username })
    .eq("id", profile.userId);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
