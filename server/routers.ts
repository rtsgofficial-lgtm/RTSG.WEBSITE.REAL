import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { sendContactNotificationEmail, sendResendHelloWorldEmail } from "./_core/resendEmail";
import { getLatestSubstackPost } from "./_core/substack";
import {
  createShopCheckoutSession,
  getRequestOrigin,
  getShopProduct,
  listShopProducts,
  updateShopProductCopy,
} from "./_core/stripeCheckout";
import { storagePut } from "./storage";
import crypto from "crypto";

// ─── Role-based middleware ──────────────────────────────────────────────────

const ARTICLE_LIMIT_PER_USER = 50;
const ARTICLE_SPAM_WINDOW_MS = 10 * 60 * 1000;
const ARTICLE_SPAM_LIMIT = 5;
const COMMENT_SPAM_WINDOW_MS = 60 * 1000;
const COMMENT_SPAM_LIMIT = 8;
const COMBINED_SPAM_WINDOW_MS = 5 * 60 * 1000;
const COMBINED_SPAM_LIMIT = 15;

type PostKind = "article" | "comment";
type SpamTracker = { articleTimes: number[]; commentTimes: number[] };

const postSpamTrackers = new Map<number, SpamTracker>();

function trimRecent(timestamps: number[], now: number, windowMs: number) {
  return timestamps.filter((timestamp) => now - timestamp <= windowMs);
}

async function checkSpamAndAutoMute(user: { id: number; role: "user" | "admin" | "moderator" }, kind: PostKind) {
  if (user.role === "admin" || user.role === "moderator") {
    return;
  }

  const now = Date.now();
  const tracker = postSpamTrackers.get(user.id) ?? { articleTimes: [], commentTimes: [] };
  const maxWindowMs = Math.max(ARTICLE_SPAM_WINDOW_MS, COMMENT_SPAM_WINDOW_MS, COMBINED_SPAM_WINDOW_MS);

  tracker.articleTimes = trimRecent(tracker.articleTimes, now, maxWindowMs);
  tracker.commentTimes = trimRecent(tracker.commentTimes, now, maxWindowMs);

  if (kind === "article") {
    tracker.articleTimes.push(now);
  } else {
    tracker.commentTimes.push(now);
  }

  const recentArticleCount = trimRecent(tracker.articleTimes, now, ARTICLE_SPAM_WINDOW_MS).length;
  const recentCommentCount = trimRecent(tracker.commentTimes, now, COMMENT_SPAM_WINDOW_MS).length;
  const recentCombinedCount =
    trimRecent(tracker.articleTimes, now, COMBINED_SPAM_WINDOW_MS).length +
    trimRecent(tracker.commentTimes, now, COMBINED_SPAM_WINDOW_MS).length;

  postSpamTrackers.set(user.id, tracker);

  const isSpamming =
    recentArticleCount > ARTICLE_SPAM_LIMIT ||
    recentCommentCount > COMMENT_SPAM_LIMIT ||
    recentCombinedCount > COMBINED_SPAM_LIMIT;

  if (isSpamming) {
    postSpamTrackers.delete(user.id);
    await db.muteUser(user.id);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account was automatically muted because it posted too frequently. Please contact an admin if this was a mistake.",
    });
  }
}

const modProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "moderator") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Moderator access required" });
  }
  return next({ ctx });
});

// ─── Helper: hash password with crypto ──────────────────────────────────────

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashLocalPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyLocalPassword(password: string, storedHash: string): boolean {
  const [scheme, salt, hash] = storedHash.split(":");

  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(password, salt, 64);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

async function setSessionCookie(ctx: any, user: NonNullable<Awaited<ReturnType<typeof db.getUserById>>>) {
  const sessionToken = await import("./_core/sdk").then(({ sdk }) =>
    sdk.createSessionToken(user.openId, {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    })
  );

  const cookieOptions = getSessionCookieOptions(ctx.req);

  ctx.res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
}

// ─── Admin session tokens (in-memory store for server-side validation) ──────

const adminSessions = new Map<string, { username: string; createdAt: number }>();

function cleanExpiredSessions() {
  const now = Date.now();
  const TTL = 24 * 60 * 60 * 1000;
  Array.from(adminSessions.entries()).forEach(([token, session]) => {
    if (now - session.createdAt > TTL) {
      adminSessions.delete(token);
    }
  });
}

function validateAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  cleanExpiredSessions();
  return adminSessions.has(token);
}


