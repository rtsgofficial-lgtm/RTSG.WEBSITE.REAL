import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUpRight, ChevronDown, Loader2, ShoppingBag } from "lucide-react";
import { useMemo, useState, type PointerEvent } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const SHOP_BACKGROUND_VIDEO =
  "https://rs.rtsg.org/glossy-red-liquid-morphing-abstract-background-2026-01-28-03-03-51-utc_2d2a24cb.mp4";

export default function ShopProduct() {
  const [, params] = useRoute("/shop/:productId");
  const productId = params?.productId ?? "";
  const checkoutStatus =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("checkout") : null;
  const { data: product, isLoading } = trpc.shop.getProduct.useQuery(
    { productId },
    { enabled: Boolean(productId) }
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [mockupsExpanded, setMockupsExpanded] = useState(false);

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((variant) => variant.id === (selectedVariantId ?? product.variants[0]?.id)) ?? null;
  }, [product, selectedVariantId]);

  const selectedImageUrl = activeImageUrl ?? selectedVariant?.mockupImageUrl ?? product?.images[0]?.url ?? "";
  const detailLines = product?.details
    .split("\n")
    .map((line) => {
      const cleaned = line.replace(/^[-•]\s*/, "").trim();
      return cleaned === "Blank product sourced from Vietnam or Bangladesh" ? "Made in Vietnam/Bangladesh" : cleaned;
    })
    .filter(Boolean) ?? [];

  const createCheckout = trpc.shop.createCheckoutSession.useMutation({
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

  const handleCheckout = () => {
    if (!product || !selectedVariant) {
      toast.error("Choose an option before checkout.");
      return;
    }

    setIsRedirecting(true);
    createCheckout.mutate({ productId: product.id, variantId: selectedVariant.id });
  };

  const handleGalleryTilt = (event: PointerEvent<HTMLElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--card-tilt-x", `${(-y * 9).toFixed(2)}deg`);
    card.style.setProperty("--card-tilt-y", `${(x * 11).toFixed(2)}deg`);
    card.style.setProperty("--tilt-shift-x", `${(x * 18).toFixed(2)}px`);
    card.style.setProperty("--tilt-shift-y", `${(y * 16).toFixed(2)}px`);
  };

  const resetGalleryTilt = (event: PointerEvent<HTMLElement>) => {
    const card = event.currentTarget;

    card.style.setProperty("--card-tilt-x", "0deg");
    card.style.setProperty("--card-tilt-y", "0deg");
    card.style.setProperty("--tilt-shift-x", "0px");
    card.style.setProperty("--tilt-shift-y", "0px");
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto max-w-3xl py-16">
        <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>
        <h1 className="mt-8 text-3xl font-bold text-foreground">Product not found</h1>
      </div>
    );
  }

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
          filter: "brightness(0.46) saturate(0.85) blur(10px)",
          transform: "scale(1.04)",
        }}
      >
        <source src={SHOP_BACKGROUND_VIDEO} type="video/mp4" />
      </video>
      <div className="fixed inset-0 z-[1] pointer-events-none bg-black/58" />

      <div className="container relative z-[2] mx-auto max-w-6xl py-10 sm:py-14">
        <Link href="/shop" className="mb-8 inline-flex items-center gap-2 text-sm text-white/54 hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>

        <div className="shop-detail-layout">
          <section
            className="shop-detail-gallery"
            onPointerMove={handleGalleryTilt}
            onPointerLeave={resetGalleryTilt}
          >
            <div className="shop-detail-hero-image">
              <img src={selectedImageUrl} alt={`${product.name} ${selectedVariant?.name ?? ""}`} />
            </div>
            <div className="shop-detail-mockups">
              <button
                type="button"
                className="shop-detail-mockups-toggle"
                onClick={() => setMockupsExpanded((current) => !current)}
                aria-expanded={mockupsExpanded}
              >
                <span>Mockups</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {mockupsExpanded && (
                <div className="shop-detail-thumbs">
                  {product.images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      className="shop-detail-thumb"
                      data-selected={selectedImageUrl === image.url ? "true" : undefined}
                      onClick={() => {
                        const selectedVariantHasImage = selectedVariant?.images.some((item) => item.url === image.url);
                        setSelectedVariantId(selectedVariantHasImage ? selectedVariant?.id ?? image.variantId : image.variantId);
                        setActiveImageUrl(image.url);
                      }}
                      aria-label={image.label}
                    >
                      <img src={image.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="shop-detail-info">
            <div className="inline-flex items-center gap-2 rounded-full glass-red px-4 py-1.5 text-xs font-medium text-primary">
              <ShoppingBag className="h-3.5 w-3.5" />
              {product.label}
            </div>

            <div>
              <h1 className="mt-6 text-4xl font-bold leading-none text-foreground sm:text-6xl">{product.name}</h1>
              <p className="mt-4 text-lg font-normal text-white">{product.price}</p>
            </div>

            <p className="text-sm leading-relaxed text-white/64 sm:text-base">{product.description}</p>

            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/42">{product.optionLabel}</p>
              <div className="shop-product-variants">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className="shop-product-variant"
                      data-selected={isSelected ? "true" : undefined}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setActiveImageUrl(variant.mockupImageUrl);
                      }}
                    >
                      {variant.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {detailLines.length > 0 && (
              <div className="shop-detail-details">
                <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/42">Details</p>
                <ul>
                  {detailLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="shop-detail-checkout"
              onClick={handleCheckout}
              disabled={isRedirecting || createCheckout.isPending}
            >
              {isRedirecting ? "Opening checkout" : "Checkout"}
              {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            </button>

            {checkoutStatus === "success" && (
              <p className="text-sm text-white/62">Payment received. Your order confirmation is being prepared.</p>
            )}
            {checkoutStatus === "cancelled" && (
              <p className="text-sm text-white/62">Checkout was cancelled. Your product selection is still here.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
