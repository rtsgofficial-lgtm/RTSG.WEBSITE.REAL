import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Loader2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const SHOP_BACKGROUND_VIDEO =
  "https://rs.rtsg.org/glossy-red-liquid-morphing-abstract-background-2026-01-28-03-03-51-utc_2d2a24cb.mp4";

export default function Shop() {
  const checkoutStatus =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("checkout") : null;
  const { data: products = [] } = trpc.shop.listProducts.useQuery();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const createCheckout = trpc.shop.createCheckoutSession.useMutation({
    onSuccess: (session) => {
      if (!session.url) {
        setPendingProductId(null);
        toast.error("Stripe did not return a checkout link.");
        return;
      }

      window.location.assign(session.url);
    },
    onError: (error) => {
      setPendingProductId(null);
      toast.error(error.message);
    },
  });

  const handleCheckout = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    const variantId = selectedVariants[productId] ?? product?.variants[0]?.id;

    if (!variantId) {
      toast.error("Choose a color before checkout.");
      return;
    }

    setPendingProductId(productId);
    createCheckout.mutate({ productId, variantId });
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
          filter: "brightness(0.5) saturate(0.85) blur(10px)",
          transform: "scale(1.04)",
          border: "none",
          borderRadius: 0,
        }}
      >
        <source src={SHOP_BACKGROUND_VIDEO} type="video/mp4" />
      </video>

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 38%, rgba(0,0,0,0.58) 100%)",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse at 50% 15%, rgba(185, 28, 28, 0.18), transparent 36%), radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.76) 100%)",
        }}
      />

      <div className="container relative z-[2] mx-auto max-w-6xl py-10 sm:py-14">
        <section className="mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full glass-red px-4 py-1.5 text-xs font-medium text-primary mb-6">
            <ShoppingBag className="h-3.5 w-3.5" />
            RTSG Shop
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold leading-none tracking-tight text-foreground sm:text-6xl">
                Shop
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/62 sm:text-base">
                Objects and apparel from the Research and Technical Studies Group.
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/42">
              Collection 01
            </p>
          </div>
        </section>

        <section className="shop-products-panel">
          {products.map((product, index) => (
            <article
              key={product.id}
              className="shop-product-row group"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <Link href={`/shop/${product.id}`} className="shop-product-media" aria-label={`View ${product.name}`}>
                <div className="shop-product-orbit" />
                <img
                  src={
                    product.variants.find(
                      (variant) => variant.id === (selectedVariants[product.id] ?? product.variants[0]?.id)
                    )?.mockupImageUrl ?? product.variants[0]?.mockupImageUrl
                  }
                  alt={product.name}
                  className="shop-product-mark"
                />
              </Link>

              <div className="shop-product-content">
                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/42">
                    {product.label}
                  </p>
                  <Link href={`/shop/${product.id}`}>
                    <h2 className="text-2xl font-bold leading-tight text-white transition-colors hover:text-primary sm:text-3xl">
                      {product.name}
                    </h2>
                  </Link>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/58">
                    {product.description}
                  </p>
                  <div className="shop-product-variants" aria-label={`${product.name} ${product.optionLabel.toLowerCase()} options`}>
                    {product.variants.map((variant) => {
                      const selectedVariant = selectedVariants[product.id] ?? product.variants[0]?.id;
                      const isSelected = selectedVariant === variant.id;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          className="shop-product-variant"
                          data-selected={isSelected ? "true" : undefined}
                          onClick={() =>
                            setSelectedVariants((current) => ({
                              ...current,
                              [product.id]: variant.id,
                            }))
                          }
                        >
                          {variant.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5">
                  <div>
                    <p className="text-base font-normal text-white sm:text-lg">
                      {product.price}
                    </p>
                    <Link href={`/shop/${product.id}`} className="text-xs font-medium text-white/46 hover:text-primary">
                      View details
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/shop/${product.id}`} className="shop-product-secondary-action">
                      Details
                    </Link>
                    <button
                      type="button"
                      className="shop-product-arrow"
                      onClick={() => handleCheckout(product.id)}
                      disabled={createCheckout.isPending}
                      aria-label={`Checkout ${product.name}`}
                    >
                      {pendingProductId === product.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        {checkoutStatus === "success" && (
          <p className="mt-5 text-sm text-white/62">
            Payment received. Your order confirmation is being prepared.
          </p>
        )}
        {checkoutStatus === "cancelled" && (
          <p className="mt-5 text-sm text-white/62">
            Checkout was cancelled. Your cart is still here.
          </p>
        )}
      </div>
    </div>
  );
}
