import { Link } from "wouter";
import { ArrowRight, Newspaper, Twitter, Zap, Youtube, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef, type PointerEvent } from "react";
import { trpc } from "@/lib/trpc";


export default function Home() {

  const YOUTUBE_FALLBACK_IMAGE = "https://rs.rtsg.org/RTSG%20Black%20And%20White%20Grain%20ith%20colored%20logo.png";
  const LOWER_BACKGROUND_VIDEO = "https://rs.rtsg.org/subtle-white-abstract-fluid-motion-background-2026-01-28-05-08-21-utc.mov";
  const DISCORD_INVITE_URL = "https://discord.gg/qhaW8GSCcA";
  const DISCORD_SHAPE_IMAGE = "https://rs.rtsg.org/24.png";
  const [scrollBlur, setScrollBlur] = useState(0);
  const [discordSectionVisible, setDiscordSectionVisible] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const discordSectionRef = useRef<HTMLElement>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const blur = Math.min(currentScrollY / 100, 5);
      setIsScrollingUp(currentScrollY < lastScrollYRef.current - 2);
      lastScrollYRef.current = currentScrollY;
      setScrollBlur(blur);
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const section = discordSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setDiscordSectionVisible(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const { data: latestVideo, isLoading: videoLoading } = trpc.youtube.getLatestVideo.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    retry: 1,
  });
  const { data: latestSubstackPost, isLoading: substackLoading } = trpc.substack.getLatestPost.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const FALLBACK_VIDEO_ID = "-XL6K1gbT-M";

  function getYouTubeEmbedUrl(latestVideo?: { videoId?: string; embedUrl?: string } | null) {
    if (latestVideo?.videoId) {
      return `https://www.youtube.com/embed/${latestVideo.videoId}`;
    }

    if (latestVideo?.embedUrl?.includes("youtube.com/embed/")) {
      return latestVideo.embedUrl;
    }

    return `https://www.youtube.com/embed/${FALLBACK_VIDEO_ID}`;
  }

  function getYouTubeWatchUrl(latestVideo?: { videoId?: string } | null) {
    return `https://youtu.be/${latestVideo?.videoId || FALLBACK_VIDEO_ID}`;
  }

  const handleDiscordTilt = (event: PointerEvent<HTMLAnchorElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--discord-tilt-x", `${(-y * 8).toFixed(2)}deg`);
    card.style.setProperty("--discord-tilt-y", `${(x * 10).toFixed(2)}deg`);
    card.style.setProperty("--discord-shift-x", `${(x * 16).toFixed(2)}px`);
    card.style.setProperty("--discord-shift-y", `${(y * 14).toFixed(2)}px`);
  };

  const resetDiscordTilt = (event: PointerEvent<HTMLAnchorElement>) => {
    const card = event.currentTarget;
    card.style.setProperty("--discord-tilt-x", "0deg");
    card.style.setProperty("--discord-tilt-y", "0deg");
    card.style.setProperty("--discord-shift-x", "0px");
    card.style.setProperty("--discord-shift-y", "0px");
  };

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
            filter: `brightness(0.8) saturate(0.8) blur(${scrollBlur}px)`,
            border: "none",
            borderRadius: 0,
            display: "block",
            transition: "filter 0.1s ease-out",
          }}
        >
          <source src="https://rs.rtsg.org/rtsg.orgwebbackground2_ac59f027.mp4.mp4" type="video/mp4" />
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

           <p className="text-lg text-white/90 max-w-xl mx-auto mb-10 leading-relaxed animate-soft-pulse">
              Primus Inter Pares
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-4">
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

              <Link href="/donate">
                <Button
                  variant="outline"
                  className="rounded-xl px-6 py-5 text-sm font-medium border-primary/30 bg-primary/10 hover:bg-primary/20 text-foreground transition-transform duration-150 active:scale-[0.97]"
                >
                  Support Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="home-lower-ambient">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="home-lower-ambient-video animate-video-fade-in"
        >
          <source src={LOWER_BACKGROUND_VIDEO} type="video/quicktime" />
          <source src={LOWER_BACKGROUND_VIDEO} type="video/mp4" />
        </video>
        <div className="home-lower-ambient-wash" />
        <div className="home-lower-ambient-vignette" />

        {/* Features Grid */}
        <section className="relative z-[2] py-20">
          <div className="container max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a href="https://rtsg.media" target="_blank" rel="noopener noreferrer" aria-label="Open RTSG Substack">
                <div className="glass glass-hover rounded-2xl p-6 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Newspaper className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Substack</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Read RTSG essays, articles, and longer-form writing on the frontier of human thought.
                  </p>
                </div>
              </a>

              <a href="https://youtube.com/@RTSG_Main" target="_blank" rel="noopener noreferrer" aria-label="Open RTSG YouTube channel">
                <div className="glass glass-hover rounded-2xl p-6 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors" style={{ animationDelay: "0.1s" }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Youtube className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">YouTube</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Watch RTSG videos, analysis, and visual explorations of emerging ideas and theories.
                  </p>
                </div>
              </a>

              <a href="https://x.com/RTSG_Main" target="_blank" rel="noopener noreferrer" aria-label="Open RTSG on X">
                <div className="glass glass-hover rounded-2xl p-6 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors" style={{ animationDelay: "0.2s" }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Twitter className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">X / Twitter</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Follow RTSG for updates, discourse, and short-form thoughts from the wider project.
                  </p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Latest Media Section */}
        <section className="relative z-[2] pb-12">
          <div className="container max-w-6xl mx-auto grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-2xl p-8 animate-fade-in flex h-full flex-col">
              <div className="flex items-center justify-between gap-5 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex shrink-0 items-center justify-center">
                    <Newspaper className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground">Latest Substack Article</h2>
                    {latestSubstackPost?.title && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                        {latestSubstackPost.title}
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href="https://rtsg.media"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glitch-hover flex shrink-0 items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View Substack
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {substackLoading ? (
                <div className="flex flex-1 flex-col">
                  <Skeleton className="w-full aspect-video rounded-xl bg-white/5" />
                  <div className="mt-5 space-y-3">
                    <Skeleton className="h-5 w-2/3 rounded bg-white/5" />
                    <Skeleton className="h-4 w-full rounded bg-white/5" />
                    <Skeleton className="h-4 w-5/6 rounded bg-white/5" />
                  </div>
                </div>
              ) : latestSubstackPost ? (
                <a
                  href={latestSubstackPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-1 flex-col"
                >
                  <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/35">
                    {latestSubstackPost.imageUrl ? (
                      <img
                        src={latestSubstackPost.imageUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-82 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-primary/10">
                        <Newspaper className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
                  </div>
                  <div className="mt-5 flex min-w-0 flex-1 flex-col">
                    <h3 className="line-clamp-2 text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                      {latestSubstackPost.title}
                    </h3>
                    {latestSubstackPost.excerpt && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {latestSubstackPost.excerpt}
                      </p>
                    )}
                    <div className="mt-auto pt-5 flex items-center gap-3 text-xs text-muted-foreground">
                      {latestSubstackPost.publishedTimeText && <span>Published {latestSubstackPost.publishedTimeText}</span>}
                      <span className="text-primary">Read on Substack</span>
                    </div>
                  </div>
                </a>
              ) : (
                <a
                  href="https://rtsg.media"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-1 items-center justify-between gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:bg-white/[0.06]"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">Read RTSG on Substack</p>
                    <p className="mt-1 text-xs text-muted-foreground">The latest post will appear here once the feed is available.</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                </a>
              )}
            </div>

            <div className="glass rounded-2xl p-8 animate-fade-in flex h-full flex-col">
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
                  href="https://youtube.com/@RTSG_Main"
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
                <div className="flex flex-1 flex-col">
                  <Skeleton className="w-full aspect-video rounded-xl bg-white/5" />
                  <div className="mt-5 space-y-3">
                    <Skeleton className="h-5 w-2/3 rounded bg-white/5" />
                    <Skeleton className="h-4 w-1/2 rounded bg-white/5" />
                  </div>
                </div>
              ) : latestVideo ? (
                <div className="flex flex-1 flex-col">
                  <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-white/10"
                    style={{ aspectRatio: "16/9" }}>
                    <iframe
                      src={`${getYouTubeEmbedUrl(latestVideo)}?rel=0&modestbranding=1&color=white`}
                      title={latestVideo.title || "RTSG Latest Video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: "none" }}
                    />
                  </div>
                  <div className="mt-5 flex min-w-0 flex-1 flex-col">
                    <h3 className="line-clamp-2 text-xl font-bold leading-tight text-foreground">
                      {latestVideo.title || "Latest RTSG video"}
                    </h3>
                    <div className="mt-auto pt-5 flex items-center gap-3 text-xs text-muted-foreground">
                      {latestVideo.publishedTimeText && <span>Published {latestVideo.publishedTimeText}</span>}
                      <a
                        href={getYouTubeWatchUrl(latestVideo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                /* No video available — show channel CTA */
                <a
                  href="https://youtu.be/-XL6K1gbT-M"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col items-center justify-center gap-4 w-full rounded-xl overflow-hidden border border-white/10 transition-colors cursor-pointer"
                  style={{ aspectRatio: "16/9" }}
                >
                  <img
                    src={YOUTUBE_FALLBACK_IMAGE}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-sm scale-100 opacity-40 transition-all duration-500 group-hover:opacity-75 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />

                  <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Youtube className="w-8 h-8 text-primary" />
                  </div>

                  <div className="relative z-10 text-center">
                    <p className="text-sm font-medium text-white">Watch on YouTube</p>
                    <p className="text-xs text-white/70 mt-1">@RTSG_Main</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </section>

        <section
          ref={discordSectionRef}
          className={`home-discord-section relative z-[2] pb-28 ${discordSectionVisible ? "is-visible" : ""} ${isScrollingUp ? "is-scrolling-up" : ""}`}
        >
          <div className="container max-w-5xl mx-auto">
            <div className="home-discord-stage">
              <div className="home-discord-shape" aria-hidden="true">
                <img src={DISCORD_SHAPE_IMAGE} alt="" />
              </div>

              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="home-discord-card"
                onPointerMove={handleDiscordTilt}
                onPointerLeave={resetDiscordTilt}
              >
                <div className="home-discord-card-glow" aria-hidden="true" />
                <div className="home-discord-card-content">
                  <div className="home-discord-icon">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">
                      Discord
                    </p>
                    <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                      Join our Discord
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                      Join the RTSG community on Discord for updates, discussion, article drops, and debates.
                    </p>
                  </div>
                  <div className="home-discord-cta" aria-hidden="true">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
