import type { Metadata } from "next";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import CorrectionsPageClient from "./CorrectionsPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = constructMetadata({
  title: "Corrections Policy & Report an Error — xSypher",
  description:
    "Report a factual error, a missing attribution or a copyright concern in an xSypher story — and read how corrections are reviewed, timed and published.",
  canonical: `${siteConfig.url}/page/corrections`,
  image: brandBannerUrl(),
  imageAlt: "xSypher corrections policy",
});

export default function CorrectionsPage() {
  return <CorrectionsPageClient />;
}
