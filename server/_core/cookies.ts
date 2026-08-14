import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure" | "domain"> {
  const secure = isSecureRequest(req);
  const hostname = req.hostname.toLowerCase();
  const domain =
    hostname === "rtsg.org" || hostname.endsWith(".rtsg.org")
      ? ".rtsg.org"
      : undefined;

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  };
}
