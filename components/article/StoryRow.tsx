import Image from "next/image";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { IMAGE_WIDTHS, resolveImageSrc } from "@/lib/image-url";
import RelativeTime from "@/components/common/RelativeTime";
import { Article, Category } from "@/lib/types";
import { getReadingTimeMinutes } from "@/lib/reading-time";
import ArticleByline from "./ArticleByline";

// `createdAt` is omitted from the Partial<Article> half before being re-declared.
//
// The intersection used to be `Partial<Article> & { createdAt?: Date | string |
// number }`, which does not widen the property at all: an intersection requires a
// value to satisfy *both* sides, so `createdAt` stayed a `Date` and any caller
// holding a serialized timestamp (an ISO string out of a Next data cache, a
// numeric epoch) was a type error. `StoryRow` only ever feeds the value to `new
// Date()`, which accepts all three forms, so the declaration now matches the
// intent — and /search can build its rows from the cached search snapshot without
// a cast.
export type StoryArticle = Omit<Partial<Article>, "createdAt"> & {
  id: string;
  slug: string;
  title: string;
  deck?: string | null;
  author?: string | null;
  img?: string | null;
  createdAt?: Date | string | number;
  category?: Partial<Category> | null;
  cat?: string;
  age?: number;
  mins?: number;
  wordCount?: number | null;
  [key: string]: any;
};

interface Props {
  article: StoryArticle;
  showDeck?: boolean;
}

export default function StoryRow({ article: a, showDeck = true }: Props) {
  // Surface the main category (parent) for SEO and header alignment if it's a subcategory
  const mainCat = (a.category as any)?.parent;
  const subCat = mainCat ? a.category : null;
  const catName = mainCat 
    ? `${mainCat.name} / ${subCat?.name}`
    : (a.category?.name || (typeof a.cat === "string" ? a.cat.toUpperCase() : "News"));
  const catSlug = (mainCat || a.category)?.slug || (typeof a.cat === "string" ? a.cat.toLowerCase() : "news");
  
  // Relative time is computed in the browser, not here.
  //
  // This is a server component and these listings are cached with ISR, so a
  // Date.now() here was frozen into the cached HTML -- a story kept claiming
  // "2 minutes ago" for the whole revalidate window. Passing the absolute
  // timestamp down lets the client render it against the real current time.
  //
  // The legacy `age` field (minutes, from mock data) has no absolute timestamp
  // to hand over, so it still formats inline. That path is not served from the
  // database and is not cached against a clock.
  const ageNode = a.createdAt
    ? <RelativeTime dateTime={new Date(a.createdAt).toISOString()} />
    : typeof a.age === "number"
      ? timeAgo(a.age)
      : null;
  
  return (
    <article className="story-row" data-reveal suppressHydrationWarning>
      <Link href={`/article/${a.slug}`} className="ph" tabIndex={-1} aria-hidden="true">
        {/* 118px-wide column: 300px covers a 2x display without pulling a hero. */}
        <Image 
          src={resolveImageSrc(a.img, IMAGE_WIDTHS.row, 225)} 
          alt={a.title} 
          fill
          sizes="118px"
          data-image-role="article-card"
          className="object-cover"
        />
      </Link>
      <div>
        <Link href={`/category/${catSlug}`} className="kicker plain">
          {catName}
        </Link>
        <h3>
          <Link href={`/article/${a.slug}`}>
            <span className="hlink">{a.title}</span>
          </Link>
        </h3>
        {showDeck && <p className="row-deck">{a.deck}</p>}
        <div className="row-meta">
          <ArticleByline article={a} size={20} /> · {ageNode} · <span className="text-[11px] text-[var(--muted)]">{getReadingTimeMinutes(a)} min read</span>
        </div>
      </div>
    </article>
  );
}
