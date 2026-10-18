// "/account" — the signed-in manager's own profile: full name/username,
// email and password. Inside the dashboard frame, like every manager page.
//
// Gated by middleware.ts. The redirect below is defense-in-depth for a
// session that expires between the middleware check and this render.

import { redirect } from "@/lib/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getCompany, getProductsForDashboard } from "@/lib/data";
import DashboardShell from "@/components/DashboardShell";
import AccountView from "@/components/AccountView";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: { locale: string } }) {
  const profile = await getSessionProfile();
  if (!profile) {
    // lib/navigation.ts's redirect() throws internally like
    // next/navigation's does, but its return type isn't `never` —
    // TypeScript can't narrow `profile` past this block without the
    // explicit `return`.
    redirect({ href: "/login", locale: params.locale });
    return;
  }
  const [brand, products] = await Promise.all([getCompany(), getProductsForDashboard()]);

  return (
    <DashboardShell
      brand={brand}
      active="account"
      productCount={products.length}
      user={{ name: profile.fullName, email: profile.email }}
    >
      <AccountView email={profile.email} fullName={profile.fullName} username={profile.username} />
    </DashboardShell>
  );
}
