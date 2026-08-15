import { eq, desc, and, sql, or, like, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userCredentials,
  passwordResetTokens,
  loginRateLimits,
  adminLoginRateLimits,
  passwordResetRateLimits,
  adminCredentials,
  adminActionLogs,
  articles,
  newsArticles,
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
  return (
    message.includes("profileBio") &&
    (message.includes("Unknown column") ||
      message.includes("ER_BAD_FIELD_ERROR"))
  );
}

function isMissingAdminSecurityTableError(error: unknown) {
  const parts: string[] = [];
  let current: unknown = error;

  while (current && typeof current === "object") {
    const errorLike = current as {
      message?: unknown;
      code?: unknown;
      sqlMessage?: unknown;
      cause?: unknown;
    };
    parts.push(String(errorLike.message ?? ""));
    parts.push(String(errorLike.code ?? ""));
    parts.push(String(errorLike.sqlMessage ?? ""));
    current = errorLike.cause;
  }

  if (parts.length === 0) {
    parts.push(String(error));
  }

  const message = parts.join(" ");
  return (
    (message.includes("admin_login_rate_limits") ||
      message.includes("admin_action_logs")) &&
    (message.includes("doesn't exist") ||
      message.includes("does not exist") ||
      message.includes("ER_NO_SUCH_TABLE") ||
      message.includes("ER_BAD_TABLE_ERROR") ||
      message.includes("Table") ||
      message.includes("no such table"))
  );
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

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
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
    result = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
  } catch (error) {
    if (!isMissingProfileBioColumnError(error)) throw error;
    result = await db
      .select(coreUserSelect)
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
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
    result = await db
      .select(coreUserSelect)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
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

export function getMentionHandle(user: {
  id: number;
  name: string | null;
  email?: string | null;
}) {
  const base =
    user.name?.trim() || user.email?.split("@")[0] || `user-${user.id}`;
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
    .map(user => ({
      id: user.id,
      name: user.name || "Anonymous",
      avatarUrl: user.avatarUrl,
      role: user.role,
      handle: getMentionHandle(user),
    }))
    .filter(user => {
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

  const normalizedHandles = new Set(
    handles.map(handle => handle.toLowerCase())
  );
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
    .map(user => ({
      id: user.id,
      name: user.name || "Anonymous",
      avatarUrl: user.avatarUrl,
      role: user.role,
      handle: getMentionHandle(user),
    }))
    .filter(user => normalizedHandles.has(user.handle));
}

export async function updateUserRole(
  userId: number,
  role: "user" | "admin" | "moderator"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserAvatar(userId: number, avatarUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
}

export async function updateUserDisplayName(
  userId: number,
  displayName: string
) {
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

  const selectPublicProfile = (
    profileBio: typeof users.profileBio | ReturnType<typeof sql<string | null>>
  ) =>
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

function normalizeAdminUsername(username: string) {
  return username.trim().toLowerCase();
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

export async function createLocalUser(input: { name: string; email: string }) {
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

export async function updateUserCredentialPassword(
  userId: number,
  passwordHash: string
) {
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

export async function recordFailedLoginAttempt(
  email: string,
  maxAttempts: number,
  lockoutMs: number
) {
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
    nextFailedAttemptCount >= maxAttempts
      ? new Date(now.getTime() + lockoutMs)
      : null;

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

export async function getAdminLoginRateLimit(username: string) {
  const database = await getDb();
  if (!database) return null;

  let result;
  try {
    result = await database
      .select()
      .from(adminLoginRateLimits)
      .where(
        eq(adminLoginRateLimits.username, normalizeAdminUsername(username))
      )
      .limit(1);
  } catch (error) {
    if (!isMissingAdminSecurityTableError(error)) throw error;
    return null;
  }

  return result[0] ?? null;
}

export async function recordFailedAdminLoginAttempt(
  username: string,
  maxAttempts: number,
  lockoutMs: number
) {
  const database = await getDb();
  if (!database) return null;

  const normalizedUsername = normalizeAdminUsername(username);
  const existing = await getAdminLoginRateLimit(normalizedUsername);
  const now = new Date();
  const existingLock = existing?.lockedUntil;

  if (existingLock && existingLock.getTime() > now.getTime()) {
    return existing;
  }

  const nextFailedAttemptCount = (existing?.failedAttemptCount ?? 0) + 1;
  const lockedUntil =
    nextFailedAttemptCount >= maxAttempts
      ? new Date(now.getTime() + lockoutMs)
      : null;

  try {
    if (existing) {
      await database
        .update(adminLoginRateLimits)
        .set({
          failedAttemptCount: nextFailedAttemptCount,
          lockedUntil,
          lastFailedAt: now,
        })
        .where(eq(adminLoginRateLimits.username, normalizedUsername));
    } else {
      await database.insert(adminLoginRateLimits).values({
        username: normalizedUsername,
        failedAttemptCount: nextFailedAttemptCount,
        lockedUntil,
        lastFailedAt: now,
      });
    }
  } catch (error) {
    if (!isMissingAdminSecurityTableError(error)) throw error;
    return null;
  }

  return {
    id: existing?.id ?? 0,
    username: normalizedUsername,
    failedAttemptCount: nextFailedAttemptCount,
    lockedUntil,
    lastFailedAt: now,
    updatedAt: now,
  };
}

export async function clearAdminLoginFailures(username: string) {
  const database = await getDb();
  if (!database) return;

  try {
    await database
      .update(adminLoginRateLimits)
      .set({ failedAttemptCount: 0, lockedUntil: null, lastFailedAt: null })
      .where(
        eq(adminLoginRateLimits.username, normalizeAdminUsername(username))
      );
  } catch (error) {
    if (!isMissingAdminSecurityTableError(error)) throw error;
  }
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
  const normalizedUsername = normalizeAdminUsername(username);
  const result = await db
    .select()
    .from(adminCredentials)
    .where(
      or(
        eq(adminCredentials.username, username),
        eq(adminCredentials.username, normalizedUsername)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAdminCredential(
  username: string,
  passwordHash: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(adminCredentials)
    .values({ username: normalizeAdminUsername(username), passwordHash });
}

export async function adminCredentialExists() {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: adminCredentials.id })
    .from(adminCredentials)
    .limit(1);
  return result.length > 0;
}

export async function createAdminActionLog(input: {
  actorType: string;
  actorUsername?: string | null;
  actorUserId?: number | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(adminActionLogs).values({
      actorType: input.actorType,
      actorUsername: input.actorUsername ?? null,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId:
        input.targetId === undefined || input.targetId === null
          ? null
          : String(input.targetId),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent?.slice(0, 512) ?? null,
    });
  } catch (error) {
    if (!isMissingAdminSecurityTableError(error)) throw error;
  }
}

export async function getAdminActionLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(adminActionLogs)
      .orderBy(desc(adminActionLogs.createdAt), desc(adminActionLogs.id))
      .limit(limit);
  } catch (error) {
    if (!isMissingAdminSecurityTableError(error)) throw error;
    return [];
  }
}

// ─── Articles ──────────────────────────────────────────────────────────────

export async function getArticles(
  limit = 50,
  offset = 0,
  searchQuery?: string,
  sortBy: "newest" | "oldest" | "mostViewed" = "newest"
) {
  const db = await getDb();
  if (!db) return [];

  // Build where conditions
  const whereConditions = [eq(articles.isPublished, true)];
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    const searchCondition = or(
      like(articles.title, searchTerm),
      like(articles.content, searchTerm),
      like(articles.excerpt, searchTerm)
    );
    if (searchCondition) whereConditions.push(searchCondition);
  }

  const whereClause = and(...whereConditions);

  // Determine sort order
  let orderByClause;
  if (sortBy === "oldest") {
    orderByClause = [desc(articles.isPinned), asc(articles.createdAt)];
  } else if (sortBy === "mostViewed") {
    orderByClause = [
      desc(articles.isPinned),
      desc(articles.viewCount),
      desc(articles.createdAt),
    ];
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
  const result = await db
    .insert(articles)
    .values({ title, content, excerpt, coverImageUrl, authorId });
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

export async function deleteArticlesByAuthor(
  authorId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const userArticles = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.authorId, authorId));

  const articleIds = userArticles.map(article => article.id);

  if (articleIds.length === 0) {
    return 0;
  }

  await db
    .delete(notifications)
    .where(inArray(notifications.articleId, articleIds));
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

function parseNewsTags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (tag): tag is string => typeof tag === "string" && tag.trim().length > 0
      );
    }
  } catch {
    // Older rows may have comma-separated tags.
  }
  return value
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function serializeNewsTags(tags: string[] | null | undefined): string | null {
  const normalized = Array.from(
    new Set(
      (tags ?? [])
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.slice(0, 48))
    )
  ).slice(0, 12);

  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

function hydrateNewsArticle<
  T extends {
    tags?: string | null;
    isPublished?: boolean;
    status?: "draft" | "published";
  },
>(article: T) {
  return {
    ...article,
    tags: parseNewsTags(article.tags),
    status: article.status ?? (article.isPublished ? "published" : "draft"),
  };
}

export async function getNewsArticles(
  input: {
    limit?: number;
    offset?: number;
    searchQuery?: string;
    category?: string;
    includeUnpublished?: boolean;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const whereConditions = [];
  if (!input.includeUnpublished) {
    const publishedCondition = and(
      eq(newsArticles.isPublished, true),
      eq(newsArticles.status, "published")
    );
    if (publishedCondition) whereConditions.push(publishedCondition);
  }
  if (input.category?.trim()) {
    whereConditions.push(eq(newsArticles.category, input.category.trim()));
  }
  if (input.searchQuery?.trim()) {
    const searchTerm = `%${input.searchQuery.trim()}%`;
    const searchCondition = or(
      like(newsArticles.title, searchTerm),
      like(newsArticles.subtitle, searchTerm),
      like(newsArticles.content, searchTerm),
      like(newsArticles.excerpt, searchTerm),
      like(newsArticles.attributions, searchTerm),
      like(newsArticles.authorName, searchTerm),
      like(newsArticles.tags, searchTerm)
    );
    if (searchCondition) whereConditions.push(searchCondition);
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const query = db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      subtitle: newsArticles.subtitle,
      content: newsArticles.content,
      excerpt: newsArticles.excerpt,
      coverImageUrl: newsArticles.coverImageUrl,
      attributions: newsArticles.attributions,
      category: newsArticles.category,
      tags: newsArticles.tags,
      status: newsArticles.status,
      authorId: newsArticles.authorId,
      authorName: newsArticles.authorName,
      authorXUrl: newsArticles.authorXUrl,
      isFeatured: newsArticles.isFeatured,
      isPublished: newsArticles.isPublished,
      viewCount: newsArticles.viewCount,
      createdAt: newsArticles.createdAt,
      updatedAt: newsArticles.updatedAt,
      editedAt: newsArticles.editedAt,
    })
    .from(newsArticles)
    .$dynamic();

  if (whereClause) query.where(whereClause);

  const result = await query
    .orderBy(desc(newsArticles.isFeatured), desc(newsArticles.createdAt))
    .limit(input.limit ?? 50)
    .offset(input.offset ?? 0);

  return result.map(hydrateNewsArticle);
}

export async function getFeaturedNewsArticle() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(newsArticles)
    .where(
      and(
        eq(newsArticles.isFeatured, true),
        eq(newsArticles.isPublished, true),
        eq(newsArticles.status, "published")
      )
    )
    .orderBy(desc(newsArticles.createdAt))
    .limit(1);

  return result[0] ? hydrateNewsArticle(result[0]) : undefined;
}

export async function getNewsArticleById(
  articleId: number,
  includeUnpublished = false
) {
  const db = await getDb();
  if (!db) return undefined;

  const conditions = [eq(newsArticles.id, articleId)];
  if (!includeUnpublished) {
    const publishedCondition = and(
      eq(newsArticles.isPublished, true),
      eq(newsArticles.status, "published")
    );
    if (publishedCondition) conditions.push(publishedCondition);
  }

  const result = await db
    .select()
    .from(newsArticles)
    .where(and(...conditions))
    .limit(1);

  return result[0] ? hydrateNewsArticle(result[0]) : undefined;
}

export async function createNewsArticle(input: {
  title: string;
  subtitle: string | null;
  content: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  attributions: string | null;
  category: string;
  tags: string[];
  status: "draft" | "published";
  authorId: number | null;
  authorName: string;
  authorXUrl: string | null;
  isPublished: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(newsArticles).values({
    ...input,
    tags: serializeNewsTags(input.tags),
    isPublished: input.status === "published" && input.isPublished,
  });
  return result[0].insertId;
}

export async function updateNewsArticle(
  articleId: number,
  input: {
    title: string;
    subtitle: string | null;
    content: string;
    excerpt: string | null;
    coverImageUrl: string | null;
    attributions: string | null;
    category: string;
    tags: string[];
    status: "draft" | "published";
    authorName: string;
    authorXUrl: string | null;
    isPublished: boolean;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(newsArticles)
    .set({
      ...input,
      tags: serializeNewsTags(input.tags),
      isPublished: input.status === "published" && input.isPublished,
      editedAt: new Date(),
    })
    .where(eq(newsArticles.id, articleId));
}

export async function publishNewsArticle(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(newsArticles)
    .set({ status: "published", isPublished: true, editedAt: new Date() })
    .where(eq(newsArticles.id, articleId));
}

export async function deleteNewsArticle(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(newsArticles).where(eq(newsArticles.id, articleId));
}

export async function setFeaturedNewsArticle(articleId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(newsArticles).set({ isFeatured: false });
  await db
    .update(newsArticles)
    .set({ isFeatured: true })
    .where(eq(newsArticles.id, articleId));
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

export async function createComment(
  content: string,
  articleId: number,
  authorId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(comments)
    .values({ content, articleId, authorId });
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

export async function deleteCommentsByAuthor(
  authorId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const userComments = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.authorId, authorId));

  const commentIds = userComments.map(comment => comment.id);

  if (commentIds.length === 0) {
    return 0;
  }

  await db
    .delete(notifications)
    .where(inArray(notifications.commentId, commentIds));
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
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return Number(result[0]?.count ?? 0);
}

export async function markNotificationRead(
  userId: number,
  notificationId: number
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}

// ─── Site Pages ─────────────────────────────────────────────────────────────

export async function getPageBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(sitePages)
    .where(eq(sitePages.slug, slug))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePage(slug: string, title: string, content: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sitePages)
    .set({ title, content })
    .where(eq(sitePages.slug, slug));
}

export async function getAllPages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sitePages);
}

// ─── Contact Messages ───────────────────────────────────────────────────────

export async function createContactMessage(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactMessages).values({ name, email, subject, message });
}

export async function getContactMessages() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt));
}

