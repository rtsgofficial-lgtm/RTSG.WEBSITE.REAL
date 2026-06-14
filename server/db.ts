import { eq, desc, and, sql, or, like, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userCredentials,
  passwordResetTokens,
  loginRateLimits,
  passwordResetRateLimits,
  adminCredentials,
  articles,
  comments,
  notifications,
  sitePages,
  contactMessages,
  siteSettings,
  pdfResources,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

const coreUserSelect = {
  id: users.id,
  openId: users.openId,
  name: users.name,
  email: users.email,
  loginMethod: users.loginMethod,
  role: users.role,
  avatarUrl: users.avatarUrl,
  profileBio: sql<string | null>`NULL`,
  isMuted: users.isMuted,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastSignedIn: users.lastSignedIn,
};

function isMissingProfileBioColumnError(error: unknown) {
  const message = String((error as { message?: unknown })?.message ?? error);
  return message.includes("profileBio") && (message.includes("Unknown column") || message.includes("ER_BAD_FIELD_ERROR"));
}

// ─── User Helpers ───────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  let result;
  try {
    result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  } catch (error) {
    if (!isMissingProfileBioColumnError(error)) throw error;
    result = await db.select(coreUserSelect).from(users).where(eq(users.openId, openId)).limit(1);
  }
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  let result;
  try {
    result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  } catch (error) {
    if (!isMissingProfileBioColumnError(error)) throw error;
    result = await db.select(coreUserSelect).from(users).where(eq(users.id, userId)).limit(1);
  }
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    if (!isMissingProfileBioColumnError(error)) throw error;
    return db.select(coreUserSelect).from(users).orderBy(desc(users.createdAt));
  }
}

export function getMentionHandle(user: { id: number; name: string | null; email?: string | null }) {
  const base = user.name?.trim() || user.email?.split("@")[0] || `user-${user.id}`;
  const handle = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return handle || `user-${user.id}`;
}

export async function searchMentionableUsers(query: string, limit = 8) {
  const db = await getDb();
  if (!db) return [];

  const trimmedQuery = query.trim().toLowerCase();
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      email: users.email,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);

  return allUsers
    .map((user) => ({
      id: user.id,
      name: user.name || "Anonymous",
      avatarUrl: user.avatarUrl,
      role: user.role,
      handle: getMentionHandle(user),
    }))
    .filter((user) => {
      if (!trimmedQuery) return true;
      return (
        user.handle.includes(trimmedQuery) ||
        user.name.toLowerCase().includes(trimmedQuery)
      );
    })
    .slice(0, limit);
}

export async function findUsersByMentionHandles(handles: string[]) {
  const db = await getDb();
  if (!db || handles.length === 0) return [];

  const normalizedHandles = new Set(handles.map((handle) => handle.toLowerCase()));
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(users);

  return allUsers
    .map((user) => ({
      id: user.id,
      name: user.name || "Anonymous",
      avatarUrl: user.avatarUrl,
      role: user.role,
      handle: getMentionHandle(user),
    }))
    .filter((user) => normalizedHandles.has(user.handle));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "moderator") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserAvatar(userId: number, avatarUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
}

export async function updateUserDisplayName(userId: number, displayName: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ name: displayName }).where(eq(users.id, userId));
}

export async function updateUserProfileBio(userId: number, profileBio: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ profileBio }).where(eq(users.id, userId));
}

export async function getPublicUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const selectPublicProfile = (profileBio: typeof users.profileBio | ReturnType<typeof sql<string | null>>) =>
    db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        profileBio,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
        articleCount: sql<number>`(SELECT COUNT(*) FROM articles WHERE articles.authorId = ${users.id} AND articles.isPublished = true)`,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

  let result;
  try {
    result = await selectPublicProfile(users.profileBio);
  } catch (error) {
    if (!isMissingProfileBioColumnError(error)) throw error;
    result = await selectPublicProfile(sql<string | null>`NULL`);
  }

  return result[0];
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string) {
  const database = await getDb();
  if (!database) return null;

  const normalizedEmail = normalizeEmail(email);

  const result = await database
    .select(coreUserSelect)
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return result[0] ?? null;
}

export async function createLocalUser(input: {
  name: string;
  email: string;
}) {
  const database = await getDb();
  if (!database) {
    throw new Error("Database not available");
  }

  const email = normalizeEmail(input.email);
  const openId = `email:${email}`;

  await database.insert(users).values({
    openId,
    name: input.name,
    email,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });

  const user = await getUserByOpenId(openId);

  if (!user) {
    throw new Error("Failed to create local user");
  }

  return user;
}

