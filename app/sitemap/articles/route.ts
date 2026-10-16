// Legacy alias for the Google News sitemap. Same cached window as the document
// it re-exports (`/sitemap/articles.xml`), for the same reason — see the comment
// there. force-dynamic was the wrong flag here: it forced a fresh database read
// per crawl for a document that is already tag-invalidated on every publish.
export const revalidate = 3600;
export { GET } from "../articles.xml/route";