export async function markMessageRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(contactMessages)
    .set({ isRead: true })
    .where(eq(contactMessages.id, id));
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
  const result = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return result.length > 0 ? result[0].value : undefined;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
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
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
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

export async function getUnifiedUserDrafts(
  userId: number,
  includeNewsDrafts = false
) {
  const communityDrafts = (await getUserDrafts(userId)).map(draft => ({
    ...draft,
    type: "article" as const,
    label: "Article Draft",
    category: null as string | null,
    subtitle: null as string | null,
    tags: [] as string[],
  }));

  if (!includeNewsDrafts) {
    return communityDrafts;
  }

  const db = await getDb();
  if (!db) return communityDrafts;

  const newsDrafts = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      subtitle: newsArticles.subtitle,
      excerpt: newsArticles.excerpt,
      coverImageUrl: newsArticles.coverImageUrl,
      attributions: newsArticles.attributions,
      authorId: newsArticles.authorId,
      authorName: newsArticles.authorName,
      authorXUrl: newsArticles.authorXUrl,
      category: newsArticles.category,
      tags: newsArticles.tags,
      createdAt: newsArticles.createdAt,
      updatedAt: newsArticles.updatedAt,
      isPublished: newsArticles.isPublished,
    })
    .from(newsArticles)
    .where(
      and(eq(newsArticles.authorId, userId), eq(newsArticles.status, "draft"))
    )
    .orderBy(desc(newsArticles.updatedAt));

  return [
    ...communityDrafts,
    ...newsDrafts.map(draft => ({
      ...draft,
      type: "news" as const,
      label: "News Draft",
      tags: parseNewsTags(draft.tags),
    })),
  ].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function publishArticle(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(articles)
    .set({ isPublished: true })
    .where(eq(articles.id, articleId));
}

export async function incrementViewCount(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(articles)
    .set({ viewCount: sql`viewCount + 1` })
    .where(eq(articles.id, articleId));
}
