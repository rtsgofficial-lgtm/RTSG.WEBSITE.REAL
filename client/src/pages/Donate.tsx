import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CreditCard, Heart, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const DONATE_BACKGROUND_VIDEO =
  "https://rs.rtsg.org/subtle-white-abstract-fluid-motion-background-2026-01-28-05-08-21-utc.mov";
const PRESET_AMOUNTS = [5, 10, 25, 50];
const PATREON_URL = "https://www.patreon.com/RTSG_Main";

export default function Donate() {
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const amount = useMemo(() => {
    const parsedCustomAmount = Number(customAmount);
    return customAmount.trim() ? parsedCustomAmount : selectedAmount;
  }, [customAmount, selectedAmount]);

  const createCheckout = trpc.donations.createCheckoutSession.useMutation({
    onSuccess: (session) => {
      if (!session.url) {
        setIsRedirecting(false);
        toast.error("Stripe did not return a checkout link.");
        return;
      }

      window.location.assign(session.url);
    },
    onError: (error) => {
      setIsRedirecting(false);
      toast.error(error.message);
    },
  });

  const handleDonate = () => {
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      toast.error("Choose a donation amount between $1 and $10,000.");
      return;
    }

    setIsRedirecting(true);
    createCheckout.mutate({
      amountCents: Math.round(amount * 100),
      isMonthly,
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="animate-video-fade-in"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0,
          filter: "brightness(0.52) saturate(0.8) blur(8px)",
          transform: "scale(1.04)",
        }}
      >
        <source src={DONATE_BACKGROUND_VIDEO} type="video/quicktime" />
        <source src={DONATE_BACKGROUND_VIDEO} type="video/mp4" />
      </video>
      <div className="fixed inset-0 z-[1] pointer-events-none bg-black/66" />

      <div className="container relative z-[2] mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/54 hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <section className="glass rounded-2xl border border-white/10 p-6 shadow-2xl sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full glass-red px-4 py-1.5 text-xs font-medium text-primary">
            <Heart className="h-3.5 w-3.5" />
            Support RTSG
          </div>

          <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-6xl">
                Help keep RTSG independent.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/68 sm:text-base">
                Your support helps fund RTSG writing, video production, research, and community projects.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">Amount</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {PRESET_AMOUNTS.map((presetAmount) => {
                  const isSelected = !customAmount && selectedAmount === presetAmount;

                  return (
                    <button
                      key={presetAmount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(presetAmount);
                        setCustomAmount("");
                      }}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/10"
                      data-selected={isSelected ? "true" : undefined}
                      style={{
                        borderColor: isSelected ? "rgba(255, 0, 51, 0.55)" : undefined,
                        background: isSelected ? "rgba(255, 0, 51, 0.14)" : undefined,
                      }}
                    >
                      ${presetAmount}
                    </button>
                  );
                })}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/42">
                  Custom Amount
                </span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/42">$</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-8 pr-4 text-sm text-foreground outline-none transition placeholder:text-white/32 focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    placeholder="Enter another amount"
                  />
                </div>
              </label>

              <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/72 transition hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={isMonthly}
                  onChange={(event) => setIsMonthly(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span>Make this a monthly donation</span>
              </label>

              <Button
                type="button"
                onClick={handleDonate}
                disabled={isRedirecting || createCheckout.isPending}
                className="mt-6 w-full rounded-xl bg-primary py-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {isRedirecting || createCheckout.isPending ? (
                  <>
                    Opening Stripe
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {isMonthly ? "Start Monthly Donation" : "Donate Once"}
                  </>
                )}
              </Button>

              <p className="mt-4 text-center text-xs leading-relaxed text-white/42">
                Secure checkout is handled by Stripe.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-7 text-center text-sm text-white/54">
          Prefer Patreon?{" "}
          <a href={PATREON_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Support RTSG on Patreon
          </a>
        </div>
      </div>
    </div>
  );
}
