import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  getNewsCategoryBySlug,
  NEWS_CATEGORIES,
  NEWS_CATEGORY_SLUGS,
  type NewsCategory,
} from "@shared/newsCategories";
import { createNewsArticlePath } from "@shared/newsSlugs";
import {
  ArrowUpRight,
  Clock,
  Eye,
  LogIn,
  LogOut,
  PenLine,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NewsArticleSummary = {
  id: number;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string;
  tags: string[];
  status: "draft" | "published";
  authorName: string;
  viewCount: number;
  createdAt: string | Date;
};

const NEWS_HERO_VIDEO_SRC = "/media/news-hero-smoke.mov";

function isNewsSubdomain() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "news.rtsg.org";
}

function getQueryFromSearch() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function newsHomeHref() {
  return isNewsSubdomain() ? "/" : "/news";
}

function profileHref() {
  return "/profile";
}

function categoryHref(category: NewsCategory) {
  return isNewsSubdomain()
    ? `/${NEWS_CATEGORY_SLUGS[category]}`
    : `/news/${NEWS_CATEGORY_SLUGS[category]}`;
}

function searchHref(query: string) {
  const trimmed = query.trim();
  const basePath = isNewsSubdomain() ? "/search" : "/news/search";
  return trimmed ? `${basePath}?q=${encodeURIComponent(trimmed)}` : basePath;
}

function articleHref(article: Pick<NewsArticleSummary, "id" | "title">) {
  return createNewsArticlePath(article, { subdomain: isNewsSubdomain() });
}

function ArticleImage({ src, title }: { src?: string | null; title: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(150,14,32,0.42),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_42%,rgba(90,4,17,0.34))]">
      <span className="max-w-[75%] text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#f6f1ea]/38">
        {title}
      </span>
    </div>
  );
}