export async function updateUserLastSignedIn(userId: number) {
  const database = await getDb();
  if (!database) return;

  await database
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserCredentialByEmail(email: string) {
  const database = await getDb();
  if (!database) return null;

  const normalizedEmail = normalizeEmail(email);

  const result = await database
    .select()
    .from(userCredentials)
    .where(eq(userCredentials.email, normalizedEmail))
    .limit(1);

  return result[0] ?? null;
}

export async function createUserCredential(input: {
  userId: number;
  email: string;
  passwordHash: string;
}) {
  const database = await getDb();
  if (!database) {
    throw new Error("Database not available");
  }

  await database.insert(userCredentials).values({
    userId: input.userId,
    email: normalizeEmail(input.email),
    passwordHash: input.passwordHash,
  });
}

export async function updateUserCredentialPassword(userId: number, passwordHash: string) {
  const database = await getDb();
  if (!database) {
    throw new Error("Database not available");
  }

  await database
    .update(userCredentials)
    .set({ passwordHash })
    .where(eq(userCredentials.userId, userId));
}

export async function getLoginRateLimit(email: string) {
  const database = await getDb();
  if (!database) return null;

  const result = await database
    .select()
    .from(loginRateLimits)
    .where(eq(loginRateLimits.email, normalizeEmail(email)))
    .limit(1);

  return result[0] ?? null;
}

export async function recordFailedLoginAttempt(email: string, maxAttempts: number, lockoutMs: number) {
  const database = await getDb();
  if (!database) return null;

  const normalizedEmail = normalizeEmail(email);
  const existing = await getLoginRateLimit(normalizedEmail);
  const now = new Date();
  const existingLock = existing?.lockedUntil;

  if (existingLock && existingLock.getTime() > now.getTime()) {
    return existing;
  }

  const nextFailedAttemptCount = (existing?.failedAttemptCount ?? 0) + 1;
  const lockedUntil =
    nextFailedAttemptCount >= maxAttempts ? new Date(now.getTime() + lockoutMs) : null;

  if (existing) {
    await database
      .update(loginRateLimits)
      .set({
        failedAttemptCount: nextFailedAttemptCount,
        lockedUntil,
        lastFailedAt: now,
      })
      .where(eq(loginRateLimits.email, normalizedEmail));
  } else {
    await database.insert(loginRateLimits).values({
      email: normalizedEmail,
      failedAttemptCount: nextFailedAttemptCount,
      lockedUntil,
      lastFailedAt: now,
    });
  }

  return {
    id: existing?.id ?? 0,
    email: normalizedEmail,
    failedAttemptCount: nextFailedAttemptCount,
    lockedUntil,
    lastFailedAt: now,
    updatedAt: now,
  };
}

export async function clearLoginFailures(email: string) {
  const database = await getDb();
  if (!database) return;

  await database
    .update(loginRateLimits)
    .set({ failedAttemptCount: 0, lockedUntil: null, lastFailedAt: null })
    .where(eq(loginRateLimits.email, normalizeEmail(email)));
}

export async function shouldAllowPasswordResetRequest(
  email: string,
  maxRequests: number,
  windowMs: number
) {
  const database = await getDb();
  if (!database) return false;

  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const result = await database
    .select()
    .from(passwordResetRateLimits)
    .where(eq(passwordResetRateLimits.email, normalizedEmail))
    .limit(1);

  const existing = result[0];
  const windowStartedAt = existing?.windowStartedAt;
  const isInsideWindow = windowStartedAt
    ? now.getTime() - windowStartedAt.getTime() <= windowMs
    : false;

  if (!existing || !isInsideWindow) {
    if (existing) {
      await database
        .update(passwordResetRateLimits)
        .set({
          requestCount: 1,
          windowStartedAt: now,
          lastRequestedAt: now,
        })
        .where(eq(passwordResetRateLimits.email, normalizedEmail));
    } else {
      await database.insert(passwordResetRateLimits).values({
        email: normalizedEmail,
        requestCount: 1,
        windowStartedAt: now,
        lastRequestedAt: now,
      });
    }

    return true;
  }

  const nextRequestCount = existing.requestCount + 1;

  await database
    .update(passwordResetRateLimits)
    .set({
      requestCount: nextRequestCount,
      lastRequestedAt: now,
    })
    .where(eq(passwordResetRateLimits.email, normalizedEmail));

  return nextRequestCount <= maxRequests;
}

export async function createPasswordResetToken(input: {
  userId: number;
  email: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const database = await getDb();
  if (!database) {
    throw new Error("Database not available");
  }

  await database.insert(passwordResetTokens).values({
    userId: input.userId,
    email: normalizeEmail(input.email),
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
  });
}

export async function getPasswordResetTokenByHash(tokenHash: string) {
  const database = await getDb();
  if (!database) return null;

  const result = await database
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  return result[0] ?? null;
}

export async function markPasswordResetTokenUsed(tokenId: number) {
  const database = await getDb();
  if (!database) return;

  await database
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

// ─── Admin Credentials ──────────────────────────────────────────────────────

export async function getAdminCredentialByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(adminCredentials)
    .where(eq(adminCredentials.username, username))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAdminCredential(username: string, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminCredentials).values({ username, passwordHash });
}

export async function adminCredentialExists() {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: adminCredentials.id }).from(adminCredentials).limit(1);
  return result.length > 0;
}

