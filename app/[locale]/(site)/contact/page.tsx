// "/contact" — how to reach the company. Shows whatever contact details
// the manager has filled in; there is deliberately no message form (it
// would need somewhere real to deliver to, and a form that only pretends
// to send is worse than none).

import { getCompany } from "@/lib/data";
import ContactView from "@/components/ContactView";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  return <ContactView brand={await getCompany()} />;
}
