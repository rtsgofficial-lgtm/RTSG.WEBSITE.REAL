import { useAuth } from "@/_core/hooks/useAuth";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import RichTextEditor from "@/components/RichTextEditor";

function isRichTextEmpty(html: string) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  const hasMedia = /<(img|iframe|video|audio)\b/i.test(html);
  return !text && !hasMedia;
}

export default function ArticleEdit() {
  const [, params] = useRoute("/articles/:id/edit");
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const articleId = Number(params?.id);
  const { data: article, isLoading } = trpc.articles.getById.useQuery(
    { id: articleId },
    { enabled: !!articleId }
  );

  const updateArticle = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Article updated successfully");
      navigate(`/articles/${articleId}`);
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to update article"),
  });

  // Track whether we've initialized from the loaded article
  const [initialized, setInitialized] = useState(false);

  // Initialize form fields when article data arrives
  useEffect(() => {
    if (article && !initialized) {
      setTitle(article.title);
      setContent(article.content);
      setExcerpt(article.excerpt || "");
      setCoverImageUrl(article.coverImageUrl || "");
      setInitialized(true);
    }
  }, [article, initialized]);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 sm:py-12">
        <Skeleton className="h-8 w-3/4 bg-white/5 mb-4" />
        <Skeleton className="h-96 w-full bg-white/5" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container max-w-3xl mx-auto py-8 sm:py-12 text-center">
        <div className="glass rounded-2xl p-12">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Article not found
          </h2>
          <Button
            onClick={() => navigate("/articles")}
            className="rounded-xl bg-primary text-primary-foreground"
          >
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  // Check authorization
  if (user?.id !== article.authorId && user?.role !== "admin") {
    return (
      <div className="container max-w-3xl mx-auto py-8 sm:py-12 text-center">
        <div className="glass rounded-2xl p-12">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Not authorized
          </h2>
          <p className="text-muted-foreground mb-6">
            You can only edit your own articles.
          </p>
          <Button
            onClick={() => navigate("/articles")}
            className="rounded-xl bg-primary text-primary-foreground"
          >
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isRichTextEmpty(content)) {
      toast.error("Title and content are required");
      return;
    }
    updateArticle.mutate({
      id: articleId,
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 sm:py-12">
      <div className="animate-fade-in">
        {/* Back */}
        <button
          onClick={() => navigate(`/articles/${articleId}`)}
          className="glitch-hover flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Article
        </button>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            Edit Article
          </h1>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Article title"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Excerpt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Excerpt (optional)
            </label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Brief summary"
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
            />
          </div>

          {/* Cover Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Cover Image URL (optional)
            </label>
            <input
              type="text"
              value={coverImageUrl}
              onChange={e => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Content Editor — only render after content is initialized so Tiptap receives the real initial value */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Content
            </label>
            {initialized ? (
              <RichTextEditor content={content} onChange={setContent} />
            ) : (
              <div className="glass rounded-xl border border-white/10 min-h-[300px] flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  Loading editor...
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={updateArticle.isPending}
              className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2 sm:w-auto"
            >
              {updateArticle.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Article"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/articles/${articleId}`)}
              className="glitch-hover w-full rounded-lg sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
