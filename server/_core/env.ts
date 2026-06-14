function getOptionalEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();

  return value || fallback;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API ?? process.env.RESEND_API_KEY ?? "",
  storeEmailFrom: getOptionalEnv("STORE_EMAIL_FROM", "RTSG Store <store@rtsg.org>"),
  storeReplyTo: getOptionalEnv("STORE_REPLY_TO", "rtsgmain@rtsg.org"),
  storeAdminEmail: getOptionalEnv("STORE_ADMIN_EMAIL", "rtsgmain@rtsg.org"),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  printfulApiKey: process.env.PRINTFUL_API ?? process.env.PRINTFUL_API_KEY ?? "",
  printfulStoreId: process.env.PRINTFUL_STORE_ID ?? "18281109",
  substackFeedUrl: process.env.SUBSTACK_FEED_URL ?? "https://rtsg.media/feed",
  siteUrl: (
    process.env.SITE_URL ??
    process.env.PUBLIC_SITE_URL ??
    process.env.VITE_SITE_URL ??
    "https://rtsg.org"
  ).replace(/\/+$/, ""),
};
