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

let substackCache: {
  expiresAt: number;
  data: LatestSubstackPost | null;
} | null = null;

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
  const response = await fetch(ENV.substackFeedUrl, {
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
    url,
    excerpt: createExcerpt(description ?? content),
    imageUrl: extractImage(itemXml, content, description),
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

  const xml = await fetchSubstackFeedXml();
  const latestPost = parseLatestPost(xml);

  substackCache = {
    expiresAt: Date.now() + SUBSTACK_CACHE_TTL_MS,
    data: latestPost,
  };

  return latestPost;
}
