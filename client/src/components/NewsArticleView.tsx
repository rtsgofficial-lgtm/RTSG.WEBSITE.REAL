import { ArrowLeft, Clock, Eye } from "lucide-react";

export type NewsArticleViewData = {
  id?: number;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  attributions?: string | null;
  category?: string | null;
  tags?: string[] | null;
  authorName?: string | null;
  authorXUrl?: string | null;
  createdAt?: string | Date | null;
  viewCount?: number | null;
};

function formatDate(value?: string | Date | null) {
  return new Date(value ?? Date.now()).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function AuthorByline({ article }: { article: NewsArticleViewData }) {
  const authorName = article.authorName?.trim() || "RTSG";
  const authorXUrl = article.authorXUrl?.trim();

  if (!authorXUrl) return <span>{authorName}</span>;

  return (
    <a
      href={authorXUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 hover:text-[#ff304f]"
    >
      <span>{authorName}</span>
      <span
        aria-label="X profile"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#3b0b16] text-[9px] font-black leading-none text-[#f6f1ea]"
      >
        X
      </span>
    </a>
  );
}

export default function NewsArticleView({
  article,
  onBack,
  backLabel = "RTSG News",
  preview = false,
}: {
  article: NewsArticleViewData;
  onBack: () => void;
  backLabel?: string;
  preview?: boolean;
}) {
  const tags = Array.isArray(article.tags) ? article.tags : [];

  return (
    <article className="min-h-screen bg-[#050506] text-[#f6f1ea]">
      <header className="border-b border-[#3b0b16] bg-[#070607] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#f6f1ea]/62 hover:text-[#ff304f]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d9152f]">
              {article.category || "Editorials"}
            </p>
            {preview && (
              <span className="border border-[#3b0b16] bg-[#12080b] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#f6f1ea]/60">
                Preview
              </span>
            )}
          </div>
          <h1 className="max-w-4xl font-serif text-5xl font-black leading-[0.95] tracking-normal sm:text-6xl">
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="mt-5 max-w-3xl text-xl font-semibold leading-8 text-[#f6f1ea]/72">
              {article.subtitle}
            </p>
          )}
          {article.excerpt && (
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#f6f1ea]/66">
              {article.excerpt}
            </p>
          )}
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="border border-[#3b0b16] bg-[#12080b] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#f6f1ea]/52"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-4 border-t border-[#3b0b16] pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#f6f1ea]/50">
            <AuthorByline article={article} />
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(article.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {article.viewCount ?? 0}
            </span>
          </div>
        </div>
      </header>

      {article.coverImageUrl && (
        <div className="mx-auto max-w-6xl border-x border-b border-[#3b0b16]">
          <img
            src={article.coverImageUrl}
            alt=""
            className="max-h-[34rem] w-full object-cover"
          />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div
          className="article-prose text-[#f6f1ea]"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
        {article.attributions?.trim() && (
          <aside className="mt-10 border-t border-[#3b0b16] pt-5 text-sm leading-7 text-[#f6f1ea]/58">
            <h2 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#d9152f]">
              Attributions
            </h2>
            <p className="whitespace-pre-wrap">{article.attributions}</p>
          </aside>
        )}
      </div>
    </article>
  );
}