// ─── YouTube Data API helpers ───────────────────────────────────────────────

type LatestYouTubeVideo = {
  videoId: string;
  title: string | null;
  thumbnail: string | null;
  publishedTimeText: string | null;
  embedUrl: string;
  source: "api" | "manual";
};

let youtubeCache: {
  expiresAt: number;
  data: LatestYouTubeVideo | null;
} | null = null;

const YOUTUBE_CACHE_TTL_MS = 30 * 60 * 1000;

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match?.[1] ?? null;
}

function formatPublishedTime(publishedAt?: string): string | null {
  if (!publishedAt) return null;

  const publishedDate = new Date(publishedAt);
  if (Number.isNaN(publishedDate.getTime())) return null;

  const diffDays = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

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

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `YouTube API request failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`
    );
  }

  return response.json() as Promise<T>;
}

async function getYouTubeUploadsPlaylistId(apiKey: string): Promise<string> {
  const directUploadsPlaylistId = process.env.YOUTUBE_UPLOADS_PLAYLIST_ID;

  if (directUploadsPlaylistId) {
    return directUploadsPlaylistId;
  }

  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE || "@RTSG_Main";

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("key", apiKey);

  if (channelId) {
    url.searchParams.set("id", channelId);
  } else {
    url.searchParams.set("forHandle", channelHandle);
  }

  const data = await fetchJson<{
    items?: Array<{
      contentDetails?: {
        relatedPlaylists?: {
          uploads?: string;
        };
      };
    }>;
  }>(url);

  const uploadsPlaylistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Could not find YouTube uploads playlist ID.");
  }

  return uploadsPlaylistId;
}

async function fetchLatestYouTubeVideoFromApi(): Promise<LatestYouTubeVideo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("[YouTube] Missing YOUTUBE_API_KEY");
    return null;
  }

  const uploadsPlaylistId = await getYouTubeUploadsPlaylistId(apiKey);

  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", uploadsPlaylistId);
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  const data = await fetchJson<{
    items?: Array<{
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: {
          default?: { url?: string };
          medium?: { url?: string };
          high?: { url?: string };
          standard?: { url?: string };
          maxres?: { url?: string };
        };
        resourceId?: {
          videoId?: string;
        };
      };
    }>;
  }>(url);

  const snippet = data.items?.[0]?.snippet;
  const videoId = snippet?.resourceId?.videoId;

  if (!videoId) {
    return null;
  }

  return {
    videoId,
    title: snippet?.title || null,
    thumbnail:
      snippet?.thumbnails?.maxres?.url ||
      snippet?.thumbnails?.standard?.url ||
      snippet?.thumbnails?.high?.url ||
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url ||
      null,
    publishedTimeText: formatPublishedTime(snippet?.publishedAt),
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    source: "api",
  };
}

async function getManualFeaturedVideo(): Promise<LatestYouTubeVideo | null> {
  const configuredUrl = await db.getSetting("featuredVideoUrl");

  if (!configuredUrl) {
    return null;
  }

  const videoId = extractYouTubeVideoId(configuredUrl);

  if (!videoId) {
    return null;
  }

  return {
    videoId,
    title: null,
    thumbnail: null,
    publishedTimeText: null,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    source: "manual",
  };
}

// ─── Admin-session-protected procedure ──────────────────────────────────────