// ─── Articles ──────────────────────────────────────────────────────────────

export async function getArticles(limit = 50, offset = 0, searchQuery?: string, sortBy: 'newest' | 'oldest' | 'mostViewed' = 'newest') {
  const db = await getDb();
  if (!db) return [];
  
  // Build where conditions
  let whereClause: any = eq(articles.isPublished, true);
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    whereClause = and(
      eq(articles.isPublished, true),
      or(
        like(articles.title, searchTerm),
        like(articles.content, searchTerm),
        like(articles.excerpt, searchTerm)
      )
    );
  }
  
  // Determine sort order
  let orderByClause;
  if (sortBy === 'oldest') {
    orderByClause = [desc(articles.isPinned), asc(articles.createdAt)];
  } else if (sortBy === 'mostViewed') {
    orderByClause = [desc(articles.isPinned), desc(articles.viewCount), desc(articles.createdAt)];
  } else {
    // Default: newest
    orderByClause = [desc(articles.isPinned), desc(articles.createdAt)];
  }
  
  return db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      authorId: articles.authorId,
      authorName: users.name,
      authorRole: users.role,
      authorAvatar: users.avatarUrl,
      isPinned: articles.isPinned,
      isLocked: articles.isLocked,
      viewCount: articles.viewCount,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.articleId = articles.id)`,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(limit)
    .offset(offset);
}

export async function getArticleById(articleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      authorId: articles.authorId,
      authorName: users.name,
      authorRole: users.role,
      authorAvatar: users.avatarUrl,
      isPinned: articles.isPinned,
      isLocked: articles.isLocked,
      isPublished: articles.isPublished,
      viewCount: articles.viewCount,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      editedAt: articles.editedAt,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(eq(articles.id, articleId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createArticle(
  title: string,
  content: string,
  excerpt: string | null,
  coverImageUrl: string | null,
  authorId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(articles).values({ title, content, excerpt, coverImageUrl, authorId });
  return result[0].insertId;
}

export async function updateArticle(
  articleId: number,
  title: string,
  content: string,
  excerpt: string | null,
  coverImageUrl: string | null
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(articles)
    .set({ title, content, excerpt, coverImageUrl, editedAt: new Date() })
    .where(eq(articles.id, articleId));
}

export async function deleteArticle(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.articleId, articleId));
  await db.delete(comments).where(eq(comments.articleId, articleId));
  await db.delete(articles).where(eq(articles.id, articleId));
}

export async function countArticlesByAuthor(authorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(articles)
    .where(eq(articles.authorId, authorId));

  return Number(result[0]?.count ?? 0);
}

export async function deleteArticlesByAuthor(authorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const userArticles = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.authorId, authorId));

  const articleIds = userArticles.map((article) => article.id);

  if (articleIds.length === 0) {
    return 0;
  }

  await db.delete(notifications).where(inArray(notifications.articleId, articleIds));
  await db.delete(comments).where(inArray(comments.articleId, articleIds));
  await db.delete(articles).where(inArray(articles.id, articleIds));

  return articleIds.length;
}

export async function togglePinArticle(articleId: number, isPinned: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set({ isPinned }).where(eq(articles.id, articleId));
}

export async function toggleLockArticle(articleId: number, isLocked: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set({ isLocked }).where(eq(articles.id, articleId));
}

export async function incrementArticleViewCount(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.id, articleId));
}

export async function getArticlesByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      isPinned: articles.isPinned,
      viewCount: articles.viewCount,
      createdAt: articles.createdAt,
      commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.articleId = articles.id)`,
    })
    .from(articles)
    .where(and(eq(articles.authorId, authorId), eq(articles.isPublished, true)))
    .orderBy(desc(articles.createdAt));
}

