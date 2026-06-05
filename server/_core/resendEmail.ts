import { Resend } from "resend";
import { ENV } from "./env";
import type { SHOP_PRODUCTS } from "./shopCatalog";

const RESEND_PLACEHOLDER = "re_xxxxxxxxx";
const STORE_FROM_ADDRESS = "RTSG Store <store@rtsg.org>";
const STORE_REPLY_TO_ADDRESS = "rtsgmain@rtsg.org";

type ShopProduct = (typeof SHOP_PRODUCTS)[number];
type ShopVariant = ShopProduct["variants"][number];

type OrderConfirmationInput = {
  customerEmail: string;
  customerName?: string | null;
  product: ShopProduct;
  variant: ShopVariant;
  orderId: string;
  printfulOrderId?: number | string | null;
  amountTotal?: string;
};

function getResendClient() {
  const apiKey = ENV.resendApiKey.trim();

  if (!apiKey || apiKey === RESEND_PLACEHOLDER) {
    throw new Error("Set RESEND_API in .env to your real Resend API key.");
  }

  return new Resend(apiKey);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendResendHelloWorldEmail() {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: STORE_FROM_ADDRESS,
    replyTo: STORE_REPLY_TO_ADDRESS,
    to: "rtsg.official@gmail.com",
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput) {
  const resend = getResendClient();
  const customerName = input.customerName?.trim();
  const greeting = customerName ? `Hi ${escapeHtml(customerName)},` : "Hi,";
  const productName = escapeHtml(input.product.name);
  const variantName = escapeHtml(input.variant.name);
  const orderId = escapeHtml(input.orderId);
  const printfulOrderId = input.printfulOrderId ? escapeHtml(String(input.printfulOrderId)) : null;
  const amountTotal = input.amountTotal ? escapeHtml(input.amountTotal) : null;

  const { data, error } = await resend.emails.send({
    from: STORE_FROM_ADDRESS,
    replyTo: STORE_REPLY_TO_ADDRESS,
    to: input.customerEmail,
    subject: `RTSG Store order confirmation - ${productName}`,
    html: `
      <div style="margin:0;padding:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:620px;margin:0 auto;padding:36px 22px;">
          <p style="margin:0 0 18px;color:#ff0033;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">RTSG Store</p>
          <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;color:#ffffff;">Order confirmed</h1>
          <p style="margin:0 0 18px;color:#d7d7d7;font-size:15px;line-height:1.65;">${greeting}</p>
          <p style="margin:0 0 24px;color:#d7d7d7;font-size:15px;line-height:1.65;">
            Thank you for your order. We received your purchase and are preparing it for fulfillment.
          </p>

          <div style="border:1px solid rgba(255,255,255,0.12);border-radius:14px;background:rgba(255,255,255,0.05);padding:18px;margin:0 0 24px;">
            <p style="margin:0 0 10px;color:#ffffff;font-size:16px;font-weight:700;">${productName}</p>
            <p style="margin:0;color:#bdbdbd;font-size:14px;line-height:1.7;">Option: ${variantName}</p>
            ${amountTotal ? `<p style="margin:0;color:#bdbdbd;font-size:14px;line-height:1.7;">Total: ${amountTotal}</p>` : ""}
            <p style="margin:0;color:#bdbdbd;font-size:14px;line-height:1.7;">Order ID: ${orderId}</p>
            ${printfulOrderId ? `<p style="margin:0;color:#bdbdbd;font-size:14px;line-height:1.7;">Fulfillment ID: ${printfulOrderId}</p>` : ""}
          </div>

          <p style="margin:0 0 18px;color:#d7d7d7;font-size:15px;line-height:1.65;">
            We will follow up if anything else is needed. If you have questions, reply to this email and it will go to RTSG directly.
          </p>
          <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">
            Research and Technical Studies Group<br />
            This is an automated store confirmation.
          </p>
        </div>
      </div>
    `,
    text: [
      "RTSG Store order confirmation",
      "",
      greeting.replace(/&#039;/g, "'"),
      "",
      "Thank you for your order. We received your purchase and are preparing it for fulfillment.",
      "",
      `${input.product.name}`,
      `Option: ${input.variant.name}`,
      amountTotal ? `Total: ${input.amountTotal}` : null,
      `Order ID: ${input.orderId}`,
      input.printfulOrderId ? `Fulfillment ID: ${input.printfulOrderId}` : null,
      "",
      "If you have questions, reply to this email and it will go to RTSG directly.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
