import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  FileText,
  Mail,
  PenLine,
  LogOut,
  Crown,
  UserCheck,
  UserX,
  Trash2,
  Check,
  Save,
  Pin,
  Lock,
  Unlock,
  Gavel,
  Eye,
  Settings,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Tab = "users" | "pages" | "messages" | "articles" | "settings";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [verified, setVerified] = useState(false);

  const token = localStorage.getItem("admin_token") || "";

  const { data: verifyData, isLoading: verifying } = trpc.adminAuth.verify.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    if (verifyData && !verifyData.valid) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_username");
      navigate("/admin");
    } else if (verifyData?.valid) {
      setVerified(true);
    }
  }, [token, verifyData, navigate]);

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_username");
      navigate("/admin");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate({ token });
  };

  if (verifying || !verified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <Shield className="w-8 h-8 text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Verifying admin session...</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { id: "pages", label: "Pages", icon: <FileText className="w-4 h-4" /> },
    { id: "messages", label: "Messages", icon: <Mail className="w-4 h-4" /> },
    { id: "articles", label: "Articles", icon: <PenLine className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="glass border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Logged in as {localStorage.getItem("admin_username") || "admin"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-8 glass rounded-2xl p-1.5 w-fit flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "users" && <UsersPanel />}
        {activeTab === "pages" && <PagesPanel />}
        {activeTab === "messages" && <MessagesPanel />}
        {activeTab === "articles" && <ArticlesPanel />}
        {activeTab === "settings" && <SettingsPanel token={token} />}
      </div>
    </div>
  );
}

// ─── Users Panel ────────────────────────────────────────────────────────────

