import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo";
import AdvertisingPageClient from "./AdvertisingPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Advertise with xSypher — Partnerships & Sponsorships",
  description:
    "Partner with xSypher to reach a high-intent audience of software engineers, security researchers, and technology decision-makers.",
  alternates: {
    canonical: `${siteConfig.url}/page/advertising`,
  },
};

export default function AdvertisingPage() {
  return <AdvertisingPageClient />;
}
