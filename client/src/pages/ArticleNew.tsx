import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";
import { ArrowLeft, Image as ImageIcon, Send } from "lucide-react";
import { getLoginUrl } from "@/const";

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

export default function ArticleNew() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = trpc.upload.image.useMutation();
  const createArticle = trpc.articles.create.useMutation({
    onSuccess: data => {
      if (data.isDraft) {
        toast.success("Draft saved! View it in your profile.");
        navigate("/profile");
      } else {
        toast.success("Article published!");
        navigate(`/articles/${data.articleId}`);
      }
    },
    onError: err => toast.error(err.message),
  });

  const handleCoverUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const result = await uploadImage.mutateAsync({
          imageBase64: base64,
          mimeType: file.type,
          filename: file.name,
        });
        setCoverImageUrl(result.url);
        toast.success("Cover image uploaded");
      } catch {
        toast.error("Failed to upload cover image");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent, isPublished = true) => {
    e.preventDefault();
    if (!title.trim() || isRichTextEmpty(content)) {
      toast.error("Title and content are required");
      return;
    }
    createArticle.mutate({
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || undefined,
      coverImageUrl: coverImageUrl || undefined,
      isPublished,
    });
  };

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="container max-w-2xl mx-auto py-12 text-center">
        <div className="glass rounded-2xl p-12">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Sign in to write
          </h2>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to submit articles.
          </p>
          <a href={getLoginUrl()}>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (user?.isMuted) {
    return (
      <div className="container max-w-2xl mx-auto py-12 text-center">
        <div className="glass rounded-2xl p-12">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Account Muted
          </h2>
          <p className="text-muted-foreground mb-6">
            Your account has been muted and cannot create articles at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 sm:py-12">
      <div className="animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate("/articles")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8">
          Write an Article
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Your article title"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground text-base sm:text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Excerpt (optional)
            </label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="A brief summary of your article..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Cover Image (optional)
            </label>
            {coverImageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverImageUrl("")}
                  className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/70 text-xs text-white hover:bg-black/90 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm">Click to upload cover image</span>
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleCoverUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* Content Editor */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Content
            </label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Write your article content here..."
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={createArticle.isPending || user?.isMuted}
              onClick={e => handleSubmit(e as any, false)}
              className="w-full rounded-xl px-6 py-5 border border-white/10 hover:bg-white/5 font-medium transition-all sm:w-auto"
            >
              {createArticle.isPending ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              type="submit"
              disabled={createArticle.isPending || user?.isMuted}
              className="w-full rounded-xl gap-2 px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-transform duration-150 active:scale-[0.97] sm:w-auto"
            >
              <Send className="w-4 h-4" />
              {createArticle.isPending ? "Publishing..." : "Publish Article"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
