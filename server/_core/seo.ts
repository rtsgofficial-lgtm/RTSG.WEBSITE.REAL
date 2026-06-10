import type { Express } from "express";
import { getArticleById, getArticles } from "../db";
import { ENV } from "./env";

const SITE_NAME = "RTSG";
const DEFAULT_TITLE = "RTSG";
const DEFAULT_DESCRIPTION = "RTSG is the preeminent thought-leader of the internet.";
const DEFAULT_IMAGE = "https://rs.rtsg.org/whiteandredrtsg_c075c4b3.png";

type PageMeta = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  imageAlt: string;
  type: "website" | "article";
  robots?: string;
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  author?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXml(value: string) {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function decodeCommonEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, "\"");
}

function textFromHtml(html: string) {
  return decodeCommonEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function absoluteUrl(value: string) {
  try {
    return new URL(value, ENV.siteUrl).toString();
  } catch {
    return ENV.siteUrl;
  }
}

function canonicalForPath(pathname: string) {
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return absoluteUrl(normalizedPath);
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function getArticlePageMeta(pathname: string): Promise<PageMeta | null> {
  const match = pathname.match(/^\/articles\/(\d+)\/?$/);
  if (!match) return null;

  const articleId = Number(match[1]);
  if (!Number.isFinite(articleId)) return null;

  const article = await getArticleById(articleId);
  const canonicalUrl = canonicalForPath(`/articles/${articleId}`);

  if (!article || !article.isPublished) {
    return {
      title: "Article not found | RTSG",
      description: "This RTSG article is unavailable or has been removed.",
      canonicalUrl,
      imageUrl: DEFAULT_IMAGE,
      imageAlt: SITE_NAME,
      type: "website",
      robots: "noindex, nofollow",
    };
  }

  const description = truncate(
    (article.excerpt && article.excerpt.trim()) || textFromHtml(article.content) || DEFAULT_DESCRIPTION,
    180
  );

  return {
    title: `${article.title} | RTSG`,
    description,
    canonicalUrl,
    imageUrl: article.coverImageUrl ? absoluteUrl(article.coverImageUrl) : DEFAULT_IMAGE,
    imageAlt: article.title,
    type: "article",
    robots: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    publishedTime: article.createdAt,
    modifiedTime: article.editedAt ?? article.updatedAt,
    author: article.authorName,
  };
}

async function getPageMeta(pathname: string): Promise<PageMeta> {
  const articleMeta = await getArticlePageMeta(pathname);
  if (articleMeta) return articleMeta;

  const baseMeta: PageMeta = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: canonicalForPath(pathname),
    imageUrl: DEFAULT_IMAGE,
    imageAlt: SITE_NAME,
    type: "website",
    robots: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  };

  if (pathname === "/articles") {
    return {
      ...baseMeta,
      title: "Articles | RTSG",
      description: "Read the latest RTSG essays, articles, and discussions.",
    };
  }

  if (pathname === "/resources") {
    return {
      ...baseMeta,
      title: "Resources | RTSG",
      description: "Browse RTSG sources, research materials, and reference documents.",
    };
  }

  if (pathname === "/about") {
    return {
      ...baseMeta,
      title: "About | RTSG",
      description: "Learn more about RTSG and its work.",
    };
  }

  if (pathname === "/contact") {
    return {
      ...baseMeta,
      title: "Contact | RTSG",
      description: "Contact RTSG.",
    };
  }

  return baseMeta;
}

function buildMetaTags(meta: PageMeta) {
  const publishedTime = toIsoDate(meta.publishedTime);
  const modifiedTime = toIsoDate(meta.modifiedTime);
  const author = meta.author?.trim();

  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="robots" content="${escapeHtml(meta.robots ?? "index, follow")}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}" />`,
  ];

  if (publishedTime) tags.push(`<meta property="article:published_time" content="${publishedTime}" />`);
  if (modifiedTime) tags.push(`<meta property="article:modified_time" content="${modifiedTime}" />`);
  if (author) tags.push(`<meta property="article:author" content="${escapeHtml(author)}" />`);

  return tags.join("\n    ");
}

export async function injectSeoMetadata(html: string, originalUrl: string) {
  const requestUrl = new URL(originalUrl, ENV.siteUrl);
  const meta = await getPageMeta(requestUrl.pathname);
  const withoutExistingSeo = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|og:title|og:description|og:image|og:image:alt|og:url|og:type|og:site_name|twitter:card|twitter:title|twitter:description|twitter:image|article:published_time|article:modified_time|article:author)"[^>]*>\s*/gi, "")
    .replace(/\s*<link\s+rel="canonical"[^>]*>\s*/gi, "");

  return withoutExistingSeo.replace("</head>", `    ${buildMetaTags(meta)}\n  </head>`);
}

export function registerSeoRoutes(app: Express) {
  app.get("/robots.txt", (_req, res) => {
    res
      .type("text/plain")
      .send(
        [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          "Disallow: /admin",
          "Disallow: /login",
          "Disallow: /profile",
          "Disallow: /articles/new",
          "Disallow: /articles/*/edit",
          "",
          `Sitemap: ${ENV.siteUrl}/sitemap.xml`,
          `Host: ${new URL(ENV.siteUrl).host}`,
          "",
        ].join("\n")
      );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const articles = await getArticles(1000);
    const staticPages = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/articles", priority: "0.9", changefreq: "daily" },
      { path: "/resources", priority: "0.7", changefreq: "weekly" },
      { path: "/about", priority: "0.5", changefreq: "monthly" },
      { path: "/contact", priority: "0.4", changefreq: "monthly" },
    ];

    const staticEntries = staticPages
      .map(
        page => `  <url>
    <loc>${escapeXml(canonicalForPath(page.path))}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
      )
      .join("\n");

    const articleEntries = articles
      .map(article => {
        const lastmod = toIsoDate(article.updatedAt) ?? toIsoDate(article.createdAt);
        return `  <url>
    <loc>${escapeXml(canonicalForPath(`/articles/${article.id}`))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join("\n");

    res
      .type("application/xml")
      .send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[staticEntries, articleEntries].filter(Boolean).join("\n")}
</urlset>
`);
  });
}
