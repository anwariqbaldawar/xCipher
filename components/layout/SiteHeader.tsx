"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import MobileDrawer from "./MobileDrawer";
import { usePathname } from "next/navigation";
import { SearchProvider, SearchButton } from "../search/SearchOverlay";
import { SocialIcon } from "@/components/common/SocialIcon";
import { Home, Info, Mail } from "lucide-react";
import Logo from "@/components/common/Logo";

const NAV_ROW = [
  { name: "Home", href: "/", className: "nr-home" },
  { name: "Latest", href: "/latest" },
  { name: "AI", href: "/category/ai" },
  { name: "Cybersecurity", href: "/category/cybersecurity" },
  { name: "Gadgets", href: "/category/gadgets" },
  { name: "Software", href: "/category/software" },
  { name: "Programming", href: "/category/programming" },
  { name: "Startups", href: "/category/startups" },
  { name: "Gaming", href: "/category/gaming" },
  { name: "Reviews", href: "/category/reviews" },
  { name: "How-To", href: "/category/how-to" },
  { name: "Opinion", href: "/category/opinion" },
  { name: "Science", href: "/category/science" },
];

import { useNavStore } from "@/lib/store/useNavStore";

type HiddenRows = { row1: boolean; row2: boolean; row3: boolean };
const NO_HIDDEN_ROWS: HiddenRows = { row1: false, row2: false, row3: false };

// Scroll thresholds for the progressive header (px).
const HIDE_ROW1_Y = 10; // scrolling down, past this -> Row 1 collapses
const HIDE_ROW2_Y = 80; // scrolling down, past this -> Row 2 collapses
const HIDE_ROW3_Y = 160; // scrolling down, past this -> Row 3 collapses
const REVEAL_ROW3_DELTA = 8; // scrolling up, accumulated px -> Row 3 returns
const REVEAL_ROW2_DELTA = 35; // scrolling up, accumulated px -> Row 2 returns
const RESET_Y = 20; // at/above this offset every row is visible again

