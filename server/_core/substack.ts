import { ENV } from "./env";

export type LatestSubstackPost = {
  title: string;
  url: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  publishedTimeText: string | null;
  author: string | null;
  source: "rss";
};

const SUBSTACK_CACHE_TTL_MS = 30 * 60 * 1000;
const SUBSTACK_ERROR_CACHE_TTL_MS = 5 * 60 * 1000;
const SUBSTACK_HOST = "www.media.rtsg.org";
const DEFAULT_SUBSTACK_FEED_URL = `https://${SUBSTACK_HOST}/feed`;

let substackCache: {
  expiresAt: number;
  data: LatestSubstackPost | null;
} | null = null;

function normalizeFeedUrl(value: string) {
  const trimmed = value.trim() || DEFAULT_SUBSTACK_FEED_URL;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.hostname.replace(/^www\./i, "") === "media.rtsg.org") {
      url.hostname = SUBSTACK_HOST;
    }
    return url.toString();
  } catch {
    return DEFAULT_SUBSTACK_FEED_URL;
  }
}

function normalizeSubstackUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.hostname.replace(/^www\./i, "") === "media.rtsg.org") {
      url.hostname = SUBSTACK_HOST;
    }
    return url.toString();
  } catch {
    return value;
  }
}

function getFeedUrlCandidates() {
  return Array.from(new Set([normalizeFeedUrl(ENV.substackFeedUrl), DEFAULT_SUBSTACK_FEED_URL]));
}

function getFetchFailureMessage(error: unknown) {
  const cause = (error as { cause?: { code?: string; hostname?: string; message?: string } })?.cause;
  const message = error instanceof Error ? error.message : String(error);
  const hostDetail = cause?.hostname ? ` (${cause.hostname})` : "";
  return cause?.code ? `${cause.code}${hostDetail}` : message;
}

function decodeText(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function decodeXmlValue(value: string) {
  return decodeText(value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim());
}

function stripHtml(value: string) {
  return decodeText(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createExcerpt(value: string | null) {
  if (!value) return null;
  const text = stripHtml(value);
  if (!text) return null;
  return text.length > 220 ? `${text.slice(0, 217).trim()}...` : text;
}

function extractFirstImage(value: string | null) {
  if (!value) return null;
  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function getTagContent(xml: string, tagName: string) {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escapedTagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTagName}>`, "i"));
  return match?.[1] ? decodeXmlValue(match[1]) : null;
}

function getTagAttributes(xml: string, tagName: string) {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = xml.matchAll(new RegExp(`<${escapedTagName}\\s+([^>]*?)(?:\\/?>)`, "gi"));
  return Array.from(matches).map((match) => {
    const attributes: Record<string, string> = {};
    const attributeText = match[1] ?? "";

    for (const attrMatch of Array.from(attributeText.matchAll(/([\w:-]+)=["']([^"']*)["']/g))) {
      attributes[attrMatch[1]] = decodeXmlValue(attrMatch[2]);
    }

    return attributes;
  });
}

function extractImage(itemXml: string, content: string | null, description: string | null) {
  for (const mediaItem of getTagAttributes(itemXml, "media:content")) {
    if (mediaItem.url && (!mediaItem.medium || mediaItem.medium === "image")) {
      return mediaItem.url;
    }
  }

  for (const enclosure of getTagAttributes(itemXml, "enclosure")) {
    if (enclosure.url && enclosure.type?.startsWith("image/")) {
      return enclosure.url;
    }
  }

  return extractFirstImage(content) ?? extractFirstImage(description);
}

function formatPublishedTime(publishedAt: string | null) {
  if (!publishedAt) return null;

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;

  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return "1 year ago";
  return `${diffYears} years ago`;
}

async function fetchSubstackFeedXml() {
  let lastError: unknown = null;

  for (const feedUrl of getFeedUrlCandidates()) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
          "User-Agent": "RTSGWebsite/1.0 (+https://rtsg.org)",
        },
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Substack feed request failed: ${response.status} ${response.statusText}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
        );
      }

      return response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Substack feed unavailable at www.media.rtsg.org/feed: ${getFetchFailureMessage(lastError)}`);
}

function parseLatestPost(xml: string): LatestSubstackPost | null {
  const itemMatch = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/i);
  const itemXml = itemMatch?.[0];

  if (!itemXml) {
    return null;
  }

  const title = getTagContent(itemXml, "title");
  const url = getTagContent(itemXml, "link") ?? getTagContent(itemXml, "guid");
  const publishedAt = getTagContent(itemXml, "pubDate") ?? getTagContent(itemXml, "dc:date");
  const content = getTagContent(itemXml, "content:encoded");
  const description = getTagContent(itemXml, "description");

  if (!title || !url) {
    return null;
  }

  return {
    title,
    url: normalizeSubstackUrl(url) ?? url,
    excerpt: createExcerpt(description ?? content),
    imageUrl: normalizeSubstackUrl(extractImage(itemXml, content, description)),
    publishedAt,
    publishedTimeText: formatPublishedTime(publishedAt),
    author: getTagContent(itemXml, "dc:creator") ?? getTagContent(itemXml, "author"),
    source: "rss",
  };
}

export async function getLatestSubstackPost() {
  if (substackCache && substackCache.expiresAt > Date.now()) {
    return substackCache.data;
  }

  let latestPost: LatestSubstackPost | null = null;

  try {
    const xml = await fetchSubstackFeedXml();
    latestPost = parseLatestPost(xml);
  } catch (error) {
    console.warn("[Substack] Latest post unavailable:", error instanceof Error ? error.message : error);
  }

  substackCache = {
    expiresAt: Date.now() + (latestPost ? SUBSTACK_CACHE_TTL_MS : SUBSTACK_ERROR_CACHE_TTL_MS),
    data: latestPost,
  };

  return latestPost;
}
