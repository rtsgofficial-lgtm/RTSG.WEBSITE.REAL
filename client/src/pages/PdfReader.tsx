import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Minus, Plus, RotateCcw, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

const BACKGROUND_VIDEO = "https://rs.rtsg.org/glossy-red-liquid-morphing-abstract-background-2026-01-28-03-03-51-utc_2d2a24cb.mp4";
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
const PDFJS_VIEWER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/web/pdf_viewer.mjs";
const PDFJS_VIEWER_CSS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/web/pdf_viewer.min.css";
const MIN_ZOOM = 60;
const MAX_ZOOM = 200;
const ZOOM_STEP = 20;

type PdfDocumentProxy = {
  numPages: number;
  destroy: () => Promise<void>;
};

type PdfJsModule = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (params: { url: string }) => {
    promise: Promise<PdfDocumentProxy>;
  };
};

type EventBus = {
  on: (eventName: string, listener: (event: any) => void) => void;
};

type PdfViewer = {
  currentPageNumber: number;
  currentScale: number;
  currentScaleValue: string;
  setDocument: (pdfDocument: PdfDocumentProxy | null) => void;
};

type PdfLinkService = {
  setDocument: (pdfDocument: PdfDocumentProxy | null, baseUrl?: string | null) => void;
  setViewer: (viewer: PdfViewer) => void;
};

