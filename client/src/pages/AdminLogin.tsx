import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Shield, Lock, User, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSetup, setIsSetup] = useState(false);

  const { data: credStatus } = trpc.adminAuth.hasCredentials.useQuery();

  const login = trpc.adminAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_username", data.username);
      toast.success("Welcome back, admin.");
      navigate("/admin/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const setup = trpc.adminAuth.setup.useMutation({
    onSuccess: () => {
      toast.success("Admin credentials created. Please log in.");
      setIsSetup(false);
      setPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const needsSetup = credStatus && !credStatus.exists;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsSetup || isSetup) {
      setup.mutate({ username, password });
    } else {
      login.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm mx-auto relative">
        <div className="glass rounded-2xl p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {needsSetup || isSetup ? "Setup Admin" : "Admin Access"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {needsSetup || isSetup
                ? "Create your admin credentials"
                : "Enter your credentials to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  minLength={3}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={login.isPending || setup.isPending}
              className="w-full rounded-xl py-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-transform duration-150 active:scale-[0.97] mt-6"
            >
              <Shield className="w-4 h-4" />
              {login.isPending || setup.isPending
                ? "Processing..."
                : needsSetup || isSetup
                ? "Create Admin Account"
                : "Sign In"}
            </Button>
          </form>

          {needsSetup && !isSetup && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              No admin account exists yet. Fill in the form above to create one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
