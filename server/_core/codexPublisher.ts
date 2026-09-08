import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import sharp from "sharp";
import { z } from "zod";
import { NEWS_CATEGORIES, normalizeNewsCategory } from "@shared/newsCategories";
import { createArticleSlug } from "@shared/newsSlugs";
import * as db from "../db";
import { storagePut } from "../storage";
import { ENV } from "./env";
import { getRequestOrigin } from "./stripeCheckout";

export const CODEX_PUBLISHER_SCOPES = [
  "article:create",
  "article:publish",
  "image:upload",
] as const;

type CodexPublisherScope = (typeof CODEX_PUBLISHER_SCOPES)[number];

type AuthenticatedPublisher = {
  id: string;
  name: string;
  scopes: string[];
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const RESPONSIVE_IMAGE_WIDTHS = [480, 960, 1440] as const;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const allowedOrigins = new Set([
  "https://rtsg.org",
  "https://www.rtsg.org",
  "https://news.rtsg.org",
]);

const codexArticleSchema = z.object({
  title: z.string().trim().min(1).max(256),
  subtitle: z.string().trim().max(512).optional().default(""),
  content: z.string().min(1).max(120_000),
  category: z.enum(NEWS_CATEGORIES).optional().default("Editorials"),
  tags: z.array(z.string().trim().min(1).max(48)).max(5).optional().default([]),
  author: z.string().optional(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  imageUrl: z.string().url().max(512).optional(),
  attributions: z.string().max(5000).optional().default(""),
});

const codexImageSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().trim().min(1).max(64),
  filename: z.string().trim().max(180).optional(),
});

function getPublisherMinWords() {
  return Number.parseInt(process.env.CODEX_MIN_WORDS ?? "400", 10) || 400;
}

function getPublisherMaxWords() {
  return Number.parseInt(process.env.CODEX_MAX_WORDS ?? "3000", 10) || 3000;
}

async function isPublisherEnabled() {
  const setting = await db.getSetting("codexPublisherEnabled");
  if (setting !== undefined) return setting === "true";
  return (process.env.CODEX_PUBLISHER_ENABLED ?? "true") === "true";
}

export function hashCodexPublisherToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createCodexPublisherPlaintextToken() {
  return `rtsg_codex_${crypto.randomBytes(32).toString("base64url")}`;
}

export async function createCodexPublisherToken(input?: {
  name?: string;
  scopes?: string[];
  expiresAt?: Date | null;
}) {
  const token = createCodexPublisherPlaintextToken();
  const tokenHash = hashCodexPublisherToken(token);
  const tokenId = crypto.randomUUID();

  await db.createCodexPublisherToken({
    id: tokenId,
    name:
      input?.name?.trim() ||
      process.env.CODEX_TOKEN_NAME?.trim() ||
      "RTSG Weekly Publisher",
    tokenHash,
    scopes: input?.scopes ?? [...CODEX_PUBLISHER_SCOPES],
    expiresAt: input?.expiresAt ?? null,
  });

  return { token, tokenId };
}

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function constantTimeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

async function readJsonBody(req: Request, res: Response, next: NextFunction) {
  req.setTimeout(15_000);
  res.setTimeout(20_000);
  next();
}

function enforceHttps(req: Request, res: Response, next: NextFunction) {
  if (!ENV.isProduction) {
    next();
    return;
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (req.secure || forwardedProto === "https") {
    next();
    return;
  }

  res.status(403).json({ error: "HTTPS is required." });
}

function restrictCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const localDevOrigin =
    !ENV.isProduction &&
    origin &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  if (origin && (allowedOrigins.has(origin) || localDevOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(origin && (allowedOrigins.has(origin) || localDevOrigin) ? 204 : 403);
    return;
  }

  if (origin && !allowedOrigins.has(origin) && !localDevOrigin) {
    res.status(403).json({ error: "Origin is not allowed." });
    return;
  }

  next();
}

async function authenticatePublisher(
  req: Request,
  requiredScope: CodexPublisherScope
): Promise<AuthenticatedPublisher> {
  if (!(await isPublisherEnabled())) {
    throw Object.assign(new Error("Codex Publisher API is disabled."), {
      status: 403,
    });
  }

  const plaintextToken = getBearerToken(req);
  if (!plaintextToken) {
    throw Object.assign(new Error("Invalid token."), { status: 401 });
  }

  const tokenHash = hashCodexPublisherToken(plaintextToken);
  const storedToken = await db.getCodexPublisherTokenByHash(tokenHash);

  if (
    !storedToken ||
    !constantTimeEqualHex(tokenHash, storedToken.tokenHash) ||
    !storedToken.active ||
    (storedToken.expiresAt && storedToken.expiresAt.getTime() <= Date.now())
  ) {
    throw Object.assign(new Error("Invalid token."), { status: 401 });
  }

  const scopes = Array.isArray(storedToken.scopes) ? storedToken.scopes : [];
  if (!scopes.includes(requiredScope)) {
    throw Object.assign(new Error("Missing required scope."), {
      status: 403,
      tokenId: storedToken.id,
    });
  }

  await db.updateCodexPublisherTokenLastUsed(storedToken.id);
  return { id: storedToken.id, name: storedToken.name, scopes };
}

function getIp(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  return (
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      ?.split(",")[0]
      ?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    null
  );
}

function sanitizeHtml(input: string) {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, "");
}

