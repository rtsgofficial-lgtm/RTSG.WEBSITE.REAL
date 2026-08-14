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
  ShoppingBag,
  Globe2,
  Activity,
  Star,
  Image as ImageIcon,
  Copy,
  CheckCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  NEWS_CATEGORIES,
  DEFAULT_NEWS_CATEGORY,
  type NewsCategory,
} from "@shared/newsCategories";
import RichTextEditor from "@/components/RichTextEditor";
import { useAuth } from "@/_core/hooks/useAuth";

type Tab =
  | "users"
  | "pages"
  | "messages"
  | "articles"
  | "news"
  | "shop"
  | "world"
  | "settings"
  | "logs";

const DASHBOARD_TABS: Tab[] = [
  "users",
  "pages",
  "messages",
  "articles",
  "news",
  "shop",
  "world",
  "settings",
  "logs",
];

function getInitialDashboardTab(): Tab {
  if (typeof window === "undefined") return "users";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return DASHBOARD_TABS.includes(tab as Tab) ? (tab as Tab) : "users";
}

type WorldProfileForm = {
  profileId: string;
  officialName: string;
  displayName: string;
  population: string;
  region: string;
  alliance: string;
  militaryStrength: string;
  rulingParty: string;
  communistParty: string;
  communistPartyUrl: string;
  researchTitle: string;
  researchUrl: string;
  description: string;
};

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const isSsoAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState<Tab>(getInitialDashboardTab);
  const [verified, setVerified] = useState(false);

  const token = localStorage.getItem("admin_token") || "";

  const { data: verifyData, isLoading: verifying } =
    trpc.adminAuth.verify.useQuery(
      { token },
      { enabled: !!token && !isSsoAdmin, retry: false }
    );

  useEffect(() => {
    if (isSsoAdmin) {
      setVerified(true);
      return;
    }
    if (authLoading) {
      return;
    }
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
  }, [token, verifyData, navigate, isSsoAdmin, authLoading]);

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_username");
      navigate("/admin");
    },
  });

  const handleLogout = () => {
    if (isSsoAdmin && !token) {
      navigate("/profile");
      return;
    }
    logoutMutation.mutate({ token });
  };

  if (authLoading || verifying || !verified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <Shield className="w-8 h-8 text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Verifying admin session...
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { id: "pages", label: "Pages", icon: <FileText className="w-4 h-4" /> },
    { id: "messages", label: "Messages", icon: <Mail className="w-4 h-4" /> },
    {
      id: "articles",
      label: "Articles",
      icon: <PenLine className="w-4 h-4" />,
    },
    { id: "news", label: "News", icon: <Star className="w-4 h-4" /> },
    { id: "shop", label: "Shop", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "world", label: "World", icon: <Globe2 className="w-4 h-4" /> },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
    },
    { id: "logs", label: "Logs", icon: <Activity className="w-4 h-4" /> },
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
              <h1 className="text-lg font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">
                Logged in as{" "}
                {isSsoAdmin
                  ? user?.email || user?.name || "admin"
                  : localStorage.getItem("admin_username") || "admin"}
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
          {tabs.map(tab => (
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
        {activeTab === "news" && <NewsPanel />}
        {activeTab === "shop" && <ShopPanel />}
        {activeTab === "world" && <WorldPanel />}
        {activeTab === "settings" && <SettingsPanel token={token} />}
        {activeTab === "logs" && <LogsPanel />}
      </div>
    </div>
  );
}

function formatLogMetadata(metadata: string | null) {
  if (!metadata) return "—";

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(
      ([, value]) => value !== null && value !== undefined && value !== ""
    );
    if (entries.length === 0) return "—";
    return entries
      .map(
        ([key, value]) =>
          `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`
      )
      .join(" • ");
  } catch {
    return metadata;
  }
}

