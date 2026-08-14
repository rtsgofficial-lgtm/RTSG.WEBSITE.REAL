export const NEWS_CATEGORIES = [
  "Editorials",
  "International",
  "Economy",
  "US Politics",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const DEFAULT_NEWS_CATEGORY: NewsCategory = "Editorials";

export const NEWS_CATEGORY_SLUGS: Record<NewsCategory, string> = {
  Editorials: "editorials",
  International: "international",
  Economy: "economy",
  "US Politics": "us-politics",
};

export function normalizeNewsCategory(
  value: string | null | undefined
): NewsCategory {
  return (
    NEWS_CATEGORIES.find(category => category === value) ??
    DEFAULT_NEWS_CATEGORY
  );
}

export function getNewsCategoryBySlug(
  slug: string | null | undefined
): NewsCategory | undefined {
  if (!slug) return undefined;
  return NEWS_CATEGORIES.find(
    category => NEWS_CATEGORY_SLUGS[category] === slug
  );
}
