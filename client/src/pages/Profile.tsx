import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  PenLine,
  Crown,
  UserCheck,
  Camera,
  Eye,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";


export default function Profile() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const uploadAvatar = trpc.users.uploadAvatar.useMutation({
    onSuccess: () => {
      toast.success("Avatar updated!");
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Fetch user's articles
  const { data: myArticles, isLoading: articlesLoading, refetch: refetchMyArticles } = trpc.articles.getByAuthor.useQuery(
    { authorId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  const deleteArticle = trpc.articles.delete.useMutation({
    onSuccess: () => {
      toast.success("Article deleted");
      refetchMyArticles();
      utils.articles.getUserDrafts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAvatar.mutate({ imageBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl bg-white/5" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 bg-white/5" />
              <Skeleton className="h-4 w-56 bg-white/5" />
            </div>
          </div>
          <Skeleton className="h-32 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    navigate("/");
    return null;
  }

  const roleConfig = {
    admin: {
      icon: <Crown className="w-3.5 h-3.5" />,
      label: "Admin",
      className: "bg-primary/20 text-primary border border-primary/30",
    },
    moderator: {
      icon: <UserCheck className="w-3.5 h-3.5" />,
      label: "Moderator",
      className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    },
    user: {
      icon: <User className="w-3.5 h-3.5" />,
      label: "Member",
      className: "bg-white/5 text-muted-foreground border border-white/10",
    },
  };

  const role = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.user;

  return (
    <div className="container max-w-2xl mx-auto py-12">
      <div className="animate-fade-in space-y-6">
        {/* Profile Header */}
        <div className="glass rounded-2xl p-8">
          <div className="flex items-start gap-5">
            {/* Avatar with upload */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                {(user as any).avatarUrl ? (
                  <img
                    src={(user as any).avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {user.name || "Anonymous"}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${role.className}`}
                >
                  {role.icon}
                  {role.label}
                </span>
              </div>

              {user.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user.email}</span>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>Last active {new Date(user.lastSignedIn).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Account Details
          </h2>

          <div className="space-y-4">
            <DisplayNameEditor user={user} />
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-muted-foreground">Login Method</span>
              <span className="text-sm font-medium text-foreground capitalize">
                {user.loginMethod || "OAuth"}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-muted-foreground">Role</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${role.className}`}
              >
                {role.icon}
                {role.label}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Articles Published</span>
              <span className="text-sm font-medium text-foreground">
                {myArticles?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Post History */}
        <div className="glass rounded-2xl p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <PenLine className="w-5 h-5 text-primary" />
              My Articles
            </h2>
            <Button
              onClick={() => navigate("/articles/new")}
              size="sm"
              className="rounded-lg gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              <PenLine className="w-3 h-3" />
              Write New
            </Button>
          </div>

          {articlesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />
              ))}
            </div>
          ) : !myArticles || myArticles.length === 0 ? (
            <div className="text-center py-8">
              <PenLine className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">You haven't published any articles yet.</p>
              <Button
                onClick={() => navigate("/articles/new")}
                variant="ghost"
                size="sm"
                className="mt-3 rounded-lg text-primary hover:text-primary"
              >
                Write your first article
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myArticles.map((article: any) => (
                <div
                  key={article.id}
                  onClick={() => navigate(`/articles/${article.id}`)}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 hover:bg-white/[0.04] transition-all cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete article "${article.title}" permanently?`)) {
                        deleteArticle.mutate({ id: article.id });
                      }
                    }}
                    className="ml-4 rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10 opacity-70 group-hover:opacity-100"
                    title="Delete article"
                    disabled={deleteArticle.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Drafts */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            My Drafts
          </h2>
          <MyDraftsSection userId={user?.id || 0} />
        </div>
      </div>
    </div>
  );
}

function MyDraftsSection({ userId }: { userId: number }) {
  const { data: drafts, isLoading } = trpc.articles.getUserDrafts.useQuery(undefined, { enabled: !!userId });
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const publishDraft = trpc.articles.publishDraft.useMutation({
    onSuccess: () => {
      toast.success("Article published!");
      utils.articles.getUserDrafts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteDraft = trpc.articles.delete.useMutation({
    onSuccess: () => {
      toast.success("Draft deleted");
      utils.articles.getUserDrafts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <div className="text-center py-8">
        <PenLine className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No drafts yet. Start writing!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft: any) => (
        <div key={draft.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 hover:bg-white/[0.04] transition-all">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">{draft.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Last edited {new Date(draft.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/articles/${draft.id}/edit`)}
              className="glitch-hover rounded-lg text-xs"
            >
              Edit
            </Button>
            <Button
              size="sm"
              onClick={() => publishDraft.mutate({ id: draft.id })}
              className="rounded-lg text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={publishDraft.isPending}
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete draft "${draft.title}" permanently?`)) {
                  deleteDraft.mutate({ id: draft.id });
                }
              }}
              className="rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
              title="Delete draft"
              disabled={deleteDraft.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DisplayNameEditor({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const utils = trpc.useUtils();
  const updateDisplayName = trpc.users.updateDisplayName.useMutation({
    onSuccess: () => {
      toast.success("Display name updated!");
      utils.auth.me.invalidate();
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    updateDisplayName.mutate({ displayName: displayName.trim() });
  };

  if (isEditing) {
    return (
      <div className="py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="rounded-lg bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50"
              maxLength={100}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateDisplayName.isPending}
            className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
          >
            {updateDisplayName.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setDisplayName(user?.name || "");
            }}
            className="rounded-lg border-white/10 hover:bg-white/5 text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-sm text-muted-foreground">Display Name</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{user?.name || "—"}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="rounded-lg border-white/10 hover:bg-white/5 text-xs gap-1.5"
        >
          <PenLine className="w-3 h-3" />
          Edit
        </Button>
      </div>
    </div>
  );
}
