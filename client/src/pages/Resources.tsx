import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Streamdown } from "streamdown";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
import { Plus, Trash2, ExternalLink, Search, Upload } from "lucide-react";
import { toast } from "sonner";


const VIDEO_SRC = "/manus-storage/glossy-red-liquid-morphing-abstract-background-2026-01-28-03-03-51-utc_2d2a24cb.mp4";

export default function Resources() {

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: page, isLoading: pageLoading } = trpc.pages.getBySlug.useQuery({ slug: "resources" });
  const { data: pdfResources, isLoading: pdfLoading, refetch: refetchPdfs } = trpc.pdfResources.list.useQuery();

  const [showAddForm, setShowAddForm] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const filteredPdfs = useMemo(() => {
    if (!pdfResources) return [];
    if (!searchQuery.trim()) return pdfResources;
    const query = searchQuery.toLowerCase();
    return pdfResources.filter((pdf) => pdf.title.toLowerCase().includes(query));
  }, [pdfResources, searchQuery]);

  const createPdf = trpc.pdfResources.create.useMutation({
    onSuccess: () => {
      toast.success("PDF added successfully");
      setPdfTitle("");
      setPdfFile(null);
      setShowAddForm(false);
      setUploadProgress(0);
      refetchPdfs();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add PDF");
      setUploadProgress(0);
    },
  });

  const deletePdf = trpc.pdfResources.delete.useMutation({
    onSuccess: () => {
      toast.success("PDF deleted");
      refetchPdfs();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete PDF");
    },
  });

  const handleAddPdf = async () => {
    if (!pdfTitle.trim() || !pdfFile) {
      toast.error("Please enter a title and select a PDF file");
      return;
    }
    // Validate MIME type
    if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a valid PDF file (.pdf)");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      toast.error("Failed to read file. Please try again.");
      setUploadProgress(0);
    };
    reader.onload = async (e) => {
      const result = e.target?.result;
      if (typeof result !== "string") {
        toast.error("Failed to read file");
        return;
      }
      // Validate PDF magic bytes in the browser before uploading
      const binary = atob(result.split(",")[1] || "");
      if (!binary.startsWith("%PDF-")) {
        toast.error("File does not appear to be a valid PDF");
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        toast.error("Failed to read file");
        return;
      }
      setUploadProgress(50);
      createPdf.mutate({ title: pdfTitle, pdfFile: base64, filename: pdfFile.name });
    };
    reader.readAsDataURL(pdfFile);
  };

  const isLoading = pageLoading || pdfLoading;

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
          <div className="space-y-8">
            {/* Main content */}
            <div className="glass rounded-2xl p-8 animate-fade-in">
              <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline [&_ul]:text-muted-foreground [&_ol]:text-muted-foreground [&_li]:text-muted-foreground">
                <Streamdown>{page.content || ""}</Streamdown>
              </div>
            </div>

            {/* PDF Resources Section */}
            <div className="glass rounded-2xl p-8 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">PDF Resources</h2>
                {isAdmin && (
                  <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    size="sm"
                    className="gap-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add PDF
                  </Button>
                )}
              </div>

              {/* Add PDF Form */}
              {isAdmin && showAddForm && (
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <Input
                    placeholder="PDF Title"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    className="rounded-lg bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{pdfFile ? pdfFile.name : "Choose PDF file"}</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => {
                        setShowAddForm(false);
                        setPdfFile(null);
                        setUploadProgress(0);
                      }}
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddPdf}
                      disabled={createPdf.isPending}
                      size="sm"
                      className="rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {createPdf.isPending ? `Uploading... ${uploadProgress}%` : "Upload PDF"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Bar */}
              {pdfResources && pdfResources.length > 0 && (
                <div className="mb-6 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search PDFs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-lg bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              )}

              {/* PDF List */}
              {filteredPdfs && filteredPdfs.length > 0 ? (
                <div className="space-y-2">
                  {filteredPdfs.map((pdf) => (
                    <div
                      key={pdf.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <a
                        href={pdf.pdfUrl.startsWith("/manus-storage/") ? pdf.pdfUrl.split("/").map((seg, i) => i <= 1 ? seg : encodeURIComponent(decodeURIComponent(seg))).join("/") : pdf.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glitch-hover flex items-center gap-2 text-primary hover:underline flex-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{pdf.title}</span>
                      </a>
                      {isAdmin && (
                        <Button
                          onClick={() => {
                            if (confirm(`Delete "${pdf.title}"?`)) {
                              deletePdf.mutate({ id: pdf.id });
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : pdfResources && pdfResources.length > 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No PDFs match your search.</p>
              ) : (
                <p className="text-sm text-muted-foreground">No PDF resources available yet.</p>
              )}
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
