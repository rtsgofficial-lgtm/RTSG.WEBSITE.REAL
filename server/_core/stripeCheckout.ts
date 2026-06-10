import type { Request, Response } from "express";
import { createHash } from "crypto";
import Stripe from "stripe";
import { ENV } from "./env";
import { createPrintfulDraftOrderFromStripeSession } from "./printful";
import { sendOrderConfirmationEmail } from "./resendEmail";
import { SHOP_PRODUCT_COPY, SHOP_PRODUCTS } from "./shopCatalog";
import * as db from "../db";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getStripeClient() {
  const apiKey = ENV.stripeSecretKey.trim();

  if (!apiKey) {
    throw new Error("Set STRIPE_SECRET_KEY in .env to your Stripe test secret key.");
  }

  if (!apiKey.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe secret key that starts with sk_test_ or sk_live_.");
  }

  return new Stripe(apiKey);
}

async function getShopProductCopy(productId: string) {
  const defaults = SHOP_PRODUCT_COPY[productId as keyof typeof SHOP_PRODUCT_COPY];
  const [description, details] = await Promise.all([
    db.getSetting(`shopProduct:${productId}:description`),
    db.getSetting(`shopProduct:${productId}:details`),
  ]);

  return {
    description: description ?? defaults?.defaultDescription ?? "",
    details: details ?? defaults?.defaultDetails ?? "",
  };
}

async function serializeShopProduct(product: (typeof SHOP_PRODUCTS)[number]) {
  const copy = await getShopProductCopy(product.id);
  const images = product.variants
    .flatMap((variant) =>
      variant.images.map((image) => ({
        id: `${variant.id}-${image.id}`,
        variantId: variant.id,
        variantName: variant.name,
        label: `${variant.name} ${image.label}`,
        url: image.url,
      }))
    )
    .filter((image, index, allImages) => allImages.findIndex((item) => item.url === image.url) === index);

  return {
    id: product.id,
    name: product.name,
    label: product.label,
    optionLabel: product.optionLabel,
    price: currencyFormatter.format(product.priceCents / 100),
    priceCents: product.priceCents,
    currency: product.currency,
    brand: product.brand,
    model: product.model,
    productType: product.productType,
    catalogTitle: product.catalogTitle,
    printfulCatalogProductId: product.printfulCatalogProductId,
    printfulSyncProductId: product.printfulSyncProductId,
    printfulExternalProductId: product.printfulExternalProductId,
    description: copy.description,
    details: copy.details,
    images,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      mockupImageUrl: variant.images[0]?.url ?? "",
      productImageUrl: variant.images[1]?.url ?? variant.images[0]?.url ?? "",
      images: variant.images,
      printfulSyncVariantId: variant.printfulSyncVariantId,
      printfulExternalVariantId: variant.printfulExternalVariantId,
    })),
  };
}

export async function listShopProducts() {
  return Promise.all(SHOP_PRODUCTS.map((product) => serializeShopProduct(product)));
}

export async function getShopProduct(productId: string) {
  const product = SHOP_PRODUCTS.find((item) => item.id === productId);

  if (!product) {
    return null;
  }

  return serializeShopProduct(product);
}

export async function updateShopProductCopy(input: {
  productId: string;
  description: string;
  details: string;
}) {
  const product = SHOP_PRODUCTS.find((item) => item.id === input.productId);

  if (!product) {
    throw new Error("That product is not available.");
  }

  await Promise.all([
    db.setSetting(`shopProduct:${input.productId}:description`, input.description),
    db.setSetting(`shopProduct:${input.productId}:details`, input.details),
  ]);

  return getShopProduct(input.productId);
}

export async function createShopCheckoutSession(input: {
  productId: string;
  variantId: string;
  origin: string;
}) {
  const product = SHOP_PRODUCTS.find((item) => item.id === input.productId);

  if (!product) {
    throw new Error("That product is not available.");
  }

  const variant = product.variants.find((item) => item.id === input.variantId);

  if (!variant) {
    throw new Error("Choose a product option before checkout.");
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    billing_address_collection: "auto",
    phone_number_collection: {
      enabled: true,
    },
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: product.priceCents,
          product_data: {
            name: `${product.name} / ${variant.name}`,
            images: [variant.images[0]?.url].filter(Boolean),
            metadata: {
              productId: product.id,
              variantId: variant.id,
              printfulSyncVariantId: String(variant.printfulSyncVariantId),
            },
          },
        },
      },
    ],
    metadata: {
      productId: product.id,
      variantId: variant.id,
      printfulSyncProductId: String(product.printfulSyncProductId),
      printfulSyncVariantId: String(variant.printfulSyncVariantId),
    },
    success_url: `${input.origin}/shop/${product.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/shop/${product.id}?checkout=cancelled`,
  });

  return {
    id: session.id,
    url: session.url,
  };
}

