import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Heart, XCircle } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function DonateStatus() {
  const [isSuccess] = useRoute("/donate/success");
  const status = isSuccess ? "success" : "cancel";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-lg rounded-2xl border border-white/10 p-8 text-center animate-fade-in">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          {status === "success" ? (
            <CheckCircle2 className="h-7 w-7 text-primary" />
          ) : (
            <XCircle className="h-7 w-7 text-primary" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          {status === "success" ? "Thank you for supporting RTSG." : "Donation cancelled."}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          {status === "success"
            ? "Your payment was received by Stripe. Your support helps keep RTSG building, publishing, and researching."
            : "No payment was made. You can return to the donation page whenever you are ready."}
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/donate">
            <Button className="rounded-xl bg-primary px-6 py-5 text-primary-foreground hover:bg-primary/90">
              <Heart className="h-4 w-4" />
              {status === "success" ? "Donate Again" : "Return to Donate"}
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="rounded-xl border-white/10 px-6 py-5 text-foreground hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" />
              Back Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
