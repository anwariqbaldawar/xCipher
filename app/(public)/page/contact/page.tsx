import type { Metadata } from "next";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import ContactPageClient from "./ContactPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = constructMetadata({
  title: "Contact xSypher — Editorial, Corrections & Sponsorship",
  description:
    "Report a correction, send a technical tip, ask about sponsorship or report a platform bug. Every message reaches the editors directly.",
  canonical: `${siteConfig.url}/page/contact`,
  image: brandBannerUrl(),
  imageAlt: "Contact xSypher",
});

export default function ContactPage() {
  return <ContactPageClient />;
}
