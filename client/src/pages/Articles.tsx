import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PenLine,
  Eye,
  MessageSquare,
  Pin,
  Lock,
  Clock,
  User,
  Search,
} from "lucide-react";
import { useState } from "react";

export default function Articles() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "mostViewed">(
    "newest"
  );
  const { data: articles, isLoading } = trpc.articles.list.useQuery({
    searchQuery,
    sortBy,
  });

  return (
    <div className="container max-w-4xl mx-auto py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Articles</h1>
          <p className="text-muted-foreground mt-1">Community submissions</p>
        </div>
        {isAuthenticated && (
          <Button
            onClick={() => navigate("/articles/new")}
            className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-transform duration-150 active:scale-[0.97]"
          >
            <PenLine className="w-4 h-4" />
            Write Article
          </Button>
        )}
      </div>

      {/* Search and Sort Controls */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 transition-colors"
          />
        </div>
        <Select
          value={sortBy}
          onValueChange={(value) =>
            setSortBy(value as "newest" | "oldest" | "mostViewed")
          }
        >
          <SelectTrigger className="w-40 rounded-xl border-white/10 bg-white/5 text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-white/10 bg-background">
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="mostViewed">Most Viewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <Skeleton className="h-6 w-3/4 bg-white/5 mb-3" />
              <Skeleton className="h-4 w-full bg-white/5 mb-2" />
              <Skeleton className="h-4 w-1/2 bg-white/5" />
            </div>
          ))}
        </div>
      ) : !articles || articles.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <PenLine className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery ? "No articles found" : "No articles yet"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery
              ? "Try adjusting your search terms."
              : "Be the first to share something with the community."}
          </p>
          {isAuthenticated && !searchQuery && (
            <Button
              onClick={() => navigate("/articles/new")}
              className="mt-6 rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <PenLine className="w-4 h-4" />
              Write Article
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.id}`}>
              <article className="glass rounded-2xl p-6 glass-hover cursor-pointer group transition-all duration-200">
                <div className="flex items-start gap-4">
                  {/* Cover image thumbnail */}
                  {article.coverImageUrl && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img
                        src={article.coverImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Title with badges */}
                    <div className="flex items-center gap-2 mb-2">
                      {article.isPinned && (
                        <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      {article.isLocked && (
                        <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      )}
                      <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {article.title}
                      </h2>
                    </div>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {article.authorName || "Anonymous"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(article.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {article.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
