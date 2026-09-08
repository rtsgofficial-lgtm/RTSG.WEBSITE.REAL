import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  handleCreateCodexArticle,
  handlePublishCodexArticle,
  handleUploadCodexImage,
  hashCodexPublisherToken,
} from "./_core/codexPublisher";

const mocks = vi.hoisted(() => ({
  getSetting: vi.fn(),
  getCodexPublisherTokenByHash: vi.fn(),
  updateCodexPublisherTokenLastUsed: vi.fn(),
  createCodexPublisherLog: vi.fn(),
  countCodexPublisherActionsSince: vi.fn(),
  createNewsArticle: vi.fn(),
  getNewsArticleById: vi.fn(),
  publishNewsArticle: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({
  getSetting: mocks.getSetting,
  getCodexPublisherTokenByHash: mocks.getCodexPublisherTokenByHash,
  updateCodexPublisherTokenLastUsed: mocks.updateCodexPublisherTokenLastUsed,
  createCodexPublisherLog: mocks.createCodexPublisherLog,
  countCodexPublisherActionsSince: mocks.countCodexPublisherActionsSince,
  createNewsArticle: mocks.createNewsArticle,
  getNewsArticleById: mocks.getNewsArticleById,
  publishNewsArticle: mocks.publishNewsArticle,
}));

vi.mock("./storage", () => ({
  storagePut: mocks.storagePut,
}));

const VALID_TOKEN = "rtsg_codex_test_token";
const VALID_TOKEN_HASH = hashCodexPublisherToken(VALID_TOKEN);

function validStoredToken(scopes = ["article:create", "article:publish", "image:upload"]) {
  return {
    id: "token-1",
    name: "RTSG Weekly Publisher",
    tokenHash: VALID_TOKEN_HASH,
    scopes,
    createdAt: new Date(),
    expiresAt: null,
    lastUsedAt: null,
    active: true,
  };
}

function articleBody(words = 410) {
  return `<p>${Array.from({ length: words }, (_, index) => `word${index}`).join(" ")}</p>`;
}

function createReq(input: {
  body?: unknown;
  params?: Record<string, string>;
  token?: string;
}) {
  return {
    body: input.body ?? {},
    params: input.params ?? {},
    hostname: "news.rtsg.org",
    headers: {
      authorization: `Bearer ${input.token ?? VALID_TOKEN}`,
      origin: "https://news.rtsg.org",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "203.0.113.9",
    },
    ip: "203.0.113.10",
    socket: { remoteAddress: "203.0.113.11" },
    protocol: "https",
    get: vi.fn((header: string) => {
      if (header.toLowerCase() === "host") return "news.rtsg.org";
      return undefined;
    }),
    setTimeout: vi.fn(),
  } as any;
}

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    json: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
    status: vi.fn((statusCode: number) => {
      res.statusCode = statusCode;
      return res;
    }),
    setHeader: vi.fn(),
    setTimeout: vi.fn(),
  };
  return res as any;
}

