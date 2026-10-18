import { getCompany } from "@/lib/data";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Route group — doesn't affect URLs. Every visitor-facing page (home,
// products, a product, the quiz, about, contact, login, privacy) shares
// this header and footer. The dashboard and account pages are siblings of
// this group, not children, so they never get it — they have their own
// frame (DashboardShell).
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getCompany();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader brand={brand} />
      <main className="flex-1">{children}</main>
      <SiteFooter brand={brand} />
    </div>
  );
}
