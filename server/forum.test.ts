import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user?: AuthenticatedUser | null, headers?: Record<string, string>): TrpcContext {
  return {
    user: user ?? null,
    req: {
      protocol: "https",
      headers: headers || {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data for authenticated user", async () => {
    const user = createUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toMatchObject({
      id: 1,
      openId: "test-user-123",
      name: "Test User",
    });
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const user = createUser();
    const ctx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("adminAuth", () => {
  it("hasCredentials returns exists status", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminAuth.hasCredentials();
    expect(result).toHaveProperty("exists");
    expect(typeof result.exists).toBe("boolean");
  });

  it("login rejects invalid credentials", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.adminAuth.login({ username: "nonexistent", password: "wrong" })
    ).rejects.toThrow();
  });

  it("verify returns invalid for random token", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminAuth.verify({ token: "random-invalid-token" });
    expect(result.valid).toBe(false);
  });
});

describe("articles", () => {
  it("list returns array of articles", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create requires authentication", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.articles.create({ title: "Test", content: "<p>Hello</p>" })
    ).rejects.toThrow();
  });

  it("create succeeds for authenticated user", async () => {
    const user = createUser();
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.create({ title: "Test Article", content: "<p>Content here</p>" });
    expect(result.success).toBe(true);
    expect(result.articleId).toBeDefined();
  });

  it("getByAuthor returns array", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.articles.getByAuthor({ authorId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("delete requires moderator role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.articles.delete({ id: 9999 })
    ).rejects.toThrow("Moderator access required");
  });

  it("togglePin requires moderator role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.articles.togglePin({ id: 9999, isPinned: true })
    ).rejects.toThrow("Moderator access required");
  });

  it("toggleLock requires moderator role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.articles.toggleLock({ id: 9999, isLocked: true })
    ).rejects.toThrow("Moderator access required");
  });
});

describe("comments", () => {
  it("listByArticle returns array", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.comments.listByArticle({ articleId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("create requires authentication", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.comments.create({ content: "Nice!", articleId: 1 })
    ).rejects.toThrow();
  });

  it("delete requires moderator role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.comments.delete({ id: 9999 })
    ).rejects.toThrow("Moderator access required");
  });
});

describe("pages", () => {
  it("getBySlug returns page content for existing page", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pages.getBySlug({ slug: "about" });
    expect(result).toBeDefined();
    if (result) {
      expect(result.slug).toBe("about");
    }
  });

  it("update requires admin role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pages.update({ slug: "about", title: "Test", content: "Content" })
    ).rejects.toThrow();
  });

  it("list requires admin role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.pages.list()).rejects.toThrow();
  });

  it("list succeeds for admin user", async () => {
    const user = createUser({ role: "admin" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pages.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("contact", () => {
  it("submit validates email format", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contact.submit({ name: "Test", email: "invalid", subject: "Hi", message: "Hello" })
    ).rejects.toThrow();
  });

  it("list requires admin role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contact.list()).rejects.toThrow();
  });
});

describe("users", () => {
  it("list requires admin role", async () => {
    const user = createUser({ role: "user" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("updateRole requires admin role", async () => {
    const user = createUser({ role: "moderator" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.updateRole({ userId: 1, role: "admin" })
    ).rejects.toThrow();
  });

  it("list succeeds for admin user", async () => {
    const user = createUser({ role: "admin" });
    const ctx = createContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("uploadAvatar requires authentication", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.uploadAvatar({ imageBase64: "abc", mimeType: "image/png" })
    ).rejects.toThrow();
  });
});
