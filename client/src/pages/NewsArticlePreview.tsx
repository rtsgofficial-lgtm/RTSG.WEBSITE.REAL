import NewsArticleView, {
  type NewsArticleViewData,
} from "@/components/NewsArticleView";
import { useLocation } from "wouter";

const PREVIEW_STORAGE_PREFIX = "rtsg-news-preview:";

function isNewsSubdomain() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "news.rtsg.org";
}

function getPreviewArticle(): NewsArticleViewData | null {
  if (typeof window === "undefined") return null;
  const previewId = new URLSearchParams(window.location.search).get("id");
  if (!previewId) return null;

  const storedPreview = window.localStorage.getItem(
    `${PREVIEW_STORAGE_PREFIX}${previewId}`
  );
  if (!storedPreview) return null;

  try {
    return JSON.parse(storedPreview) as NewsArticleViewData;
  } catch {
    return null;
  }
}

export { PREVIEW_STORAGE_PREFIX };

export default function NewsArticlePreview() {
  const [, navigate] = useLocation();
  const article = getPreviewArticle();
  const newsHomeHref = isNewsSubdomain() ? "/" : "/news";

  if (!article) {
    return (
      <div className="min-h-screen bg-[#050506] px-4 py-12 text-center text-[#f6f1ea]">
        <h1 className="font-serif text-4xl font-black">
          News preview not found
        </h1>
        <button
          type="button"
          onClick={() => navigate(newsHomeHref)}
          className="mt-6 inline-block border border-[#3b0b16] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#f6f1ea] hover:bg-[#8f1024]"
        >
          Back to RTSG News
        </button>
      </div>
    );
  }

  return (
    <NewsArticleView
      article={article}
      onBack={() => window.close()}
      backLabel="Close Preview"
      preview
    />
  );
}
