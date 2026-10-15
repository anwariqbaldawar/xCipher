"use client";

import { useEffect, useRef, useState } from 'react';

interface TocItem { id: string; text: string; level: number }

export default function TableOfContents({ containerSelector = '.prose', title = 'In this article' }: { containerSelector?: string; title?: string }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const root = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = root.current?.closest(containerSelector) || document.querySelector(containerSelector);
    if (!container) return;
    // Never write into an editable host (the article editor). ProseMirror owns
    // that DOM and redraws a heading whose attributes change under it, which
    // re-fires the observer below: an endless loop on every frame.
    const editableHost = container.closest('[contenteditable]:not([contenteditable="false"])') !== null;
    let frame = 0;
    const update = () => {
      const seen = new Set<string>();
      const next = Array.from(container.querySelectorAll('h2, h3, h4')).filter(el => !el.closest('[data-toc], [contenteditable="false"]')).map((el, index) => {
        const base = el.textContent?.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || `section-${index + 1}`;
        let id = base;
        let suffix = 2;
        while (seen.has(id)) id = `${base}-${suffix++}`;
        seen.add(id);
        if (el.id !== id && !editableHost) el.id = id;
        return { id, text: el.textContent || '', level: Number(el.tagName[1]) };
      }).filter(item => item.text.trim());
      setItems(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); });
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [containerSelector]);

  useEffect(() => {
    if (items.length === 0) return;

    const container = root.current?.closest(containerSelector) || document.querySelector(containerSelector);
    if (!container) return;

    const headingElements = Array.from(container.querySelectorAll('h2, h3, h4')).filter(
      el => !el.closest('[data-toc], [contenteditable="false"]')
    );
    if (headingElements.length === 0) return;

    // Use IntersectionObserver with negative rootMargin to detect active heading
    // without layout thrashing on scroll.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          const topEntry = visible.reduce((prev, curr) =>
            curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev
          );
          if (topEntry.target.id) {
            setActiveId(topEntry.target.id);
          }
        }
      },
      {
        rootMargin: "-100px 0px -60% 0px",
        threshold: 0
      }
    );

    headingElements.forEach(el => observer.observe(el));

    // Throttled rAF listener ensures zero forced synchronous reflows
    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let currentActiveId = '';
        for (const heading of headingElements) {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= 150) {
            currentActiveId = heading.id;
          } else {
            break;
          }
        }
        if (!currentActiveId && headingElements[0]) {
          const firstRect = headingElements[0].getBoundingClientRect();
          if (firstRect.top > 150 && firstRect.top < window.innerHeight) {
            currentActiveId = headingElements[0].id;
          }
        }
        if (currentActiveId && currentActiveId !== activeId) {
          setActiveId(currentActiveId);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [items, containerSelector, activeId]);

  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeId || !navRef.current) return;
    let rafId = 0;
    rafId = requestAnimationFrame(() => {
      const nav = navRef.current;
      if (!nav) return;
      const activeElement = nav.querySelector(`a[href="#${activeId}"]`) as HTMLElement;
      if (activeElement) {
        const navTop = nav.scrollTop;
        const navBottom = navTop + nav.clientHeight;
        const elTop = activeElement.offsetTop;
        const elBottom = elTop + activeElement.clientHeight;

        if (elTop < navTop || elBottom > navBottom) {
          nav.scrollTo({
            top: elTop - nav.clientHeight / 2 + activeElement.clientHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [activeId]);

  return <div ref={root} data-toc className="article-toc bg-[var(--surface-2)] border border-[var(--line)] p-4 rounded-xl my-4">
    <div className="text-xs font-bold uppercase tracking-widest text-[var(--ink)] mb-3">{title}</div>
    {items.length ? <nav ref={navRef} aria-label={title} className="relative flex flex-col max-h-[65vh] overflow-y-auto no-scrollbar">{items.map(item => <a key={item.id} href={`#${item.id}`} className={`block relative text-sm transition-all duration-300 py-1.5 pr-2 border-l-[3px] rounded-r-lg ${item.id === activeId ? 'text-[var(--accent)] font-semibold border-[var(--accent)] bg-red-500/10 dark:bg-red-500/15 backdrop-blur-sm' : 'text-[var(--muted)] hover:text-[var(--ink)] border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-[var(--surface-3)]/50'} ${item.level === 3 ? 'pl-6' : item.level === 4 ? 'pl-8' : 'pl-3'}`} onClick={event => {
      event.preventDefault();
      const container = root.current?.closest(containerSelector) || document.querySelector(containerSelector);
      const headings = Array.from(container?.querySelectorAll('h2, h3, h4') || []);
      // Ids are only assigned outside editable hosts; fall back to the text.
      const target = headings.find(el => el.id === item.id) || headings.find(el => (el.textContent || '') === item.text);
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }}>{(item.level === 3 || item.level === 4) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-2 -translate-y-[1px]"></span>}{item.text}</a>)}</nav> : <p className="text-xs text-[var(--muted)]">Add section headings to build an outline.</p>}
  </div>;
}