// ─── Comments ──────────────────────────────────────────────────────────────

export async function getCommentsByArticle(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: comments.id,
      content: comments.content,
      articleId: comments.articleId,
      authorId: comments.authorId,
      authorName: users.name,
      authorRole: users.role,
      authorAvatar: users.avatarUrl,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.articleId, articleId))
    .orderBy(desc(comments.createdAt));
}

export async function createComment(content: string, articleId: number, authorId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(comments).values({ content, articleId, authorId });
  return result[0].insertId;
}

export async function getCommentById(commentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      id: comments.id,
      content: comments.content,
      articleId: comments.articleId,
      authorId: comments.authorId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function deleteComment(commentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.commentId, commentId));
  await db.delete(comments).where(eq(comments.id, commentId));
}

export async function deleteCommentsByAuthor(authorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const userComments = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.authorId, authorId));

  const commentIds = userComments.map((comment) => comment.id);

  if (commentIds.length === 0) {
    return 0;
  }

  await db.delete(notifications).where(inArray(notifications.commentId, commentIds));
  await db.delete(comments).where(inArray(comments.id, commentIds));

  return commentIds.length;
}

// ─── Notifications ────────────────────────────────────────────────────────

export async function createArticleCommentNotification(input: {
  userId: number;
  actorId: number;
  articleId: number;
  commentId: number;
  type?: "article_comment" | "comment_mention";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    userId: input.userId,
    actorId: input.actorId,
    type: input.type ?? "article_comment",
    articleId: input.articleId,
    commentId: input.commentId,
  });
}

export async function getNotificationsForUser(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      articleId: notifications.articleId,
      commentId: notifications.commentId,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      actorId: notifications.actorId,
      actorName: users.name,
      actorAvatar: users.avatarUrl,
      articleTitle: articles.title,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .leftJoin(articles, eq(notifications.articleId, articles.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return Number(result[0]?.count ?? 0);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ─── Site Pages ─────────────────────────────────────────────────────────────

export async function getPageBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sitePages).where(eq(sitePages.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePage(slug: string, title: string, content: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(sitePages).set({ title, content }).where(eq(sitePages.slug, slug));
}

export async function getAllPages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sitePages);
}

// ─── Contact Messages ───────────────────────────────────────────────────────

export async function createContactMessage(name: string, email: string, subject: string, message: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactMessages).values({ name, email, subject, message });
}

export async function getContactMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
}

export async function markMessageRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contactMessages).set({ isRead: true }).where(eq(contactMessages.id, id));
}

export async function deleteContactMessage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
}

// ─── Site Settings ──────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : undefined;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function isUnderConstruction(): Promise<boolean> {
  const value = await getSetting("isUnderConstruction");
  return value === "true";
}

// ─── PDF Resources ──────────────────────────────────────────────────────────

export async function createPdfResource(title: string, pdfUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pdfResources).values({ title, pdfUrl });
}

export async function getPdfResources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pdfResources).orderBy(desc(pdfResources.createdAt));
}

export async function deletePdfResource(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pdfResources).where(eq(pdfResources.id, id));
}

// ─── User Muting ────────────────────────────────────────────────────────────

export async function muteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isMuted: true }).where(eq(users.id, userId));
}

export async function unmuteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isMuted: false }).where(eq(users.id, userId));
}

export async function isUserMuted(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0].isMuted : false;
}


// ─── Article Drafts ─────────────────────────────────────────────────────────

export async function getUserDrafts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      authorId: articles.authorId,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      isPublished: articles.isPublished,
    })
    .from(articles)
    .where(and(eq(articles.authorId, userId), eq(articles.isPublished, false)))
    .orderBy(desc(articles.updatedAt));
}

export async function publishArticle(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set({ isPublished: true }).where(eq(articles.id, articleId));
}

export async function incrementViewCount(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set({ viewCount: sql`viewCount + 1` }).where(eq(articles.id, articleId));
}
