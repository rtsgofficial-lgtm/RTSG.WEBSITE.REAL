import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Crown, Eye, MessageSquare, PenLine, Shield, User, UserCheck } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";

function RoleBadge({ role }: { role: string | null }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Crown className="h-3.5 w-3.5" />
        Admin
      </span>
    );
  }

  if (role === "moderator") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-yellow-400">
        <UserCheck className="h-3.5 w-3.5" />
        Moderator
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Shield className="h-3.5 w-3.5" />
      Member
    </span>
  );
}

export default function UserProfile() {
  const [, params] = useRoute("/users/:id");
  const [, navigate] = useLocation();
  const userId = Number(params?.id);

  const { data: profile, isLoading: profileLoading } = trpc.users.profile.useQuery(
    { id: userId },
    { enabled: Number.isFinite(userId) && userId > 0 }
  );
  const { data: articles, isLoading: articlesLoading } = trpc.articles.getByAuthor.useQuery(
    { authorId: userId },
    { enabled: Number.isFinite(userId) && userId > 0 }
  );

  if (profileLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-12">
        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-2xl bg-white/5" />
            <div className="space-y-3">
              <Skeleton className="h-7 w-44 bg-white/5" />
              <Skeleton className="h-4 w-64 bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-3xl py-12 text-center">
        <div className="glass rounded-2xl p-10">
          <h1 className="mb-2 text-xl font-bold text-foreground">User not found</h1>
          <p className="mb-6 text-sm text-muted-foreground">This profile may no longer exist.</p>
          <Button onClick={() => navigate("/articles")} className="rounded-xl bg-primary text-primary-foreground">
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-12">
      <div className="animate-fade-in space-y-6">
        <button
          onClick={() => navigate("/articles")}
          className="glitch-hover mb-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </button>

        <section className="glass rounded-2xl p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-primary" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="truncate text-3xl font-bold text-foreground">{profile.name || "Anonymous"}</h1>
                <RoleBadge role={profile.role} />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <PenLine className="h-3.5 w-3.5" />
                  {profile.articleCount || 0} article{Number(profile.articleCount) === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {profile.profileBio || "This user has not added a profile description yet."}
              </p>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-8">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
            <PenLine className="h-5 w-5 text-primary" />
            Articles
          </h2>

          {articlesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full rounded-xl bg-white/5" />
              ))}
            </div>
          ) : !articles || articles.length === 0 ? (
            <div className="py-8 text-center">
              <PenLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No published articles yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`}>
                  <article className="group cursor-pointer rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.04]">
                    <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {article.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {article.commentCount}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
