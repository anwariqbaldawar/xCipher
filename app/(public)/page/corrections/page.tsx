import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo";
import CorrectionsPageClient from "./CorrectionsPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Corrections Policy & Report an Error — xSypher",
  description:
    "Read xSypher's editorial corrections policy or report a factual error in one of our published stories.",
  alternates: {
    canonical: `${siteConfig.url}/page/corrections`,
  },
};

export default function CorrectionsPage() {
  return <CorrectionsPageClient />;
}