function UsersPanel() {
  const { data: users, refetch } = trpc.users.list.useQuery();
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { refetch(); toast.success("Role updated"); },
    onError: (err) => toast.error(err.message),
  });
  const muteMutation = trpc.users.mute.useMutation({
    onSuccess: () => { refetch(); toast.success("User muted"); },
    onError: (err) => toast.error(err.message),
  });
  const unmuteMutation = trpc.users.unmute.useMutation({
    onSuccess: () => { refetch(); toast.success("User unmuted"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteUserArticlesMutation = trpc.users.deleteArticlesByUser.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`Deleted ${data.deletedCount} article${data.deletedCount === 1 ? "" : "s"}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteUserCommentsMutation = trpc.users.deleteCommentsByUser.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`Deleted ${data.deletedCount} comment${data.deletedCount === 1 ? "" : "s"}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDeleteUserArticles = (userId: number, userName: string | null) => {
    const label = userName || "this user";
    if (
      confirm(
        `Delete ALL articles from ${label}? This also deletes comments on those articles and cannot be undone.`,
      )
    ) {
      deleteUserArticlesMutation.mutate({ userId });
    }
  };

  const handleDeleteUserComments = (userId: number, userName: string | null) => {
    const label = userName || "this user";
    if (confirm(`Delete ALL comments from ${label}? This cannot be undone.`)) {
      deleteUserCommentsMutation.mutate({ userId });
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">User Management</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Promote or demote users, mute accounts, or delete all articles/comments from a user.
      </p>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground">{u.name || "—"}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      u.role === "admin"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : u.role === "moderator"
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        : "bg-white/5 text-muted-foreground border border-white/10"
                    }`}>
                      {u.role === "admin" && <Crown className="w-2.5 h-2.5" />}
                      {u.role === "moderator" && <UserCheck className="w-2.5 h-2.5" />}
                      {u.role === "user" && <UserX className="w-2.5 h-2.5" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateRole.mutate({ userId: u.id, role: "admin" })}
                          className="rounded-lg text-xs text-primary hover:bg-primary/10 h-7 px-2"
                          title="Promote to Admin"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {u.role !== "moderator" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateRole.mutate({ userId: u.id, role: "moderator" })}
                          className="rounded-lg text-xs text-yellow-400 hover:bg-yellow-500/10 h-7 px-2"
                          title="Set as Moderator"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {u.role !== "user" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateRole.mutate({ userId: u.id, role: "user" })}
                          className="rounded-lg text-xs text-muted-foreground hover:bg-white/5 h-7 px-2"
                          title="Demote to User"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {u.isMuted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unmuteMutation.mutate({ userId: u.id })}
                          className="rounded-lg text-xs text-green-400 hover:bg-green-500/10 h-7 px-2"
                          title="Unmute User"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => muteMutation.mutate({ userId: u.id })}
                          className="rounded-lg text-xs text-red-400 hover:bg-red-500/10 h-7 px-2"
                          title="Mute User"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUserComments(u.id, u.name)}
                        disabled={deleteUserCommentsMutation.isPending}
                        className="rounded-lg text-xs text-orange-400 hover:bg-orange-500/10 h-7 px-2"
                        title="Delete all comments by this user"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUserArticles(u.id, u.name)}
                        disabled={deleteUserArticlesMutation.isPending}
                        className="rounded-lg text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
                        title="Delete all articles by this user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!users || users.length === 0) && (
          <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>
        )}
      </div>
    </div>
  );
}

// ─── Pages Panel ────────────────────────────────────────────────────────────

function PagesPanel() {
  const { data: pages, refetch } = trpc.pages.list.useQuery();
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const updatePage = trpc.pages.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingSlug(null);
      toast.success("Page updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const startEdit = (slug: string, title: string, content: string) => {
    setEditingSlug(slug);
    setEditTitle(title);
    setEditContent(content);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">Page Editor</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Edit the About and Resources page content. Supports Markdown formatting.
      </p>

      {editingSlug ? (
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Editing: {editingSlug}</h3>
            <Button
              variant="ghost"
              onClick={() => setEditingSlug(null)}
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Content (Markdown)</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground font-mono text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => updatePage.mutate({ slug: editingSlug, title: editTitle, content: editContent })}
                disabled={updatePage.isPending}
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-transform duration-150 active:scale-[0.97]"
              >
                <Save className="w-4 h-4" />
                {updatePage.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {pages?.map((page) => (
            <div key={page.slug} className="glass glass-hover rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{page.title}</h3>
                <p className="text-sm text-muted-foreground">/{page.slug}</p>
              </div>
              <Button
                onClick={() => startEdit(page.slug, page.title, page.content || "")}
                className="rounded-xl gap-2 bg-white/5 hover:bg-white/10 text-foreground border border-white/10"
              >
                <FileText className="w-4 h-4" />
                Edit
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Messages Panel ─────────────────────────────────────────────────────────

function MessagesPanel() {
  const { data: messages, refetch } = trpc.contact.list.useQuery();
  const markRead = trpc.contact.markRead.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteMsg = trpc.contact.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Message deleted"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">Contact Messages</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Messages submitted through the contact form.
      </p>

      <div className="space-y-3">
        {messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className={`glass rounded-2xl p-5 ${!msg.isRead ? "border-l-2 border-l-primary" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{msg.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    From: {msg.name} ({msg.email}) • {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!msg.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate({ id: msg.id })}
                      className="rounded-lg text-xs text-primary hover:bg-primary/10 h-7 px-2"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm("Delete this message?")) deleteMsg.mutate({ id: msg.id }); }}
                    className="rounded-lg text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No messages yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Articles Moderation Panel ──────────────────────────────────────────────

function ArticlesPanel() {
  const { data: articlesList, refetch } = trpc.articles.list.useQuery();

  const deleteArticle = trpc.articles.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Article deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePin = trpc.articles.togglePin.useMutation({
    onSuccess: () => { refetch(); toast.success("Article updated"); },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleLock = trpc.articles.toggleLock.useMutation({
    onSuccess: () => { refetch(); toast.success("Article updated"); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">Article Moderation</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Pin, lock, or delete articles. Locked articles prevent new comments.
      </p>

      <div className="space-y-2">
        {articlesList && articlesList.length > 0 ? (
          articlesList.map((article: any) => (
            <div key={article.id} className="glass rounded-2xl p-5 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {article.isPinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                  {article.isLocked && <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                  <h3 className="font-semibold text-foreground truncate">{article.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  by {article.authorName || "Anonymous"} • {new Date(article.createdAt).toLocaleDateString()} • <Eye className="w-3 h-3 inline" /> {article.viewCount} • {article.commentCount} comments
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePin.mutate({ id: article.id, isPinned: !article.isPinned })}
                  className={`rounded-lg h-8 w-8 p-0 ${article.isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title={article.isPinned ? "Unpin" : "Pin"}
                >
                  <Pin className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLock.mutate({ id: article.id, isLocked: !article.isLocked })}
                  className={`rounded-lg h-8 w-8 p-0 ${article.isLocked ? "text-yellow-400" : "text-muted-foreground hover:text-foreground"}`}
                  title={article.isLocked ? "Unlock" : "Lock"}
                >
                  {article.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (confirm(`Delete article "${article.title}"?`)) deleteArticle.mutate({ id: article.id }); }}
                  className="rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  title="Delete article"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <Gavel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No articles to moderate.</p>
          </div>
        )}
      </div>

    </div>
  );
}

// Settings Panel Component
function SettingsPanel({ token }: { token: string }) {
  const { data: settingsData, isLoading: constructionLoading } = trpc.settings.getConstructionMode.useQuery();
  const { data: popupData, isLoading: popupLoading, refetch: refetchPopup } = trpc.settings.getHomepagePopup.useQuery();
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  useEffect(() => {
    if (!popupData) return;
    setPopupEnabled(popupData.enabled);
    setPopupMessage(popupData.message);
  }, [popupData]);

  const setConstructionMode = trpc.settings.setConstructionMode.useMutation({
    onSuccess: () => {
      toast.success("Site settings updated");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const setHomepagePopup = trpc.settings.setHomepagePopup.useMutation({
    onSuccess: () => {
      refetchPopup();
      toast.success("Homepage popup settings saved");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save homepage popup settings");
    },
  });

  const isUnderConstruction = settingsData?.isUnderConstruction ?? true;

  const handleToggleConstruction = () => {
    setConstructionMode.mutate(
      { isUnderConstruction: !isUnderConstruction },
      {
        onSuccess: () => {
          // Refresh the page to reflect the change
          window.location.reload();
        },
      }
    );
  };

  const handleSaveHomepagePopup = () => {
    setHomepagePopup.mutate({
      enabled: popupEnabled,
      message: popupMessage,
    });
  };

  if (constructionLoading || popupLoading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 border border-white/5">
      <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        Site Settings
      </h2>

      <div className="space-y-6">
        {/* Construction Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Construction Mode</h3>
            <p className="text-sm text-muted-foreground">
              {isUnderConstruction
                ? "Site is currently under construction. Only admins can see the full site."
                : "Site is live. All users can access the full site."}
            </p>
          </div>
          <Button
            onClick={handleToggleConstruction}
            disabled={setConstructionMode.isPending}
            className={`rounded-lg px-4 py-2 ${
              isUnderConstruction
                ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            }`}
          >
            {setConstructionMode.isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isUnderConstruction ? (
              "Launch Site"
            ) : (
              "Enable Construction"
            )}
          </Button>
        </div>

        {/* Homepage Popup */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Homepage Popup Message</h3>
                <p className="text-sm text-muted-foreground">
                  Show a dismissible popup over the homepage with a blurred background. Leave the message empty to prevent it from appearing.
                </p>
              </div>
              <label className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 text-sm text-foreground cursor-pointer border border-white/10 shrink-0">
                <input
                  type="checkbox"
                  checked={popupEnabled}
                  onChange={(e) => setPopupEnabled(e.target.checked)}
                  className="accent-primary"
                />
                Enabled
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Popup Message
              </label>
              <textarea
                value={popupMessage}
                onChange={(e) => setPopupMessage(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Write the announcement or warning users should see when they visit the homepage..."
                className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  Current status: <strong className={popupEnabled && popupMessage.trim() ? "text-green-400" : "text-yellow-400"}>
                    {popupEnabled && popupMessage.trim() ? "Visible on homepage" : "Hidden"}
                  </strong>
                </span>
                <span>{popupMessage.length}/2000</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveHomepagePopup}
                disabled={setHomepagePopup.isPending}
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-transform duration-150 active:scale-[0.97]"
              >
                <Save className="w-4 h-4" />
                {setHomepagePopup.isPending ? "Saving..." : "Save Popup Settings"}
              </Button>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <div className={`w-2 h-2 rounded-full ${
              isUnderConstruction ? "bg-yellow-400" : "bg-green-400"
            }`} />
            <span>
              Current Status: <strong>{isUnderConstruction ? "Under Construction" : "Live"}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
