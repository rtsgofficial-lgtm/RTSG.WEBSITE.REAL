import { useAuth } from "@/_core/hooks/useAuth";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Eye,
  Clock,
  User,
  MessageSquare,
  Pin,
  Lock,
  Trash2,
  Send,
  Shield,
  Crown,
  Edit,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";


export default function ArticleDetail() {
  const [, params] = useRoute("/articles/:id");
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [commentText, setCommentText] = useState("");
  const [commentCursor, setCommentCursor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const articleId = Number(params?.id);
  const { data: article, isLoading } = trpc.articles.getById.useQuery(
    { id: articleId },
    { enabled: !!articleId }
  );
  const { data: commentsData, refetch: refetchComments } = trpc.comments.listByArticle.useQuery(
    { articleId },
    { enabled: !!articleId }
  );

  const utils = trpc.useUtils();
  const incrementView = trpc.articles.incrementView.useMutation();
  const viewIncrementedRef = useRef(new Set<number>());
  const activeMentionQuery = useMemo(() => {
    const beforeCursor = commentText.slice(0, commentCursor);
    const match = beforeCursor.match(/(^|[\s([{])@([a-z0-9_-]{0,31})$/i);
    return match ? match[2].toLowerCase() : null;
  }, [commentCursor, commentText]);
  const mentionCandidatesQuery = trpc.users.mentionSearch.useQuery(
    { query: activeMentionQuery ?? "" },
    { enabled: isAuthenticated && activeMentionQuery !== null }
  );

  // Increment view count when article is first loaded (only once per article)
  useEffect(() => {
    if (articleId && !viewIncrementedRef.current.has(articleId)) {
      viewIncrementedRef.current.add(articleId);
      incrementView.mutate({ id: articleId });
    }
  }, [articleId]);

  const addComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      toast.success("Comment posted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => {
      refetchComments();
      toast.success("Comment deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteArticle = trpc.articles.delete.useMutation({
    onSuccess: () => {
      toast.success("Article deleted");
      navigate("/articles");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePin = trpc.articles.togglePin.useMutation({
    onSuccess: () => {
      utils.articles.getById.invalidate({ id: articleId });
      toast.success("Updated");
    },
  });

  const toggleLock = trpc.articles.toggleLock.useMutation({
    onSuccess: () => {
      utils.articles.getById.invalidate({ id: articleId });
      toast.success("Updated");
    },
  });

  const isMod = user?.role === "admin" || user?.role === "moderator";

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-12">
        <Skeleton className="h-8 w-3/4 bg-white/5 mb-4" />
        <Skeleton className="h-4 w-1/3 bg-white/5 mb-8" />
        <Skeleton className="h-64 w-full bg-white/5" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container max-w-3xl mx-auto py-12 text-center">
        <div className="glass rounded-2xl p-12">
          <h2 className="text-xl font-bold text-foreground mb-2">Article not found</h2>
          <p className="text-muted-foreground mb-6">This article may have been removed.</p>
          <Button onClick={() => navigate("/articles")} className="rounded-xl bg-primary text-primary-foreground">
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ content: commentText.trim(), articleId });
  };

  const insertMention = (handle: string) => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? commentText.length;
    const beforeCursor = commentText.slice(0, cursor);
    const afterCursor = commentText.slice(cursor);
    const match = beforeCursor.match(/(^|[\s([{])@([a-z0-9_-]{0,31})$/i);

    if (!match || match.index === undefined) return;

    const prefix = beforeCursor.slice(0, match.index) + match[1];
    const nextText = `${prefix}@${handle} ${afterCursor}`;
    const nextCursor = `${prefix}@${handle} `.length;

    setCommentText(nextText);
    setCommentCursor(nextCursor);
    window.setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-z0-9][a-z0-9_-]{1,31}\b)/gi);

    return parts.map((part, index) => {
      if (/^@[a-z0-9][a-z0-9_-]{1,31}$/i.test(part)) {
        return (
          <span key={`${part}-${index}`} className="rounded-md bg-primary/10 px-1 py-0.5 font-medium text-primary">
            {part}
          </span>
        );
      }

      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  const getRoleBadge = (role: string | null) => {
    if (role === "admin")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
          <Crown className="w-2.5 h-2.5" />
          Admin
        </span>
      );
    if (role === "moderator")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          <Shield className="w-2.5 h-2.5" />
          Mod
        </span>
      );
    return null;
  };

  const canEditArticle = user?.id === article.authorId || user?.role === "admin";
  const shouldShowOwnerDelete = user?.id === article.authorId && !isMod;

  return (
    <div className="container max-w-3xl mx-auto py-12">
      <div className="animate-fade-in">
        {/* Back */}
        <button
          onClick={() => navigate("/articles")}
          className="glitch-hover flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </button>

        {/* Article */}
        <article className="glass rounded-2xl overflow-hidden">
          {/* Cover Image */}
          {article.coverImageUrl && (
            <div className="w-full h-64 overflow-hidden">
              <img src={article.coverImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-8">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              {article.isPinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-primary/20 text-primary border border-primary/30">
                  <Pin className="w-2.5 h-2.5" />
                  Pinned
                </span>
              )}
              {article.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-foreground mb-4">{article.title}</h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-white/5">
              <button
                type="button"
                onClick={() => navigate(`/users/${article.authorId}`)}
                className="flex items-center gap-1.5 transition-colors hover:text-primary"
              >
                {article.authorAvatar ? (
                  <img src={article.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                {article.authorName || "Anonymous"}
              </button>
              {getRoleBadge(article.authorRole)}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(article.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {article.viewCount} views
              </span>
              {article.editedAt && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                  · Edited {new Date(article.editedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Content */}
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Author/Admin Actions */}
            {canEditArticle && (
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/articles/${articleId}/edit`)}
                  className="glitch-hover rounded-lg text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </Button>
                {shouldShowOwnerDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this article permanently?")) {
                        deleteArticle.mutate({ id: articleId });
                      }
                    }}
                    className="glitch-hover rounded-lg text-xs gap-1 text-destructive hover:text-destructive"
                    disabled={deleteArticle.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            )}

            {/* Mod Actions */}
            {isMod && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePin.mutate({ id: articleId, isPinned: !article.isPinned })}
                  className="glitch-hover rounded-lg text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Pin className="w-3.5 h-3.5" />
                  {article.isPinned ? "Unpin" : "Pin"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLock.mutate({ id: articleId, isLocked: !article.isLocked })}
                  className="glitch-hover rounded-lg text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {article.isLocked ? "Unlock" : "Lock"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete this article permanently?")) {
                      deleteArticle.mutate({ id: articleId });
                    }
                  }}
                  className="glitch-hover rounded-lg text-xs gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </article>

        {/* Comments Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Comments ({commentsData?.length || 0})
          </h2>

          {/* Comment Form */}
          {!article.isLocked && isAuthenticated ? (
            user?.isMuted ? (
              <div className="glass rounded-xl p-4 mb-6 text-center text-sm text-muted-foreground">
                <Shield className="w-4 h-4 inline mr-1" />
                Your account is muted and cannot post comments.
              </div>
            ) : (
              <form onSubmit={handleCommentSubmit} className="glass rounded-xl p-4 mb-6">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(e) => {
                      setCommentText(e.target.value);
                      setCommentCursor(e.target.selectionStart);
                    }}
                    onClick={(e) => setCommentCursor(e.currentTarget.selectionStart)}
                    onKeyUp={(e) => setCommentCursor(e.currentTarget.selectionStart)}
                    onSelect={(e) => setCommentCursor(e.currentTarget.selectionStart)}
                    placeholder="Write a comment... use @name to tag someone"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none text-sm"
                  />
                  {activeMentionQuery !== null && mentionCandidatesQuery.data && mentionCandidatesQuery.data.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/95 shadow-2xl backdrop-blur-xl">
                      {mentionCandidatesQuery.data.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => insertMention(candidate.handle)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
                        >
                          {candidate.avatarUrl ? (
                            <img src={candidate.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {candidate.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              @{candidate.handle}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tag people with their handle, like <span className="text-primary">@username</span>.
                </p>
                <div className="flex justify-end mt-3">
                  <Button
                    type="submit"
                    disabled={addComment.isPending || !commentText.trim()}
                    size="sm"
                    className="rounded-lg gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {addComment.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            )
          ) : article.isLocked ? (
            <div className="glass rounded-xl p-4 mb-6 text-center text-sm text-muted-foreground">
              <Lock className="w-4 h-4 inline mr-1" />
              Comments are locked on this article.
            </div>
          ) : (
            <div className="glass rounded-xl p-4 mb-6 text-center text-sm text-muted-foreground">
              <a href={getLoginUrl()} className="glitch-hover text-primary hover:underline">
                Sign in
              </a>{" "}
              to leave a comment.
            </div>
          )}

          {/* Comments List */}
          {commentsData && commentsData.length > 0 ? (
            <div className="space-y-3">
              {commentsData.map((comment: any) => (
                <div key={comment.id} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {comment.authorAvatar ? (
                        <img
                          src={comment.authorAvatar}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/users/${comment.authorId}`)}
                        className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {comment.authorName || "Anonymous"}
                      </button>
                      {getRoleBadge(comment.authorRole)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {(isMod || user?.id === comment.authorId) && (
                      <button
                        onClick={() => {
                          if (confirm("Delete this comment permanently?")) {
                            deleteComment.mutate({ id: comment.id });
                          }
                        }}
                        disabled={deleteComment.isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {renderCommentContent(comment.content)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              No comments yet. Be the first to share your thoughts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
