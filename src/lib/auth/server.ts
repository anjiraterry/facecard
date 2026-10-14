import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://auth.neon.tech",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET || "fc_dev_auth_cookie_secret_0123456789abcdef",
  },
});
