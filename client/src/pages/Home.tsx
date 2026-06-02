import { Link } from "wouter";
import { ArrowRight, PenLine, Users, Zap, Youtube, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";


export default function Home() {

  const [scrollBlur, setScrollBlur] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const blur = Math.min(window.scrollY / 100, 5);
      setScrollBlur(blur);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: latestVideo, isLoading: videoLoading } = trpc.youtube.getLatestVideo.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    retry: 1,
  });

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 relative overflow-hidden">
        {/* Background Video — ambient, behind everything */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="animate-video-fade-in"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0,
            filter: `brightness(0.6) saturate(0.8) blur(${scrollBlur}px)`,
            border: "none",
            borderRadius: 0,
            display: "block",
            transition: "filter 0.1s ease-out",
          }}
        >
          <source src="https://rs.rtsg.org/rtsg.orgwebbackground2_ac59f027.mp4" type="video/mp4" />
        </video>

        {/* Multi-stop gradient vignette — sits above video, below content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.75) 100%)",
          }}
        />

        {/* Radial vignette on edges */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Hero content — above all overlays */}
        <div className="container text-center max-w-3xl mx-auto" style={{ position: "relative", zIndex: 2 }}>
          {/* Decorative glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-red text-xs font-medium text-primary mb-8">
              <Zap className="w-3 h-3" />
              Research and Technical Studies Group
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="text-foreground">RTSG</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Share research, publish articles, and engage in intelligent discourse
              with like-minded individuals in an elegant space designed for knowledge exchange.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/articles">
                <Button className="rounded-xl px-6 py-5 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-transform duration-150 active:scale-[0.97]">
                  Browse Articles
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="outline"
                  className="rounded-xl px-6 py-5 text-sm font-medium border-white/10 hover:bg-white/5 text-foreground transition-transform duration-150 active:scale-[0.97]"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/resources">
              <div className="glass glass-hover rounded-2xl p-6 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <PenLine className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Cutting-edge</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  RTSG publishes world-class essays, articles and videos that are on the frontier of human thought.
                </p>
              </div>
            </Link>

            <Link href="/articles">
              <div className="glass glass-hover rounded-2xl p-6 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors" style={{ animationDelay: "0.1s" }}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Community Publishing</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Let the world know your thoughts. RTSG enables everyone to write.
                </p>
              </div>
            </Link>

            <a href="https://x.com/RTSG_Main" target="_blank" rel="noopener noreferrer">
              <div className="glass glass-hover rounded-2xl p-6 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors" style={{ animationDelay: "0.2s" }}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Next-level quality</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  RTSG stays on top of the discourse and gives expression to innovative new ideas and theories.
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Latest Video Section */}
      <section className="pb-24">
        <div className="container max-w-3xl mx-auto">
          <div className="glass rounded-2xl p-8 animate-fade-in">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Youtube className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Latest Video</h2>
                  {latestVideo?.title && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">{latestVideo.title}</p>
                  )}
                </div>
              </div>
              <a
                href="https://www.youtube.com/@RTSG_Main"
                target="_blank"
                rel="noopener noreferrer"
                className="glitch-hover flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                View channel
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Video embed */}
            {videoLoading ? (
              <Skeleton className="w-full aspect-video rounded-xl bg-white/5" />
            ) : latestVideo ? (
              <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-white/10"
                style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={`${latestVideo.embedUrl}?rel=0&modestbranding=1&color=white`}
                  title={latestVideo.title || "RTSG Latest Video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ border: "none" }}
                />
              </div>
            ) : (
              /* No video available — show channel CTA */
              <a
                href="https://www.youtube.com/@RTSG_Main"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-4 w-full rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                style={{ aspectRatio: "16/9" }}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Youtube className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Watch on YouTube</p>
                  <p className="text-xs text-muted-foreground mt-1">@RTSG_Main</p>
                </div>
              </a>
            )}

            {/* Published time if available */}
            {latestVideo?.publishedTimeText && (
              <p className="text-xs text-muted-foreground mt-3">
                Published {latestVideo.publishedTimeText}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