export default function SiteHeader() {
  const pathname = usePathname() || "";
  const isArticlePage = Boolean(pathname && (pathname.startsWith("/article/") || pathname.includes("/article/")));
  // Progressive 3-tier headroom state. Each flag = that row is collapsed.
  // Row 1 = utility bar, Row 2 = main brand bar, Row 3 = category bar.
  const [hiddenRows, setHiddenRows] = useState<HiddenRows>(NO_HIDDEN_ROWS);
  const lastScrollYRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const lastDirectionRef = useRef<"up" | "down" | null>(null);
  const activeCategorySlug = useNavStore((state) => state.activeCategorySlug);
  
  const now = new Date();
  const todayDateFull = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayDateCompact = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const [currentDate, setCurrentDate] = useState<{ full: string; compact: string } | null>(null);

  useEffect(() => {
    const updateDate = () => {
      const d = new Date();
      setCurrentDate({
        full: d.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        compact: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    };

    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  // Reset header rows on route change
  useEffect(() => {
    setHiddenRows(NO_HIDDEN_ROWS);
    lastScrollYRef.current = typeof window !== "undefined" ? window.scrollY : 0;
    accumulatedDeltaRef.current = 0;
    lastDirectionRef.current = null;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame = 0;
    lastScrollYRef.current = window.scrollY;

    // Rows change the header's height, which sits above the article in normal flow.
    // Browser scroll anchoring would "correct" that shift by moving scrollY, which
    // feeds back into the headroom logic and makes the header jump. Disable it while
    // the progressive header is active on article pages.
    const root = document.documentElement;
    const previousAnchor = root.style.overflowAnchor;
    if (isArticlePage) root.style.overflowAnchor = "none";

    // Only the article reading view uses progressive hide; other pages keep all rows.
    const applyRows = (next: HiddenRows) => {
      setHiddenRows((prev) =>
        prev.row1 === next.row1 && prev.row2 === next.row2 && prev.row3 === next.row3 ? prev : next
      );
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const diff = y - lastScrollYRef.current;
      lastScrollYRef.current = y;

      const navrow = document.getElementById("navrow");
      if (y > 140) navrow?.classList.add("stuck");
      else if (y < 120) navrow?.classList.remove("stuck");

      if (y > 100) document.body.classList.add("scrolled");
      else if (y < 20) document.body.classList.remove("scrolled");

      if (!isArticlePage) {
        applyRows(NO_HIDDEN_ROWS);
        return;
      }

      // Back at the very top of the article: restore everything, including Row 1.
      if (y < RESET_Y) {
        accumulatedDeltaRef.current = 0;
        lastDirectionRef.current = null;
        applyRows(NO_HIDDEN_ROWS);
        return;
      }

      if (diff === 0) return;

      const direction = diff > 0 ? "down" : "up";
      if (direction !== lastDirectionRef.current) {
        lastDirectionRef.current = direction;
        accumulatedDeltaRef.current = 0;
      }
      accumulatedDeltaRef.current += Math.abs(diff);

      setHiddenRows((prev) => {
        if (direction === "down") {
          // Stage-wise collapse: each tier hides once the reader passes its threshold.
          const next: HiddenRows = {
            row1: y > HIDE_ROW1_Y,
            row2: y > HIDE_ROW2_Y,
            row3: y > HIDE_ROW3_Y,
          };
          return prev.row1 === next.row1 && prev.row2 === next.row2 && prev.row3 === next.row3 ? prev : next;
        }

        // Scrolling up: Row 3 returns first, then Row 2. Row 1 only returns at the top.
        const acc = accumulatedDeltaRef.current;
        const next: HiddenRows = {
          row1: prev.row1,
          row2: acc > REVEAL_ROW2_DELTA ? false : prev.row2,
          row3: acc > REVEAL_ROW3_DELTA ? false : prev.row3,
        };
        return prev.row1 === next.row1 && prev.row2 === next.row2 && prev.row3 === next.row3 ? prev : next;
      });
    };

    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.overflowAnchor = previousAnchor;
      document.body.classList.remove("scrolled");
    };
  }, [isArticlePage]);

  // Mobile Auto-Slide logic
  useEffect(() => {
    const navrowIn = document.getElementById("navrowIn");
    if (!navrowIn) return;
    
    // Give it a tiny delay to ensure the DOM has painted the .on class
    const timeoutId = setTimeout(() => {
      const activeLink = navrowIn.querySelector(".on");
      if (activeLink) {
        activeLink.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [pathname, activeCategorySlug]);

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    // Check if the link matches the explicitly set active category
    if (activeCategorySlug && href === `/category/${activeCategorySlug}`) {
      return true;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <SearchProvider>
      {/* Progressive 3-tier smart header. Rows collapse via grid-rows/opacity/translate
          (never display:none or unmount) and the whole header stays sticky at top-0. */}
      <header
        className="site-head sticky top-0 z-40"
      >
        {/* Row 1: Top utility bar (date, quick links, theme toggle) */}
        <div className={`hdr-row hdr-row-1 ${hiddenRows.row1 ? "is-collapsed" : ""}`}>
          <div className="hdr-clip">
            <div className="hdr-content">
        <div className="utility text-[10px] w-full">
          <div className="wrap utility-in flex items-center justify-between w-full">
            {/* Left: Date */}
            <div className="flex-1 flex justify-start shrink-0">
              <span id="todayDate" className="util-date !font-mono font-medium tracking-tight normal-case whitespace-nowrap">
                <span className="date-full" suppressHydrationWarning>{currentDate ? currentDate.full : todayDateFull}</span>
                <span className="date-compact" suppressHydrationWarning>{currentDate ? currentDate.compact : todayDateCompact}</span>
              </span>
            </div>

            {/* Center: Quick Links with Separators */}
            <div className="flex-1 flex items-center justify-center px-1 sm:px-2 text-[var(--muted)]">
              <span className="text-[var(--line-2)] opacity-70 mr-2.5 sm:mr-6 text-xs">|</span>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <Link href="/" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-[var(--accent)] transition-colors" aria-label="Home">
                  <Home className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                </Link>
                <Link href="/page/about" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-[var(--accent)] transition-colors" aria-label="About">
                  <Info className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                </Link>
                <Link href="/page/contact" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-[var(--accent)] transition-colors" aria-label="Contact">
                  <Mail className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                </Link>
              </div>
              <span className="text-[var(--line-2)] opacity-70 ml-2.5 sm:ml-6 text-xs">|</span>
            </div>

            {/* Right: Dark Mode Toggle */}
            <div className="flex-1 flex justify-end items-center gap-1 sm:gap-2.5">
              <ThemeToggle />
            </div>
          </div>
        </div>
            </div>
          </div>
        </div>

        {/* Row 2: Main brand bar (hamburger, logo, search, subscribe) */}
        <div className={`hdr-row hdr-row-2 ${hiddenRows.row2 ? "is-collapsed" : ""}`}>
          <div className="hdr-clip">
            <div className="hdr-content">
        <div className="wrap masthead relative">
          <MobileDrawer />
          <Link className="logo" href="/" aria-label="xSypher — home">
            <Logo variant="brand" className="text-[26px]" />
          </Link>
          <div className="hidden sm:block border-l border-[var(--line)] pl-3.5 ml-3.5 text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--muted)] leading-tight">
            ADVANCED TECH &<br />SECURITY INSIGHTS
          </div>
          
          <nav className="primary-nav flex-1" id="primaryNav" aria-label="Primary"></nav>

          {/* Desktop Centered Minimalist Navigation (Hidden as requested) */}
          <nav className="hidden absolute left-1/2 -translate-x-1/2 items-center gap-3 font-bold text-[12px] tracking-tight" style={{ fontFamily: "var(--f-display)" }}>
            <Link href="/" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Home">
              H
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/ai" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="AI">
              A
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/cybersecurity" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Cybersecurity">
              C
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/gadgets" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Gadgets">
              G
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/software" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Software">
              S
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/programming" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Programming">
              P
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/business" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Business">
              B
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/gaming" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Gaming">
              G
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/reviews" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Reviews">
              R
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/how-to" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="How-To">
              H
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/opinion" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Opinion">
              O
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
            <Link href="/category/science" className="group relative inline-flex flex-col items-center justify-center py-1 text-[var(--ink)] hover:text-[var(--accent)] transition-colors" aria-label="Science">
              S
              <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--accent)] transition-all duration-150 ease-out group-hover:w-full rounded-full" />
            </Link>
          </nav>

          <div className="mast-actions ml-auto">
            <SearchButton />
            <Link className="btn btn-solid" href="/page/newsletters#subscribe" id="subscribeBtn">Subscribe</Link>
          </div>
        </div>
            </div>
          </div>
        </div>

        {/* Row 3: Category navigation bar */}
        <div className={`hdr-row hdr-row-3 ${hiddenRows.row3 ? "is-collapsed" : ""}`}>
          <div className="hdr-clip">
            <div className="hdr-content">
        <div className="navrow" id="navrow">
          <div className="wrap navrow-in md:justify-center items-center h-8.5 lg:h-[44px]" id="navrowIn" role="navigation" aria-label="Sections">
            {NAV_ROW.map((item) => {
              const active = isLinkActive(item.href);
              const classes = [
                item.className, 
                active ? "on" : "",
                "px-3 py-1.5 text-[11px] lg:text-xs rounded-md flex items-center justify-center transition-colors"
              ].filter(Boolean).join(" ");
              return (
                <Link
                  key={`${item.name}-${item.href}`}
                  href={item.href}
                  className={classes}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
            </div>
          </div>
        </div>
      </header>
    </SearchProvider>
  );
}