export async function createDonationCheckoutSession(input: {
  amountCents: number;
  isMonthly: boolean;
  origin: string;
}) {
  const amountCents = Math.round(input.amountCents);

  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 1_000_000) {
    throw new Error("Choose a donation amount between $1 and $10,000.");
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: input.isMonthly ? "subscription" : "payment",
    billing_address_collection: "auto",
    customer_creation: input.isMonthly ? undefined : "if_required",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          ...(input.isMonthly
            ? {
                recurring: {
                  interval: "month" as const,
                },
              }
            : {}),
          product_data: {
            name: input.isMonthly ? "Monthly RTSG Support" : "One-time RTSG Support",
            description: input.isMonthly
              ? "Monthly contribution supporting RTSG."
              : "One-time contribution supporting RTSG.",
          },
        },
      },
    ],
    metadata: {
      checkoutType: "donation",
      donationInterval: input.isMonthly ? "monthly" : "one_time",
      amountCents: String(amountCents),
    },
    success_url: `${input.origin}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/donate/cancel`,
  });

  return {
    id: session.id,
    url: session.url,
  };
}

export function getRequestOrigin(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const protocol = proto ?? req.protocol;
  const host = req.get("host");

  if (!host) {
    throw new Error("Could not determine site origin.");
  }

  return `${protocol}://${host}`;
}

function getOrderEmailSentKey(sessionId: string) {
  const digest = createHash("sha256").update(sessionId).digest("hex").slice(0, 40);
  return `shopEmailSent:${digest}`;
}

function formatStripeAmount(amount: number | null, currency: string | null) {
  if (amount === null || !currency) {
    return undefined;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

async function sendCheckoutOrderConfirmation(
  session: Stripe.Checkout.Session,
  printfulOrder: { id: number | string }
) {
  const emailSentKey = getOrderEmailSentKey(session.id);
  const alreadySent = await db.getSetting(emailSentKey);

  if (alreadySent === "true") {
    return { sent: false, reason: "already_sent" as const };
  }

  const customerEmail = session.customer_details?.email ?? session.customer_email;

  if (!customerEmail) {
    return { sent: false, reason: "missing_customer_email" as const };
  }

  const product = SHOP_PRODUCTS.find((item) => item.id === session.metadata?.productId);
  const variant = product?.variants.find((item) => item.id === session.metadata?.variantId);

  if (!product || !variant) {
    return { sent: false, reason: "missing_product_or_variant" as const };
  }

  const email = await sendOrderConfirmationEmail({
    customerEmail,
    customerName: session.customer_details?.name,
    product,
    variant,
    orderId: session.id,
    printfulOrderId: printfulOrder.id,
    amountTotal: formatStripeAmount(session.amount_total, session.currency),
  });

  await db.setSetting(emailSentKey, "true");

  return { sent: true, id: email?.id ?? null };
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const webhookSecret = ENV.stripeWebhookSecret.trim();

  if (!webhookSecret) {
    res.status(501).send("Stripe webhook is not configured.");
    return;
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    res.status(400).send("Missing Stripe signature.");
    return;
  }

  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature.";
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const eventSession = event.data.object;
    const session = await stripe.checkout.sessions.retrieve(eventSession.id);

    if (session.metadata?.checkoutType === "donation") {
      console.log("[Stripe] Donation checkout completed", {
        sessionId: eventSession.id,
        donationInterval: session.metadata?.donationInterval,
        amountCents: session.metadata?.amountCents,
      });
      res.json({ received: true });
      return;
    }

    const order = await createPrintfulDraftOrderFromStripeSession(session);
    const emailResult = await sendCheckoutOrderConfirmation(session, order).catch((error) => {
      console.error("[Resend] Failed to send shop order confirmation", {
        sessionId: eventSession.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return { sent: false, reason: "send_failed" as const };
    });

    console.log("[Stripe] Checkout completed and Printful draft created", {
      sessionId: eventSession.id,
      productId: eventSession.metadata?.productId,
      variantId: eventSession.metadata?.variantId,
      printfulOrderId: order.id,
      printfulOrderStatus: order.status,
      orderEmail: emailResult,
    });
  }

  res.json({ received: true });
}
