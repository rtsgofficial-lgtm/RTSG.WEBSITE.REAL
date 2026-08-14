import { trpc } from "@/lib/trpc";
import NewsArticleView from "@/components/NewsArticleView";
import { useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";

function isNewsSubdomain() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "news.rtsg.org";
}

export default function NewsArticleDetail() {
  const [, paramsFromNewsPath] = useRoute("/news/articles/:id");
  const [, paramsFromSubdomainPath] = useRoute("/articles/:id");
  const [, navigate] = useLocation();
  const articleId = Number(
    paramsFromNewsPath?.id ?? paramsFromSubdomainPath?.id
  );
  const newsHomeHref = isNewsSubdomain() ? "/" : "/news";

  const { data: article, isLoading } = trpc.news.getById.useQuery(
    { id: articleId },
    { enabled: Number.isFinite(articleId) && articleId > 0 }
  );
  const incrementView = trpc.news.incrementView.useMutation();

  useEffect(() => {
    if (article?.id) {
      incrementView.mutate({ id: article.id });
    }
  }, [article?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050506] px-4 py-12 text-[#f6f1ea]">
        <div className="mx-auto max-w-4xl animate-pulse">
          <div className="mb-5 h-6 w-32 bg-[#3b0b16]" />
          <div className="mb-4 h-16 w-4/5 bg-[#3b0b16]" />
          <div className="h-96 w-full bg-[#12080b]" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#050506] px-4 py-12 text-center text-[#f6f1ea]">
        <h1 className="font-serif text-4xl font-black">
          News article not found
        </h1>
        <Link href={newsHomeHref}>
          <span className="mt-6 inline-block border border-[#3b0b16] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#f6f1ea] hover:bg-[#8f1024]">
            Back to RTSG News
          </span>
        </Link>
      </div>
    );
  }

  return (
    <NewsArticleView article={article} onBack={() => navigate(newsHomeHref)} />
  );
}
