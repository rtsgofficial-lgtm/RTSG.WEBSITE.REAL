import { eq, desc, and, sql, or, like, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userCredentials,
  adminCredentials,
  articles,
  comments,
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
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string) {
  const database = await getDb();
  if (!database) return null;

  const normalizedEmail = normalizeEmail(email);

  const result = await database
    .select()
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
  await db.delete(comments).where(eq(comments.articleId, articleId));
  await db.delete(articles).where(eq(articles.id, articleId));
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
  if (!db) return;
  await db.insert(comments).values({ content, articleId, authorId });
}

export async function deleteComment(commentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(eq(comments.id, commentId));
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
