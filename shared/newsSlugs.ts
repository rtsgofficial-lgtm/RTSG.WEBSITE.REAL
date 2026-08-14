export function createArticleSlug(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96) || "article"
  );
}

export function createNewsArticlePath(
  article: { id: number; title: string },
  options: { subdomain?: boolean } = {}
) {
  const prefix = options.subdomain ? "" : "/news";
  return `${prefix}/articles/${article.id}/${createArticleSlug(article.title)}`;
}
