import type { Metadata } from "next";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import AdvertisingPageClient from "./AdvertisingPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = constructMetadata({
  title: "Sponsor xSypher — Developer Tool & Technical Sponsorships",
  description:
    "Sponsor an independent engineering publication read by full-stack developers, architects and security/AI practitioners. Dedicated technical deep-dives, labelled banner placements and early-partner packages — no invented impression numbers.",
  canonical: `${siteConfig.url}/page/advertising`,
  image: brandBannerUrl(),
  imageAlt: "Sponsor xSypher",
});

export default function AdvertisingPage() {
  return <AdvertisingPageClient />;
}