function toPlainText(html: string) {
  return sanitizeHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(html: string) {
  const text = toPlainText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean))).slice(0, 5);
}

function createCodexArticleUrl(req: Request, articleId: number, title: string) {
  const origin =
    req.hostname === "news.rtsg.org"
      ? getRequestOrigin(req)
      : "https://news.rtsg.org";
  return `${origin.replace(/\/+$/, "")}/articles/${articleId}/${createArticleSlug(title)}`;
}

async function ensureRateLimit(input: {
  publisher: AuthenticatedPublisher;
  action: "draft_create" | "publish" | "image_upload";
}) {
  const now = Date.now();
  const windows = {
    draft_create: { since: new Date(now - ONE_DAY_MS), max: 3, message: "Maximum 3 draft creations per day reached." },
    publish: { since: new Date(now - SEVEN_DAYS_MS), max: 1, message: "Maximum 1 publish every 7 days reached." },
    image_upload: { since: new Date(now - ONE_DAY_MS), max: 10, message: "Maximum 10 image uploads per day reached." },
  } as const;
  const rule = windows[input.action];
  const count = await db.countCodexPublisherActionsSince(
    input.publisher.id,
    input.action,
    rule.since
  );

  if (count >= rule.max) {
    throw Object.assign(new Error(rule.message), { status: 429 });
  }
}

async function withPublisherAudit(
  req: Request,
  res: Response,
  requiredScope: CodexPublisherScope,
  action: "draft_create" | "publish" | "image_upload",
  handler: (publisher: AuthenticatedPublisher) => Promise<{ articleId?: number | null; body: unknown }>
) {
  let publisher: AuthenticatedPublisher | null = null;
  let articleId: number | null = null;

  try {
    publisher = await authenticatePublisher(req, requiredScope);
    await ensureRateLimit({ publisher, action });
    const result = await handler(publisher);
    articleId = result.articleId ?? null;
    await db.createCodexPublisherLog({
      tokenId: publisher.id,
      action,
      articleId,
      ipAddress: getIp(req),
      success: true,
    });
    console.info(
      JSON.stringify({
        service: "codex-publisher",
        action,
        tokenId: publisher.id,
        articleId,
        success: true,
      })
    );
    res.json(result.body);
  } catch (error) {
    const status =
      error instanceof z.ZodError
        ? 400
        : Number((error as { status?: unknown }).status) || 500;
    const message =
      error instanceof Error ? error.message : "Codex Publisher API error.";
    await db.createCodexPublisherLog({
      tokenId:
        publisher?.id ??
        ((error as { tokenId?: string }).tokenId ? String((error as { tokenId?: string }).tokenId) : null),
      action,
      articleId,
      ipAddress: getIp(req),
      success: false,
      errorMessage: message,
    });
    console.info(
      JSON.stringify({
        service: "codex-publisher",
        action,
        tokenId: publisher?.id ?? null,
        articleId,
        success: false,
        status,
        error: message,
      })
    );
    res.status(status).json({ error: message });
  }
}

