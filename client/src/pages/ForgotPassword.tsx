import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      const message =
        data.message || "If an account exists for that email, a reset link will be sent shortly.";
      setSentMessage(message);
      toast.success("Check your email for a reset link.");
    },
    onError: () => {
      toast.error("Something went wrong. Please try again in a moment.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestReset.mutate({ email });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm glass rounded-2xl p-8 animate-fade-in">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>

          <h1 className="text-xl font-bold text-foreground">Forgot Password</h1>

          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we will send a secure reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={requestReset.isPending}
            className="w-full rounded-xl py-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-transform duration-150 active:scale-[0.97] mt-6"
          >
            {requestReset.isPending ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        {sentMessage && (
          <p className="mt-5 text-center text-sm leading-relaxed text-muted-foreground">
            {sentMessage}
          </p>
        )}
      </div>
    </div>
  );
}
