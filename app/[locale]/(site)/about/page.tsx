// "/about" — the company's own introduction, written in the dashboard.

import { getCompany } from "@/lib/data";
import AboutView from "@/components/AboutView";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  return <AboutView brand={await getCompany()} />;
}