const dashboardProcedure = publicProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role === "admin") {
    return next({ ctx });
  }
  const authHeader = ctx.req.headers["x-admin-token"] as string | undefined;
  if (validateAdminToken(authHeader)) {
    return next({ ctx });
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);

      const existingCredential = await db.getUserCredentialByEmail(email);

      if (existingCredential) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      let user = await db.getUserByEmail(email);

      if (!user) {
        user = await db.createLocalUser({
          name: input.name,
          email,
        });
      }

      await db.createUserCredential({
        userId: user.id,
        email,
        passwordHash: hashLocalPassword(input.password),
      });

      await db.updateUserLastSignedIn(user.id);
      await setSessionCookie(ctx, user);

      return { success: true, user };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      const credential = await db.getUserCredentialByEmail(email);

      if (!credential || !verifyLocalPassword(input.password, credential.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const user = await db.getUserById(credential.userId);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      await db.updateUserLastSignedIn(user.id);
      await setSessionCookie(ctx, user);

      return { success: true, user };
    }),

  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
}),

  // ─── Admin Auth (separate username/password) ────────────────────────────

  adminAuth: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const cred = await db.getAdminCredentialByUsername(input.username);
        if (!cred || !verifyPassword(input.password, cred.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }
        const token = crypto.randomBytes(32).toString("hex");
        adminSessions.set(token, { username: cred.username, createdAt: Date.now() });
        return { success: true, token, username: cred.username };
      }),
    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(({ input }) => {
        return { valid: validateAdminToken(input.token) };
      }),
    logout: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(({ input }) => {
        adminSessions.delete(input.token);
        return { success: true };
      }),
    setup: publicProcedure
      .input(z.object({ username: z.string().min(3), password: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const exists = await db.adminCredentialExists();
        if (exists) {
          throw new TRPCError({ code: "CONFLICT", message: "Admin credentials already configured" });
        }
        const passwordHash = hashPassword(input.password);
        await db.createAdminCredential(input.username, passwordHash);
        return { success: true };
      }),
    hasCredentials: publicProcedure.query(async () => {
      const exists = await db.adminCredentialExists();
      return { exists };
    }),
  }),

  // ─── User Management ──────────────────────────────────────────────────────

  users: router({
    list: dashboardProcedure.query(async () => {
      return db.getAllUsers();
    }),
    updateRole: dashboardProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "moderator"]) }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const user = await db.getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl, createdAt: user.createdAt };
    }),
    uploadAvatar: protectedProcedure
      .input(z.object({ imageBase64: z.string(), mimeType: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "png";
        const key = `avatars/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateUserAvatar(ctx.user.id, url);
        return { success: true, avatarUrl: url };
      }),
    mute: dashboardProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.muteUser(input.userId);
        return { success: true };
      }),
    unmute: dashboardProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.unmuteUser(input.userId);
        return { success: true };
      }),
    deleteArticlesByUser: dashboardProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const deletedCount = await db.deleteArticlesByAuthor(input.userId);
        return { success: true, deletedCount };
      }),
    deleteCommentsByUser: dashboardProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const deletedCount = await db.deleteCommentsByAuthor(input.userId);
        return { success: true, deletedCount };
      }),
    updateDisplayName: protectedProcedure
      .input(z.object({ displayName: z.string().min(1).max(100) }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserDisplayName(ctx.user.id, input.displayName);
        return { success: true };
      }),
  }),

  // ─── Articles ─────────────────────────────────────────────────────────────

  articles: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), searchQuery: z.string().optional(), sortBy: z.enum(['newest', 'oldest', 'mostViewed']).optional() }).optional())
      .query(async ({ input }) => {
        return db.getArticles(input?.limit || 50, input?.offset || 0, input?.searchQuery, input?.sortBy || 'newest');
      }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const article = await db.getArticleById(input.id);
      if (!article) return undefined;
      if (!article.isPublished && (!ctx.user || (ctx.user.id !== article.authorId && ctx.user.role !== "admin"))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This draft is not accessible" });
      }
      return article;
    }),
    incrementView: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.incrementViewCount(input.id);
      return { success: true };
    }),
    getByAuthor: publicProcedure.input(z.object({ authorId: z.number() })).query(async ({ input }) => {
      return db.getArticlesByAuthor(input.authorId);
    }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().min(1),
          excerpt: z.string().optional(),
          coverImageUrl: z.string().optional(),
          isPublished: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isMuted = await db.isUserMuted(ctx.user.id);
        if (isMuted) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Your account is muted and cannot create articles" });
        }

        await checkSpamAndAutoMute(ctx.user, "article");

        if (ctx.user.role !== "admin") {
          const currentArticleCount = await db.countArticlesByAuthor(ctx.user.id);
          if (currentArticleCount >= ARTICLE_LIMIT_PER_USER) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Article limit reached. Each user can create up to ${ARTICLE_LIMIT_PER_USER} articles.`,
            });
          }
        }

        const articleId = await db.createArticle(
          input.title,
          input.content,
          input.excerpt || null,
          input.coverImageUrl || null,
          ctx.user.id
        );
        if (!articleId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.isPublished) {
          await db.publishArticle(articleId);
        }
        return { success: true, articleId, isDraft: !input.isPublished };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1),
          content: z.string().min(1),
          excerpt: z.string().optional(),
          coverImageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const article = await db.getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        if (article.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateArticle(input.id, input.title, input.content, input.excerpt || null, input.coverImageUrl || null);
        return { success: true };
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const article = await db.getArticleById(input.id);
      if (!article) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      }

      const authHeader = ctx.req.headers["x-admin-token"] as string | undefined;
      const isDashboardAdmin = validateAdminToken(authHeader);
      const isOwner = ctx.user?.id === article.authorId;
      const isModerator = ctx.user?.role === "admin" || ctx.user?.role === "moderator";

      if (!isDashboardAdmin && !isOwner && !isModerator) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own articles" });
      }

      await db.deleteArticle(input.id);
      return { success: true };
    }),
    togglePin: modProcedure
      .input(z.object({ id: z.number(), isPinned: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.togglePinArticle(input.id, input.isPinned);
        return { success: true };
      }),
    toggleLock: modProcedure
      .input(z.object({ id: z.number(), isLocked: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleLockArticle(input.id, input.isLocked);
        return { success: true };
      }),
    getUserDrafts: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserDrafts(ctx.user.id);
    }),
    publishDraft: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const article = await db.getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        if (article.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.publishArticle(input.id);
        return { success: true };
      }),
  }),

  // ─── Comments ─────────────────────────────────────────────────────────────

  comments: router({
    listByArticle: publicProcedure.input(z.object({ articleId: z.number() })).query(async ({ input }) => {
      return db.getCommentsByArticle(input.articleId);
    }),
    create: protectedProcedure
      .input(z.object({ content: z.string().min(1), articleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const isMuted = await db.isUserMuted(ctx.user.id);
        if (isMuted) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Your account is muted and cannot create comments" });
        }
        await checkSpamAndAutoMute(ctx.user, "comment");
        await db.createComment(input.content, input.articleId, ctx.user.id);
        return { success: true };
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const comment = await db.getCommentById(input.id);
      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }

      const authHeader = ctx.req.headers["x-admin-token"] as string | undefined;
      const isDashboardAdmin = validateAdminToken(authHeader);
      const isOwner = ctx.user?.id === comment.authorId;
      const isStaff = ctx.user?.role === "admin" || ctx.user?.role === "moderator";

      if (!isDashboardAdmin && !isOwner && !isStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own comments" });
      }

      await db.deleteComment(input.id);
      return { success: true };
    }),
  }),

  // ─── Upload (for article images) ─────────────────────────────────────────

  upload: router({
    image: protectedProcedure
      .input(z.object({ imageBase64: z.string(), mimeType: z.string(), filename: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "png";
        const key = `articles/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { success: true, url };
      }),
  }),

  // ─── Site Pages ────────────────────────────────────────────────────────

  pages: router({
    getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      return db.getPageBySlug(input.slug);
    }),
    update: dashboardProcedure
      .input(z.object({ slug: z.string(), title: z.string(), content: z.string() }))
      .mutation(async ({ input }) => {
        await db.updatePage(input.slug, input.title, input.content);
        return { success: true };
      }),
    list: dashboardProcedure.query(async () => {
      return db.getAllPages();
    }),
  }),

  // ─── Contact Messages ─────────────────────────────────────────────────

  contact: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          subject: z.string().min(1),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        await db.createContactMessage(input.name, input.email, input.subject, input.message);
        const email = await sendContactNotificationEmail(input);
        return { success: true, emailSent: true, emailId: email?.id ?? null };
      }),
    list: dashboardProcedure.query(async () => {
      return db.getContactMessages();
    }),
    markRead: dashboardProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markMessageRead(input.id);
      return { success: true };
    }),
    delete: dashboardProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteContactMessage(input.id);
      return { success: true };
    }),
  }),

  resend: router({
    sendHelloWorld: dashboardProcedure.mutation(async () => {
      const data = await sendResendHelloWorldEmail();
      return { success: true, id: data?.id ?? null };
    }),
  }),

  shop: router({
    listProducts: publicProcedure.query(async () => {
      return listShopProducts();
    }),
    getProduct: publicProcedure.input(z.object({ productId: z.string().min(1) })).query(async ({ input }) => {
      const product = await getShopProduct(input.productId);

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return product;
    }),
    updateProductCopy: dashboardProcedure
      .input(
        z.object({
          productId: z.string().min(1),
          description: z.string().max(3000),
          details: z.string().max(5000),
        })
      )
      .mutation(async ({ input }) => {
        const product = await updateShopProductCopy(input);
        return { success: true, product };
      }),
    createCheckoutSession: publicProcedure
      .input(z.object({ productId: z.string().min(1), variantId: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        try {
          return createShopCheckoutSession({
            productId: input.productId,
            variantId: input.variantId,
            origin: getRequestOrigin(ctx.req),
          });
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Unable to start checkout.",
          });
        }
      }),
  }),

  // ─── Site Settings ──────────────────────────────────────────────────────

  settings: router({
    getConstructionMode: publicProcedure.query(async () => {
      const isUnderConstruction = await db.isUnderConstruction();
      return { isUnderConstruction };
    }),
    setConstructionMode: dashboardProcedure
      .input(z.object({ isUnderConstruction: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.setSetting("isUnderConstruction", input.isUnderConstruction ? "true" : "false");
        return { success: true };
      }),
    getFeaturedVideoUrl: publicProcedure.query(async () => {
      const url = await db.getSetting("featuredVideoUrl");
      return { url: url || null };
    }),
    setFeaturedVideoUrl: dashboardProcedure
      .input(z.object({ url: z.string().url().includes("youtube").or(z.string().url().includes("youtu.be")).or(z.literal("")) }))
      .mutation(async ({ input }) => {
        await db.setSetting("featuredVideoUrl", input.url);
        return { success: true };
      }),
    getHomepagePopup: publicProcedure.query(async () => {
      const [enabled, message] = await Promise.all([
        db.getSetting("homepagePopupEnabled"),
        db.getSetting("homepagePopupMessage"),
      ]);

      return {
        enabled: enabled === "true",
        message: message || "",
      };
    }),
    setHomepagePopup: dashboardProcedure
      .input(
        z.object({
          enabled: z.boolean(),
          message: z.string().max(2000, "Popup message must be 2,000 characters or fewer"),
        })
      )
      .mutation(async ({ input }) => {
        await Promise.all([
          db.setSetting("homepagePopupEnabled", input.enabled ? "true" : "false"),
          db.setSetting("homepagePopupMessage", input.message),
        ]);

        return { success: true };
      }),
  }),

  // ─── YouTube Latest Video ─────────────────────────────────────────────────

  youtube: router({
    getLatestVideo: publicProcedure.query(async () => {
      if (youtubeCache && youtubeCache.expiresAt > Date.now()) {
        return youtubeCache.data;
      }

      let latestVideo: LatestYouTubeVideo | null = null;

      try {
        latestVideo = await fetchLatestYouTubeVideoFromApi();
      } catch (err) {
        console.warn("[YouTube] Failed to fetch latest video from YouTube Data API:", err);
      }

      if (!latestVideo) {
        latestVideo = await getManualFeaturedVideo();
      }

      youtubeCache = {
        expiresAt: Date.now() + YOUTUBE_CACHE_TTL_MS,
        data: latestVideo,
      };

      return latestVideo;
    }),
  }),

  substack: router({
    getLatestPost: publicProcedure.query(async () => {
      try {
        return await getLatestSubstackPost();
      } catch (err) {
        console.warn("[Substack] Failed to fetch latest post from RSS feed:", err);
        return null;
      }
    }),
  }),

  pdfResources: router({
    list: publicProcedure.query(async () => {
      return db.getPdfResources();
    }),
    create: dashboardProcedure
      .input(z.object({ title: z.string().min(1), pdfFile: z.string(), filename: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.pdfFile, "base64");

        // Validate PDF magic bytes (%PDF-)
        if (buffer.length < 5 || buffer.slice(0, 5).toString("ascii") !== "%PDF-") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File does not appear to be a valid PDF" });
        }

        // Sanitize filename: replace spaces and special chars with hyphens, keep alphanumeric/dots/hyphens
        const sanitized = input.filename
          .toLowerCase()
          .replace(/[^a-z0-9.\-_]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        const safeFilename = sanitized || "document.pdf";

        const key = `pdfs/${Date.now()}-${safeFilename}`;
        let url: string;
        try {
          const result = await storagePut(key, buffer, "application/pdf");
          url = result.url;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown storage error";
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `PDF upload failed: ${msg}` });
        }
        await db.createPdfResource(input.title, url);
        return { success: true };
      }),
    delete: dashboardProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deletePdfResource(input.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
