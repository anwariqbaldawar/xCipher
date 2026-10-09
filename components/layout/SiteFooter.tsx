import Link from "next/link";
import AdUnit from "@/components/common/AdUnit";
import Logo from "@/components/common/Logo";

export default function SiteFooter() {
  return (
    <footer className="site-foot">
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
            <div className="foot-social">
              <Link href="https://x.com/xSypher_tech" aria-label="X" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z" />
                </svg>
              </Link>
              <Link href="https://www.facebook.com/profile.php?id=61594767646306" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.6-1.6h1.6V4.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.6H7.5V14h2.8v8h3.2z" />
                </svg>
              </Link>
              <Link href="https://www.instagram.com/xsypher_tech/?hl=en" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </Link>
              <Link href="https://www.threads.net/@xsypher_tech" aria-label="Threads" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" />
                </svg>
              </Link>
              <Link href="#" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.1c.5-1 1.8-2.2 3.8-2.2 4 0 4.8 2.7 4.8 6.1V24h-4v-8.5c0-2-.4-3.5-2.1-3.5-1.7 0-2.4 1.2-2.4 3.4V24h-4V8z" />
                </svg>
              </Link>
            </div>
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
