import { SocialIcon } from "./SocialIcon";

// ─────────────────────────────────────────────────────────────────────────────
// Official publication profiles, in the one display order used everywhere:
// Facebook → Threads → Instagram → LinkedIn → X → Reddit. Footer, About,
// Contact and the mobile drawer all render this component so the set, the
// order and the destinations can never drift apart again.
// ─────────────────────────────────────────────────────────────────────────────

export const SOCIAL_LINKS = [
  { platform: "facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61594767646306" },
  { platform: "threads", label: "Threads", href: "https://www.threads.net/@xsypher_tech" },
  { platform: "instagram", label: "Instagram", href: "https://www.instagram.com/xsypher_tech/?hl=en" },
  { platform: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/xsypher/" },
  { platform: "x", label: "X", href: "https://x.com/xSypher_tech" },
  { platform: "reddit", label: "Reddit", href: "https://www.reddit.com/r/xsypher/" },
] as const;

export default function SocialLinks({
  className = "",
  linkClassName = "",
}: {
  className?: string;
  linkClassName?: string;
}) {
  return (
    <div className={className}>
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.platform}
          href={link.href}
          aria-label={link.label}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName || undefined}
        >
          <SocialIcon platform={link.platform} />
        </a>
      ))}
    </div>
  );
}
