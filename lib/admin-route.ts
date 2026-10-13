/**
 * Centralized route-matching logic for the editorial admin console.
 *
 * Symmetrically handles:
 * - Apex domain paths: /admin, /admin/articles, /admin/settings, /admin/editor/[id]
 * - Admin subdomain paths: /, /articles, /settings, /editor/[id]
 * - Query strings and trailing slashes
 * - Strict mutual exclusivity: Home / Dashboard is NEVER active when the user
 *   is on any other section, and other sections are NEVER active when on Home.
 */
export function isConsoleRouteActive(
  currentPathname: string | null | undefined,
  targetHref: string,
  options: {
    exact?: boolean;
    isWriting?: boolean;
    isReviewQueue?: boolean;
  } = {}
): boolean {
  if (!currentPathname) return false;

  const isReviewQueueTarget = targetHref.includes("status=SUBMITTED") || targetHref.startsWith("/admin/review");

  // Review Queue direct target check
  if (isReviewQueueTarget) {
    return Boolean(options.isReviewQueue);
  }

  // Clean path of query parameters, hash, and trailing slashes
  const cleanPath = currentPathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const cleanTarget = targetHref.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  // Normalize away optional '/admin' prefix
  // e.g. '/admin' -> '/', '/admin/settings' -> '/settings', '/settings' -> '/settings'
  const normCurrent = cleanPath.replace(/^\/admin(\/|$)/, "/").replace(/\/+$/, "") || "/";
  const normTarget = cleanTarget.replace(/^\/admin(\/|$)/, "/").replace(/\/+$/, "") || "/";

  const isHomeTarget = normTarget === "/";
  const isCurrentHome = normCurrent === "/";

  if (isHomeTarget) {
    // Home / Dashboard is ONLY active when the user is strictly on the dashboard/home
    // and NOT in editor writing mode
    return isCurrentHome && !options.isWriting;
  }

  // If currently on Home/Dashboard, no sub-section should ever be active
  if (isCurrentHome) {
    return false;
  }

  // Articles & Review Queue
  if (normTarget === "/articles") {
    if (options.isReviewQueue) return false;
    if (options.isWriting) return true;
    return (
      normCurrent === "/articles" ||
      normCurrent.startsWith("/articles/") ||
      normCurrent.startsWith("/review/")
    );
  }

  // New Story / Editor
  if (normTarget === "/editor") {
    return normCurrent === "/editor" || normCurrent.startsWith("/editor/");
  }

  // Exact matching for specific single-page links
  if (options.exact) {
    return normCurrent === normTarget;
  }

  // Prefix matching for general sections (e.g. /settings, /media, /users)
  return normCurrent === normTarget || normCurrent.startsWith(normTarget + "/");
}
