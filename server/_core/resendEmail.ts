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

type ContactNotificationInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
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
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>RTSG Store order confirmation</title>
          <style>
            @media only screen and (max-width: 600px) {
              .main-container {
                width: 100% !important;
              }

              .content-padding {
                padding-left: 22px !important;
                padding-right: 22px !important;
              }

              .headline {
                font-size: 26px !important;
                line-height: 1.2 !important;
              }

              .button {
                display: block !important;
                text-align: center !important;
              }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background-color:#050505; color:#ffffff; font-family:Arial, Helvetica, sans-serif;">
          <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; font-size:1px; line-height:1px;">
            Your RTSG Store order has been confirmed.
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050505; margin:0; padding:0;">
            <tr>
              <td align="center" style="padding:38px 14px; background:radial-gradient(circle at top left, rgba(255,0,0,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(255,0,0,0.10), transparent 30%), #050505;">
                <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" class="main-container" style="width:640px; max-width:640px; border-radius:24px; overflow:hidden; background-color:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); box-shadow:0 24px 80px rgba(0,0,0,0.45);">
                  <tr>
                    <td class="content-padding" style="padding:30px 32px 22px 32px; border-bottom:1px solid rgba(255,255,255,0.12);">
                      <div style="font-size:24px; font-weight:800; letter-spacing:0.08em; color:#ffffff; text-transform:uppercase;">
                        RTSG<span style="color:#ff2b2b;">.</span>
                      </div>
                      <div style="margin-top:8px; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.68);">
                        Store order confirmation.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td class="content-padding" style="padding:36px 32px 34px 32px;">
                      <div style="display:inline-block; margin-bottom:16px; padding:6px 11px; border:1px solid rgba(255,43,43,0.38); border-radius:999px; background-color:rgba(255,43,43,0.10); color:#ff4a4a; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;">
                        Order Confirmed
                      </div>

                      <h1 class="headline" style="margin:0 0 18px 0; font-size:32px; line-height:1.15; color:#ffffff; font-weight:800;">
                        Thank you for your order
                      </h1>

                      <p style="margin:0 0 18px 0; color:rgba(255,255,255,0.84); font-size:16px; line-height:1.7;">
                        ${greeting}
                      </p>

                      <p style="margin:0 0 18px 0; color:rgba(255,255,255,0.84); font-size:16px; line-height:1.7;">
                        We received your purchase and are preparing it for fulfillment.
                      </p>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                        <tr>
                          <td style="padding:20px; border-radius:18px; background-color:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.12);">
                            <p style="margin:0 0 12px 0; color:#ffffff; font-size:17px; line-height:1.45; font-weight:800;">
                              ${productName}
                            </p>
                            <p style="margin:0; color:rgba(255,255,255,0.78); font-size:15px; line-height:1.7;">
                              <strong style="color:#ffffff;">Option:</strong> ${variantName}<br />
                              ${amountTotal ? `<strong style="color:#ffffff;">Total:</strong> ${amountTotal}<br />` : ""}
                              <strong style="color:#ffffff;">Order ID:</strong> ${orderId}<br />
                              ${printfulOrderId ? `<strong style="color:#ffffff;">Fulfillment ID:</strong> ${printfulOrderId}` : ""}
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 18px 0; color:rgba(255,255,255,0.84); font-size:16px; line-height:1.7;">
                        We will follow up if anything else is needed. If you have questions, reply to this email and it will go to RTSG directly.
                      </p>

                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 12px 0;">
                        <tr>
                          <td>
                            <a href="https://rtsg.org/shop" class="button" style="display:inline-block; padding:14px 24px; border-radius:12px; background:linear-gradient(135deg, #ff2b2b, #9f0000); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; box-shadow:0 12px 30px rgba(255,43,43,0.22);">
                              Visit RTSG Store
                            </a>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
                        <tr>
                          <td style="height:1px; background-color:rgba(255,255,255,0.16); line-height:1px; font-size:1px;">
                            &nbsp;
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 18px 0; color:rgba(255,255,255,0.84); font-size:16px; line-height:1.7;">
                        Thank you for supporting RTSG.
                      </p>

                      <p style="margin:0; color:rgba(255,255,255,0.84); font-size:16px; line-height:1.7;">
                        - RTSG Store
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td class="content-padding" style="padding:24px 32px 30px 32px; border-top:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.54); font-size:12px; line-height:1.6;">
                      <div style="margin-bottom:14px;">
                        <a href="https://rtsg.org" style="color:#ff4a4a; text-decoration:none; font-weight:700; margin-right:14px; text-transform:uppercase; letter-spacing:0.05em;">Website</a>
                        <a href="https://youtube.com/@RTSG_Main" style="color:#ff4a4a; text-decoration:none; font-weight:700; margin-right:14px; text-transform:uppercase; letter-spacing:0.05em;">YouTube</a>
                        <a href="mailto:${STORE_REPLY_TO_ADDRESS}" style="color:#ff4a4a; text-decoration:none; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Contact</a>
                      </div>

                      <div style="margin-bottom:10px;">
                        You are receiving this email because you made a purchase from the RTSG Store.
                      </div>

                      <div>
                        RTSG Store<br />
                        <a href="https://rtsg.org" style="color:#ff4a4a; text-decoration:none;">rtsg.org</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: [
      "RTSG Store order confirmation",
      "",
      greeting.replace(/&#039;/g, "'"),
      "",
      "Thank you for your order. We received your purchase and are preparing it for shipping.",
      "",
      `${input.product.name}`,
      `Option: ${input.variant.name}`,
      amountTotal ? `Total: ${input.amountTotal}` : null,
      `Order ID: ${input.orderId}`,
      input.printfulOrderId ? `Fulfillment ID: ${input.printfulOrderId}` : null,
      "",
      "If you have questions, send an email to rtsgmain@rtsg.org and it will go to RTSG directly.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function sendContactNotificationEmail(input: ContactNotificationInput) {
  const resend = getResendClient();
  const adminEmail = process.env.STORE_ADMIN_EMAIL?.trim() || "rtsgmain@rtsg.org";
  const senderName = escapeHtml(input.name);
  const senderEmail = escapeHtml(input.email);
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message).replace(/\n/g, "<br />");

  const { data, error } = await resend.emails.send({
    from: "RTSG Contact Form <store@rtsg.org>",
    replyTo: input.email,
    to: adminEmail,
    subject: `[RTSG Contact] ${input.subject}`,
    html: `
      <div style="margin:0;padding:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:620px;margin:0 auto;padding:34px 22px;">
          <p style="margin:0 0 18px;color:#ff0033;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">RTSG Contact</p>
          <h1 style="margin:0 0 22px;font-size:26px;line-height:1.2;color:#ffffff;">New contact form message</h1>

          <div style="border:1px solid rgba(255,255,255,0.12);border-radius:14px;background:rgba(255,255,255,0.05);padding:18px;margin:0 0 22px;">
            <p style="margin:0;color:#bdbdbd;font-size:14px;line-height:1.7;"><strong style="color:#fff;">Name:</strong> ${senderName}</p>
            <p style="margin:0;color:#bdbdbd;font-size:14px;line-height:1.7;"><strong style="color:#fff;">Email:</strong> ${senderEmail}</p>
            <p style="margin:0;color:#bdbdbd;font-size:14px;line-height:1.7;"><strong style="color:#fff;">Subject:</strong> ${subject}</p>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12);border-radius:14px;background:rgba(255,255,255,0.04);padding:18px;">
            <p style="margin:0;color:#d7d7d7;font-size:15px;line-height:1.7;">${message}</p>
          </div>
        </div>
      </div>
    `,
    text: [
      "New RTSG contact form message",
      "",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Subject: ${input.subject}`,
      "",
      input.message,
    ].join("\n"),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
