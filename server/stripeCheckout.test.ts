import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { summarizeCheckoutSession } from "./_core/stripeCheckout";

function checkoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: "cs_test_return_status",
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    metadata: {
      checkoutType: "shop",
      productId: "rtsg-shirt",
      variantId: "black",
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("Stripe checkout return status", () => {
  it("only marks a completed, paid shop session as paid", () => {
    expect(summarizeCheckoutSession(checkoutSession(), "shop")).toEqual({
      status: "paid",
      productId: "rtsg-shirt",
    });

    expect(
      summarizeCheckoutSession(
        checkoutSession({ payment_status: "unpaid" }),
        "shop"
      )
    ).toEqual({ status: "pending", productId: "rtsg-shirt" });
  });

  it("rejects a checkout session from the wrong payment flow", () => {
    expect(
      summarizeCheckoutSession(
        checkoutSession({ metadata: { checkoutType: "donation" } }),
        "shop"
      )
    ).toEqual({ status: "failed", productId: null });
  });

  it("accepts paid donations and rejects expired sessions", () => {
    const donation = checkoutSession({
      metadata: { checkoutType: "donation" },
    });

    expect(summarizeCheckoutSession(donation, "donation")).toEqual({
      status: "paid",
      productId: null,
    });
    expect(
      summarizeCheckoutSession(
        { ...donation, status: "expired", payment_status: "unpaid" },
        "donation"
      )
    ).toEqual({ status: "failed", productId: null });
  });

  it("continues to recognize paid shop sessions created before checkoutType was added", () => {
    expect(
      summarizeCheckoutSession(
        checkoutSession({
          metadata: { productId: "legacy-product", variantId: "legacy-variant" },
        }),
        "shop"
      )
    ).toEqual({ status: "paid", productId: "legacy-product" });
  });
});
