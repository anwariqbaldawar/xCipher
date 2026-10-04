import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo";
import ContactPageClient from "./ContactPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact xSypher — Editorial & Security Desks",
  description:
    "Have a breaking security vulnerability, investigative tip, PR inquiry, or technical feedback? Get in touch with xSypher.",
  alternates: {
    canonical: `${siteConfig.url}/page/contact`,
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
