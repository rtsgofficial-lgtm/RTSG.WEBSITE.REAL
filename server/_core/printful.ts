import { createHash } from "crypto";
import type Stripe from "stripe";
import { ENV } from "./env";
import { findShopProduct, SHOP_PRODUCTS } from "./shopCatalog";

type PrintfulRecipient = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
};

type PrintfulOrderResponse = {
  code: number;
  result?: {
    id: number;
    external_id: string | null;
    status: string;
  };
  error?: {
    reason?: string;
    message?: string;
  };
};

type StripeShippingDetails = {
  name?: string | null;
  address?: Stripe.Address | null;
};

type StripeSessionWithShippingDetails = Stripe.Checkout.Session & {
  shipping_details?: StripeShippingDetails | null;
};

function getPrintfulHeaders() {
  const apiKey = ENV.printfulApiKey.trim();
  const storeId = ENV.printfulStoreId.trim();

  if (!apiKey) {
    throw new Error("Set PRINTFUL_API in .env.");
  }

  if (!storeId) {
    throw new Error("Set PRINTFUL_STORE_ID in .env.");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-PF-Store-Id": storeId,
  };
}

function toPrintfulRecipient(session: Stripe.Checkout.Session): PrintfulRecipient {
  const legacyShipping = (session as StripeSessionWithShippingDetails).shipping_details;
  const shipping = session.collected_information?.shipping_details ?? legacyShipping;
  const customer = session.customer_details;
  const address = shipping?.address ?? customer?.address;
  const name = shipping?.name ?? customer?.name;

  const missingFields = [
    !name ? "name" : null,
    !address?.line1 ? "address line 1" : null,
    !address?.city ? "city" : null,
    !address?.country ? "country" : null,
    !address?.postal_code ? "postal code" : null,
  ].filter(Boolean);

  if (!name || !address?.line1 || !address.city || !address.country || !address.postal_code) {
    throw new Error(
      `Stripe session ${session.id} is missing shipping details required for Printful: ${missingFields.join(", ")}.`
    );
  }

  return {
    name,
    address1: address.line1,
    address2: address.line2 ?? undefined,
    city: address.city,
    state_code: address.state ?? undefined,
    country_code: address.country,
    zip: address.postal_code,
    email: customer?.email ?? undefined,
    phone: customer?.phone ?? undefined,
  };
}

function getPrintfulExternalId(sessionId: string) {
  return `rtsg${createHash("sha256").update(sessionId).digest("hex").slice(0, 28)}`;
}

async function getExistingPrintfulOrder(externalId: string) {
  const response = await fetch(`https://api.printful.com/orders/@${encodeURIComponent(externalId)}`, {
    headers: getPrintfulHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  const body = (await response.json()) as PrintfulOrderResponse;

  if (!response.ok) {
    throw new Error(
      body.error?.message ?? `Unable to check existing Printful order. Printful returned ${response.status}.`
    );
  }

  return body.result ?? null;
}

export async function createPrintfulDraftOrderFromStripeSession(session: Stripe.Checkout.Session) {
  const product =
    findShopProduct(session.metadata?.productId) ??
    SHOP_PRODUCTS.find((item) => item.variants.some((variant) => variant.id === session.metadata?.variantId));
  const variant = product?.variants.find((item) => item.id === session.metadata?.variantId);

  if (!product || !variant) {
    throw new Error("Stripe session does not map to a Printful product variant.");
  }

  const externalId = getPrintfulExternalId(session.id);
  const existingOrder = await getExistingPrintfulOrder(externalId);

  if (existingOrder) {
    return existingOrder;
  }

  console.log("[Printful] Creating draft order", {
    sessionId: session.id,
    printfulExternalId: externalId,
    productId: product.id,
    variantId: variant.id,
    printfulSyncVariantId: variant.printfulSyncVariantId,
    printfulStoreId: ENV.printfulStoreId,
  });

  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: getPrintfulHeaders(),
    body: JSON.stringify({
      external_id: externalId,
      recipient: toPrintfulRecipient(session),
      items: [
        {
          sync_variant_id: variant.printfulSyncVariantId,
          external_variant_id: variant.printfulExternalVariantId,
          name: `${product.name} / ${variant.name}`,
          quantity: 1,
          retail_price: (product.priceCents / 100).toFixed(2),
        },
      ],
    }),
  });

  const body = (await response.json()) as PrintfulOrderResponse;

  if (!response.ok) {
    console.error("[Printful] Failed to create draft order", {
      sessionId: session.id,
      printfulExternalId: externalId,
      status: response.status,
      code: body.code,
      reason: body.error?.reason,
      message: body.error?.message,
    });

    throw new Error(body.error?.message ?? `Unable to create Printful draft order. Printful returned ${response.status}.`);
  }

  if (!body.result) {
    throw new Error("Printful did not return a created order.");
  }

  return body.result;
}