export async function handleCreateCodexArticle(req: Request, res: Response) {
  await withPublisherAudit(
    req,
    res,
    "article:create",
    "draft_create",
    async publisher => {
      const input = codexArticleSchema.parse(req.body);
      const sanitizedContent = sanitizeHtml(input.content);
      const wordCount = countWords(sanitizedContent);
      const minWords = getPublisherMinWords();
      const maxWords = getPublisherMaxWords();

      if (wordCount < minWords || wordCount > maxWords) {
        throw Object.assign(
          new Error(`Article body must be between ${minWords} and ${maxWords} words.`),
          { status: 400 }
        );
      }

      const status = input.status;
      if (status === "published" && !publisher.scopes.includes("article:publish")) {
        throw Object.assign(new Error("Missing required scope."), { status: 403 });
      }
      if (status === "published") {
        await ensureRateLimit({ publisher, action: "publish" });
      }

      const articleId = await db.createNewsArticle({
        title: input.title,
        subtitle: input.subtitle || null,
        content: sanitizedContent,
        excerpt: input.subtitle || toPlainText(sanitizedContent).slice(0, 240),
        coverImageUrl: input.imageUrl ?? null,
        attributions: input.attributions ? sanitizeHtml(input.attributions) : null,
        category: normalizeNewsCategory(input.category),
        tags: normalizeTags(input.tags),
        status,
        authorId: null,
        authorName: "RTSG News",
        authorXUrl: null,
        isPublished: status === "published",
      });

      if (!articleId) {
        throw Object.assign(new Error("Article could not be created."), {
          status: 500,
        });
      }

      if (status === "published") {
        await db.createCodexPublisherLog({
          tokenId: publisher.id,
          action: "publish",
          articleId,
          ipAddress: getIp(req),
          success: true,
        });
      }

      return {
        articleId,
        body: { id: String(articleId), url: createCodexArticleUrl(req, articleId, input.title) },
      };
    }
  );
}

export async function handlePublishCodexArticle(req: Request, res: Response) {
  await withPublisherAudit(req, res, "article:publish", "publish", async () => {
      const articleId = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(articleId) || articleId <= 0) {
        throw Object.assign(new Error("Invalid article id."), { status: 400 });
      }

      const article = await db.getNewsArticleById(articleId, true);
      if (!article) {
        throw Object.assign(new Error("Article not found."), { status: 404 });
      }

      await db.publishNewsArticle(articleId);
      return {
        articleId,
        body: {
          id: String(articleId),
          url: createCodexArticleUrl(req, articleId, article.title),
        },
      };
  });
}

export async function handleUploadCodexImage(req: Request, res: Response) {
  await withPublisherAudit(req, res, "image:upload", "image_upload", async publisher => {
      const input = codexImageSchema.parse(req.body);
      const mimeType = input.mimeType.toLowerCase();

      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        throw Object.assign(new Error("Image must be png, jpg, or webp."), {
          status: 400,
        });
      }

      const imageBuffer = Buffer.from(input.imageBase64, "base64");
      if (imageBuffer.length === 0 || imageBuffer.length > MAX_IMAGE_BYTES) {
        throw Object.assign(new Error("Image must be 10 MB or smaller."), {
          status: 400,
        });
      }

      const safeName =
        input.filename
          ?.replace(/\.[^.]+$/, "")
          .replace(/[^a-z0-9_-]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase()
          .slice(0, 80) || "article-image";
      const image = sharp(imageBuffer, { failOn: "error" }).rotate();
      const metadata = await image.metadata();
      const originalWidth = metadata.width ?? RESPONSIVE_IMAGE_WIDTHS.at(-1)!;
      const responsive = [];

      for (const width of RESPONSIVE_IMAGE_WIDTHS) {
        if (width > originalWidth && responsive.length > 0) continue;
        const webpBuffer = await sharp(imageBuffer, { failOn: "error" })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        const { url } = await storagePut(
          `codex-news/${publisher.id}/${Date.now()}-${safeName}-${width}.webp`,
          webpBuffer,
          "image/webp"
        );
        responsive.push({ width, url });
      }

      if (responsive.length === 0) {
        const webpBuffer = await image.webp({ quality: 82 }).toBuffer();
        const { url } = await storagePut(
          `codex-news/${publisher.id}/${Date.now()}-${safeName}.webp`,
          webpBuffer,
          "image/webp"
        );
        responsive.push({ width: originalWidth, url });
      }

      const primary = responsive[responsive.length - 1];
      const thumbnail = responsive[0];

      return {
        body: {
          url: primary.url,
          thumbnailUrl: thumbnail.url,
          responsive,
        },
      };
    });
}

export function registerCodexPublisherApi(app: Express) {
  app.use("/api/codex", readJsonBody, enforceHttps, restrictCors);
  app.post("/api/codex/articles", handleCreateCodexArticle);
  app.post("/api/codex/articles/:id/publish", handlePublishCodexArticle);
  app.post("/api/codex/images", handleUploadCodexImage);
}