function LogsPanel() {
  const { data: logs, isLoading } = trpc.adminLogs.list.useQuery({
    limit: 100,
  });

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">Admin Logs</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Recent admin sign-ins, lockouts, and dashboard actions.
      </p>

      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Target
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    IP
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {log.actorUsername || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.actorRole || log.actorType}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {log.targetType
                        ? `${log.targetType}${log.targetId ? `:${log.targetId}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {log.ipAddress || "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground min-w-[16rem]">
                      {formatLogMetadata(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No admin logs yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Users Panel ────────────────────────────────────────────────────────────

function UsersPanel() {
  const { data: users, refetch } = trpc.users.list.useQuery();
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Role updated");
    },
    onError: err => toast.error(err.message),
  });
  const muteMutation = trpc.users.mute.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("User muted");
    },
    onError: err => toast.error(err.message),
  });
  const unmuteMutation = trpc.users.unmute.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("User unmuted");
    },
    onError: err => toast.error(err.message),
  });
  const deleteUserArticlesMutation =
    trpc.users.deleteArticlesByUser.useMutation({
      onSuccess: data => {
        refetch();
        toast.success(
          `Deleted ${data.deletedCount} article${data.deletedCount === 1 ? "" : "s"}`
        );
      },
      onError: err => toast.error(err.message),
    });
  const deleteUserCommentsMutation =
    trpc.users.deleteCommentsByUser.useMutation({
      onSuccess: data => {
        refetch();
        toast.success(
          `Deleted ${data.deletedCount} comment${data.deletedCount === 1 ? "" : "s"}`
        );
      },
      onError: err => toast.error(err.message),
    });

  const handleDeleteUserArticles = (
    userId: number,
    userName: string | null
  ) => {
    const label = userName || "this user";
    if (
      confirm(
        `Delete ALL articles from ${label}? This also deletes comments on those articles and cannot be undone.`
      )
    ) {
      deleteUserArticlesMutation.mutate({ userId });
    }
  };

  const handleDeleteUserComments = (
    userId: number,
    userName: string | null
  ) => {
    const label = userName || "this user";
    if (confirm(`Delete ALL comments from ${label}? This cannot be undone.`)) {
      deleteUserCommentsMutation.mutate({ userId });
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">
        User Management
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Promote or demote users, mute accounts, or delete all articles/comments
        from a user.
      </p>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground">
                      {u.name || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {u.email || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        u.role === "admin"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : u.role === "moderator"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-white/5 text-muted-foreground border border-white/10"
                      }`}
                    >
                      {u.role === "admin" && <Crown className="w-2.5 h-2.5" />}
                      {u.role === "moderator" && (
                        <UserCheck className="w-2.5 h-2.5" />
                      )}
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
                          onClick={() =>
                            updateRole.mutate({ userId: u.id, role: "admin" })
                          }
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
                          onClick={() =>
                            updateRole.mutate({
                              userId: u.id,
                              role: "moderator",
                            })
                          }
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
                          onClick={() =>
                            updateRole.mutate({ userId: u.id, role: "user" })
                          }
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
                          onClick={() =>
                            unmuteMutation.mutate({ userId: u.id })
                          }
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
          <div className="p-8 text-center text-sm text-muted-foreground">
            No users found.
          </div>
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
    onError: err => toast.error(err.message),
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
            <h3 className="text-lg font-semibold text-foreground">
              Editing: {editingSlug}
            </h3>
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Content (Markdown)
              </label>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground font-mono text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updatePage.mutate({
                    slug: editingSlug,
                    title: editTitle,
                    content: editContent,
                  })
                }
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
          {pages?.map(page => (
            <div
              key={page.slug}
              className="glass glass-hover rounded-2xl p-5 flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-foreground">{page.title}</h3>
                <p className="text-sm text-muted-foreground">/{page.slug}</p>
              </div>
              <Button
                onClick={() =>
                  startEdit(page.slug, page.title, page.content || "")
                }
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
    onSuccess: () => {
      refetch();
      toast.success("Message deleted");
    },
    onError: err => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">
        Contact Messages
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Messages submitted through the contact form.
      </p>

      <div className="space-y-3">
        {messages && messages.length > 0 ? (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`glass rounded-2xl p-5 ${!msg.isRead ? "border-l-2 border-l-primary" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {msg.subject}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    From: {msg.name} ({msg.email}) •{" "}
                    {new Date(msg.createdAt).toLocaleString()}
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
                    onClick={() => {
                      if (confirm("Delete this message?"))
                        deleteMsg.mutate({ id: msg.id });
                    }}
                    className="rounded-lg text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {msg.message}
              </p>
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
    onSuccess: () => {
      refetch();
      toast.success("Article deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePin = trpc.articles.togglePin.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Article updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleLock = trpc.articles.toggleLock.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Article updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">
        Article Moderation
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Pin, lock, or delete community-submitted articles. Locked articles
        prevent new comments.
      </p>

      <div className="space-y-2">
        {articlesList && articlesList.length > 0 ? (
          articlesList.map((article: any) => (
            <div
              key={article.id}
              className="glass rounded-2xl p-5 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {article.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                  {article.isLocked && (
                    <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  )}
                  <h3 className="font-semibold text-foreground truncate">
                    {article.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  by {article.authorName || "Anonymous"} •{" "}
                  {new Date(article.createdAt).toLocaleDateString()} •{" "}
                  <Eye className="w-3 h-3 inline" /> {article.viewCount} •{" "}
                  {article.commentCount} comments
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    togglePin.mutate({
                      id: article.id,
                      isPinned: !article.isPinned,
                    })
                  }
                  className={`rounded-lg h-8 w-8 p-0 ${article.isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title={article.isPinned ? "Unpin" : "Pin"}
                >
                  <Pin className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toggleLock.mutate({
                      id: article.id,
                      isLocked: !article.isLocked,
                    })
                  }
                  className={`rounded-lg h-8 w-8 p-0 ${article.isLocked ? "text-yellow-400" : "text-muted-foreground hover:text-foreground"}`}
                  title={article.isLocked ? "Unlock" : "Lock"}
                >
                  {article.isLocked ? (
                    <Unlock className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete article "${article.title}"?`))
                      deleteArticle.mutate({ id: article.id });
                  }}
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

// ─── News Panel ─────────────────────────────────────────────────────────────

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

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 48);
}

const NEWS_PREVIEW_STORAGE_PREFIX = "rtsg-news-preview:";

function isNewsSubdomainHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "news.rtsg.org";
}

function normalizeAuthorXUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const handle = trimmedValue.match(/^@?([A-Za-z0-9_]{1,15})$/)?.[1];
  if (handle) return `https://x.com/${handle}`;

  try {
    const url = new URL(
      /^[a-z]+:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`
    );
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    if (hostname !== "x.com" && hostname !== "twitter.com") return "";
    url.protocol = "https:";
    return url.toString();
  } catch {
    return "";
  }
}

function NewsPanel() {
  const { data: newsArticles, refetch } = trpc.news.list.useQuery({
    includeUnpublished: true,
    limit: 100,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState<NewsCategory>(DEFAULT_NEWS_CATEGORY);
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [attributions, setAttributions] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorXUrl, setAuthorXUrl] = useState("");
  const [makeFeatured, setMakeFeatured] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [successArticleUrl, setSuccessArticleUrl] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setCategory(DEFAULT_NEWS_CATEGORY);
    setExcerpt("");
    setCoverImageUrl("");
    setContent("");
    setAttributions("");
    setAuthorName("");
    setAuthorXUrl("");
    setMakeFeatured(false);
    setTags([]);
    setTagInput("");
  };

  const uploadImage = trpc.upload.image.useMutation();
  const createNews = trpc.news.create.useMutation();
  const updateNews = trpc.news.update.useMutation();
  const setFeatured = trpc.news.setFeatured.useMutation();

  const featureNews = trpc.news.setFeatured.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Featured news article updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteNews = trpc.news.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("News article deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const startEdit = (article: any) => {
    setEditingId(article.id);
    setTitle(article.title);
    setSubtitle(article.subtitle || "");
    setCategory((article.category || DEFAULT_NEWS_CATEGORY) as NewsCategory);
    setExcerpt(article.excerpt || "");
    setCoverImageUrl(article.coverImageUrl || "");
    setContent(article.content || "");
    setAttributions(article.attributions || "");
    setAuthorName(article.authorName || "");
    setAuthorXUrl(article.authorXUrl || "");
    setMakeFeatured(Boolean(article.isFeatured));
    setTags(Array.isArray(article.tags) ? article.tags : []);
  };

  const addTag = (value: string) => {
    const nextTag = normalizeTag(value);
    if (!nextTag) return;
    setTags(currentTags =>
      Array.from(new Set([...currentTags, nextTag])).slice(0, 12)
    );
    setTagInput("");
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    }
    if (event.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(currentTags => currentTags.slice(0, -1));
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
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
          folder: "news",
        });
        setCoverImageUrl(result.url);
        toast.success("Cover image uploaded");
      } catch (error: any) {
        toast.error(error?.message || "Failed to upload cover image");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (status: "draft" | "published") => {
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      category,
      excerpt: excerpt.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      content,
      attributions: attributions.trim() || undefined,
      authorName: authorName.trim() || undefined,
      authorXUrl: authorXUrl.trim() || undefined,
      tags,
      status,
      isPublished: status === "published",
    };

    if (!payload.title) {
      toast.error("Title is required");
      return;
    }
    if (
      status === "published" &&
      (!payload.subtitle || isRichTextEmpty(content))
    ) {
      toast.error("Subtitle and body are required before publishing");
      return;
    }

    try {
      const result = editingId
        ? await updateNews.mutateAsync({ id: editingId, ...payload })
        : await createNews.mutateAsync({
            ...payload,
            isFeatured: makeFeatured && status === "published",
          });

      if (makeFeatured && status === "published") {
        await setFeatured.mutateAsync({ id: result.articleId });
      }

      await refetch();
      resetForm();

      if (status === "published") {
        setSuccessArticleUrl(result.articleUrl);
      } else {
        toast.success("News draft saved");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to save news article");
    }
  };

  const openPreview = () => {
    const previewId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const previewPath = isNewsSubdomainHost()
      ? `/preview?id=${encodeURIComponent(previewId)}`
      : `/news/preview?id=${encodeURIComponent(previewId)}`;
    const previewArticle = {
      title: title.trim() || "Untitled News Article",
      subtitle: subtitle.trim() || null,
      category,
      excerpt: excerpt.trim() || null,
      coverImageUrl: coverImageUrl.trim() || null,
      content: isRichTextEmpty(content) ? "<p></p>" : content,
      attributions: attributions.trim() || null,
      authorName: authorName.trim() || "RTSG",
      authorXUrl: normalizeAuthorXUrl(authorXUrl),
      tags,
      createdAt: new Date().toISOString(),
      viewCount: 0,
    };

    window.localStorage.setItem(
      `${NEWS_PREVIEW_STORAGE_PREFIX}${previewId}`,
      JSON.stringify(previewArticle)
    );
    window.open(`${window.location.origin}${previewPath}`, "_blank");
  };

  const copySuccessLink = async () => {
    try {
      await navigator.clipboard.writeText(successArticleUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const isSaving =
    createNews.isPending || updateNews.isPending || setFeatured.isPending;
  const draftArticles =
    newsArticles?.filter(
      (article: any) => article.status === "draft" || !article.isPublished
    ) ?? [];
  const publishedArticles =
    newsArticles?.filter(
      (article: any) => article.status === "published" && article.isPublished
    ) ?? [];

  const renderArticleCard = (article: any) => (
    <div
      key={article.id}
      className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          {article.isFeatured && (
            <Star className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          {(article.status === "draft" || !article.isPublished) && (
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-400">
              Draft
            </span>
          )}
          <h3 className="truncate font-semibold text-foreground">
            {article.title}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {article.category} •{" "}
          {new Date(article.createdAt).toLocaleDateString()} •{" "}
          {article.viewCount} views
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => featureNews.mutate({ id: article.id })}
          disabled={featureNews.isPending || !article.isPublished}
          className={`h-8 w-8 rounded-lg p-0 ${article.isFeatured ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          title="Feature on RTSG News"
        >
          <Star className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startEdit(article)}
          className="h-8 rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm(`Delete news article "${article.title}"?`))
              deleteNews.mutate({ id: article.id });
          }}
          className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10"
          title="Delete news article"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">RTSG News</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Create and manage news-only articles. These do not appear in the
        community article feed.
      </p>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? "Edit News Article" : "New News Article"}
            </h3>
            {editingId && (
              <Button
                variant="ghost"
                onClick={resetForm}
                className="rounded-xl text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Title
              </label>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="News headline"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Subtitle
              </label>
              <input
                value={subtitle}
                onChange={event => setSubtitle(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="Short deck below the headline"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={event =>
                    setCategory(event.target.value as NewsCategory)
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
                >
                  {NEWS_CATEGORIES.map(categoryOption => (
                    <option key={categoryOption} value={categoryOption}>
                      {categoryOption === "Editorials"
                        ? "Editorial"
                        : categoryOption}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Cover Image
                </label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) handleCoverUpload(file);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadImage.isPending}
                  className="h-12 w-full rounded-xl border-white/10 gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  {uploadImage.isPending
                    ? "Uploading..."
                    : coverImageUrl
                      ? "Replace Image"
                      : "Upload Image"}
                </Button>
              </div>
            </div>

            {coverImageUrl && (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <img
                  src={coverImageUrl}
                  alt=""
                  className="h-44 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-3 bg-white/[0.03] px-3 py-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {coverImageUrl}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCoverImageUrl("")}
                    className="h-7 rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={event => setExcerpt(event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 resize-none"
                placeholder="Short summary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Tags
              </label>
              <div className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-primary/50">
                <div className="flex flex-wrap items-center gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setTags(currentTags =>
                          currentTags.filter(item => item !== tag)
                        )
                      }
                      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      title="Remove tag"
                    >
                      {tag} ×
                    </button>
                  ))}
                  <input
                    value={tagInput}
                    onChange={event => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => addTag(tagInput)}
                    className="min-w-32 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder={
                      tags.length ? "Add tag" : "Type a tag and press Enter"
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Body
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write the news article body..."
                size="large"
                imageUploadFolder="news"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Contributors, Attributions, Etc.
              </label>
              <textarea
                value={attributions}
                onChange={event => setAttributions(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 resize-y"
                placeholder="Photo credits, reporting contributors, sources, corrections, or other article notes"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Author / Contributor Name
                </label>
                <input
                  value={authorName}
                  onChange={event => setAuthorName(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="RTSG"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  X Link
                </label>
                <input
                  value={authorXUrl}
                  onChange={event => setAuthorXUrl(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="@rtsg or https://x.com/rtsg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={makeFeatured}
                  onChange={event => setMakeFeatured(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Feature on News
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={openPreview}
                className="w-full rounded-xl gap-2 border-white/10"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={isSaving}
                className="w-full rounded-xl gap-2 border-white/10"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                type="button"
                onClick={() => handleSave("published")}
                disabled={isSaving}
                className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Check className="w-4 h-4" />
                {isSaving ? "Publishing..." : "Publish Article"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Drafts
              </h3>
              <span className="text-xs text-muted-foreground">
                {draftArticles.length}
              </span>
            </div>
            <div className="space-y-2">
              {draftArticles.length > 0 ? (
                draftArticles.map(renderArticleCard)
              ) : (
                <div className="glass rounded-2xl p-8 text-center">
                  <Save className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No news drafts yet.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Published
              </h3>
              <span className="text-xs text-muted-foreground">
                {publishedArticles.length}
              </span>
            </div>
            <div className="space-y-2">
              {publishedArticles.length > 0 ? (
                publishedArticles.map(renderArticleCard)
              ) : (
                <div className="glass rounded-2xl p-8 text-center">
                  <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No published news articles yet.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {successArticleUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="glass w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <CheckCircle className="mb-3 h-9 w-9 text-primary" />
                <h3 className="text-xl font-bold text-foreground">
                  Article uploaded successfully!
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSuccessArticleUrl("")}
                className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="break-all text-sm text-foreground">
                {successArticleUrl}
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={copySuccessLink}
                className="rounded-xl gap-2 border-white/10"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <a
                href={successArticleUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  type="button"
                  className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Article
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shop Panel ─────────────────────────────────────────────────────────────

function ShopPanel() {
  const { data: products, refetch } = trpc.shop.listProducts.useQuery();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");

  const updateProductCopy = trpc.shop.updateProductCopy.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Shop product updated");
    },
    onError: err => toast.error(err.message),
  });

  const editingProduct =
    products?.find(product => product.id === editingProductId) ??
    products?.[0] ??
    null;

  useEffect(() => {
    if (!editingProduct) return;
    setEditingProductId(editingProduct.id);
    setDescription(editingProduct.description);
    setDetails(editingProduct.details);
  }, [editingProduct?.id]);

  const handleSave = () => {
    if (!editingProduct) return;
    updateProductCopy.mutate({
      productId: editingProduct.id,
      description,
      details,
    });
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">Shop</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Edit public product descriptions and review the Printful product data
        used by checkout.
      </p>

      {!editingProduct ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No shop products configured.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-3">
            {products?.map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => setEditingProductId(product.id)}
                className={`glass w-full rounded-2xl p-4 text-left transition-colors ${
                  editingProduct.id === product.id
                    ? "border-primary/30 bg-primary/10"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <img
                  src={product.variants[0]?.mockupImageUrl}
                  alt=""
                  className="mb-4 aspect-square w-full rounded-xl bg-black/25 object-contain p-3"
                />
                <p className="text-sm font-semibold text-foreground">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground">{product.price}</p>
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingProduct.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {editingProduct.brand} {editingProduct.model} •{" "}
                  {editingProduct.productType} • {editingProduct.price}
                </p>
                <a
                  href={`/shop/${editingProduct.id}`}
                  className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <Eye className="w-3 h-3" />
                  View public product page
                </a>
              </div>
              <Button
                onClick={handleSave}
                disabled={updateProductCopy.isPending}
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Save className="w-4 h-4" />
                {updateProductCopy.isPending ? "Saving..." : "Save Product"}
              </Button>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Sync Product
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {editingProduct.printfulSyncProductId}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Catalog Product
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {editingProduct.printfulCatalogProductId}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Variants
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {editingProduct.variants.length}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Public Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  maxLength={3000}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {description.length}/3000
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Product Details
                </label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  rows={8}
                  maxLength={5000}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {details.length}/5000
                </p>
              </div>

              <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Printful Variants
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {editingProduct.variants.map(variant => (
                    <div
                      key={variant.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        {variant.images.map(image => (
                          <img
                            key={image.id}
                            src={image.url}
                            alt=""
                            className="aspect-square w-full rounded-lg bg-black/20 object-contain p-2"
                          />
                        ))}
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {variant.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sync variant {variant.printfulSyncVariantId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        External {variant.printfulExternalVariantId}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── World Panel ───────────────────────────────────────────────────────────

function WorldPanel() {
  const { data: profiles, refetch } = trpc.world.listProfiles.useQuery();
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<WorldProfileForm>({
    profileId: "",
    officialName: "",
    displayName: "",
    population: "",
    region: "",
    alliance: "",
    militaryStrength: "",
    rulingParty: "",
    communistParty: "",
    communistPartyUrl: "",
    researchTitle: "",
    researchUrl: "",
    description: "",
  });

  const updateProfile = trpc.world.updateProfile.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("World profile updated");
    },
    onError: err => toast.error(err.message),
  });

  const editingProfile =
    profiles?.find(profile => profile.id === editingProfileId) ??
    profiles?.[0] ??
    null;

  useEffect(() => {
    if (!editingProfile) return;
    setEditingProfileId(editingProfile.id);
    setForm({
      profileId: editingProfile.id,
      officialName: editingProfile.officialName,
      displayName: editingProfile.displayName,
      population: editingProfile.population,
      region: editingProfile.region,
      alliance: editingProfile.alliance,
      militaryStrength: editingProfile.militaryStrength,
      rulingParty: editingProfile.rulingParty,
      communistParty: editingProfile.communistParty,
      communistPartyUrl: editingProfile.communistPartyUrl ?? "",
      researchTitle: editingProfile.researchTitle ?? "",
      researchUrl: editingProfile.researchUrl ?? "",
      description: editingProfile.description,
    });
  }, [editingProfile?.id]);

  const updateField = (field: keyof WorldProfileForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (!editingProfile) return;
    updateProfile.mutate(form);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all";

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-4">World</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Edit the country descriptions and details shown on the public
        interactive globe.
      </p>

      {!editingProfile ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Globe2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No world profiles configured.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-3">
            {profiles?.map(profile => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setEditingProfileId(profile.id)}
                className={`glass w-full rounded-2xl p-4 text-left transition-colors ${
                  editingProfile.id === profile.id
                    ? "border-primary/30 bg-primary/10"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <p className="text-sm font-semibold text-foreground">
                  {profile.displayName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile.officialName}
                </p>
                <p className="mt-3 text-[11px] uppercase tracking-wider text-white/34">
                  {profile.tag ??
                    (profile.iso3s.length > 1
                      ? "Territory group"
                      : profile.iso3s[0])}
                </p>
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingProfile.officialName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {editingProfile.region}
                </p>
                <a
                  href="/globe"
                  className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <Eye className="w-3 h-3" />
                  View public globe page
                </a>
              </div>
              <Button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Save className="w-4 h-4" />
                {updateProfile.isPending ? "Saving..." : "Save Country"}
              </Button>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Official Name
                  </label>
                  <input
                    value={form.officialName}
                    onChange={event =>
                      updateField("officialName", event.target.value)
                    }
                    maxLength={200}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Display Name
                  </label>
                  <input
                    value={form.displayName}
                    onChange={event =>
                      updateField("displayName", event.target.value)
                    }
                    maxLength={120}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Population
                  </label>
                  <input
                    value={form.population}
                    onChange={event =>
                      updateField("population", event.target.value)
                    }
                    maxLength={500}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Region
                  </label>
                  <input
                    value={form.region}
                    onChange={event =>
                      updateField("region", event.target.value)
                    }
                    maxLength={500}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Alliance
                </label>
                <input
                  value={form.alliance}
                  onChange={event =>
                    updateField("alliance", event.target.value)
                  }
                  maxLength={1000}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Research Title
                  </label>
                  <input
                    value={form.researchTitle}
                    onChange={event =>
                      updateField("researchTitle", event.target.value)
                    }
                    maxLength={300}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Research Link
                  </label>
                  <input
                    value={form.researchUrl}
                    onChange={event =>
                      updateField("researchUrl", event.target.value)
                    }
                    maxLength={500}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Military Strength
                </label>
                <textarea
                  value={form.militaryStrength}
                  onChange={event =>
                    updateField("militaryStrength", event.target.value)
                  }
                  rows={3}
                  maxLength={1200}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Ruling Party
                  </label>
                  <textarea
                    value={form.rulingParty}
                    onChange={event =>
                      updateField("rulingParty", event.target.value)
                    }
                    rows={3}
                    maxLength={1000}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Communist Party
                  </label>
                  <input
                    value={form.communistParty}
                    onChange={event =>
                      updateField("communistParty", event.target.value)
                    }
                    maxLength={500}
                    className={inputClass}
                  />
                  <input
                    value={form.communistPartyUrl}
                    onChange={event =>
                      updateField("communistPartyUrl", event.target.value)
                    }
                    maxLength={500}
                    placeholder="Party website URL"
                    className={`${inputClass} mt-3`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={event =>
                    updateField("description", event.target.value)
                  }
                  rows={7}
                  maxLength={3000}
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {form.description.length}/3000
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Panel Component
function SettingsPanel({ token }: { token: string }) {
  const { data: settingsData, isLoading: constructionLoading } =
    trpc.settings.getConstructionMode.useQuery();
  const {
    data: popupData,
    isLoading: popupLoading,
    refetch: refetchPopup,
  } = trpc.settings.getHomepagePopup.useQuery();
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
    onError: err => {
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
            <h3 className="font-semibold text-foreground mb-1">
              Construction Mode
            </h3>
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
                <h3 className="font-semibold text-foreground mb-1">
                  Homepage Popup Message
                </h3>
                <p className="text-sm text-muted-foreground">
                  Show a dismissible popup over the homepage with a blurred
                  background. Leave the message empty to prevent it from
                  appearing.
                </p>
              </div>
              <label className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 text-sm text-foreground cursor-pointer border border-white/10 shrink-0">
                <input
                  type="checkbox"
                  checked={popupEnabled}
                  onChange={e => setPopupEnabled(e.target.checked)}
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
                onChange={e => setPopupMessage(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Write the announcement or warning users should see when they visit the homepage..."
                className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  Current status:{" "}
                  <strong
                    className={
                      popupEnabled && popupMessage.trim()
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    {popupEnabled && popupMessage.trim()
                      ? "Visible on homepage"
                      : "Hidden"}
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
                {setHomepagePopup.isPending
                  ? "Saving..."
                  : "Save Popup Settings"}
              </Button>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <div
              className={`w-2 h-2 rounded-full ${
                isUnderConstruction ? "bg-yellow-400" : "bg-green-400"
              }`}
            />
            <span>
              Current Status:{" "}
              <strong>
                {isUnderConstruction ? "Under Construction" : "Live"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
