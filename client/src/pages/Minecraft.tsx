import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Map, MessageCircle, ScrollText } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const SERVER_IP = "play.rtsg.org";
const DISCORD_URL = "https://discord.gg/7vdWEQpQ68";
const DYNMAP_URL = "http://play.rtsg.org:8128/";

export default function Minecraft() {
  const [copied, setCopied] = useState(false);

  const copyServerIp = async () => {
    try {
      await navigator.clipboard.writeText(SERVER_IP);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <img
        src="/media/rtsg-nations-hero.png"
        alt=""
        className="fixed inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.92) 100%)",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      <main className="container relative z-[1] flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col justify-center py-10 sm:py-14">
        <section className="max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            RTSG Minecraft
          </div>

          <h1 className="max-w-4xl text-5xl font-bold leading-[0.95] tracking-normal text-white sm:text-7xl lg:text-8xl">
            RTSG NATIONS
          </h1>

          <button
            type="button"
            onClick={copyServerIp}
            className="group mt-8 block w-full max-w-3xl rounded-lg border border-white/10 bg-black/50 p-5 text-left shadow-2xl backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-black/60 sm:p-7"
            aria-label={`Copy server IP ${SERVER_IP}`}
          >
            <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-white/60">
              Server IP
            </span>
            <span className="mt-2 flex min-w-0 items-center gap-3">
              <span className="min-w-0 break-all text-4xl font-black leading-none tracking-normal text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.24)] sm:text-6xl lg:text-7xl">
                {SERVER_IP}
              </span>
              <Copy className="h-6 w-6 shrink-0 text-primary opacity-80 transition-transform group-hover:scale-105" />
            </span>
            <span className="mt-3 block text-sm text-white/70">
              {copied ? "Copied" : "Click to copy"}
            </span>
          </button>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
              <Button className="h-12 w-full rounded-lg bg-primary px-5 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90 sm:w-auto">
                <MessageCircle className="h-4 w-4" />
                Join Discord
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>

            <a href={DYNMAP_URL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="h-12 w-full rounded-lg border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10 sm:w-auto"
              >
                <Map className="h-4 w-4" />
                View Dynmap
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>

            <Link href="/rules">
              <Button
                variant="outline"
                className="h-12 w-full rounded-lg border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10 sm:w-auto"
              >
                <ScrollText className="h-4 w-4" />
                Read Rules
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
