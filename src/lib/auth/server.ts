import { createNeonAuth } from "@neondatabase/auth/next/server";

const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET;
if (!cookieSecret && process.env.NODE_ENV === "production") {
  throw new Error("NEON_AUTH_COOKIE_SECRET or AUTH_SECRET must be configured in production.");
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://auth.neon.tech",
  cookies: {
    secret: cookieSecret || "fc_dev_auth_cookie_secret_0123456789abcdef",
  },
});