type PdfViewerModule = {
  EventBus: new () => EventBus;
  PDFLinkService: new (params: { eventBus: EventBus; externalLinkTarget?: number }) => PdfLinkService;
  PDFViewer: new (params: {
    container: HTMLDivElement;
    viewer: HTMLDivElement;
    eventBus: EventBus;
    linkService: PdfLinkService;
    textLayerMode?: number;
  }) => PdfViewer;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function PdfReader() {
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const pdfUrl = params.get("url") || "";
  const title = params.get("title") || "RTSG PDF";
  const scrollportRef = useRef<HTMLDivElement | null>(null);
  const viewerElementRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PdfViewer | null>(null);
  const linkServiceRef = useRef<PdfLinkService | null>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);

  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document.querySelector(`link[href="${PDFJS_VIEWER_CSS_URL}"]`)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = PDFJS_VIEWER_CSS_URL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!pdfUrl) {
      setError("No PDF was selected.");
      setIsLoading(false);
      return;
    }

    const container = scrollportRef.current;
    const viewerElement = viewerElementRef.current;
    if (!container || !viewerElement) return;

    setIsLoading(true);
    setIsRenderingPage(true);
    setError(null);
    viewerElement.innerHTML = "";

    (import(/* @vite-ignore */ PDFJS_URL) as Promise<PdfJsModule>)
      .then(async (pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        (globalThis as typeof globalThis & { pdfjsLib?: PdfJsModule }).pdfjsLib = pdfjs;

        const pdfjsViewer = await (import(/* @vite-ignore */ PDFJS_VIEWER_URL) as Promise<PdfViewerModule>);
        return [pdfjs, pdfjsViewer] as const;
      })
      .then(([pdfjs, pdfjsViewer]) => {
        const eventBus = new pdfjsViewer.EventBus();
        const linkService = new pdfjsViewer.PDFLinkService({
          eventBus,
          externalLinkTarget: 2,
        });
        const pdfViewer = new pdfjsViewer.PDFViewer({
          container,
          viewer: viewerElement,
          eventBus,
          linkService,
          textLayerMode: 1,
        });

        linkService.setViewer(pdfViewer);
        pdfViewerRef.current = pdfViewer;
        linkServiceRef.current = linkService;

        eventBus.on("pagesinit", () => {
          if (!isActive) return;
          pdfViewer.currentScale = zoom / 100;
          setIsLoading(false);
          setIsRenderingPage(false);
        });

        eventBus.on("pagechanging", (event) => {
          if (!isActive || typeof event.pageNumber !== "number") return;
          setPage(event.pageNumber);
          setPageInput(String(event.pageNumber));
        });

        eventBus.on("scalechanging", (event) => {
          if (!isActive || typeof event.scale !== "number") return;
          setZoom(Math.round(event.scale * 100));
        });

        eventBus.on("pagerender", () => {
          if (isActive) setIsRenderingPage(true);
        });

        eventBus.on("pagerendered", () => {
          if (isActive) setIsRenderingPage(false);
        });

        return pdfjs.getDocument({ url: pdfUrl }).promise;
      })
      .then((pdfDoc) => {
        if (!isActive) {
          void pdfDoc.destroy();
          return;
        }

        pdfDocRef.current = pdfDoc;
        setPageCount(pdfDoc.numPages);
        setPage(1);
        setPageInput("1");
        pdfViewerRef.current?.setDocument(pdfDoc);
        linkServiceRef.current?.setDocument(pdfDoc, null);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Could not load this PDF.");
        setIsLoading(false);
        setIsRenderingPage(false);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
      pdfViewerRef.current?.setDocument(null);
      linkServiceRef.current?.setDocument(null, null);
      if (pdfDocRef.current) void pdfDocRef.current.destroy();
      pdfViewerRef.current = null;
      linkServiceRef.current = null;
      pdfDocRef.current = null;
    };
  }, [pdfUrl]);

  const goToPage = (nextPage: number) => {
    const maxPage = pageCount ?? Number.MAX_SAFE_INTEGER;
    const clampedPage = clamp(nextPage, 1, maxPage);
    if (pdfViewerRef.current) pdfViewerRef.current.currentPageNumber = clampedPage;
    setPage(clampedPage);
    setPageInput(String(clampedPage));
  };

  const setNextZoom = (nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (pdfViewerRef.current) pdfViewerRef.current.currentScale = clampedZoom / 100;
    setZoom(clampedZoom);
  };

  return (
    <div className="pdf-reader-page">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="animate-video-fade-in pdf-reader-bg-video"
      >
        <source src={BACKGROUND_VIDEO} type="video/mp4" />
      </video>
      <div className="pdf-reader-bg-wash" />
      <div className="pdf-reader-bg-vignette" />

      <div className="pdf-reader-shell">
        <header className="pdf-reader-header">
          <button
            onClick={() => navigate("/resources")}
            className="pdf-reader-back glitch-hover"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Resources
          </button>

          <div className="pdf-reader-title-block">
            <div className="pdf-reader-title-icon">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-primary/90">PDF Reader</p>
              <h1 className="truncate text-lg font-bold text-foreground sm:text-2xl">{title}</h1>
            </div>
          </div>

          <a href={pdfUrl} download target="_blank" rel="noopener noreferrer" className="pdf-reader-download">
            <Download className="h-4 w-4" />
            <span>Download</span>
          </a>
        </header>

        <div className="pdf-reader-toolbar liquid-glass-panel">
          <div className="pdf-reader-control-group" aria-label="Page controls">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="pdf-reader-icon-button"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <label className="pdf-reader-page-input">
              <span>Page</span>
              <input
                value={pageInput}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(event) => {
                  setPageInput(event.target.value.replace(/\D/g, ""));
                }}
                onBlur={() => {
                  const nextPage = Number(pageInput);
                  if (nextPage) {
                    goToPage(nextPage);
                  } else {
                    setPageInput(String(page));
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
              <span>{pageCount ? `/ ${pageCount}` : ""}</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={!!pageCount && page >= pageCount}
              className="pdf-reader-icon-button"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="pdf-reader-control-group" aria-label="Zoom controls">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNextZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="pdf-reader-icon-button"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="pdf-reader-zoom-label">{zoom}%</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNextZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="pdf-reader-icon-button"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNextZoom(100)}
              className="pdf-reader-icon-button"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <main className="pdf-reader-viewer liquid-glass-panel">
          {isLoading && (
            <div className="pdf-reader-loading">
              <Skeleton className="h-full min-h-[28rem] w-full rounded-xl bg-white/5" />
              <div className="pdf-reader-loading-label">Loading PDF...</div>
            </div>
          )}

          {error ? (
            <div className="pdf-reader-error">
              <FileText className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold text-foreground">{error}</p>
              <Button onClick={() => navigate("/resources")} className="rounded-xl bg-primary text-primary-foreground">
                Back to Resources
              </Button>
            </div>
          ) : (
            <div ref={scrollportRef} className="pdf-reader-scrollport">
              <div ref={viewerElementRef} className="pdfViewer pdf-reader-pdf-viewer" />
              <div className="pdf-reader-rendering-status" aria-live="polite">
                {isRenderingPage && (
                  <div className="pdf-reader-rendering-label">Rendering {zoom}%</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
