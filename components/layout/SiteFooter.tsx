import Link from "next/link";
import AdUnit from "@/components/common/AdUnit";
import Logo from "@/components/common/Logo";
import SocialLinks from "@/components/common/SocialLinks";

export default function SiteFooter() {
  return (
    <footer className="site-foot relative overflow-hidden border-t border-white/10 text-neutral-300">
      {/* Decorative layers: non-interactive, hidden from assistive tech. The grid is a
          CSS layer on .site-foot::before; the corner glows and accent line are below. */}
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -bottom-28 -left-28 w-[420px] h-[420px] rounded-full bg-red-600/15 blur-[110px]" />
        <div className="absolute -bottom-28 -right-28 w-[420px] h-[420px] rounded-full bg-red-600/12 blur-[110px]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-red-500/30 via-white/5 to-red-500/30" />
      </div>
      <div className="wrap">
        <AdUnit location="footer" size="728 × 90" slotClass="ad-leaderboard" style={{ paddingTop: "34px" }} />
        <div className="foot-grid">
          <div className="foot-brand">
            <Link className="logo" href="/" aria-label="xSypher — home">
              <Logo variant="brand" className="text-[26px] text-white" />
            </Link>
            <p className="text-gray-400">
              xSypher is an independent technology publication. We cover the companies, code and ideas shaping
              modern life — with original reporting, hands-on reviews and analysis that respects your time.
            </p>
            <SocialLinks className="foot-social" />
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-bold tracking-widest uppercase !text-red-500 mb-4 block">Coverage</p>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/latest">Latest Intelligence</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/category/ai">AI & Machine Learning</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/category/cybersecurity">Cybersecurity</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/category/software">Software Architecture</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/category/gadgets">Hardware & Gadgets</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/category/business">Tech Business</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/series">Editorial Collections</Link>
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-bold tracking-widest uppercase !text-red-500 mb-4 block">The Newsroom</p>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/about">About xSypher</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/contact">Contact Desk</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/advertising">Advertising & Partnerships</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/careers">Careers</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/media-kit">Media Kit</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/newsletters#subscribe">Newsletters</Link>
            <a className="!text-gray-400 hover:!text-white transition-colors" href="/feed.xml" target="_blank" rel="noopener noreferrer">RSS Feed</a>
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-bold tracking-widest uppercase !text-red-500 mb-4 block">Standards & Legal</p>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/editorial-standards">Editorial Standards</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/editorial-policy">Editorial Policy</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/corrections">Corrections Policy</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/transparency">Transparency Report</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/privacy-policy">Privacy Policy</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/terms-of-use">Terms of Use</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/cookie-policy">Cookie Policy</Link>
            <Link prefetch={false} className="!text-gray-400 hover:!text-white transition-colors" href="/page/disclaimer">Technical Disclaimer</Link>
          </div>
        </div>
        <div className="foot-bottom flex items-center justify-center w-full">
          <span className="text-center text-gray-400">© 2026 xSypher. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