function NewsMasthead({
  activeCategory,
  initialSearch = "",
}: {
  activeCategory?: NewsCategory;
  initialSearch?: string;
}) {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchInput, setSearchInput] = useState(initialSearch);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(searchHref(searchInput));
  };

  return (
    <header className="border-b border-[#3b0b16] bg-[#070607]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Link href={newsHomeHref()}>
            <span className="cursor-pointer font-serif text-3xl font-black leading-none tracking-normal text-[#f6f1ea] sm:text-5xl">
              RTSG News<span className="text-[#b3132b]">★</span>
            </span>
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <form onSubmit={handleSearch} className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f6f1ea]/45" />
              <input
                type="search"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Search news"
                className="h-10 w-full border border-[#3b0b16] bg-[#12080b] pl-10 pr-3 text-sm font-semibold text-[#f6f1ea] outline-none placeholder:text-[#f6f1ea]/40 focus:bg-[#1b0a10]"
              />
            </form>
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {user.role === "admin" && (
                  <>
                    <Link href="/admin/dashboard?tab=news">
                      <Button
                        variant="ghost"
                        className="h-10 rounded-none border border-[#3b0b16] px-3 text-[#f6f1ea] hover:bg-[#8f1024] hover:text-white"
                      >
                        <PenLine className="mr-2 h-4 w-4" />
                        Create Article
                      </Button>
                    </Link>
                    <Link href="/admin/dashboard?tab=news">
                      <Button
                        variant="ghost"
                        className="h-10 rounded-none border border-[#3b0b16] px-3 text-[#f6f1ea] hover:bg-[#8f1024] hover:text-white"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    </Link>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 rounded-none border border-[#3b0b16] px-3 text-[#f6f1ea] hover:bg-[#8f1024] hover:text-white"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span className="max-w-24 truncate text-sm">
                        {user.name || "User"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-none border border-[#3b0b16] bg-[#090607] p-0 text-[#f6f1ea] shadow-xl"
                  >
                    <div className="px-3 py-3">
                      <p className="truncate text-sm font-black">
                        {user.name || "User"}
                      </p>
                      {user.email && (
                        <p className="mt-1 break-all text-xs font-semibold text-[#f6f1ea]/55">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <DropdownMenuSeparator className="bg-[#3b0b16]" />
                    <DropdownMenuItem
                      onClick={() => navigate(profileHref())}
                      className="cursor-pointer rounded-none px-3 py-2 text-sm font-black uppercase tracking-[0.08em] focus:bg-[#8f1024] focus:text-white"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={logout}
                      className="cursor-pointer rounded-none px-3 py-2 text-sm font-black uppercase tracking-[0.08em] focus:bg-[#8f1024] focus:text-white"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <a href={getLoginUrl()}>
                <Button
                  variant="ghost"
                  className="h-10 rounded-none border border-[#3b0b16] px-3 text-[#f6f1ea] hover:bg-[#8f1024] hover:text-white"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </a>
            )}
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-y border-[#3b0b16] py-2">
          {NEWS_CATEGORIES.map(category => (
            <Link key={category} href={categoryHref(category)}>
              <span
                className={`block whitespace-nowrap px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-colors ${
                  activeCategory === category
                    ? "bg-[#8f1024] text-white"
                    : "text-[#f6f1ea]/78 hover:bg-[#2a0710] hover:text-white"
                }`}
              >
                {category}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function NewsHero() {
  return (
    <section className="relative min-h-[58vh] overflow-hidden border-b border-[#3b0b16] bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      >
        <source src={NEWS_HERO_VIDEO_SRC} type="video/quicktime" />
        <source src={NEWS_HERO_VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(150,14,32,0.42),transparent_34%),linear-gradient(115deg,rgba(3,3,4,0.54),rgba(18,8,11,0.7)_46%,rgba(73,9,21,0.32))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.86),rgba(0,0,0,0.24)_52%,rgba(0,0,0,0.62))]" />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl justify-end">
          <h1 className="animate-news-hero-title max-w-[12ch] text-right font-serif text-4xl font-black leading-[0.92] tracking-normal text-[#f6f1ea] drop-shadow-[0_8px_28px_rgba(0,0,0,0.72)] sm:text-6xl lg:text-7xl">
            Primus Inter Pares
          </h1>
        </div>
      </div>
    </section>
  );
}

function FeaturedSection({ article }: { article: NewsArticleSummary | null }) {
  const [, navigate] = useLocation();

  return (
    <section className="border-b-2 border-[#3b0b16] pb-9">
      <div className="mb-4 flex items-end justify-between border-b border-[#3b0b16] pb-2">
        <h2 className="font-serif text-3xl font-black tracking-normal">
          Featured
        </h2>
        {article && (
          <button
            type="button"
            onClick={() => navigate(articleHref(article))}
            className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-[#d9152f]"
          >
            Read <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {article ? (
        <Link href={articleHref(article)}>
          <article className="group grid cursor-pointer gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="aspect-[16/10] overflow-hidden border border-[#3b0b16] bg-black">
              <ArticleImage src={article.coverImageUrl} title={article.title} />
            </div>
            <div className="flex flex-col justify-between gap-6">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#d9152f]">
                  {article.category || "Editorials"}
                </p>
                <h3 className="font-serif text-4xl font-black leading-[0.95] tracking-normal text-[#f6f1ea] transition-colors group-hover:text-[#ff304f] sm:text-5xl">
                  {article.title}
                </h3>
                {(article.subtitle || article.excerpt) && (
                  <p className="mt-4 text-base leading-7 text-[#f6f1ea]/68">
                    {article.subtitle || article.excerpt}
                  </p>
                )}
                {article.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {article.tags.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="border border-[#3b0b16] bg-[#12080b] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#f6f1ea]/52"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ArticleMeta article={article} />
            </div>
          </article>
        </Link>
      ) : (
        <div className="border border-[#3b0b16] bg-[#0b0708] p-8 text-sm font-semibold text-[#f6f1ea]/58">
          No featured news article has been published yet.
        </div>
      )}
    </section>
  );
}

function ArticleMeta({ article }: { article: NewsArticleSummary }) {
  return (
    <div className="flex flex-wrap gap-4 border-t border-[#3b0b16] pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#f6f1ea]/50">
      <span>{article.authorName || "RTSG News"}</span>
      <span>{formatDate(article.createdAt)}</span>
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" />
        {article.viewCount}
      </span>
    </div>
  );
}

function NewsArticleGrid({
  articles,
  emptyMessage,
  isLoading,
}: {
  articles: NewsArticleSummary[];
  emptyMessage: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map(item => (
          <div
            key={item}
            className="h-72 animate-pulse border border-[#3b0b16] bg-[#16080d]"
          />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="border border-[#3b0b16] bg-[#0b0708] p-8 text-sm font-semibold text-[#f6f1ea]/58">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-x-5 gap-y-8 md:grid-cols-3">
      {articles.map(article => (
        <Link key={article.id} href={articleHref(article)}>
          <article className="group cursor-pointer border-t-4 border-[#3b0b16] pt-3">
            <div className="mb-3 aspect-[16/10] overflow-hidden border border-[#3b0b16] bg-black">
              <ArticleImage src={article.coverImageUrl} title={article.title} />
            </div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#d9152f]">
              {article.category || "Editorials"}
            </p>
            <h3 className="font-serif text-2xl font-black leading-tight tracking-normal text-[#f6f1ea] transition-colors group-hover:text-[#ff304f]">
              {article.title}
            </h3>
            {(article.subtitle || article.excerpt) && (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#f6f1ea]/62">
                {article.subtitle || article.excerpt}
              </p>
            )}
            {article.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {article.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="border border-[#3b0b16] bg-[#12080b] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#f6f1ea]/48"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-[#3b0b16] pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#f6f1ea]/48">
              <span>{formatDate(article.createdAt)}</span>
              <span>{article.viewCount} views</span>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}

function ListingHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="border-b-2 border-[#3b0b16] py-8 sm:py-10">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#d9152f]">
        RTSG News
      </p>
      <h1 className="font-serif text-5xl font-black leading-none tracking-normal text-[#f6f1ea] sm:text-6xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#f6f1ea]/62">
          {subtitle}
        </p>
      )}
    </section>
  );
}

export default function News() {
  const { data: featuredNewsArticle } = trpc.news.getFeatured.useQuery();
  const { data: latestArticles, isLoading } = trpc.news.list.useQuery({
    limit: 9,
  });

  const featuredArticle = featuredNewsArticle ?? latestArticles?.[0] ?? null;
  const latest =
    latestArticles?.filter(article => article.id !== featuredArticle?.id) ?? [];

  return (
    <div className="min-h-screen bg-[#050506] text-[#f6f1ea]">
      <NewsMasthead />
      <NewsHero />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FeaturedSection article={featuredArticle} />
        <section className="py-9">
          <div className="mb-5 flex items-end justify-between border-b border-[#3b0b16] pb-2">
            <h2 className="font-serif text-3xl font-black tracking-normal">
              Latest
            </h2>
            <Clock className="h-5 w-5 text-[#d9152f]" />
          </div>
          <NewsArticleGrid
            articles={latest}
            emptyMessage="No latest news articles have been published yet."
            isLoading={isLoading}
          />
        </section>
      </main>
    </div>
  );
}

export function NewsCategoryPage() {
  const [, mainParams] = useRoute("/news/:categorySlug");
  const [, subdomainParams] = useRoute("/:categorySlug");
  const categorySlug =
    mainParams?.categorySlug ?? subdomainParams?.categorySlug;
  const category = getNewsCategoryBySlug(categorySlug);
  const { data: articles, isLoading } = trpc.news.list.useQuery(
    { limit: 30, category },
    { enabled: Boolean(category) }
  );

  return (
    <div className="min-h-screen bg-[#050506] text-[#f6f1ea]">
      <NewsMasthead activeCategory={category} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ListingHeader
          title={category ?? "Section not found"}
          subtitle={
            category
              ? `Latest RTSG News stories filed under ${category}.`
              : "This RTSG News section does not exist."
          }
        />
        <section className="py-9">
          <NewsArticleGrid
            articles={articles ?? []}
            emptyMessage={
              category
                ? `No news articles have been published in ${category} yet.`
                : "Choose one of the RTSG News sections above."
            }
            isLoading={isLoading}
          />
        </section>
      </main>
    </div>
  );
}

export function NewsSearchPage() {
  const searchQuery = getQueryFromSearch();
  const { data: articles, isLoading } = trpc.news.list.useQuery({
    limit: 30,
    searchQuery,
  });

  return (
    <div className="min-h-screen bg-[#050506] text-[#f6f1ea]">
      <NewsMasthead initialSearch={searchQuery} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ListingHeader
          title={searchQuery ? `Search: ${searchQuery}` : "Search RTSG News"}
          subtitle="Search headlines, article text, and excerpts across RTSG News."
        />
        <section className="py-9">
          <NewsArticleGrid
            articles={searchQuery ? (articles ?? []) : []}
            emptyMessage={
              searchQuery
                ? `No news articles matched "${searchQuery}".`
                : "Enter a search term in the masthead above."
            }
            isLoading={Boolean(searchQuery) && isLoading}
          />
        </section>
      </main>
    </div>
  );
}
