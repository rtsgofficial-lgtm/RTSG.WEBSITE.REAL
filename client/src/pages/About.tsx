import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Streamdown } from "streamdown";

const VIDEO_SRC = "https://rs.rtsg.org/glossy-red-liquid-morphing-abstract-background-2026-01-28-03-03-51-utc_2d2a24cb.mp4";

export default function About() {
  const { data: page, isLoading } = trpc.pages.getBySlug.useQuery({ slug: "about" });

  return (
    <div className="relative min-h-screen">
      {/* Ambient background video */}
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
          filter: "brightness(0.75) saturate(0.8)",
          border: "none",
          borderRadius: 0,
        }}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Gradient vignette overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.75) 100%)",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Page content */}
      <div className="container max-w-3xl mx-auto py-8 relative" style={{ zIndex: 2 }}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 bg-white/5" />
            <Skeleton className="h-4 w-full bg-white/5" />
            <Skeleton className="h-4 w-3/4 bg-white/5" />
            <Skeleton className="h-4 w-5/6 bg-white/5" />
          </div>
        ) : page ? (
          <div className="glass rounded-2xl p-8 animate-fade-in">
            <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline [&_ul]:text-muted-foreground [&_ol]:text-muted-foreground [&_li]:text-muted-foreground">
              <Streamdown>{page.content || ""}</Streamdown>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Content not available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