describe("Codex Publisher API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CODEX_PUBLISHER_ENABLED = "true";
    process.env.CODEX_MIN_WORDS = "400";
    process.env.CODEX_MAX_WORDS = "3000";
    mocks.getSetting.mockResolvedValue(undefined);
    mocks.getCodexPublisherTokenByHash.mockResolvedValue(validStoredToken());
    mocks.countCodexPublisherActionsSince.mockResolvedValue(0);
    mocks.updateCodexPublisherTokenLastUsed.mockResolvedValue(undefined);
    mocks.createCodexPublisherLog.mockResolvedValue(undefined);
    mocks.createNewsArticle.mockResolvedValue(42);
    mocks.getNewsArticleById.mockResolvedValue({
      id: 42,
      title: "Draft Article",
      status: "draft",
      isPublished: false,
    });
    mocks.publishNewsArticle.mockResolvedValue(undefined);
    mocks.storagePut.mockResolvedValue({
      key: "codex-news/token-1/test.jpg",
      url: "https://rs.rtsg.org/codex-news/token-1/test.jpg",
    });
  });

  afterEach(() => {
    delete process.env.CODEX_MIN_WORDS;
    delete process.env.CODEX_MAX_WORDS;
  });

  it("creates a sanitized draft with a valid scoped token", async () => {
    const req = createReq({
      body: {
        title: "Major Development",
        subtitle: "A concise deck",
        content: `${articleBody()}<script>alert("x")</script><p onclick="bad()">safe</p>`,
        category: "International",
        tags: ["BRICS", "BRICS", "Geopolitics"],
        status: "draft",
        author: "Should Be Ignored",
      },
    });
    const res = createRes();

    await handleCreateCodexArticle(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: "42",
      url: "https://news.rtsg.org/articles/42/major-development",
    });
    expect(mocks.createNewsArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "RTSG News",
        tags: ["BRICS", "Geopolitics"],
        status: "draft",
        isPublished: false,
      })
    );
    expect(mocks.createNewsArticle.mock.calls[0][0].content).not.toContain("<script");
    expect(mocks.createNewsArticle.mock.calls[0][0].content).not.toContain("onclick");
    expect(mocks.createCodexPublisherLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "draft_create", success: true })
    );
  });

  it("rejects invalid tokens with 401 and writes a failure audit log", async () => {
    mocks.getCodexPublisherTokenByHash.mockResolvedValue(null);
    const res = createRes();

    await handleCreateCodexArticle(
      createReq({
        body: {
          title: "Major Development",
          content: articleBody(),
          category: "International",
          tags: [],
        },
      }),
      res
    );

    expect(res.statusCode).toBe(401);
    expect(mocks.createCodexPublisherLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "draft_create", success: false })
    );
  });

  it("rejects expired tokens with 401", async () => {
    mocks.getCodexPublisherTokenByHash.mockResolvedValue({
      ...validStoredToken(),
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = createRes();

    await handleCreateCodexArticle(
      createReq({ body: { title: "Major Development", content: articleBody() } }),
      res
    );

    expect(res.statusCode).toBe(401);
  });

  it("rejects missing scopes with 403", async () => {
    mocks.getCodexPublisherTokenByHash.mockResolvedValue(
      validStoredToken(["image:upload"])
    );
    const res = createRes();

    await handleCreateCodexArticle(
      createReq({ body: { title: "Major Development", content: articleBody() } }),
      res
    );

    expect(res.statusCode).toBe(403);
  });

  it("publishes an existing draft and enforces the weekly publish limit", async () => {
    const res = createRes();

    await handlePublishCodexArticle(
      createReq({ params: { id: "42" } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.publishNewsArticle).toHaveBeenCalledWith(42);

    mocks.countCodexPublisherActionsSince.mockResolvedValue(1);
    const limitedRes = createRes();
    await handlePublishCodexArticle(
      createReq({ params: { id: "42" } }),
      limitedRes
    );

    expect(limitedRes.statusCode).toBe(429);
  });

  it("uploads allowed image files to R2", async () => {
    const res = createRes();
    const pngBase64 = (
      await sharp({
        create: {
          width: 2,
          height: 2,
          channels: 3,
          background: "#b91c1c",
        },
      })
        .png()
        .toBuffer()
    ).toString("base64");

    await handleUploadCodexImage(
      createReq({
        body: {
          imageBase64: pngBase64,
          mimeType: "image/png",
          filename: "Google Source Photo.jpg",
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.storagePut).toHaveBeenCalledWith(
      expect.stringContaining("codex-news/token-1/"),
      expect.any(Buffer),
      "image/webp"
    );
  });

  it("rejects invalid article length and too many tags", async () => {
    const res = createRes();

    await handleCreateCodexArticle(
      createReq({
        body: {
          title: "Short Article",
          content: "<p>too short</p>",
          tags: ["one", "two", "three", "four", "five", "six"],
        },
      }),
      res
    );

    expect(res.statusCode).toBe(400);
  });
});
